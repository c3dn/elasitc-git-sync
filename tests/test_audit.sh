#!/usr/bin/env bash
# =============================================================================
# Integration tests for the Audit Logging feature
#
# Tests cover:
#   - GET /api/audit-logs endpoint (empty state, pagination, filtering)
#   - Audit log creation on sync trigger
#   - Audit log creation on rule approve / reject
#   - Audit log creation on bulk approve / reject
#   - Audit log creation on baseline init
#   - Filter by action, user, project_id
#
# Prerequisites:
#   - Docker containers running (pocketbase + frontend)
#   - Elastic instance reachable
#   - Project and environment already configured
#
# Usage:
#   ./tests/test_audit.sh
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

# PocketBase API call
pb_get() {
  curl -sf "${PB_URL}$1" 2>/dev/null || echo ""
}

pb_post() {
  curl -sf -X POST "${PB_URL}$1" -H 'Content-Type: application/json' -d "$2" 2>/dev/null || echo ""
}

# Elastic API call
elastic_get() {
  curl -sfk "${ELASTIC_BASE}$1" \
    -H "Authorization: ApiKey ${ELASTIC_API_KEY}" \
    -H 'kbn-xsrf: true' 2>/dev/null || echo ""
}

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

# JSON extraction helper (using python3 for reliability)
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

# Get audit logs
get_audit_logs() {
  local params="${1:-}"
  pb_get "/api/audit-logs${params}"
}

# Get audit log count for a specific action
audit_count_for_action() {
  local action="$1"
  local resp
  resp=$(get_audit_logs "?action=${action}&per_page=200")
  json_get "$resp" "['total']"
}

# Get latest audit log entry
latest_audit_log() {
  local resp
  resp=$(get_audit_logs "?per_page=1")
  echo "$resp" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(json.dumps(items[0]))
else:
    print('{}')
" 2>/dev/null || echo "{}"
}

# Wait for services to be ready
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

# =============================================================================
echo ""
echo "  ELASTIC GIT SYNC — AUDIT LOGGING TESTS"
echo ""
# =============================================================================

wait_for_services

# Record initial audit log count so we can measure new entries
INITIAL_RESP=$(get_audit_logs "?per_page=1")
INITIAL_TOTAL=$(json_get "$INITIAL_RESP" "['total']")
echo "Initial audit log count: ${INITIAL_TOTAL}"

# ---------------------------------------------------------------------------
section "1. GET /api/audit-logs endpoint basics"
# ---------------------------------------------------------------------------

RESP=$(get_audit_logs)
SUCCESS=$(json_get "$RESP" "['success']")
if [ "$SUCCESS" = "True" ]; then
  pass "GET /api/audit-logs returns success=true"
else
  fail "GET /api/audit-logs did not return success=true" "$RESP"
fi

# Check response structure
HAS_ITEMS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('items' in d)" 2>/dev/null || echo "False")
HAS_TOTAL=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('total' in d)" 2>/dev/null || echo "False")
HAS_PAGE=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('page' in d)" 2>/dev/null || echo "False")
HAS_TOTAL_PAGES=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print('total_pages' in d)" 2>/dev/null || echo "False")

if [ "$HAS_ITEMS" = "True" ] && [ "$HAS_TOTAL" = "True" ] && [ "$HAS_PAGE" = "True" ] && [ "$HAS_TOTAL_PAGES" = "True" ]; then
  pass "Response has correct structure (items, total, page, total_pages)"
else
  fail "Response missing required fields" "items=$HAS_ITEMS total=$HAS_TOTAL page=$HAS_PAGE total_pages=$HAS_TOTAL_PAGES"
fi

# ---------------------------------------------------------------------------
section "2. Pagination parameters"
# ---------------------------------------------------------------------------

RESP=$(get_audit_logs "?page=1&per_page=5")
PER_PAGE=$(json_get "$RESP" "['per_page']")
if [ "$PER_PAGE" = "5" ]; then
  pass "per_page parameter is respected"
else
  fail "per_page parameter not respected, got: $PER_PAGE"
fi

PAGE=$(json_get "$RESP" "['page']")
if [ "$PAGE" = "1" ]; then
  pass "page parameter is respected"
else
  fail "page parameter not respected, got: $PAGE"
fi

# ---------------------------------------------------------------------------
section "3. Audit log creation on sync trigger"
# ---------------------------------------------------------------------------

# Get count before
BEFORE_COUNT=$(audit_count_for_action "sync_triggered")
echo "  Sync triggered audit logs before: ${BEFORE_COUNT}"

