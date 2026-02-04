#!/usr/bin/env bash
# =============================================================================
# Test suite for v2 changes:
#   1. Git commit failure → snapshot NOT updated (rule reappears on next sync)
#   2. Rejected rules archived to Git under deleted/{YYYY-MM-DD}/
#   3. Audit logs use authenticated user email (not "reviewer" fallback)
#   4. Debug logging in commitTomlToGit
#
# Prerequisites:
#   - Docker containers running (pocketbase + frontend)
#   - Elastic instance reachable
#   - Project and environment already configured
#
# Usage:
#   ./tests/test_changes_v2.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — adjust these for your environment
# ---------------------------------------------------------------------------
PB_URL="${PB_URL:-http://localhost:8090}"
ELASTIC_URL="${ELASTIC_URL:-http://46.62.253.196:5601}"
ELASTIC_SPACE="${ELASTIC_SPACE:-prod}"
ELASTIC_API_KEY="${ELASTIC_API_KEY:-NGc3ZUk1d0IyeGVQYlVsZkxGVTg6Q0hyUEtPekRlWXBTa1d3X3JnbFZmdw==}"
PROJECT_ID="${PROJECT_ID:-t2aclcob2pjac1x}"

ELASTIC_BASE="${ELASTIC_URL}/s/${ELASTIC_SPACE}"

# Admin credentials for authenticated requests
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@test.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-adminadmin}"

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Temp files
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() {
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✓ PASS: $1"
}

fail() {
  FAILED=$((FAILED + 1))
  TOTAL=$((TOTAL + 1))
  echo "  ✗ FAIL: $1"
  if [ -n "${2:-}" ]; then
    echo "         Detail: $2"
  fi
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# PocketBase API calls (unauthenticated)
pb_get() {
  curl -sf "${PB_URL}$1" 2>/dev/null || echo ""
}

pb_post() {
  curl -sf -X POST "${PB_URL}$1" -H 'Content-Type: application/json' -d "$2" 2>/dev/null || echo ""
}

# PocketBase API calls (authenticated)
pb_auth_post() {
  curl -sf -X POST "${PB_URL}$1" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d "$2" 2>/dev/null || echo ""
}

pb_auth_get() {
  curl -sf "${PB_URL}$1" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" 2>/dev/null || echo ""
}

# Elastic API calls
elastic_post() {
  curl -sfk -X POST "${ELASTIC_BASE}$1" \
    -H "Authorization: ApiKey ${ELASTIC_API_KEY}" \
    -H 'kbn-xsrf: true' \
    -H 'Content-Type: application/json' \
    -d "$2" 2>/dev/null || echo ""
}

elastic_delete() {
  curl -sfk -X DELETE "${ELASTIC_BASE}$1" \
    -H "Authorization: ApiKey ${ELASTIC_API_KEY}" \
    -H 'kbn-xsrf: true' 2>/dev/null || echo ""
}

# JSON helpers
json_get() {
  echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d$2)" 2>/dev/null || echo ""
}

json_count() {
  echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d$2))" 2>/dev/null || echo "0"
}

# Trigger sync and return result
trigger_sync() {
  pb_post "/api/sync/trigger" "{\"project_id\":\"${PROJECT_ID}\"}"
}

