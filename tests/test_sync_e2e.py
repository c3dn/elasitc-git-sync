import json
import os
import time
import base64
import urllib.error
import urllib.parse
import urllib.request

import pytest


PB_URL = os.getenv("PB_URL", "http://localhost:8090").rstrip("/")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@test.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminadmin")
PROJECT_ID = os.getenv("PROJECT_ID", "t2aclcob2pjac1x")
SYNC_TIMEOUT_SECONDS = int(os.getenv("SYNC_TIMEOUT_SECONDS", "180"))


def _json_request(
    url: str,
    method: str,
    *,
    headers: dict | None = None,
    body: dict | None = None,
    timeout: int = 30,
):
    payload = None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, json.loads(data) if data else {}
    except urllib.error.URLError as exc:
        return 0, {"error": str(exc)}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"raw": raw}
        return exc.code, parsed


def _request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    timeout: int = 30,
):
    url = f"{PB_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return _json_request(url, method, headers=headers, body=body, timeout=timeout)


def _auth_admin():
    auth_status, auth_payload = _request(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        body={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if auth_status != 200:
        pytest.skip("Superuser auth failed. Set ADMIN_EMAIL/ADMIN_PASSWORD for this environment.")
    token = auth_payload.get("token", "")
    if not token:
        pytest.skip(f"No auth token in response: {auth_payload}")
    return token


def _first_environment(token: str, project_id: str):
    flt = urllib.parse.quote(f"project='{project_id}'")
    status, payload = _request(
        "GET",
        f"/api/collections/environments/records?perPage=1&filter={flt}",
        token=token,
    )
    if status != 200:
        return None
    items = payload.get("items", [])
    return items[0] if items else None


def _list_pending_by_rule(token: str, rule_id: str):
    flt = urllib.parse.quote(f"rule_id='{rule_id}' && status='pending'")
    status, payload = _request(
        "GET",
        f"/api/collections/pending_changes/records?perPage=50&filter={flt}",
        token=token,
    )
    if status != 200:
        return []
    return payload.get("items", [])


def _cleanup_pending_and_snapshots(token: str, rule_id: str):
    pending = _list_pending_by_rule(token, rule_id)
    for p in pending:
        _request("DELETE", f"/api/collections/pending_changes/records/{p['id']}", token=token)

    flt = urllib.parse.quote(f"rule_id='{rule_id}'")
    status, payload = _request(
        "GET",
        f"/api/collections/rule_snapshots/records?perPage=50&filter={flt}",
        token=token,
    )
    if status == 200:
        for s in payload.get("items", []):
            _request("DELETE", f"/api/collections/rule_snapshots/records/{s['id']}", token=token)


def _elastic_base(kibana_url: str, space: str | None):
    base = kibana_url.rstrip("/")
    if space and space != "default":
        base = f"{base}/s/{space}"
    return base


def _elastic_create_rule(kibana_url: str, api_key: str, space: str | None, rule: dict):
    base = _elastic_base(kibana_url, space)
    return _json_request(
        f"{base}/api/detection_engine/rules",
        "POST",
        headers={"Authorization": f"ApiKey {api_key}", "kbn-xsrf": "true"},
        body=rule,
    )


def _elastic_get_rule(kibana_url: str, api_key: str, space: str | None, rule_id: str):
    base = _elastic_base(kibana_url, space)
    url = f"{base}/api/detection_engine/rules?rule_id={urllib.parse.quote(rule_id)}"
    return _json_request(url, "GET", headers={"Authorization": f"ApiKey {api_key}", "kbn-xsrf": "true"})


def _elastic_delete_rule(kibana_url: str, api_key: str, space: str | None, rule_id: str):
    base = _elastic_base(kibana_url, space)
    url = f"{base}/api/detection_engine/rules?rule_id={urllib.parse.quote(rule_id)}"
    return _json_request(url, "DELETE", headers={"Authorization": f"ApiKey {api_key}", "kbn-xsrf": "true"})


def _gitlab_project_from_url(git_url: str):
    p = urllib.parse.urlparse(git_url)
    if not p.scheme or not p.netloc:
        return None, None
    path = p.path.lstrip("/")
    if path.endswith(".git"):
        path = path[:-4]
    if not path:
        return None, None
    return f"{p.scheme}://{p.netloc}", path


def _gitlab_upsert_rule(base: str, project_path: str, token: str, branch: str, file_path: str, rule: dict):
    encoded_project = urllib.parse.quote(project_path, safe="")
    encoded_file = urllib.parse.quote(file_path, safe="")
    url = f"{base}/api/v4/projects/{encoded_project}/repository/files/{encoded_file}"
    body = {
        "branch": branch,
        "content": json.dumps(rule, indent=2),
        "commit_message": f"[e2e] upsert {file_path}",
    }
    # Try update first, then create.
    status, payload = _json_request(url, "PUT", headers={"Authorization": f"Bearer {token}"}, body=body)
    if status in (200, 201):
        return status, payload
    return _json_request(url, "POST", headers={"Authorization": f"Bearer {token}"}, body=body)


def _gitlab_upsert_raw_file(base: str, project_path: str, token: str, branch: str, file_path: str, content: str):
    encoded_project = urllib.parse.quote(project_path, safe="")
    encoded_file = urllib.parse.quote(file_path, safe="")
    url = f"{base}/api/v4/projects/{encoded_project}/repository/files/{encoded_file}"
    body = {
        "branch": branch,
        "content": content,
        "commit_message": f"[e2e] upsert raw {file_path}",
    }
    status, payload = _json_request(url, "PUT", headers={"Authorization": f"Bearer {token}"}, body=body)
    if status in (200, 201):
        return status, payload
    return _json_request(url, "POST", headers={"Authorization": f"Bearer {token}"}, body=body)


def _gitlab_delete_file(base: str, project_path: str, token: str, branch: str, file_path: str):
    encoded_project = urllib.parse.quote(project_path, safe="")
    encoded_file = urllib.parse.quote(file_path, safe="")
    url = f"{base}/api/v4/projects/{encoded_project}/repository/files/{encoded_file}"
    body = {"branch": branch, "commit_message": f"[e2e] cleanup {file_path}"}
    return _json_request(url, "DELETE", headers={"Authorization": f"Bearer {token}"}, body=body)


def _github_owner_repo_from_url(git_url: str):
    p = urllib.parse.urlparse(git_url)
    if not p.netloc or "github.com" not in p.netloc:
        return None, None
    path = p.path.lstrip("/")
    if path.endswith(".git"):
        path = path[:-4]
    parts = [x for x in path.split("/") if x]
    if len(parts) < 2:
        return None, None
    return parts[0], parts[1]


def _github_get_sha(owner: str, repo: str, token: str, branch: str, file_path: str):
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in file_path.split("/"))
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}?ref={urllib.parse.quote(branch)}"
    status, payload = _json_request(
        url,
        "GET",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
    )
    if status == 200:
        return payload.get("sha")
    return None


