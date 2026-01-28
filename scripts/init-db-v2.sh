#!/bin/bash

# Initialize PocketBase database collections for v0.23+
# Uses the install token for authentication

BASE_URL="http://localhost:8090"

# Get the install token from logs
TOKEN=$(docker compose logs pocketbase 2>&1 | grep -o "pbinstal/[^\"]*" | tail -1 | sed 's/pbinstal\///')

if [ -z "$TOKEN" ]; then
  echo "Could not find install token. Make sure PocketBase is running."
  exit 1
fi

echo "Using token: ${TOKEN:0:20}..."
echo ""
echo "Initializing Elastic Git Sync database..."

# Delete existing collection if exists and recreate
delete_collection() {
  local name=$1
  curl -s -X DELETE "$BASE_URL/api/collections/$name" \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
}

# Create elastic_instances collection
echo "Creating elastic_instances collection..."
delete_collection "elastic_instances"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "elastic_instances",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "fields": [
      {"id": "f1", "name": "name", "type": "text", "required": true},
      {"id": "f2", "name": "url", "type": "url", "required": true},
      {"id": "f3", "name": "api_key", "type": "text", "required": true},
      {"id": "f4", "name": "spaces", "type": "json", "required": false},
      {"id": "f5", "name": "is_active", "type": "bool", "required": true},
      {"id": "f6", "name": "last_connection_test", "type": "date", "required": false},
      {"id": "f7", "name": "connection_status", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["unknown", "success", "failed"]}}
    ]
  }' && echo " Done"

# Create git_repositories collection
echo "Creating git_repositories collection..."
delete_collection "git_repositories"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "git_repositories",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "fields": [
      {"id": "g1", "name": "name", "type": "text", "required": true},
      {"id": "g2", "name": "url", "type": "url", "required": true},
      {"id": "g3", "name": "provider", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["gitlab", "github", "generic"]}},
      {"id": "g4", "name": "access_token", "type": "text", "required": true},
      {"id": "g5", "name": "default_branch", "type": "text", "required": true},
      {"id": "g6", "name": "base_path", "type": "text", "required": false},
      {"id": "g7", "name": "is_active", "type": "bool", "required": true},
      {"id": "g8", "name": "last_connection_test", "type": "date", "required": false},
      {"id": "g9", "name": "connection_status", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["unknown", "success", "failed"]}}
    ]
  }' && echo " Done"

