"""
Change detection engine for Elastic Security detection rules.

Compares current Elastic state against baseline snapshots using
hash-based detection (matching the elastic/detection-rules CLI algorithm)
and field-level diffing for granular change classification.
"""

import base64
import hashlib
import json
import os
import subprocess
import tempfile
import shutil
from typing import Any


def compute_rule_hash(rule: dict) -> str:
    """
    Compute a rule hash using the detection-rules algorithm:
    sorted JSON -> serialized -> base64 -> SHA256.
    """
    # Remove volatile/documentation fields that change without user action
    stable = {k: v for k, v in rule.items() if k not in (
        "id", "created_at", "updated_at", "created_by", "updated_by",
        "execution_summary", "revision", "related_integrations",
        "required_fields", "setup", "note", "immutable", "output_index",
        "rule_source", "version", "meta", "_enriched_exceptions",
    )}
    serialized = json.dumps(stable, sort_keys=True, separators=(",", ":"))
    b64 = base64.b64encode(serialized.encode("utf-8")).decode("utf-8")
    return hashlib.sha256(b64.encode("utf-8")).hexdigest()


def classify_changes(previous: dict | None, current: dict | None) -> list[str]:
    """
    Given previous and current rule states, return a list of specific change types.
    """
    if previous is None and current is not None:
        return ["new_rule"]
    if previous is not None and current is None:
        return ["deleted_rule"]
    if previous is None and current is None:
        return []

    changes = []

    # Enabled/disabled state
    prev_enabled = previous.get("enabled", False)
    curr_enabled = current.get("enabled", False)
    if prev_enabled != curr_enabled:
        changes.append("rule_enabled" if curr_enabled else "rule_disabled")

    # Severity
    if previous.get("severity") != current.get("severity"):
        changes.append("severity_changed")

    # Tags
    prev_tags = set(previous.get("tags") or [])
    curr_tags = set(current.get("tags") or [])
    if prev_tags != curr_tags:
        changes.append("tags_changed")

    # Query
    if previous.get("query") != current.get("query"):
        changes.append("query_changed")

    # Exception list references (adding/removing entire exception lists)
    prev_exceptions = previous.get("exceptions_list") or []
    curr_exceptions = current.get("exceptions_list") or []
    if json.dumps(prev_exceptions, sort_keys=True) != json.dumps(curr_exceptions, sort_keys=True):
        if len(curr_exceptions) > len(prev_exceptions):
            changes.append("exception_added")
        elif len(curr_exceptions) < len(prev_exceptions):
            changes.append("exception_removed")
        else:
            changes.append("exception_modified")

    # Exception list items (changes to items within exception lists)
    prev_items = previous.get("_exception_items") or []
    curr_items = current.get("_exception_items") or []
    prev_items_str = json.dumps(prev_items, sort_keys=True)
    curr_items_str = json.dumps(curr_items, sort_keys=True)
    if prev_items_str != curr_items_str and "exception_added" not in changes and "exception_removed" not in changes and "exception_modified" not in changes:
        if len(curr_items) > len(prev_items):
            changes.append("exception_added")
        elif len(curr_items) < len(prev_items):
            changes.append("exception_removed")
        else:
            changes.append("exception_modified")

    # If nothing specific detected but hashes differ, it's a generic modification
    if not changes:
        changes.append("modified_rule")

    return changes


def build_diff_summary(change_types: list[str], rule_name: str,
                       previous: dict | None, current: dict | None) -> str:
    """Build a human-readable summary of changes."""
    parts = []
    for ct in change_types:
        if ct == "new_rule":
            parts.append(f"New rule detected: {rule_name}")
        elif ct == "deleted_rule":
            parts.append(f"Rule deleted: {rule_name}")
        elif ct == "rule_enabled":
            parts.append("Rule was enabled")
        elif ct == "rule_disabled":
            parts.append("Rule was disabled")
        elif ct == "severity_changed":
            prev_sev = (previous or {}).get("severity", "unknown")
            curr_sev = (current or {}).get("severity", "unknown")
            parts.append(f"Severity changed: {prev_sev} -> {curr_sev}")
        elif ct == "tags_changed":
            parts.append("Tags were modified")
        elif ct == "query_changed":
            parts.append("Detection query was modified")
        elif ct == "exception_added":
            parts.append("Exception list entry added")
        elif ct == "exception_removed":
            parts.append("Exception list entry removed")
        elif ct == "exception_modified":
            parts.append("Exception list modified")
        elif ct == "modified_rule":
            parts.append("Rule configuration modified")
    return "; ".join(parts)


