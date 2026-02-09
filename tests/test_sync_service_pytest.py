import json
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException


ROOT = Path(__file__).resolve().parents[1]
SYNC_DIR = ROOT / "backend" / "sync_service"
if str(SYNC_DIR) not in sys.path:
    sys.path.insert(0, str(SYNC_DIR))

import change_detector as cd  # noqa: E402
import main as sync_main  # noqa: E402


def _rule(
    rule_id: str,
    *,
    name: str | None = None,
    query: str = "process where true",
    severity: str = "low",
    enabled: bool = True,
    tags: list[str] | None = None,
    exceptions_list: list[dict] | None = None,
    exception_items: list[dict] | None = None,
) -> dict:
    return {
        "rule_id": rule_id,
        "name": name or f"rule-{rule_id}",
        "type": "query",
        "query": query,
        "severity": severity,
        "risk_score": 21,
        "enabled": enabled,
        "tags": tags or [],
        "exceptions_list": exceptions_list or [],
        "_exception_items": exception_items or [],
    }


def _snapshot(rule: dict) -> dict:
    return {
        "rule_id": rule["rule_id"],
        "rule_name": rule.get("name", ""),
        "rule_hash": cd.compute_rule_hash(rule),
        "rule_content": rule,
        "exceptions": rule.get("exceptions_list", []),
        "enabled": rule.get("enabled", False),
        "severity": rule.get("severity", ""),
        "tags": rule.get("tags", []),
    }


def test_detect_changes_happy_path_no_changes(monkeypatch):
    rule = _rule("r-1")
    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([rule], []))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([rule], []))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[_snapshot(rule)],
    )

    assert result["changes"] == []
    assert result["errors"] == []
    assert len(result["current_rules"]) == 1


def test_detect_changes_bidirectional_conflict_candidate(monkeypatch):
    # Simuliert Divergenz: eine Rule modifiziert, eine gelöscht, eine neu.
    baseline_modified = _rule("r-mod", query="old query", severity="low", enabled=True, tags=["old"])
    baseline_deleted = _rule("r-del", query="will be deleted")
    current_modified = _rule("r-mod", query="new query", severity="high", enabled=False, tags=["new"])
    current_new = _rule("r-new", query="new rule")

    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([current_modified, current_new], []))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([current_modified, current_new], []))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="soc",
        baseline_snapshots=[_snapshot(baseline_modified), _snapshot(baseline_deleted)],
    )

    by_id = {c["rule_id"]: c for c in result["changes"]}
    assert set(by_id) == {"r-mod", "r-del", "r-new"}
    assert "deleted_rule" in by_id["r-del"]["change_types"]
    assert "new_rule" in by_id["r-new"]["change_types"]
    assert {"query_changed", "severity_changed", "rule_disabled", "tags_changed"}.issubset(
        set(by_id["r-mod"]["change_types"])
    )


def test_detect_changes_network_errors_from_cli_and_api(monkeypatch):
    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([], ["CLI export timed out after 120 seconds"]))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([], ["API export error: connection refused"]))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[],
    )

    assert result["current_rules"] == []
    assert result["changes"] == []
    assert any("CLI export timed out" in err for err in result["errors"])
    assert any("API export error" in err for err in result["errors"])


def test_detect_changes_cli_skip_is_supplemented_by_api(monkeypatch):
    r1 = _rule("r-1")
    r2 = _rule("r-2")
    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([r1], []))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([r1, r2], []))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[_snapshot(r1), _snapshot(r2)],
    )

    ids = {r["rule_id"] for r in result["current_rules"]}
    assert ids == {"r-1", "r-2"}
    assert any("CLI skipped 1 rule(s)" in err for err in result["errors"])
    assert result["changes"] == []