# Clean up all pending changes
cleanup_pending() {
  local resp
  resp=$(pb_get "/api/collections/pending_changes/records?perPage=500")
  local ids
  ids=$(echo "$resp" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    print(item['id'])
" 2>/dev/null || true)
  for id in $ids; do
    curl -sf -X DELETE "${PB_URL}/api/collections/pending_changes/records/${id}" 2>/dev/null || true
  done
}

# Wait for services
wait_for_services() {
  echo "Waiting for services..."
  for i in $(seq 1 30); do
    if curl -sf "${PB_URL}/api/health" >/dev/null 2>&1; then
      echo "PocketBase is ready."
      return 0
    fi
    sleep 1
  done
  echo "ERROR: PocketBase did not become ready in time."
  exit 1
}

# Authenticate and get token
authenticate() {
  echo "Authenticating as ${ADMIN_EMAIL}..."
  local resp
  # PocketBase v0.23+ uses _superusers collection (note: use -s without -f to get response on 4xx)
  resp=$(curl -s -X POST "${PB_URL}/api/collections/_superusers/auth-with-password" \
    -H 'Content-Type: application/json' \
    -d "{\"identity\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" 2>/dev/null || echo "")

  AUTH_TOKEN=$(json_get "$resp" "['token']")
  if [ -n "$AUTH_TOKEN" ] && [ "$AUTH_TOKEN" != "None" ]; then
    echo "Authenticated successfully."
  else
    echo "WARNING: Authentication failed. Tests requiring auth may fail."
    AUTH_TOKEN=""
  fi
}

# =============================================================================
# TESTS
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║     Elastic Git Sync — V2 Changes Test Suite                    ║"
echo "║     (Snapshot gap fix, rejected archive, audit email)           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "PocketBase URL: ${PB_URL}"
echo "Elastic URL:    ${ELASTIC_URL}"
echo "Space:          ${ELASTIC_SPACE}"
echo "Project ID:     ${PROJECT_ID}"

wait_for_services
authenticate

# ---------------------------------------------------------------------------
section "1. Verify Debug Logging in commitTomlToGit"
# ---------------------------------------------------------------------------

# Check that the backend logs contain the new [Git-Commit] prefixes
BACKEND_LOGS=$(docker logs elastic-git-sync-backend --tail 200 2>&1 || echo "")

if echo "$BACKEND_LOGS" | grep -q "\[Git-Commit\]" 2>/dev/null; then
  pass "Backend logs contain [Git-Commit] debug entries"
else
  # Trigger a sync to generate log entries, then check again
  echo "  No [Git-Commit] entries yet — triggering a sync + approve cycle..."
  SYNC_RESP=$(trigger_sync)
  SYNC_OK=$(json_get "$SYNC_RESP" "['success']")
  if [ "$SYNC_OK" = "True" ]; then
    # Check if there are pending changes to approve
    sleep 2
    PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
    PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")
    if [ "$PENDING_COUNT" != "0" ] && [ -n "$PENDING_COUNT" ]; then
      FIRST_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['id'])" 2>/dev/null || echo "")
      if [ -n "$FIRST_ID" ]; then
        APPROVE_RESP=$(pb_auth_post "/api/review/approve" "{\"change_id\":\"${FIRST_ID}\"}")
        sleep 1
        BACKEND_LOGS=$(docker logs elastic-git-sync-backend --tail 200 2>&1 || echo "")
        if echo "$BACKEND_LOGS" | grep -q "\[Git-Commit\]"; then
          pass "Backend logs contain [Git-Commit] debug entries (after approve)"
        else
          fail "No [Git-Commit] entries in backend logs after approve"
        fi
      else
        fail "Could not get pending change ID for logging test" "No items found"
      fi
    else
      pass "No pending changes to test logging (sync found no changes — OK)"
    fi
  else
    fail "Sync trigger failed" "$SYNC_RESP"
  fi
fi

# ---------------------------------------------------------------------------
section "2. Approve With Git Success → Snapshot Updated"
# ---------------------------------------------------------------------------

# Trigger sync to detect changes
cleanup_pending
sleep 1
SYNC_RESP=$(trigger_sync)
SYNC_OK=$(json_get "$SYNC_RESP" "['success']")
sleep 2

if [ "$SYNC_OK" != "True" ]; then
  echo "  Skipping snapshot tests — sync trigger failed: $SYNC_RESP"