def rule_to_toml(rule: dict) -> str:
    """
    Convert an Elastic Security rule JSON to TOML format
    following the detection-rules convention.
    """
    import toml

    # Build metadata section
    metadata = {
        "creation_date": rule.get("created_at", ""),
        "updated_date": rule.get("updated_at", ""),
        "maturity": "production" if rule.get("enabled") else "development",
    }

    # Build rule section - keep all fields except volatile ones
    rule_section = {}
    skip_fields = {
        "id", "created_at", "updated_at", "created_by", "updated_by",
        "execution_summary", "revision",
    }
    for key, value in rule.items():
        if key not in skip_fields and value is not None:
            rule_section[key] = value

    toml_dict = {
        "metadata": metadata,
        "rule": rule_section,
    }

    return toml.dumps(toml_dict)


def detect_changes(
    kibana_url: str,
    api_key: str,
    space: str,
    baseline_snapshots: list[dict],
    use_cli: bool = True,
) -> dict:
    """
    Detect changes between current Elastic state and baseline snapshots.

    Args:
        kibana_url: Kibana base URL
        api_key: Elastic API key
        space: Kibana space name
        baseline_snapshots: List of {rule_id, rule_hash, rule_content, exceptions, enabled, severity, tags}
        use_cli: Whether to try the detection-rules CLI first

    Returns:
        {
            "changes": [
                {
                    "rule_id": str,
                    "rule_name": str,
                    "change_types": [str],
                    "diff_summary": str,
                    "previous_state": dict | None,
                    "current_state": dict | None,
                    "current_hash": str | None,
                    "toml_content": str | None,
                }
            ],
            "current_rules": [
                {
                    "rule_id": str,
                    "rule_name": str,
                    "rule_hash": str,
                    "rule_content": dict,
                    "toml_content": str,
                    "enabled": bool,
                    "severity": str,
                    "tags": list,
                    "exceptions": list,
                }
            ],
            "errors": [str]
        }
    """
    errors = []
    current_rules_raw = []

    cli_rules = []
    if use_cli:
        cli_rules, cli_errors = _export_via_cli(kibana_url, api_key, space)
        errors.extend(cli_errors)

    # Always fetch via API to catch rules the CLI may have skipped
    # (e.g. rules with KQL parse errors that the CLI can't convert to TOML)
    api_rules, api_errors = _export_via_api(kibana_url, api_key, space)
    if not cli_rules:
        errors.extend(api_errors)

    # Merge: CLI results take priority (have proper TOML), API fills gaps
    cli_rule_ids = set()
    for rule in cli_rules:
        rid = rule.get("rule_id") or rule.get("id", "")
        if rid:
            cli_rule_ids.add(rid)
    current_rules_raw = list(cli_rules)

    api_supplemented = 0
    for rule in api_rules:
        rid = rule.get("rule_id") or rule.get("id", "")
        if rid and rid not in cli_rule_ids:
            current_rules_raw.append(rule)
            api_supplemented += 1

    if api_supplemented > 0:
        errors.append(f"CLI skipped {api_supplemented} rule(s), supplemented from API")

    # Enrich CLI-exported rules with data from API
    # (CLI rules don't have _exception_items or internal Kibana 'id')
    if cli_rules and api_rules:
        api_enrichment: dict[str, dict] = {}
        for rule in api_rules:
            rid = rule.get("rule_id") or rule.get("id", "")
            if rid:
                api_enrichment[rid] = {
                    "id": rule.get("id", ""),
                    "_exception_items": rule.get("_exception_items", []),
                }
        for rule in current_rules_raw:
            rid = rule.get("rule_id") or rule.get("id", "")
            if rid and rid in api_enrichment:
                enrichment = api_enrichment[rid]
                if "id" not in rule and enrichment["id"]:
                    rule["id"] = enrichment["id"]
                if "_exception_items" not in rule:
                    rule["_exception_items"] = enrichment["_exception_items"]

    # Build current rules map with hashes
    current_map: dict[str, dict] = {}
    current_rules_output = []

    for rule in current_rules_raw:
        rule_id = rule.get("rule_id") or rule.get("id", "")
        if not rule_id:
            continue

        rule_hash = compute_rule_hash(rule)
        try:
            toml_content = rule_to_toml(rule)
        except Exception as e:
            toml_content = None
            errors.append(f"TOML conversion failed for {rule_id}: {str(e)}")

        entry = {
            "rule_id": rule_id,
            "rule_name": rule.get("name", ""),
            "rule_hash": rule_hash,
            "rule_content": rule,
            "toml_content": toml_content,
            "enabled": rule.get("enabled", False),
            "severity": rule.get("severity", ""),
            "tags": rule.get("tags", []),
            "exceptions": rule.get("exceptions_list", []),
        }
        current_map[rule_id] = entry
        current_rules_output.append(entry)

    # Build baseline map
    baseline_map: dict[str, dict] = {}
    for snap in baseline_snapshots:
        rid = snap.get("rule_id", "")
        if rid:
            baseline_map[rid] = snap

    # Detect changes
    changes = []

    # Check for new and modified rules
    for rule_id, current in current_map.items():
        baseline = baseline_map.get(rule_id)

        if baseline is None:
            # New rule
            change_types = ["new_rule"]
            diff_summary = build_diff_summary(change_types, current["rule_name"], None, current["rule_content"])
            changes.append({
                "rule_id": rule_id,
                "rule_name": current["rule_name"],
                "change_types": change_types,
                "diff_summary": diff_summary,
                "previous_state": None,
                "current_state": current["rule_content"],
                "current_hash": current["rule_hash"],
                "toml_content": current["toml_content"],
            })
        elif baseline.get("rule_hash") != current["rule_hash"]:
            # Modified rule - classify the change
            prev_content = baseline.get("rule_content", {})
            change_types = classify_changes(prev_content, current["rule_content"])
            diff_summary = build_diff_summary(
                change_types, current["rule_name"],
                prev_content, current["rule_content"]
            )
            changes.append({
                "rule_id": rule_id,
                "rule_name": current["rule_name"],
                "change_types": change_types,
                "diff_summary": diff_summary,
                "previous_state": prev_content,
                "current_state": current["rule_content"],
                "current_hash": current["rule_hash"],
                "toml_content": current["toml_content"],
            })

    # Check for deleted rules
    for rule_id, baseline in baseline_map.items():
        if rule_id not in current_map:
            change_types = ["deleted_rule"]
            rule_name = baseline.get("rule_name", rule_id)
            diff_summary = build_diff_summary(change_types, rule_name, baseline.get("rule_content"), None)
            changes.append({
                "rule_id": rule_id,
                "rule_name": rule_name,
                "change_types": change_types,
                "diff_summary": diff_summary,
                "previous_state": baseline.get("rule_content"),
                "current_state": None,
                "current_hash": None,
                "toml_content": None,
            })

    return {
        "changes": changes,
        "current_rules": current_rules_output,
        "errors": errors,
    }


