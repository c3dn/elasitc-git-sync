"""
Sync Service — FastAPI wrapper around the detection-rules CLI.

Runs on port 8091 inside the PocketBase container.
PocketBase hooks call this via $http.send() to localhost:8091.
"""

import json
import logging
import os
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from change_detector import (
    compute_rule_hash,
    detect_changes,
    rule_to_toml,
)

logging.basicConfig(level=logging.INFO, format="[sync-service] %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Elastic Git Sync Service", version="1.0.0")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class BaselineSnapshot(BaseModel):
    rule_id: str
    rule_name: str = ""
    rule_hash: str = ""
    rule_content: dict = {}
    exceptions: list = []
    enabled: bool = False
    severity: str = ""
    tags: list = []


class DetectChangesRequest(BaseModel):
    kibana_url: str
    api_key: str
    space: str = "default"
    baseline_snapshots: list[BaselineSnapshot] = []


class ExportTomlRequest(BaseModel):
    rule: dict


class RevertRuleRequest(BaseModel):
    kibana_url: str
    api_key: str
    space: str = "default"
    rule_content: dict  # The approved state to restore


class RevertExceptionItemsRequest(BaseModel):
    kibana_url: str
    api_key: str
    space: str = "default"
    previous_items: list[dict] = []  # Exception items from baseline
    current_items: list[dict] = []   # Exception items currently in Elastic


class ComputeHashRequest(BaseModel):
    rule: dict