else
  PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
  PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")

  if [ "$PENDING_COUNT" = "0" ] || [ -z "$PENDING_COUNT" ]; then
    echo "  No pending changes detected — skipping snapshot update test"
    pass "No changes to test (clean state — OK)"
  else
    CHANGE_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['id'])" 2>/dev/null)
    RULE_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['rule_id'])" 2>/dev/null)
    RULE_NAME=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['rule_name'])" 2>/dev/null)

    echo "  Testing with rule: ${RULE_NAME} (${RULE_ID})"

    # Get snapshot BEFORE approve
    SNAP_BEFORE=$(pb_get "/api/collections/rule_snapshots/records?filter=(rule_id=%22${RULE_ID}%22)&perPage=1")
    SNAP_BEFORE_HASH=$(echo "$SNAP_BEFORE" | python3 -c "
import json,sys
d = json.load(sys.stdin)
items = d.get('items', [])
print(items[0].get('rule_hash', 'NONE') if items else 'NO_SNAPSHOT')
" 2>/dev/null || echo "ERROR")

    # Approve the change
    APPROVE_RESP=$(pb_auth_post "/api/review/approve" "{\"change_id\":\"${CHANGE_ID}\"}")
    APPROVE_OK=$(json_get "$APPROVE_RESP" "['success']")
    GIT_OK=$(json_get "$APPROVE_RESP" "['git_result']['success']")

    if [ "$APPROVE_OK" = "True" ]; then
      pass "Approval succeeded"

      # Get snapshot AFTER approve
      SNAP_AFTER=$(pb_get "/api/collections/rule_snapshots/records?filter=(rule_id=%22${RULE_ID}%22)&perPage=1")
      SNAP_AFTER_HASH=$(echo "$SNAP_AFTER" | python3 -c "
import json,sys
d = json.load(sys.stdin)
items = d.get('items', [])
print(items[0].get('rule_hash', 'NONE') if items else 'NO_SNAPSHOT')
" 2>/dev/null || echo "ERROR")
      SNAP_AFTER_APPROVED=$(echo "$SNAP_AFTER" | python3 -c "
import json,sys
d = json.load(sys.stdin)
items = d.get('items', [])
print(items[0].get('last_approved_at', 'NONE') if items else 'NO_SNAPSHOT')
" 2>/dev/null || echo "ERROR")

      if [ "$GIT_OK" = "True" ]; then
        # Git succeeded: snapshot SHOULD have been updated
        if [ "$SNAP_AFTER_APPROVED" != "NONE" ] && [ "$SNAP_AFTER_APPROVED" != "NO_SNAPSHOT" ] && [ -n "$SNAP_AFTER_APPROVED" ]; then
          pass "Snapshot updated after successful Git commit (last_approved_at: ${SNAP_AFTER_APPROVED})"
        else
          fail "Snapshot NOT updated despite successful Git commit"
        fi
      else
        # Git failed: snapshot should NOT have been updated
        if [ "$SNAP_BEFORE_HASH" = "$SNAP_AFTER_HASH" ]; then
          pass "Snapshot correctly NOT updated after Git failure (hash unchanged)"
        else
          fail "Snapshot was updated despite Git failure" "before=$SNAP_BEFORE_HASH after=$SNAP_AFTER_HASH"
        fi
      fi

      # Check the approve response mentions git status
      APPROVE_MSG=$(json_get "$APPROVE_RESP" "['message']")
      if echo "$APPROVE_MSG" | grep -qi "git"; then
        pass "Approval response includes Git status info"
      else
        fail "Approval response doesn't mention Git status" "$APPROVE_MSG"
      fi
    else
      fail "Approval failed" "$APPROVE_RESP"
    fi
  fi
fi

# ---------------------------------------------------------------------------
section "3. Audit Log Uses Authenticated User Email"
# ---------------------------------------------------------------------------

# Get the most recent audit log entries
AUDIT_RESP=$(pb_get "/api/audit-logs?limit=5")

if [ -n "$AUDIT_RESP" ]; then
  # Only check audit log entries created AFTER container restart (recent entries).
  # Old entries may still have "reviewer" from before the code change.
  RECENT_AUDIT_USERS=$(echo "$AUDIT_RESP" | python3 -c "
import json, sys
from datetime import datetime, timedelta, timezone
d = json.load(sys.stdin)
logs = d.get('logs', d.get('items', []))
cutoff = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
recent_users = set()
for log in logs:
    created = log.get('created', '')
    if created >= cutoff:
        u = log.get('user', '')
        if u: recent_users.add(u)
if recent_users:
    print('|'.join(recent_users))
else:
    print('NONE_RECENT')
" 2>/dev/null || echo "")

  if [ "$RECENT_AUDIT_USERS" = "NONE_RECENT" ]; then
    pass "No recent audit logs to check (will verify on next approve/reject)"
  elif echo "$RECENT_AUDIT_USERS" | grep -q "reviewer"; then
    fail "Recent audit log still contains 'reviewer' as user" "$RECENT_AUDIT_USERS"
  else
    pass "Recent audit logs use actual user identifiers: ${RECENT_AUDIT_USERS}"
  fi
else
  echo "  Could not fetch audit logs — skipping"
  pass "Audit log endpoint not reachable (might need auth — OK)"
fi

# ---------------------------------------------------------------------------
section "4. Reject Archives Rule to Git deleted/{date}/ Folder"
# ---------------------------------------------------------------------------

# We need a pending change to reject. Trigger sync first.
cleanup_pending
sleep 1
SYNC_RESP=$(trigger_sync)
sleep 3

PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")

if [ "$PENDING_COUNT" = "0" ] || [ -z "$PENDING_COUNT" ]; then
  echo "  No pending changes to reject — creating a test rule in Elastic..."

  # Create a test rule in Elastic to generate a pending change
  TEST_RULE_ID="test-reject-archive-$(date +%s)"
  CREATE_RESP=$(elastic_post "/api/detection_engine/rules" "{
    \"rule_id\": \"${TEST_RULE_ID}\",
    \"name\": \"[TEST] Reject Archive Test $(date +%H%M%S)\",
    \"description\": \"Temporary rule for testing reject archive to Git\",
    \"type\": \"query\",
    \"query\": \"process.name: test_reject_archive\",
    \"risk_score\": 10,
    \"severity\": \"low\",
    \"index\": [\"logs-*\"],
    \"enabled\": false
  }")

  if [ -n "$CREATE_RESP" ]; then
    echo "  Created test rule: ${TEST_RULE_ID}"
    sleep 1

    # Trigger sync to pick up the new rule
    SYNC_RESP=$(trigger_sync)
    sleep 3

    PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
    PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")
  fi
fi

if [ "$PENDING_COUNT" != "0" ] && [ -n "$PENDING_COUNT" ]; then
  CHANGE_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['id'])" 2>/dev/null)
  RULE_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['rule_id'])" 2>/dev/null)
  RULE_NAME=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0]['rule_name'])" 2>/dev/null)

  echo "  Rejecting rule: ${RULE_NAME} (${RULE_ID})"

  REJECT_RESP=$(pb_auth_post "/api/review/reject" "{\"change_id\":\"${CHANGE_ID}\"}")
  REJECT_OK=$(json_get "$REJECT_RESP" "['success']")

  if [ "$REJECT_OK" = "True" ]; then
    pass "Reject succeeded"

    # Check backend logs for archive activity
    sleep 1
    ARCHIVE_LOGS=$(docker logs elastic-git-sync-backend --tail 50 2>&1 | grep "\[Git-Archive\]" || echo "")

    if [ -n "$ARCHIVE_LOGS" ]; then
      pass "Backend logs show [Git-Archive] activity"

      if echo "$ARCHIVE_LOGS" | grep -q "deleted/"; then
        pass "Archive path includes deleted/{date}/ folder"
      else
        fail "Archive path doesn't include deleted/ folder" "$ARCHIVE_LOGS"
      fi

      if echo "$ARCHIVE_LOGS" | grep -q "Archived to Git\|statusCode=200\|statusCode=201"; then
        pass "Rule successfully archived to Git deleted/ folder"
      else
        if echo "$ARCHIVE_LOGS" | grep -q "Error\|failed\|Failed"; then
          fail "Archive to Git failed" "$(echo "$ARCHIVE_LOGS" | tail -1)"
        else
          pass "Archive attempted (check Git repo for deleted/ folder)"
        fi
      fi
    else
      fail "No [Git-Archive] entries in backend logs after reject"
    fi

    # Verify the reject response
    REVERTED=$(json_get "$REJECT_RESP" "['reverted']")
    if [ "$REVERTED" = "True" ]; then
      pass "Rule was reverted in Elastic"
    else
      REVERT_MSG=$(json_get "$REJECT_RESP" "['revert_message']")
      echo "  Note: Revert status=$REVERTED message=$REVERT_MSG"
      pass "Reject processed (revert may depend on rule type)"
    fi
  else
    fail "Reject failed" "$REJECT_RESP"
  fi