def _export_via_cli(kibana_url: str, api_key: str, space: str) -> tuple[list[dict], list[str]]:
    """
    Export rules using the detection-rules CLI.
    Returns (rules_list, errors_list).
    """
    rules = []
    errors = []
    export_dir = tempfile.mkdtemp(prefix="dr_export_")

    try:
        cmd = [
            "python3", "-m", "detection_rules",
            "kibana",
            "--kibana-url", kibana_url,
            "--api-key", api_key,
        ]

        if space and space != "default":
            cmd.extend(["--space", space])

        cmd.extend([
            "export-rules",
            "-d", export_dir,
            "--skip-errors",
            "--export-exceptions",
            "--strip-version",
        ])

        env = os.environ.copy()
        env["PYTHONDONTWRITEBYTECODE"] = "1"

        # If SSL verification is disabled, patch the SSL context before
        # running the detection-rules CLI so urllib3/requests skip cert
        # validation (the CLI is a subprocess and does not inherit our
        # httpx verify=False setting).
        disable_ssl = os.environ.get("DISABLE_SSL_VERIFY", "false").lower() in ("true", "1", "yes")
        if disable_ssl:
            ssl_patch = (
                "import ssl; ssl._create_default_https_context = ssl._create_unverified_context; "
                "import runpy; runpy.run_module('detection_rules', run_name='__main__')"
            )
            # Replace "python3 -m detection_rules <args>" with
            # "python3 -c '<patch>;runpy...' <args>"
            cli_args = cmd[3:]  # everything after "python3 -m detection_rules"
            cmd = ["python3", "-c", ssl_patch] + cli_args

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            env=env,
        )

        if result.returncode != 0:
            errors.append(f"CLI export failed (code {result.returncode}): {result.stderr[:500]}")
            return rules, errors

        # Read exported TOML files and convert back to JSON for comparison
        for filename in os.listdir(export_dir):
            if filename.startswith("_"):
                continue  # Skip _errors.txt etc.
            filepath = os.path.join(export_dir, filename)
            if not os.path.isfile(filepath):
                continue

            try:
                if filename.endswith(".toml"):
                    import toml
                    with open(filepath, "r") as f:
                        data = toml.load(f)
                    rule = data.get("rule", {})
                    rules.append(rule)
                elif filename.endswith(".json"):
                    with open(filepath, "r") as f:
                        rule = json.load(f)
                    rules.append(rule)
            except Exception as e:
                errors.append(f"Failed to parse {filename}: {str(e)}")

    except subprocess.TimeoutExpired:
        errors.append("CLI export timed out after 120 seconds")
    except FileNotFoundError:
        errors.append("detection-rules CLI not found, falling back to API")
    except Exception as e:
        errors.append(f"CLI export error: {str(e)}")
    finally:
        shutil.rmtree(export_dir, ignore_errors=True)

    return rules, errors