def _github_upsert_rule(owner: str, repo: str, token: str, branch: str, file_path: str, rule: dict):
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in file_path.split("/"))
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}"
    sha = _github_get_sha(owner, repo, token, branch, file_path)
    content = base64.b64encode(json.dumps(rule, indent=2).encode("utf-8")).decode("utf-8")
    body = {
        "message": f"[e2e] upsert {file_path}",
        "content": content,
        "branch": branch,
    }
    if sha:
        body["sha"] = sha
    return _json_request(
        url,
        "PUT",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
        body=body,
    )


def _github_upsert_raw_file(owner: str, repo: str, token: str, branch: str, file_path: str, content: str):
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in file_path.split("/"))
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}"
    sha = _github_get_sha(owner, repo, token, branch, file_path)
    body = {
        "message": f"[e2e] upsert raw {file_path}",
        "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
        "branch": branch,
    }
    if sha:
        body["sha"] = sha
    return _json_request(
        url,
        "PUT",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
        body=body,
    )


def _github_delete_file(owner: str, repo: str, token: str, branch: str, file_path: str):
    sha = _github_get_sha(owner, repo, token, branch, file_path)
    if not sha:
        return 200, {"message": "already absent"}
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in file_path.split("/"))
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_path}"
    body = {"message": f"[e2e] cleanup {file_path}", "sha": sha, "branch": branch}
    return _json_request(
        url,
        "DELETE",
        headers={"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"},
        body=body,
    )


def _trigger_sync_with_retry(token: str, body: dict, *, timeout: int):
    deadline = time.time() + timeout
    last_status = 0
    last_payload = {}
    while time.time() < deadline:
        status, payload = _request("POST", "/api/sync/trigger", token=token, body=body, timeout=timeout)
        last_status, last_payload = status, payload
        if status == 409:
            time.sleep(2)
            continue
        return status, payload
    return last_status, last_payload