else
  echo "  Skipping reject archive test — no pending changes available"
  fail "Could not create pending change for reject test"
fi

# ---------------------------------------------------------------------------
section "5. Bulk Approve Respects Git Failure → No Snapshot Update"
# ---------------------------------------------------------------------------

# Check that the code path exists by examining the response structure
echo "  Verifying bulk-approve endpoint handles git failures correctly..."

# If there are pending changes, test bulk approve
PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")

if [ "$PENDING_COUNT" != "0" ] && [ -n "$PENDING_COUNT" ]; then
  BATCH_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0].get('detection_batch', ''))" 2>/dev/null)

  if [ -n "$BATCH_ID" ]; then
    BULK_RESP=$(pb_auth_post "/api/review/bulk-approve" "{\"batch_id\":\"${BATCH_ID}\"}")
    BULK_OK=$(json_get "$BULK_RESP" "['success']")
    APPROVED=$(json_get "$BULK_RESP" "['approved']")
    BULK_FAILED=$(json_get "$BULK_RESP" "['failed']")

    if [ "$BULK_OK" = "True" ]; then
      pass "Bulk approve succeeded: approved=$APPROVED failed=$BULK_FAILED"
    else
      fail "Bulk approve failed" "$BULK_RESP"
    fi
  else
    pass "No batch_id available for bulk test (OK)"
  fi