def test_detect_changes_cli_priority_for_same_rule_id(monkeypatch):
    cli_rule = _rule("r-1", query="query from cli")
    api_rule = _rule("r-1", query="query from api")
    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([cli_rule], []))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([api_rule], []))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[_snapshot(cli_rule)],
    )

    assert len(result["current_rules"]) == 1
    assert result["current_rules"][0]["rule_content"]["query"] == "query from cli"


def test_detect_changes_deleted_rule(monkeypatch):
    rule = _rule("r-del")
    monkeypatch.setattr(cd, "_export_via_cli", lambda *a, **k: ([], []))
    monkeypatch.setattr(cd, "_export_via_api", lambda *a, **k: ([], []))

    result = cd.detect_changes(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[_snapshot(rule)],
    )

    assert len(result["changes"]) == 1
    assert result["changes"][0]["rule_id"] == "r-del"
    assert result["changes"][0]["change_types"] == ["deleted_rule"]


def test_classify_changes_exception_item_modified():
    previous = _rule("r-exc", exception_items=[{"item_id": "1", "name": "A"}])
    current = _rule("r-exc", exception_items=[{"item_id": "1", "name": "B"}])
    changes = cd.classify_changes(previous, current)
    assert "exception_modified" in changes


def test_compute_rule_hash_ignores_volatile_fields():
    base = _rule("r-hash")
    with_volatile = dict(base)
    with_volatile.update(
        {
            "id": "internal-id",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "updated_by": "someone",
            "revision": 99,
        }
    )
    assert cd.compute_rule_hash(base) == cd.compute_rule_hash(with_volatile)


@pytest.mark.anyio
async def test_parse_rule_content_json_and_toml():
    json_req = sync_main.ParseRuleContentRequest(content=json.dumps(_rule("r-json")), format="json")
    json_resp = await sync_main.api_parse_rule_content(json_req)
    assert json_resp["rule"]["rule_id"] == "r-json"

    toml_content = """
[metadata]
maturity = "production"

[rule]
rule_id = "r-toml"
name = "toml-rule"
type = "query"
query = "process where true"
severity = "low"
risk_score = 21
enabled = true
"""
    toml_req = sync_main.ParseRuleContentRequest(
        content=toml_content,
        format="toml",
        filename="r-toml.toml",
    )
    toml_resp = await sync_main.api_parse_rule_content(toml_req)
    assert toml_resp["rule"]["rule_id"] == "r-toml"


@pytest.mark.anyio
async def test_parse_rule_content_invalid_formats():
    with pytest.raises(HTTPException) as bad_json_exc:
        await sync_main.api_parse_rule_content(
            sync_main.ParseRuleContentRequest(content="{not-json", format="json")
        )
    assert bad_json_exc.value.status_code == 400
    assert "Parse failed" in bad_json_exc.value.detail

    with pytest.raises(HTTPException) as bad_toml_exc:
        await sync_main.api_parse_rule_content(
            sync_main.ParseRuleContentRequest(content="[rule\nx=1", format="toml")
        )
    assert bad_toml_exc.value.status_code == 400
    assert "Parse failed" in bad_toml_exc.value.detail

    with pytest.raises(HTTPException) as unsupported_exc:
        await sync_main.api_parse_rule_content(
            sync_main.ParseRuleContentRequest(content="x", format="yaml")
        )
    assert unsupported_exc.value.status_code == 400
    assert "Unsupported format" in unsupported_exc.value.detail


@pytest.mark.anyio
async def test_detect_changes_endpoint_handles_internal_failure(monkeypatch):
    def _boom(*args, **kwargs):
        raise RuntimeError("network down")

    monkeypatch.setattr(sync_main, "detect_changes", _boom)
    payload = sync_main.DetectChangesRequest(
        kibana_url="https://kibana.local",
        api_key="dummy",
        space="default",
        baseline_snapshots=[],
    )
    with pytest.raises(HTTPException) as exc:
        await sync_main.api_detect_changes(payload)
    assert exc.value.status_code == 500
    assert "network down" in exc.value.detail