def _export_via_api(kibana_url: str, api_key: str, space: str) -> tuple[list[dict], list[str]]:
    """
    Export rules directly via Elastic API (fallback when CLI is unavailable).
    Returns (rules_list, errors_list).
    """
    import httpx

    rules = []
    errors = []

    base_url = kibana_url.rstrip("/")
    if space and space != "default":
        base_url = f"{base_url}/s/{space}"

    rules_url = f"{base_url}/api/detection_engine/rules/_find"
    headers = {
        "Authorization": f"ApiKey {api_key}",
        "kbn-xsrf": "true",
        "Content-Type": "application/json",
    }

    try:
        page = 1
        per_page = 10000
        total = 0

        with httpx.Client(timeout=60, verify=False) as client:
            while True:
                resp = client.get(
                    rules_url,
                    params={"per_page": per_page, "page": page, "sort_field": "name", "sort_order": "asc"},
                    headers=headers,
                )
                resp.raise_for_status()
                data = resp.json()
                page_rules = data.get("data", [])
                total = data.get("total", 0)
                rules.extend(page_rules)

                if len(rules) >= total:
                    break
                page += 1

    except Exception as e:
        errors.append(f"API export error: {str(e)}")

    # Fetch exception lists and their items
    try:
        exceptions_url = f"{base_url}/api/exception_lists/_find"
        with httpx.Client(timeout=60, verify=False) as client:
            resp = client.get(
                exceptions_url,
                params={"per_page": 10000, "page": 1},
                headers=headers,
            )
            if resp.status_code == 200:
                exc_data = resp.json()
                exception_lists = {
                    el.get("list_id"): el
                    for el in exc_data.get("data", [])
                }

                # Fetch actual exception items for each list
                exception_items_by_list: dict[str, list[dict]] = {}
                for list_id, exc_list in exception_lists.items():
                    namespace = exc_list.get("namespace_type", "single")
                    try:
                        items_url = f"{base_url}/api/exception_lists/items/_find"
                        items_resp = client.get(
                            items_url,
                            params={
                                "list_id": list_id,
                                "namespace_type": namespace,
                                "per_page": 10000,
                                "page": 1,
                            },
                            headers=headers,
                        )
                        if items_resp.status_code == 200:
                            items_data = items_resp.json()
                            # Clean volatile fields from items
                            cleaned_items = []
                            for item in items_data.get("data", []):
                                cleaned = {
                                    k: v for k, v in item.items()
                                    if k not in (
                                        "id", "created_at", "updated_at",
                                        "created_by", "updated_by",
                                        "_version", "tie_breaker_id",
                                    )
                                }
                                cleaned_items.append(cleaned)
                            exception_items_by_list[list_id] = cleaned_items
                    except Exception as e:
                        errors.append(f"Failed to fetch items for list {list_id}: {str(e)}")

                # Attach enriched exceptions and items to rules
                for rule in rules:
                    rule_exceptions = rule.get("exceptions_list", [])
                    enriched = []
                    rule_exception_items = []
                    for ref in rule_exceptions:
                        list_id = ref.get("list_id", "")
                        if list_id in exception_lists:
                            enriched.append(exception_lists[list_id])
                        else:
                            enriched.append(ref)
                        if list_id in exception_items_by_list:
                            rule_exception_items.extend(exception_items_by_list[list_id])
                    if enriched:
                        rule["_enriched_exceptions"] = enriched
                    # Store cleaned exception items for hash computation
                    # (not in the hash exclusion list, so it WILL affect the hash)
                    rule["_exception_items"] = sorted(
                        rule_exception_items,
                        key=lambda x: json.dumps(x, sort_keys=True),
                    )
    except Exception as e:
        errors.append(f"Exception list fetch error: {str(e)}")

    return rules, errors
