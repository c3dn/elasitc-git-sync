#!/bin/bash

# Initialize PocketBase database collections for v0.23+
# Uses the correct field format

BASE_URL="http://localhost:8090"

# Get the install token from logs
TOKEN=$(docker compose logs pocketbase 2>&1 | grep -o "pbinstal/[^\"]*" | tail -1 | sed 's/pbinstal\///')

if [ -z "$TOKEN" ]; then
  echo "Could not find install token. Make sure PocketBase is running."
  exit 1
fi

echo "Initializing Elastic Git Sync database..."

# Create elastic_instances collection
echo "Creating elastic_instances collection..."
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
      {"hidden":false,"id":"text1001","max":255,"min":1,"name":"name","pattern":"","presentable":true,"primaryKey":false,"required":true,"system":false,"type":"text"},
      {"hidden":false,"id":"url1002","exceptDomains":null,"name":"url","onlyDomains":null,"presentable":false,"required":true,"system":false,"type":"url"},
      {"hidden":false,"id":"text1003","max":0,"min":1,"name":"api_key","pattern":"","presentable":false,"primaryKey":false,"required":true,"system":false,"type":"text"},
      {"hidden":false,"id":"json1004","maxSize":0,"name":"spaces","presentable":false,"required":false,"system":false,"type":"json"},
      {"hidden":false,"id":"bool1005","name":"is_active","presentable":false,"required":false,"system":false,"type":"bool"},
      {"hidden":false,"id":"date1006","max":"","min":"","name":"last_connection_test","presentable":false,"required":false,"system":false,"type":"date"},
      {"hidden":false,"id":"select1007","maxSelect":1,"name":"connection_status","presentable":false,"required":false,"system":false,"type":"select","values":["unknown","success","failed"]},
      {"hidden":false,"id":"autodate1910","name":"created","onCreate":true,"onUpdate":false,"presentable":false,"system":false,"type":"autodate"},
      {"hidden":false,"id":"autodate1911","name":"updated","onCreate":true,"onUpdate":true,"presentable":false,"system":false,"type":"autodate"}
    ]
  }' > /dev/null && echo "  Done" || echo "  Failed"

# Create git_repositories collection
echo "Creating git_repositories collection..."
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
      {"hidden":false,"id":"text2001","max":255,"min":1,"name":"name","pattern":"","presentable":true,"primaryKey":false,"required":true,"system":false,"type":"text"},
      {"hidden":false,"id":"url2002","exceptDomains":null,"name":"url","onlyDomains":null,"presentable":false,"required":true,"system":false,"type":"url"},
      {"hidden":false,"id":"select2003","maxSelect":1,"name":"provider","presentable":false,"required":true,"system":false,"type":"select","values":["gitlab","github","generic"]},
      {"hidden":false,"id":"text2004","max":0,"min":1,"name":"access_token","pattern":"","presentable":false,"primaryKey":false,"required":true,"system":false,"type":"text"},
      {"hidden":false,"id":"text2005","max":255,"min":1,"name":"default_branch","pattern":"","presentable":false,"primaryKey":false,"required":true,"system":false,"type":"text"},
      {"hidden":false,"id":"text2006","max":500,"min":0,"name":"base_path","pattern":"","presentable":false,"primaryKey":false,"required":false,"system":false,"type":"text"},
      {"hidden":false,"id":"bool2007","name":"is_active","presentable":false,"required":false,"system":false,"type":"bool"},
      {"hidden":false,"id":"date2008","max":"","min":"","name":"last_connection_test","presentable":false,"required":false,"system":false,"type":"date"},
      {"hidden":false,"id":"select2009","maxSelect":1,"name":"connection_status","presentable":false,"required":false,"system":false,"type":"select","values":["unknown","success","failed"]},
      {"hidden":false,"id":"autodate2910","name":"created","onCreate":true,"onUpdate":false,"presentable":false,"system":false,"type":"autodate"},
      {"hidden":false,"id":"autodate2911","name":"updated","onCreate":true,"onUpdate":true,"presentable":false,"system":false,"type":"autodate"}
    ]
  }' > /dev/null && echo "  Done" || echo "  Failed"