# Get the collection IDs for relations
ELASTIC_ID=$(curl -s "$BASE_URL/api/collections/elastic_instances" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
GIT_ID=$(curl -s "$BASE_URL/api/collections/git_repositories" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Elastic ID: $ELASTIC_ID, Git ID: $GIT_ID"

# Create projects collection
echo "Creating projects collection..."
delete_collection "projects"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"projects\",
    \"type\": \"base\",
    \"listRule\": \"\",
    \"viewRule\": \"\",
    \"createRule\": \"\",
    \"updateRule\": \"\",
    \"deleteRule\": \"\",
    \"fields\": [
      {\"id\": \"p1\", \"name\": \"name\", \"type\": \"text\", \"required\": true},
      {\"id\": \"p2\", \"name\": \"description\", \"type\": \"text\", \"required\": false},
      {\"id\": \"p3\", \"name\": \"elastic_instance\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$ELASTIC_ID\", \"cascadeDelete\": false, \"maxSelect\": 1}},
      {\"id\": \"p4\", \"name\": \"elastic_space\", \"type\": \"text\", \"required\": true},
      {\"id\": \"p5\", \"name\": \"git_repository\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$GIT_ID\", \"cascadeDelete\": false, \"maxSelect\": 1}},
      {\"id\": \"p6\", \"name\": \"git_path\", \"type\": \"text\", \"required\": false},
      {\"id\": \"p7\", \"name\": \"is_active\", \"type\": \"bool\", \"required\": true},
      {\"id\": \"p8\", \"name\": \"sync_enabled\", \"type\": \"bool\", \"required\": true},
      {\"id\": \"p9\", \"name\": \"auto_sync_interval\", \"type\": \"number\", \"required\": false}
    ]
  }" && echo " Done"

# Get projects ID
PROJECTS_ID=$(curl -s "$BASE_URL/api/collections/projects" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Projects ID: $PROJECTS_ID"

# Create environments collection
echo "Creating environments collection..."
delete_collection "environments"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"environments\",
    \"type\": \"base\",
    \"listRule\": \"\",
    \"viewRule\": \"\",
    \"createRule\": \"\",
    \"updateRule\": \"\",
    \"deleteRule\": \"\",
    \"fields\": [
      {\"id\": \"e1\", \"name\": \"project\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$PROJECTS_ID\", \"cascadeDelete\": true, \"maxSelect\": 1}},
      {\"id\": \"e2\", \"name\": \"name\", \"type\": \"select\", \"required\": true, \"options\": {\"maxSelect\": 1, \"values\": [\"test\", \"staging\", \"production\"]}},
      {\"id\": \"e3\", \"name\": \"elastic_space\", \"type\": \"text\", \"required\": true},
      {\"id\": \"e4\", \"name\": \"git_branch\", \"type\": \"text\", \"required\": true},
      {\"id\": \"e5\", \"name\": \"requires_approval\", \"type\": \"bool\", \"required\": true},
      {\"id\": \"e6\", \"name\": \"auto_deploy\", \"type\": \"bool\", \"required\": true}
    ]
  }" && echo " Done"

# Get environments ID
ENV_ID=$(curl -s "$BASE_URL/api/collections/environments" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create sync_jobs collection
echo "Creating sync_jobs collection..."
delete_collection "sync_jobs"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"sync_jobs\",
    \"type\": \"base\",
    \"listRule\": \"\",
    \"viewRule\": \"\",
    \"createRule\": \"\",
    \"updateRule\": \"\",
    \"deleteRule\": \"\",
    \"fields\": [
      {\"id\": \"s1\", \"name\": \"project\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$PROJECTS_ID\", \"cascadeDelete\": true, \"maxSelect\": 1}},
      {\"id\": \"s2\", \"name\": \"environment\", \"type\": \"relation\", \"required\": false, \"options\": {\"collectionId\": \"$ENV_ID\", \"cascadeDelete\": true, \"maxSelect\": 1}},
      {\"id\": \"s3\", \"name\": \"type\", \"type\": \"select\", \"required\": true, \"options\": {\"maxSelect\": 1, \"values\": [\"manual\", \"scheduled\", \"webhook\"]}},
      {\"id\": \"s4\", \"name\": \"direction\", \"type\": \"select\", \"required\": true, \"options\": {\"maxSelect\": 1, \"values\": [\"elastic_to_git\", \"git_to_elastic\", \"bidirectional\"]}},
      {\"id\": \"s5\", \"name\": \"status\", \"type\": \"select\", \"required\": true, \"options\": {\"maxSelect\": 1, \"values\": [\"pending\", \"running\", \"completed\", \"failed\", \"conflict\"]}},
      {\"id\": \"s6\", \"name\": \"started_at\", \"type\": \"date\", \"required\": false},
      {\"id\": \"s7\", \"name\": \"completed_at\", \"type\": \"date\", \"required\": false},
      {\"id\": \"s8\", \"name\": \"triggered_by\", \"type\": \"text\", \"required\": false},
      {\"id\": \"s9\", \"name\": \"changes_summary\", \"type\": \"json\", \"required\": false},
      {\"id\": \"s10\", \"name\": \"error_message\", \"type\": \"text\", \"required\": false},
      {\"id\": \"s11\", \"name\": \"git_commit_sha\", \"type\": \"text\", \"required\": false},
      {\"id\": \"s12\", \"name\": \"merge_request_url\", \"type\": \"url\", \"required\": false}
    ]
  }" && echo " Done"

# Get sync_jobs ID
SYNC_ID=$(curl -s "$BASE_URL/api/collections/sync_jobs" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create rules_cache collection
echo "Creating rules_cache collection..."
delete_collection "rules_cache"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"rules_cache\",
    \"type\": \"base\",
    \"listRule\": \"\",
    \"viewRule\": \"\",
    \"createRule\": \"\",
    \"updateRule\": \"\",
    \"deleteRule\": \"\",
    \"fields\": [
      {\"id\": \"r1\", \"name\": \"project\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$PROJECTS_ID\", \"cascadeDelete\": true, \"maxSelect\": 1}},
      {\"id\": \"r2\", \"name\": \"rule_id\", \"type\": \"text\", \"required\": true},
      {\"id\": \"r3\", \"name\": \"rule_name\", \"type\": \"text\", \"required\": true},
      {\"id\": \"r4\", \"name\": \"rule_type\", \"type\": \"text\", \"required\": false},
      {\"id\": \"r5\", \"name\": \"enabled\", \"type\": \"bool\", \"required\": true},
      {\"id\": \"r6\", \"name\": \"elastic_hash\", \"type\": \"text\", \"required\": false},
      {\"id\": \"r7\", \"name\": \"git_hash\", \"type\": \"text\", \"required\": false},
      {\"id\": \"r8\", \"name\": \"last_sync\", \"type\": \"date\", \"required\": false},
      {\"id\": \"r9\", \"name\": \"sync_status\", \"type\": \"select\", \"required\": false, \"options\": {\"maxSelect\": 1, \"values\": [\"synced\", \"modified_elastic\", \"modified_git\", \"conflict\", \"new_elastic\", \"new_git\"]}},
      {\"id\": \"r10\", \"name\": \"file_path\", \"type\": \"text\", \"required\": false}
    ]
  }" && echo " Done"

# Create conflicts collection
echo "Creating conflicts collection..."
delete_collection "conflicts"
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"conflicts\",
    \"type\": \"base\",
    \"listRule\": \"\",
    \"viewRule\": \"\",
    \"createRule\": \"\",
    \"updateRule\": \"\",
    \"deleteRule\": \"\",
    \"fields\": [
      {\"id\": \"c1\", \"name\": \"sync_job\", \"type\": \"relation\", \"required\": true, \"options\": {\"collectionId\": \"$SYNC_ID\", \"cascadeDelete\": true, \"maxSelect\": 1}},
      {\"id\": \"c2\", \"name\": \"rule_id\", \"type\": \"text\", \"required\": true},
      {\"id\": \"c3\", \"name\": \"rule_name\", \"type\": \"text\", \"required\": true},
      {\"id\": \"c4\", \"name\": \"elastic_version\", \"type\": \"json\", \"required\": true},
      {\"id\": \"c5\", \"name\": \"git_version\", \"type\": \"json\", \"required\": true},
      {\"id\": \"c6\", \"name\": \"resolution\", \"type\": \"select\", \"required\": false, \"options\": {\"maxSelect\": 1, \"values\": [\"pending\", \"use_elastic\", \"use_git\", \"manual_merge\"]}},
      {\"id\": \"c7\", \"name\": \"resolved_at\", \"type\": \"date\", \"required\": false},
      {\"id\": \"c8\", \"name\": \"resolved_by\", \"type\": \"text\", \"required\": false}
    ]
  }" && echo " Done"

echo ""
echo "Database initialization complete!"
echo ""
echo "Test credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123456"
echo ""
echo "Access the app at: http://localhost:3000"