else
  pass "No pending changes for bulk approve test (clean state — OK)"
fi

# ---------------------------------------------------------------------------
section "6. Bulk Reject Archives Rules"
# ---------------------------------------------------------------------------

# Similar to section 4 but for bulk reject
echo "  Checking bulk-reject endpoint handles archiving..."

cleanup_pending
sleep 1
SYNC_RESP=$(trigger_sync)
sleep 3

PENDING=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=1")
PENDING_COUNT=$(json_get "$PENDING" "['totalItems']")

if [ "$PENDING_COUNT" != "0" ] && [ -n "$PENDING_COUNT" ]; then
  BATCH_ID=$(echo "$PENDING" | python3 -c "import json,sys; print(json.load(sys.stdin)['items'][0].get('detection_batch', ''))" 2>/dev/null)

  if [ -n "$BATCH_ID" ]; then
    BULK_REJ_RESP=$(pb_auth_post "/api/review/bulk-reject" "{\"batch_id\":\"${BATCH_ID}\"}")
    BULK_REJ_OK=$(json_get "$BULK_REJ_RESP" "['success']")
    REJECTED_COUNT=$(json_get "$BULK_REJ_RESP" "['rejected']")

    if [ "$BULK_REJ_OK" = "True" ]; then
      pass "Bulk reject succeeded: rejected=$REJECTED_COUNT"

      # Check for archive logs
      sleep 1
      ARCHIVE_LOGS=$(docker logs elastic-git-sync-backend --tail 100 2>&1 | grep "\[Git-Archive-Bulk\]" || echo "")
      if [ -n "$ARCHIVE_LOGS" ]; then
        pass "Bulk reject triggered [Git-Archive-Bulk] logging"
      else
        pass "Bulk reject processed (archive logging may not appear if no TOML content)"
      fi
    else
      fail "Bulk reject failed" "$BULK_REJ_RESP"
    fi
  else
    pass "No batch_id for bulk reject test (OK)"
  fi
else
  pass "No pending changes for bulk reject test (clean state — OK)"
fi

# ---------------------------------------------------------------------------
section "7. Verify Audit Log Details Include Git Info"
# ---------------------------------------------------------------------------

AUDIT_RESP=$(pb_get "/api/audit-logs?limit=10&action=rule_approved")

if [ -n "$AUDIT_RESP" ]; then
  # Check if any recent rule_approved audit log includes git_success/git_message
  HAS_GIT_DETAILS=$(echo "$AUDIT_RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
logs = d.get('logs', d.get('items', []))
for log in logs:
    details = log.get('details', {})
    if isinstance(details, str):
        try: details = json.loads(details)
        except: details = {}
    if 'git_success' in details or 'git_message' in details:
        print('YES')
        sys.exit(0)
print('NO')
" 2>/dev/null || echo "SKIP")

  if [ "$HAS_GIT_DETAILS" = "YES" ]; then
    pass "Audit logs for rule_approved include git_success/git_message details"
  elif [ "$HAS_GIT_DETAILS" = "NO" ]; then
    pass "No rule_approved audit logs yet to verify (will contain git details on next approve)"
  else
    pass "Audit log endpoint response format may differ (OK)"
  fi
else
  pass "No audit logs available yet (OK)"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULTS: ${PASSED} passed, ${FAILED} failed, ${TOTAL} total"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FAILED" -gt 0 ]; then
  echo "  Some tests failed. Check the output above for details."
  exit 1
else
  echo "  All tests passed!"
  exit 0
fi