class ParseRuleContentRequest(BaseModel):
    content: str
    format: str = ""
    filename: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Health check endpoint."""
    cli_available = _check_cli_available()
    return {
        "status": "healthy",
        "cli_available": cli_available,
        "version": "1.0.0",
    }


@app.post("/detect-changes")
async def api_detect_changes(req: DetectChangesRequest):
    """
    Detect changes between current Elastic state and baseline snapshots.

    Exports all rules from the specified Kibana space, computes hashes,
    and compares against the provided baseline. Returns a list of
    granular changes (new, modified, deleted, state changes, etc.).
    """
    logger.info(f"Detecting changes for {req.kibana_url} space={req.space}")
    logger.info(f"Baseline has {len(req.baseline_snapshots)} snapshots")

    try:
        result = detect_changes(
            kibana_url=req.kibana_url,
            api_key=req.api_key,
            space=req.space,
            baseline_snapshots=[s.model_dump() for s in req.baseline_snapshots],
            use_cli=True,
        )

        logger.info(
            f"Detection complete: {len(result['changes'])} changes, "
            f"{len(result['current_rules'])} current rules, "
            f"{len(result['errors'])} errors"
        )

        return result

    except Exception as e:
        logger.error(f"Change detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export-toml")
async def api_export_toml(req: ExportTomlRequest):
    """
    Convert an Elastic Security rule JSON to TOML format
    following the detection-rules convention.
    """
    try:
        toml_content = rule_to_toml(req.rule)
        rule_hash = compute_rule_hash(req.rule)
        return {
            "toml_content": toml_content,
            "rule_hash": rule_hash,
        }
    except Exception as e:
        logger.error(f"TOML export failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/revert-rule")
async def api_revert_rule(req: RevertRuleRequest):
    """
    Revert a rule in Elastic to its last approved state.

    PUTs the provided rule_content back to the Elastic detection engine API.
    """
    logger.info(f"Reverting rule {req.rule_content.get('rule_id', '?')} in {req.kibana_url}")

    base_url = req.kibana_url.rstrip("/")
    if req.space and req.space != "default":
        base_url = f"{base_url}/s/{req.space}"

    rules_url = f"{base_url}/api/detection_engine/rules"
    headers = {
        "Authorization": f"ApiKey {req.api_key}",
        "kbn-xsrf": "true",
        "Content-Type": "application/json",
    }

    # Clean the rule content of read-only and internal fields before PUT
    rule_data = dict(req.rule_content)
    for field in ("id", "created_at", "updated_at", "created_by", "updated_by",
                   "execution_summary", "revision",
                   "_exception_items", "_enriched_exceptions"):
        rule_data.pop(field, None)

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            # Try PUT (update existing)
            resp = await client.put(rules_url, headers=headers, json=rule_data)

            if resp.status_code == 200:
                return {
                    "success": True,
                    "message": f"Rule {rule_data.get('rule_id', '')} reverted successfully",
                }

            # If PUT fails with 404, the rule was deleted — recreate it
            if resp.status_code == 404:
                resp = await client.post(rules_url, headers=headers, json=rule_data)
                if resp.status_code in (200, 201):
                    return {
                        "success": True,
                        "message": f"Rule {rule_data.get('rule_id', '')} recreated successfully",
                    }

            return {
                "success": False,
                "message": f"Revert failed with status {resp.status_code}: {resp.text[:500]}",
            }

    except Exception as e:
        logger.error(f"Revert failed: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"Revert error: {str(e)}",
        }


@app.post("/revert-exception-items")
async def api_revert_exception_items(req: RevertExceptionItemsRequest):
    """
    Revert exception list items to their previous state.

    Compares previous_items vs current_items by item_id:
    - Items in previous but not current → recreate
    - Items in current but not previous → delete
    - Items that differ → update
    """
    base_url = req.kibana_url.rstrip("/")
    if req.space and req.space != "default":
        base_url = f"{base_url}/s/{req.space}"

    headers = {
        "Authorization": f"ApiKey {req.api_key}",
        "kbn-xsrf": "true",
        "Content-Type": "application/json",
    }

    prev_by_id = {it.get("item_id"): it for it in req.previous_items if it.get("item_id")}
    curr_by_id = {it.get("item_id"): it for it in req.current_items if it.get("item_id")}

    results = []
    errors = []

    try:
        async with httpx.AsyncClient(timeout=30, verify=False) as client:
            # Items that were removed (in previous, not in current) → recreate
            for item_id, item in prev_by_id.items():
                if item_id not in curr_by_id:
                    try:
                        create_data = {k: v for k, v in item.items()
                                       if k not in ("id", "created_at", "updated_at",
                                                     "created_by", "updated_by",
                                                     "_version", "tie_breaker_id")}
                        resp = await client.post(
                            f"{base_url}/api/exception_lists/items",
                            headers=headers, json=create_data,
                        )
                        if resp.status_code in (200, 201):
                            results.append(f"Recreated: {item.get('name', item_id)}")
                        else:
                            errors.append(f"Failed to recreate {item.get('name', item_id)}: {resp.status_code}")
                    except Exception as e:
                        errors.append(f"Error recreating {item.get('name', item_id)}: {str(e)}")

            # Items that were added (in current, not in previous) → delete
            for item_id, item in curr_by_id.items():
                if item_id not in prev_by_id:
                    try:
                        namespace = item.get("namespace_type", "single")
                        resp = await client.delete(
                            f"{base_url}/api/exception_lists/items",
                            params={"item_id": item_id, "namespace_type": namespace},
                            headers=headers,
                        )
                        if resp.status_code == 200:
                            results.append(f"Deleted: {item.get('name', item_id)}")
                        else:
                            errors.append(f"Failed to delete {item.get('name', item_id)}: {resp.status_code}")
                    except Exception as e:
                        errors.append(f"Error deleting {item.get('name', item_id)}: {str(e)}")

            # Items that were modified → update
            for item_id, curr_item in curr_by_id.items():
                prev_item = prev_by_id.get(item_id)
                if prev_item and json.dumps(prev_item, sort_keys=True) != json.dumps(curr_item, sort_keys=True):
                    try:
                        update_data = {k: v for k, v in prev_item.items()
                                       if k not in ("id", "created_at", "updated_at",
                                                     "created_by", "updated_by",
                                                     "_version", "tie_breaker_id")}
                        resp = await client.put(
                            f"{base_url}/api/exception_lists/items",
                            headers=headers, json=update_data,
                        )
                        if resp.status_code == 200:
                            results.append(f"Reverted: {prev_item.get('name', item_id)}")
                        else:
                            errors.append(f"Failed to revert {prev_item.get('name', item_id)}: {resp.status_code}")
                    except Exception as e:
                        errors.append(f"Error reverting {prev_item.get('name', item_id)}: {str(e)}")

    except Exception as e:
        errors.append(f"Connection error: {str(e)}")

    success = len(errors) == 0
    return {
        "success": success,
        "message": "; ".join(results) if results else "No changes to revert",
        "results": results,
        "errors": errors,
    }


@app.post("/compute-hash")
async def api_compute_hash(req: ComputeHashRequest):
    """Compute the detection-rules compatible hash for a rule."""
    try:
        rule_hash = compute_rule_hash(req.rule)
        return {"rule_hash": rule_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse-rule-content")
async def api_parse_rule_content(req: ParseRuleContentRequest):
    """
    Parse a rule file payload and return the normalized rule JSON object.
    Supports JSON and TOML (detection-rules style with [rule] section).
    """
    fmt = (req.format or "").strip().lower()
    if not fmt and req.filename:
        if req.filename.endswith(".toml"):
            fmt = "toml"
        elif req.filename.endswith(".json"):
            fmt = "json"
    if not fmt:
        fmt = "json"

    try:
        if fmt == "json":
            parsed = json.loads(req.content)
        elif fmt == "toml":
            try:
                import tomllib  # py3.11+
                parsed = tomllib.loads(req.content)
            except Exception:
                import toml
                parsed = toml.loads(req.content)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {fmt}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parse failed: {str(e)}")

    rule = parsed.get("rule", parsed) if isinstance(parsed, dict) else parsed
    if not isinstance(rule, dict):
        raise HTTPException(status_code=400, detail="Parsed content does not contain a rule object")

    return {"rule": rule}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_cli_available() -> bool:
    """Check if the detection-rules CLI is installed."""
    import subprocess
    try:
        result = subprocess.run(
            ["python3", "-m", "detection_rules", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("SYNC_SERVICE_PORT", "8091"))
    logger.info(f"Starting sync service on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