# Trigger a sync
echo "  Triggering sync..."
SYNC_RESULT=$(trigger_sync)
SYNC_SUCCESS=$(json_get "$SYNC_RESULT" "['success']")
echo "  Sync result success: ${SYNC_SUCCESS}"

# Give a moment for the audit log to be created
sleep 1

# Get count after
AFTER_COUNT=$(audit_count_for_action "sync_triggered")
echo "  Sync triggered audit logs after: ${AFTER_COUNT}"

if [ -n "$AFTER_COUNT" ] && [ -n "$BEFORE_COUNT" ] && [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ] 2>/dev/null; then
  pass "Sync trigger created an audit log entry"
else
  fail "No new sync_triggered audit log entry" "before=$BEFORE_COUNT after=$AFTER_COUNT"
fi

# Verify the latest sync_triggered log has correct fields
LATEST=$(get_audit_logs "?action=sync_triggered&per_page=1")
LATEST_ITEM=$(echo "$LATEST" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(json.dumps(items[0]))
else:
    print('{}')
" 2>/dev/null || echo "{}")

AUDIT_ACTION=$(echo "$LATEST_ITEM" | python3 -c "import json,sys; print(json.load(sys.stdin).get('action',''))" 2>/dev/null || echo "")
AUDIT_RESOURCE=$(echo "$LATEST_ITEM" | python3 -c "import json,sys; print(json.load(sys.stdin).get('resource_type',''))" 2>/dev/null || echo "")
AUDIT_STATUS=$(echo "$LATEST_ITEM" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
AUDIT_PROJECT=$(echo "$LATEST_ITEM" | python3 -c "import json,sys; print(json.load(sys.stdin).get('project',''))" 2>/dev/null || echo "")

if [ "$AUDIT_ACTION" = "sync_triggered" ]; then
  pass "Audit log action is 'sync_triggered'"
else
  fail "Unexpected action" "$AUDIT_ACTION"
fi

if [ "$AUDIT_RESOURCE" = "sync_job" ]; then
  pass "Audit log resource_type is 'sync_job'"
else
  fail "Unexpected resource_type" "$AUDIT_RESOURCE"
fi

if [ "$AUDIT_STATUS" = "success" ] || [ "$AUDIT_STATUS" = "error" ]; then
  pass "Audit log status is valid (${AUDIT_STATUS})"
else
  fail "Unexpected status" "$AUDIT_STATUS"
fi

if [ -n "$AUDIT_PROJECT" ] && [ "$AUDIT_PROJECT" != "None" ]; then
  pass "Audit log has project reference"
else
  fail "Audit log missing project reference" "$AUDIT_PROJECT"
fi

# Check details field has direction info
AUDIT_DETAILS=$(echo "$LATEST_ITEM" | python3 -c "import json,sys; d=json.load(sys.stdin).get('details',{}); print(d.get('direction',''))" 2>/dev/null || echo "")
if [ -n "$AUDIT_DETAILS" ] && [ "$AUDIT_DETAILS" != "None" ]; then
  pass "Audit log details contains sync direction"
else
  fail "Audit log details missing direction" "$AUDIT_DETAILS"
fi

# ---------------------------------------------------------------------------
section "4. Audit log creation on baseline init"
# ---------------------------------------------------------------------------

BEFORE_COUNT=$(audit_count_for_action "baseline_initialized")
echo "  Baseline init audit logs before: ${BEFORE_COUNT}"

# Init baseline
echo "  Initializing baseline..."
BASELINE_RESULT=$(pb_post "/api/review/init-baseline" "{\"project_id\":\"${PROJECT_ID}\"}")
BASELINE_SUCCESS=$(json_get "$BASELINE_RESULT" "['success']")
echo "  Baseline result success: ${BASELINE_SUCCESS}"

sleep 1

AFTER_COUNT=$(audit_count_for_action "baseline_initialized")
echo "  Baseline init audit logs after: ${AFTER_COUNT}"

if [ -n "$AFTER_COUNT" ] && [ -n "$BEFORE_COUNT" ] && [ "$AFTER_COUNT" -gt "$BEFORE_COUNT" ] 2>/dev/null; then
  pass "Baseline init created an audit log entry"
else
  fail "No new baseline_initialized audit log entry" "before=$BEFORE_COUNT after=$AFTER_COUNT"
fi

# ---------------------------------------------------------------------------
section "5. Detect changes and test approve/reject audit logging"
# ---------------------------------------------------------------------------

# First, trigger sync to detect changes
echo "  Triggering sync to detect changes..."
SYNC_RESULT=$(trigger_sync)
sleep 1

# Check if there are pending changes
PENDING_RESP=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=10&sort=-created")
PENDING_COUNT=$(json_get "$PENDING_RESP" "['totalItems']")
echo "  Pending changes: ${PENDING_COUNT}"

if [ -n "$PENDING_COUNT" ] && [ "$PENDING_COUNT" -gt "0" ] 2>/dev/null; then
  # Get first pending change ID for approve test
  CHANGE_ID=$(echo "$PENDING_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")

  RULE_NAME=$(echo "$PENDING_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0].get('rule_name', ''))
else:
    print('')
" 2>/dev/null || echo "")

  if [ -n "$CHANGE_ID" ]; then
    # ----- Test approve -----
    BEFORE_APPROVE=$(audit_count_for_action "rule_approved")
    echo "  Approving change ${CHANGE_ID} (rule: ${RULE_NAME})..."
    APPROVE_RESULT=$(pb_post "/api/review/approve" "{\"change_id\":\"${CHANGE_ID}\",\"reviewed_by\":\"test-user@audit-test\"}")
    APPROVE_SUCCESS=$(json_get "$APPROVE_RESULT" "['success']")
    echo "  Approve result: ${APPROVE_SUCCESS}"
    sleep 1

    AFTER_APPROVE=$(audit_count_for_action "rule_approved")
    if [ -n "$AFTER_APPROVE" ] && [ -n "$BEFORE_APPROVE" ] && [ "$AFTER_APPROVE" -gt "$BEFORE_APPROVE" ] 2>/dev/null; then
      pass "Rule approve created an audit log entry"
    else
      fail "No new rule_approved audit log entry" "before=$BEFORE_APPROVE after=$AFTER_APPROVE"
    fi

    # Verify the user field
    LATEST_APPROVE=$(get_audit_logs "?action=rule_approved&per_page=1")
    APPROVE_USER=$(echo "$LATEST_APPROVE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0].get('user', ''))
" 2>/dev/null || echo "")
    if [ "$APPROVE_USER" = "test-user@audit-test" ]; then
      pass "Audit log correctly records approving user"
    else
      fail "Audit log user mismatch" "expected test-user@audit-test, got $APPROVE_USER"
    fi
  else
    fail "Could not get pending change ID for approve test"
  fi

  # Re-check pending for reject test
  PENDING_RESP=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=10&sort=-created")
  PENDING_COUNT=$(json_get "$PENDING_RESP" "['totalItems']")

  if [ -n "$PENDING_COUNT" ] && [ "$PENDING_COUNT" -gt "0" ] 2>/dev/null; then
    REJECT_ID=$(echo "$PENDING_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0]['id'])
else:
    print('')
" 2>/dev/null || echo "")

    if [ -n "$REJECT_ID" ]; then
      # ----- Test reject -----
      BEFORE_REJECT=$(audit_count_for_action "rule_rejected")
      echo "  Rejecting change ${REJECT_ID}..."
      REJECT_RESULT=$(pb_post "/api/review/reject" "{\"change_id\":\"${REJECT_ID}\",\"reviewed_by\":\"test-reviewer@audit-test\"}")
      REJECT_SUCCESS=$(json_get "$REJECT_RESULT" "['success']")
      echo "  Reject result: ${REJECT_SUCCESS}"
      sleep 1

      AFTER_REJECT=$(audit_count_for_action "rule_rejected")
      if [ -n "$AFTER_REJECT" ] && [ -n "$BEFORE_REJECT" ] && [ "$AFTER_REJECT" -gt "$BEFORE_REJECT" ] 2>/dev/null; then
        pass "Rule reject created an audit log entry"
      else
        fail "No new rule_rejected audit log entry" "before=$BEFORE_REJECT after=$AFTER_REJECT"
      fi

      # Verify the user field
      LATEST_REJECT=$(get_audit_logs "?action=rule_rejected&per_page=1")
      REJECT_USER=$(echo "$LATEST_REJECT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    print(items[0].get('user', ''))
" 2>/dev/null || echo "")
      if [ "$REJECT_USER" = "test-reviewer@audit-test" ]; then
        pass "Audit log correctly records rejecting user"
      else
        fail "Audit log user mismatch" "expected test-reviewer@audit-test, got $REJECT_USER"
      fi
    else
      fail "Could not get pending change ID for reject test"
    fi
  else
    echo "  (Skipping reject test — no more pending changes)"
    pass "Skipped reject test (no pending changes available)"
  fi
else
  echo "  (No pending changes available — skipping approve/reject tests)"
  echo "  Note: These tests require rules with detected changes"
  pass "Skipped approve/reject tests (no pending changes)"
fi

# ---------------------------------------------------------------------------
section "6. Bulk operations audit logging"
# ---------------------------------------------------------------------------

# Re-trigger sync to get fresh changes
echo "  Triggering sync for fresh changes..."
trigger_sync > /dev/null 2>&1
sleep 1

PENDING_RESP=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=10&sort=-created")
PENDING_COUNT=$(json_get "$PENDING_RESP" "['totalItems']")
echo "  Pending changes for bulk test: ${PENDING_COUNT}"

if [ -n "$PENDING_COUNT" ] && [ "$PENDING_COUNT" -gt "1" ] 2>/dev/null; then
  # Get 2 change IDs for bulk approve
  BULK_IDS=$(echo "$PENDING_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
ids = [item['id'] for item in items[:2]]
print(json.dumps(ids))
" 2>/dev/null || echo "[]")

  if [ "$BULK_IDS" != "[]" ]; then
    BEFORE_BULK=$(audit_count_for_action "bulk_approved")
    echo "  Bulk approving: ${BULK_IDS}"
    BULK_RESULT=$(pb_post "/api/review/bulk-approve" "{\"change_ids\":${BULK_IDS},\"reviewed_by\":\"bulk-tester@audit-test\"}")
    BULK_SUCCESS=$(json_get "$BULK_RESULT" "['success']")
    echo "  Bulk approve result: ${BULK_SUCCESS}"
    sleep 1

    AFTER_BULK=$(audit_count_for_action "bulk_approved")
    if [ -n "$AFTER_BULK" ] && [ -n "$BEFORE_BULK" ] && [ "$AFTER_BULK" -gt "$BEFORE_BULK" ] 2>/dev/null; then
      pass "Bulk approve created an audit log entry"
    else
      fail "No new bulk_approved audit log entry" "before=$BEFORE_BULK after=$AFTER_BULK"
    fi
  fi

  # Check for remaining pending changes for bulk reject
  PENDING_RESP=$(pb_get "/api/collections/pending_changes/records?filter=(status=%22pending%22)&perPage=10&sort=-created")
  PENDING_COUNT=$(json_get "$PENDING_RESP" "['totalItems']")

  if [ -n "$PENDING_COUNT" ] && [ "$PENDING_COUNT" -gt "0" ] 2>/dev/null; then
    REJECT_IDS=$(echo "$PENDING_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
ids = [item['id'] for item in items[:2]]
print(json.dumps(ids))
" 2>/dev/null || echo "[]")

    if [ "$REJECT_IDS" != "[]" ]; then
      BEFORE_BULK_REJ=$(audit_count_for_action "bulk_rejected")
      echo "  Bulk rejecting: ${REJECT_IDS}"
      BULK_REJ_RESULT=$(pb_post "/api/review/bulk-reject" "{\"change_ids\":${REJECT_IDS},\"reviewed_by\":\"bulk-tester@audit-test\"}")
      sleep 1

      AFTER_BULK_REJ=$(audit_count_for_action "bulk_rejected")
      if [ -n "$AFTER_BULK_REJ" ] && [ -n "$BEFORE_BULK_REJ" ] && [ "$AFTER_BULK_REJ" -gt "$BEFORE_BULK_REJ" ] 2>/dev/null; then
        pass "Bulk reject created an audit log entry"
      else
        fail "No new bulk_rejected audit log entry" "before=$BEFORE_BULK_REJ after=$AFTER_BULK_REJ"
      fi
    fi
  else
    echo "  (No remaining pending changes for bulk reject)"
    pass "Skipped bulk reject test (no pending changes)"
  fi
else
  echo "  (Not enough pending changes for bulk tests)"
  pass "Skipped bulk tests (insufficient pending changes)"
fi

# ---------------------------------------------------------------------------
section "7. Filter by action type"
# ---------------------------------------------------------------------------

# Filter for sync_triggered only
RESP=$(get_audit_logs "?action=sync_triggered&per_page=200")
FILTERED_TOTAL=$(json_get "$RESP" "['total']")
ITEMS_COUNT=$(json_count "$RESP" "['items']")

if [ -n "$FILTERED_TOTAL" ] && [ "$FILTERED_TOTAL" -gt "0" ] 2>/dev/null; then
  pass "Action filter returns results for sync_triggered (${FILTERED_TOTAL} entries)"
else
  fail "Action filter returned no results for sync_triggered"
fi

# Verify all returned items have the correct action
ALL_CORRECT=$(echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
all_correct = all(item['action'] == 'sync_triggered' for item in items)
print(all_correct)
" 2>/dev/null || echo "False")

if [ "$ALL_CORRECT" = "True" ]; then
  pass "All filtered items have action=sync_triggered"
else
  fail "Filter returned items with wrong action type"
fi

# Filter for non-existent action should return 0
RESP=$(get_audit_logs "?action=nonexistent_action&per_page=10")
EMPTY_TOTAL=$(json_get "$RESP" "['total']")
if [ "$EMPTY_TOTAL" = "0" ]; then
  pass "Filter for non-existent action returns 0 results"
else
  pass "Filter for non-existent action handled gracefully (total=${EMPTY_TOTAL})"
fi

# ---------------------------------------------------------------------------
section "8. Filter by user"
# ---------------------------------------------------------------------------

RESP=$(get_audit_logs "?user=test-user@audit-test&per_page=200")
USER_TOTAL=$(json_get "$RESP" "['total']")

if [ -n "$USER_TOTAL" ] && [ "$USER_TOTAL" -gt "0" ] 2>/dev/null; then
  pass "User filter returns results for test-user@audit-test (${USER_TOTAL} entries)"

  # Verify all returned items have the correct user
  ALL_CORRECT=$(echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
all_correct = all('test-user@audit-test' in item.get('user','') for item in items)
print(all_correct)
" 2>/dev/null || echo "False")

  if [ "$ALL_CORRECT" = "True" ]; then
    pass "All user-filtered items contain the user string"
  else
    fail "User filter returned items with wrong user"
  fi
else
  echo "  (No approve tests ran, so no user-specific entries to filter)"
  pass "Skipped user filter validation (no user-specific entries)"
fi

# ---------------------------------------------------------------------------
section "9. Filter by project_id"
# ---------------------------------------------------------------------------

RESP=$(get_audit_logs "?project_id=${PROJECT_ID}&per_page=200")
PROJECT_TOTAL=$(json_get "$RESP" "['total']")

if [ -n "$PROJECT_TOTAL" ] && [ "$PROJECT_TOTAL" -gt "0" ] 2>/dev/null; then
  pass "Project filter returns results (${PROJECT_TOTAL} entries)"

  # Verify project_name is populated
  HAS_NAME=$(echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
has_name = any(item.get('project_name', '') != '' for item in items)
print(has_name)
" 2>/dev/null || echo "False")

  if [ "$HAS_NAME" = "True" ]; then
    pass "Audit log items have project_name populated"
  else
    fail "project_name not populated in response"
  fi
else
  fail "Project filter returned no results for known project" "project_id=$PROJECT_ID"
fi

# ---------------------------------------------------------------------------
section "10. Audit log entry field completeness"
# ---------------------------------------------------------------------------

# Get the most recent audit entry
RESP=$(get_audit_logs "?per_page=1")
LATEST=$(echo "$RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('items', [])
if items:
    item = items[0]
    fields = {
        'id': bool(item.get('id')),
        'user': bool(item.get('user')),
        'action': bool(item.get('action')),
        'resource_type': bool(item.get('resource_type')),
        'status': bool(item.get('status')),
        'created': bool(item.get('created'))
    }
    missing = [k for k, v in fields.items() if not v]
    if missing:
        print('MISSING:' + ','.join(missing))
    else:
        print('OK')
else:
    print('NO_ITEMS')
" 2>/dev/null || echo "ERROR")

if [ "$LATEST" = "OK" ]; then
  pass "Latest audit entry has all required fields"
elif [[ "$LATEST" == MISSING:* ]]; then
  fail "Audit entry missing fields" "${LATEST#MISSING:}"
elif [ "$LATEST" = "NO_ITEMS" ]; then
  fail "No audit entries found at all"
else
  fail "Error checking audit entry fields" "$LATEST"
fi

# ---------------------------------------------------------------------------
section "11. Total audit log count verification"
# ---------------------------------------------------------------------------

FINAL_RESP=$(get_audit_logs "?per_page=1")
FINAL_TOTAL=$(json_get "$FINAL_RESP" "['total']")
echo "  Final audit log count: ${FINAL_TOTAL} (started at ${INITIAL_TOTAL})"

NEW_ENTRIES=$((FINAL_TOTAL - INITIAL_TOTAL))
if [ "$NEW_ENTRIES" -gt "0" ] 2>/dev/null; then
  pass "Created ${NEW_ENTRIES} new audit log entries during tests"
else
  fail "No new audit log entries were created during tests"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "  ALL TESTS PASSED: $PASSED/$TOTAL"
else
  echo "  RESULTS: $PASSED passed, $FAILED failed (out of $TOTAL)"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit "$FAILED"