# Get collection IDs
sleep 1
ELASTIC_ID=$(curl -s "$BASE_URL/api/collections/elastic_instances" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
GIT_ID=$(curl -s "$BASE_URL/api/collections/git_repositories" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "  Elastic ID: $ELASTIC_ID, Git ID: $GIT_ID"

# Create projects collection
echo "Creating projects collection..."
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
      {\"hidden\":false,\"id\":\"text3001\",\"max\":255,\"min\":1,\"name\":\"name\",\"pattern\":\"\",\"presentable\":true,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text3002\",\"max\":1000,\"min\":0,\"name\":\"description\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"relation3003\",\"cascadeDelete\":false,\"collectionId\":\"$ELASTIC_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"elastic_instance\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"text3004\",\"max\":255,\"min\":1,\"name\":\"elastic_space\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"relation3005\",\"cascadeDelete\":false,\"collectionId\":\"$GIT_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"git_repository\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"text3006\",\"max\":500,\"min\":0,\"name\":\"git_path\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"bool3007\",\"name\":\"is_active\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"bool\"},
      {\"hidden\":false,\"id\":\"bool3008\",\"name\":\"sync_enabled\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"bool\"},
      {\"hidden\":false,\"id\":\"number3009\",\"max\":null,\"min\":0,\"name\":\"auto_sync_interval\",\"noDecimal\":false,\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"number\"},
      {\"hidden\":false,\"id\":\"autodate3910\",\"name\":\"created\",\"onCreate\":true,\"onUpdate\":false,\"presentable\":false,\"system\":false,\"type\":\"autodate\"},
      {\"hidden\":false,\"id\":\"autodate3911\",\"name\":\"updated\",\"onCreate\":true,\"onUpdate\":true,\"presentable\":false,\"system\":false,\"type\":\"autodate\"}
    ]
  }" > /dev/null && echo "  Done" || echo "  Failed"

# Get projects ID
sleep 1
PROJECTS_ID=$(curl -s "$BASE_URL/api/collections/projects" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')
echo "  Projects ID: $PROJECTS_ID"

# Create environments collection
echo "Creating environments collection..."
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
      {\"hidden\":false,\"id\":\"relation4001\",\"cascadeDelete\":true,\"collectionId\":\"$PROJECTS_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"project\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"select4002\",\"maxSelect\":1,\"name\":\"name\",\"presentable\":true,\"required\":true,\"system\":false,\"type\":\"select\",\"values\":[\"test\",\"staging\",\"production\"]},
      {\"hidden\":false,\"id\":\"text4003\",\"max\":255,\"min\":1,\"name\":\"elastic_space\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text4004\",\"max\":255,\"min\":1,\"name\":\"git_branch\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"bool4005\",\"name\":\"requires_approval\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"bool\"},
      {\"hidden\":false,\"id\":\"bool4006\",\"name\":\"auto_deploy\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"bool\"},
      {\"hidden\":false,\"id\":\"autodate4910\",\"name\":\"created\",\"onCreate\":true,\"onUpdate\":false,\"presentable\":false,\"system\":false,\"type\":\"autodate\"},
      {\"hidden\":false,\"id\":\"autodate4911\",\"name\":\"updated\",\"onCreate\":true,\"onUpdate\":true,\"presentable\":false,\"system\":false,\"type\":\"autodate\"}
    ]
  }" > /dev/null && echo "  Done" || echo "  Failed"

# Get environments ID
sleep 1
ENV_ID=$(curl -s "$BASE_URL/api/collections/environments" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

# Create sync_jobs collection
echo "Creating sync_jobs collection..."
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
      {\"hidden\":false,\"id\":\"relation5001\",\"cascadeDelete\":true,\"collectionId\":\"$PROJECTS_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"project\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"relation5002\",\"cascadeDelete\":true,\"collectionId\":\"$ENV_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"environment\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"select5003\",\"maxSelect\":1,\"name\":\"type\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"select\",\"values\":[\"manual\",\"scheduled\",\"webhook\"]},
      {\"hidden\":false,\"id\":\"select5004\",\"maxSelect\":1,\"name\":\"direction\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"select\",\"values\":[\"elastic_to_git\",\"git_to_elastic\",\"bidirectional\"]},
      {\"hidden\":false,\"id\":\"select5005\",\"maxSelect\":1,\"name\":\"status\",\"presentable\":true,\"required\":true,\"system\":false,\"type\":\"select\",\"values\":[\"pending\",\"running\",\"completed\",\"failed\",\"conflict\"]},
      {\"hidden\":false,\"id\":\"date5006\",\"max\":\"\",\"min\":\"\",\"name\":\"started_at\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"date\"},
      {\"hidden\":false,\"id\":\"date5007\",\"max\":\"\",\"min\":\"\",\"name\":\"completed_at\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"date\"},
      {\"hidden\":false,\"id\":\"text5008\",\"max\":255,\"min\":0,\"name\":\"triggered_by\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"json5009\",\"maxSize\":0,\"name\":\"changes_summary\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"json\"},
      {\"hidden\":false,\"id\":\"text5010\",\"max\":5000,\"min\":0,\"name\":\"error_message\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text5011\",\"max\":255,\"min\":0,\"name\":\"git_commit_sha\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"url5012\",\"exceptDomains\":null,\"name\":\"merge_request_url\",\"onlyDomains\":null,\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"url\"},
      {\"hidden\":false,\"id\":\"autodate5910\",\"name\":\"created\",\"onCreate\":true,\"onUpdate\":false,\"presentable\":false,\"system\":false,\"type\":\"autodate\"},
      {\"hidden\":false,\"id\":\"autodate5911\",\"name\":\"updated\",\"onCreate\":true,\"onUpdate\":true,\"presentable\":false,\"system\":false,\"type\":\"autodate\"}
    ]
  }" > /dev/null && echo "  Done" || echo "  Failed"

# Get sync_jobs ID
sleep 1
SYNC_ID=$(curl -s "$BASE_URL/api/collections/sync_jobs" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

# Create rules_cache collection
echo "Creating rules_cache collection..."
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
      {\"hidden\":false,\"id\":\"relation6001\",\"cascadeDelete\":true,\"collectionId\":\"$PROJECTS_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"project\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"text6002\",\"max\":255,\"min\":1,\"name\":\"rule_id\",\"pattern\":\"\",\"presentable\":true,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text6003\",\"max\":500,\"min\":1,\"name\":\"rule_name\",\"pattern\":\"\",\"presentable\":true,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text6004\",\"max\":100,\"min\":0,\"name\":\"rule_type\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"bool6005\",\"name\":\"enabled\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"bool\"},
      {\"hidden\":false,\"id\":\"text6006\",\"max\":64,\"min\":0,\"name\":\"elastic_hash\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text6007\",\"max\":64,\"min\":0,\"name\":\"git_hash\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"date6008\",\"max\":\"\",\"min\":\"\",\"name\":\"last_sync\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"date\"},
      {\"hidden\":false,\"id\":\"select6009\",\"maxSelect\":1,\"name\":\"sync_status\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"select\",\"values\":[\"synced\",\"modified_elastic\",\"modified_git\",\"conflict\",\"new_elastic\",\"new_git\"]},
      {\"hidden\":false,\"id\":\"text6010\",\"max\":1000,\"min\":0,\"name\":\"file_path\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"autodate6910\",\"name\":\"created\",\"onCreate\":true,\"onUpdate\":false,\"presentable\":false,\"system\":false,\"type\":\"autodate\"},
      {\"hidden\":false,\"id\":\"autodate6911\",\"name\":\"updated\",\"onCreate\":true,\"onUpdate\":true,\"presentable\":false,\"system\":false,\"type\":\"autodate\"}
    ]
  }" > /dev/null && echo "  Done" || echo "  Failed"

# Create conflicts collection
echo "Creating conflicts collection..."
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
      {\"hidden\":false,\"id\":\"relation7001\",\"cascadeDelete\":true,\"collectionId\":\"$SYNC_ID\",\"maxSelect\":1,\"minSelect\":0,\"name\":\"sync_job\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"relation\"},
      {\"hidden\":false,\"id\":\"text7002\",\"max\":255,\"min\":1,\"name\":\"rule_id\",\"pattern\":\"\",\"presentable\":true,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"text7003\",\"max\":500,\"min\":1,\"name\":\"rule_name\",\"pattern\":\"\",\"presentable\":true,\"primaryKey\":false,\"required\":true,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"json7004\",\"maxSize\":0,\"name\":\"elastic_version\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"json\"},
      {\"hidden\":false,\"id\":\"json7005\",\"maxSize\":0,\"name\":\"git_version\",\"presentable\":false,\"required\":true,\"system\":false,\"type\":\"json\"},
      {\"hidden\":false,\"id\":\"select7006\",\"maxSelect\":1,\"name\":\"resolution\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"select\",\"values\":[\"pending\",\"use_elastic\",\"use_git\",\"manual_merge\"]},
      {\"hidden\":false,\"id\":\"date7007\",\"max\":\"\",\"min\":\"\",\"name\":\"resolved_at\",\"presentable\":false,\"required\":false,\"system\":false,\"type\":\"date\"},
      {\"hidden\":false,\"id\":\"text7008\",\"max\":255,\"min\":0,\"name\":\"resolved_by\",\"pattern\":\"\",\"presentable\":false,\"primaryKey\":false,\"required\":false,\"system\":false,\"type\":\"text\"},
      {\"hidden\":false,\"id\":\"autodate7910\",\"name\":\"created\",\"onCreate\":true,\"onUpdate\":false,\"presentable\":false,\"system\":false,\"type\":\"autodate\"},
      {\"hidden\":false,\"id\":\"autodate7911\",\"name\":\"updated\",\"onCreate\":true,\"onUpdate\":true,\"presentable\":false,\"system\":false,\"type\":\"autodate\"}
    ]
  }" > /dev/null && echo "  Done" || echo "  Failed"

# Create app user
echo "Creating app user..."
curl -s -X POST "$BASE_URL/api/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456",
    "passwordConfirm": "admin123456",
    "emailVisibility": true
  }' > /dev/null 2>&1 && echo "  Done" || echo "  User already exists"

echo ""
echo "Database initialization complete!"
echo ""
echo "Test credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123456"
echo ""
echo "Access the app at: http://localhost:3000"