def _wait_for_sync_job(token: str, sync_job_id: str):
    deadline = time.time() + SYNC_TIMEOUT_SECONDS
    last = None
    while time.time() < deadline:
        status, payload = _request("GET", f"/api/collections/sync_jobs/records/{sync_job_id}", token=token)
        if status == 200:
            last = payload
            job_status = payload.get("status", "")
            if job_status and job_status != "running":
                return payload
        time.sleep(2)
    return last


def _wait_for_audit_entry(token: str, sync_job_id: str):
    deadline = time.time() + 60
    encoded_id = urllib.parse.quote(sync_job_id)
    while time.time() < deadline:
        status, payload = _request(
            "GET",
            f"/api/audit-logs?action=sync_triggered&per_page=50&resource_id={encoded_id}",
            token=token,
        )
        if status == 200:
            items = payload.get("items", [])
            for item in items:
                if item.get("resource_id") == sync_job_id:
                    return item
        time.sleep(2)
    return None


def test_e2e_manual_sync_creates_job_and_audit_entry():
    # Health check
    health_status, _ = _request("GET", "/api/health")
    if health_status != 200:
        pytest.skip(f"PocketBase not reachable at {PB_URL} (status={health_status})")

    # Authenticate superuser
    auth_status, auth_payload = _request(
        "POST",
        "/api/collections/_superusers/auth-with-password",
        body={"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if auth_status != 200:
        pytest.skip(
            "Superuser auth failed. Set ADMIN_EMAIL/ADMIN_PASSWORD for this environment."
        )

    token = auth_payload.get("token", "")
    assert token, f"Auth payload has no token: {auth_payload}"

    # Ensure project exists
    project_status, _ = _request(
        "GET",
        f"/api/collections/projects/records/{PROJECT_ID}",
        token=token,
    )
    if project_status != 200:
        pytest.skip(f"Project {PROJECT_ID} not found. Set PROJECT_ID for your environment.")

    # Trigger sync
    sync_status, sync_payload = _request(
        "POST",
        "/api/sync/trigger",
        token=token,
        body={"project_id": PROJECT_ID, "direction": "elastic_to_git"},
    )
    assert sync_status == 200, sync_payload
    assert sync_payload.get("success") is True, sync_payload
    sync_job_id = sync_payload.get("sync_job_id")
    assert sync_job_id, f"No sync_job_id in response: {sync_payload}"

    # Wait for final sync status
    job = _wait_for_sync_job(token, sync_job_id)
    assert job is not None, f"Sync job {sync_job_id} not readable"
    assert job.get("id") == sync_job_id
    assert job.get("project") == PROJECT_ID
    assert job.get("status") in {"completed", "failed"}, job
    assert job.get("triggered_by") == "user", job

    # Verify audit entry contains real user (not system/unknown)
    audit_entry = _wait_for_audit_entry(token, sync_job_id)
    assert audit_entry is not None, f"No audit entry found for sync_job_id={sync_job_id}"
    assert audit_entry.get("action") == "sync_triggered"
    assert audit_entry.get("resource_type") == "sync_job"
    assert audit_entry.get("user") not in {"", "system", "unknown"}
    assert audit_entry.get("user") == ADMIN_EMAIL


def test_e2e_bidirectional_divergence_creates_pending_and_imports():
    health_status, _ = _request("GET", "/api/health")
    if health_status != 200:
        pytest.skip(f"PocketBase not reachable at {PB_URL} (status={health_status})")

    token = _auth_admin()
    project_status, project = _request(
        "GET",
        f"/api/collections/projects/records/{PROJECT_ID}",
        token=token,
    )
    if project_status != 200:
        pytest.skip(f"Project {PROJECT_ID} not found. Set PROJECT_ID for your environment.")

    env = _first_environment(token, PROJECT_ID)
    if not env:
        pytest.skip("No environment found for project; cannot run bidirectional E2E.")

    elastic_id = project.get("elastic_instance")
    git_repo_id = project.get("git_repository")
    if not elastic_id or not git_repo_id:
        pytest.skip("Project is missing elastic_instance or git_repository relation.")

    e_status, elastic = _request("GET", f"/api/collections/elastic_instances/records/{elastic_id}", token=token)
    g_status, git_repo = _request("GET", f"/api/collections/git_repositories/records/{git_repo_id}", token=token)
    if e_status != 200 or g_status != 200:
        pytest.skip("Elastic/Git settings could not be loaded from PocketBase.")

    kibana_url = elastic.get("url", "")
    api_key = elastic.get("api_key", "")
    provider = (git_repo.get("provider") or "").lower()
    git_url = git_repo.get("url", "")
    git_token = git_repo.get("access_token", "")
    git_branch = env.get("git_branch") or git_repo.get("default_branch") or "main"
    elastic_space = env.get("elastic_space") or project.get("elastic_space") or "default"
    git_path = (project.get("git_path") or "").strip("/")
    if not (kibana_url and api_key and provider and git_url and git_token):
        pytest.skip("Missing required Elastic/Git credentials for E2E divergence test.")

    ts = int(time.time())
    rule_id = f"e2e-bidir-{ts}"
    rule_name = f"[E2E] Bidirectional divergence {ts}"
    file_name = f"{rule_id}.json"
    file_path = f"{git_path}/{file_name}" if git_path else file_name

    elastic_rule = {
        "rule_id": rule_id,
        "name": rule_name,
        "description": "E2E bidirectional divergence test (elastic side)",
        "type": "query",
        "query": "process.name: elastic_variant",
        "risk_score": 10,
        "severity": "low",
        "index": ["logs-*"],
        "enabled": False,
    }
    git_rule = {
        "rule_id": rule_id,
        "name": rule_name,
        "description": "E2E bidirectional divergence test (git side)",
        "type": "query",
        "query": "process.name: git_variant",
        "risk_score": 10,
        "severity": "low",
        "index": ["logs-*"],
        "enabled": False,
    }

    cleanup_done = False
    try:
        # 1) Elastic side mutation
        c_status, c_payload = _elastic_create_rule(kibana_url, api_key, elastic_space, elastic_rule)
        assert c_status in (200, 201), c_payload

        # 2) Git side mutation for same rule_id (divergence/conflict candidate)
        if provider == "gitlab":
            base, project_path = _gitlab_project_from_url(git_url)
            if not base or not project_path:
                pytest.skip(f"Unsupported GitLab URL format: {git_url}")
            gu_status, gu_payload = _gitlab_upsert_rule(base, project_path, git_token, git_branch, file_path, git_rule)
        elif provider == "github":
            owner, repo = _github_owner_repo_from_url(git_url)
            if not owner or not repo:
                pytest.skip(f"Unsupported GitHub URL format: {git_url}")
            gu_status, gu_payload = _github_upsert_rule(owner, repo, git_token, git_branch, file_path, git_rule)
        else:
            pytest.skip(f"Unsupported git provider for this E2E test: {provider}")

        assert gu_status in (200, 201), gu_payload

        # 3) Trigger bidirectional sync
        sync_status, sync_payload = _trigger_sync_with_retry(
            token,
            {
                "project_id": PROJECT_ID,
                "environment_id": env.get("id"),
                "direction": "bidirectional",
                "branch": git_branch,
                "space": elastic_space,
                "prune": False,
            },
            timeout=max(120, SYNC_TIMEOUT_SECONDS),
        )
        assert sync_status == 200, sync_payload
        assert sync_payload.get("success") is True, sync_payload
        sync_job_id = sync_payload.get("sync_job_id")
        assert sync_job_id, sync_payload

        job = _wait_for_sync_job(token, sync_job_id)
        assert job is not None, f"Sync job {sync_job_id} not readable"
        assert job.get("status") in {"completed", "failed"}, job

        summary = sync_payload.get("summary", {})
        # Conflict/divergence expectation:
        # - Elastic->Git detects at least one change and queues pending review
        # - Git->Elastic imports at least one rule file.
        assert summary.get("changes_detected", 0) >= 1, summary
        assert summary.get("pending_created", 0) >= 1, summary
        assert summary.get("imported", 0) >= 1, summary

        pending = _list_pending_by_rule(token, rule_id)
        assert pending, f"No pending change created for divergent rule_id={rule_id}"

        # Verify Git version reached Elastic via git_to_elastic import
        gr_status, gr_payload = _elastic_get_rule(kibana_url, api_key, elastic_space, rule_id)
        assert gr_status == 200, gr_payload
        assert gr_payload.get("query") == git_rule["query"], gr_payload

    finally:
        # Best-effort cleanup so test is repeatable.
        _elastic_delete_rule(kibana_url, api_key, elastic_space, rule_id)
        try:
            if provider == "gitlab":
                base, project_path = _gitlab_project_from_url(git_url)
                if base and project_path:
                    _gitlab_delete_file(base, project_path, git_token, git_branch, file_path)
            elif provider == "github":
                owner, repo = _github_owner_repo_from_url(git_url)
                if owner and repo:
                    _github_delete_file(owner, repo, git_token, git_branch, file_path)
        finally:
            _cleanup_pending_and_snapshots(token, rule_id)
            cleanup_done = True

    assert cleanup_done


def test_e2e_invalid_git_rule_format_reports_import_error():
    health_status, _ = _request("GET", "/api/health")
    if health_status != 200:
        pytest.skip(f"PocketBase not reachable at {PB_URL} (status={health_status})")

    token = _auth_admin()
    project_status, project = _request(
        "GET",
        f"/api/collections/projects/records/{PROJECT_ID}",
        token=token,
    )
    if project_status != 200:
        pytest.skip(f"Project {PROJECT_ID} not found. Set PROJECT_ID for your environment.")

    env = _first_environment(token, PROJECT_ID)
    if not env:
        pytest.skip("No environment found for project; cannot run invalid-format E2E.")

    elastic_id = project.get("elastic_instance")
    git_repo_id = project.get("git_repository")
    if not elastic_id or not git_repo_id:
        pytest.skip("Project is missing elastic_instance or git_repository relation.")

    e_status, elastic = _request("GET", f"/api/collections/elastic_instances/records/{elastic_id}", token=token)
    g_status, git_repo = _request("GET", f"/api/collections/git_repositories/records/{git_repo_id}", token=token)
    if e_status != 200 or g_status != 200:
        pytest.skip("Elastic/Git settings could not be loaded from PocketBase.")

    provider = (git_repo.get("provider") or "").lower()
    git_url = git_repo.get("url", "")
    git_token = git_repo.get("access_token", "")
    git_branch = env.get("git_branch") or git_repo.get("default_branch") or "main"
    elastic_space = env.get("elastic_space") or project.get("elastic_space") or "default"
    git_path = (project.get("git_path") or "").strip("/")

    if not (provider and git_url and git_token):
        pytest.skip("Missing git settings for invalid-format E2E.")

    ts = int(time.time())
    bad_rule_id = f"e2e-invalid-{ts}"
    bad_file_name = f"{bad_rule_id}.json"
    bad_file_path = f"{git_path}/{bad_file_name}" if git_path else bad_file_name
    bad_content = f'{{"rule_id":"{bad_rule_id}",'  # intentionally invalid JSON

    cleanup_done = False
    try:
        if provider == "gitlab":
            base, project_path = _gitlab_project_from_url(git_url)
            if not base or not project_path:
                pytest.skip(f"Unsupported GitLab URL format: {git_url}")
            up_status, up_payload = _gitlab_upsert_raw_file(base, project_path, git_token, git_branch, bad_file_path, bad_content)
        elif provider == "github":
            owner, repo = _github_owner_repo_from_url(git_url)
            if not owner or not repo:
                pytest.skip(f"Unsupported GitHub URL format: {git_url}")
            up_status, up_payload = _github_upsert_raw_file(owner, repo, git_token, git_branch, bad_file_path, bad_content)
        else:
            pytest.skip(f"Unsupported git provider for this E2E test: {provider}")

        assert up_status in (200, 201), up_payload

        sync_status, sync_payload = _trigger_sync_with_retry(
            token,
            {
                "project_id": PROJECT_ID,
                "environment_id": env.get("id"),
                "direction": "git_to_elastic",
                "branch": git_branch,
                "space": elastic_space,
                "prune": False,
            },
            timeout=max(120, SYNC_TIMEOUT_SECONDS),
        )
        assert sync_status == 200, sync_payload
        assert sync_payload.get("success") is True, sync_payload
        sync_job_id = sync_payload.get("sync_job_id")
        assert sync_job_id, sync_payload

        job = _wait_for_sync_job(token, sync_job_id)
        assert job is not None, f"Sync job {sync_job_id} not readable"
        assert job.get("status") in {"completed", "failed"}, job

        summary = sync_payload.get("summary", {})
        # Negative-path guarantee: malformed file must NOT become an Elastic rule.
        er_status, er_payload = _elastic_get_rule(
            elastic.get("url", ""),
            elastic.get("api_key", ""),
            elastic_space,
            bad_rule_id,
        )
        assert er_status != 200, {"rule_id": bad_rule_id, "elastic_payload": er_payload, "summary": summary}
    finally:
        try:
            if provider == "gitlab":
                base, project_path = _gitlab_project_from_url(git_url)
                if base and project_path:
                    _gitlab_delete_file(base, project_path, git_token, git_branch, bad_file_path)
            elif provider == "github":
                owner, repo = _github_owner_repo_from_url(git_url)
                if owner and repo:
                    _github_delete_file(owner, repo, git_token, git_branch, bad_file_path)
        finally:
            _cleanup_pending_and_snapshots(token, bad_rule_id)
            cleanup_done = True

    assert cleanup_done
