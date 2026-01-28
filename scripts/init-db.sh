#!/bin/bash

# Initialize PocketBase database collections
# Run this script after PocketBase is started

BASE_URL="http://localhost:8090"

echo "Initializing Elastic Git Sync database..."

# Create elastic_instances collection
echo "Creating elastic_instances collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "elastic_instances",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "name", "type": "text", "required": true},
      {"name": "url", "type": "url", "required": true},
      {"name": "api_key", "type": "text", "required": true},
      {"name": "spaces", "type": "json", "required": false},
      {"name": "is_active", "type": "bool", "required": true},
      {"name": "last_connection_test", "type": "date", "required": false},
      {"name": "connection_status", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["unknown", "success", "failed"]}}
    ]
  }' | head -1

# Create git_repositories collection
echo "Creating git_repositories collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "git_repositories",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "name", "type": "text", "required": true},
      {"name": "url", "type": "url", "required": true},
      {"name": "provider", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["gitlab", "github", "generic"]}},
      {"name": "access_token", "type": "text", "required": true},
      {"name": "default_branch", "type": "text", "required": true},
      {"name": "base_path", "type": "text", "required": false},
      {"name": "is_active", "type": "bool", "required": true},
      {"name": "last_connection_test", "type": "date", "required": false},
      {"name": "connection_status", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["unknown", "success", "failed"]}}
    ]
  }' | head -1

# Create projects collection
echo "Creating projects collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "projects",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "name", "type": "text", "required": true},
      {"name": "description", "type": "text", "required": false},
      {"name": "elastic_instance", "type": "relation", "required": true, "options": {"collectionId": "elastic_instances", "cascadeDelete": false, "maxSelect": 1}},
      {"name": "elastic_space", "type": "text", "required": true},
      {"name": "git_repository", "type": "relation", "required": true, "options": {"collectionId": "git_repositories", "cascadeDelete": false, "maxSelect": 1}},
      {"name": "git_path", "type": "text", "required": false},
      {"name": "is_active", "type": "bool", "required": true},
      {"name": "sync_enabled", "type": "bool", "required": true},
      {"name": "auto_sync_interval", "type": "number", "required": false}
    ]
  }' | head -1

# Create environments collection
echo "Creating environments collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "environments",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "project", "type": "relation", "required": true, "options": {"collectionId": "projects", "cascadeDelete": true, "maxSelect": 1}},
      {"name": "name", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["test", "staging", "production"]}},
      {"name": "elastic_space", "type": "text", "required": true},
      {"name": "git_branch", "type": "text", "required": true},
      {"name": "requires_approval", "type": "bool", "required": true},
      {"name": "auto_deploy", "type": "bool", "required": true}
    ]
  }' | head -1

# Create sync_jobs collection
echo "Creating sync_jobs collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sync_jobs",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "project", "type": "relation", "required": true, "options": {"collectionId": "projects", "cascadeDelete": true, "maxSelect": 1}},
      {"name": "environment", "type": "relation", "required": false, "options": {"collectionId": "environments", "cascadeDelete": true, "maxSelect": 1}},
      {"name": "type", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["manual", "scheduled", "webhook"]}},
      {"name": "direction", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["elastic_to_git", "git_to_elastic", "bidirectional"]}},
      {"name": "status", "type": "select", "required": true, "options": {"maxSelect": 1, "values": ["pending", "running", "completed", "failed", "conflict"]}},
      {"name": "started_at", "type": "date", "required": false},
      {"name": "completed_at", "type": "date", "required": false},
      {"name": "triggered_by", "type": "text", "required": false},
      {"name": "changes_summary", "type": "json", "required": false},
      {"name": "error_message", "type": "text", "required": false},
      {"name": "git_commit_sha", "type": "text", "required": false},
      {"name": "merge_request_url", "type": "url", "required": false}
    ]
  }' | head -1

# Create rules_cache collection
echo "Creating rules_cache collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rules_cache",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "project", "type": "relation", "required": true, "options": {"collectionId": "projects", "cascadeDelete": true, "maxSelect": 1}},
      {"name": "rule_id", "type": "text", "required": true},
      {"name": "rule_name", "type": "text", "required": true},
      {"name": "rule_type", "type": "text", "required": false},
      {"name": "enabled", "type": "bool", "required": true},
      {"name": "elastic_hash", "type": "text", "required": false},
      {"name": "git_hash", "type": "text", "required": false},
      {"name": "last_sync", "type": "date", "required": false},
      {"name": "sync_status", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["synced", "modified_elastic", "modified_git", "conflict", "new_elastic", "new_git"]}},
      {"name": "file_path", "type": "text", "required": false}
    ]
  }' | head -1

# Create conflicts collection
echo "Creating conflicts collection..."
curl -s -X POST "$BASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "conflicts",
    "type": "base",
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "schema": [
      {"name": "sync_job", "type": "relation", "required": true, "options": {"collectionId": "sync_jobs", "cascadeDelete": true, "maxSelect": 1}},
      {"name": "rule_id", "type": "text", "required": true},
      {"name": "rule_name", "type": "text", "required": true},
      {"name": "elastic_version", "type": "json", "required": true},
      {"name": "git_version", "type": "json", "required": true},
      {"name": "resolution", "type": "select", "required": false, "options": {"maxSelect": 1, "values": ["pending", "use_elastic", "use_git", "manual_merge"]}},
      {"name": "resolved_at", "type": "date", "required": false},
      {"name": "resolved_by", "type": "text", "required": false}
    ]
  }' | head -1

# Create test user
echo "Creating test user..."
curl -s -X POST "$BASE_URL/api/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456",
    "passwordConfirm": "admin123456",
    "emailVisibility": true
  }' | head -1

echo ""
echo "Database initialization complete!"
echo ""
echo "Test credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123456"
