#!/bin/bash
# Setup script for test Elasticsearch 9.x + Kibana

set -e

ELASTIC_PASSWORD="changeme123"
ELASTIC_URL="http://localhost:9200"
KIBANA_URL="http://localhost:5601"

echo "Starting Elasticsearch 9.x and Kibana..."
docker compose -f docker-compose.elastic.yml up -d

echo "Waiting for Elasticsearch to be ready..."
until curl -s -u "elastic:$ELASTIC_PASSWORD" "$ELASTIC_URL/_cluster/health" 2>/dev/null | grep -q '"status"'; do
  echo "  Waiting for Elasticsearch..."
  sleep 5
done
echo "Elasticsearch is ready!"

echo ""
echo "Setting kibana_system password..."
curl -s -X POST -u "elastic:$ELASTIC_PASSWORD" \
  "$ELASTIC_URL/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$ELASTIC_PASSWORD\"}"

echo ""
echo "Waiting for Kibana to be ready..."
until curl -s "$KIBANA_URL/api/status" 2>/dev/null | grep -q '"level":"available"'; do
  echo "  Waiting for Kibana..."
  sleep 5
done
echo "Kibana is ready!"

echo ""
echo "Creating API key for Elastic Git Sync..."
API_KEY_RESPONSE=$(curl -s -X POST -u "elastic:$ELASTIC_PASSWORD" \
  "$ELASTIC_URL/_security/api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "elastic-git-sync",
    "role_descriptors": {
      "elastic-git-sync-role": {
        "cluster": ["monitor", "manage_security"],
        "indices": [
          {
            "names": [".kibana*", ".siem-signals*", ".lists*", ".items*"],
            "privileges": ["all"]
          },
          {
            "names": [".alerts-security*", ".internal.alerts-security*"],
            "privileges": ["read", "write", "manage"]
          }
        ],
        "applications": [
          {
            "application": "kibana-.kibana",
            "privileges": ["feature_siem.all", "feature_securitySolutionCases.all", "feature_actions.all"],
            "resources": ["space:default", "space:*"]
          }
        ]
      }
    }
  }')

# Extract API key - try jq first, fallback to grep
if command -v jq &> /dev/null; then
  API_KEY=$(echo "$API_KEY_RESPONSE" | jq -r '.encoded')
else
  API_KEY=$(echo "$API_KEY_RESPONSE" | grep -o '"encoded":"[^"]*"' | sed 's/"encoded":"//;s/"//')
fi

echo ""
echo "=========================================="
echo "  Elasticsearch 9.x Setup Complete!"
echo "=========================================="
echo ""
echo "Elasticsearch: $ELASTIC_URL"
echo "Kibana:        $KIBANA_URL"
echo ""
echo "Elastic credentials:"
echo "  Username: elastic"
echo "  Password: $ELASTIC_PASSWORD"
echo ""
echo "API Key for Elastic Git Sync:"
echo "  $API_KEY"
echo ""
echo "Add this to your Elastic instance in the app:"
echo "  URL: http://host.docker.internal:5601  (for Kibana API)"
echo "  API Key: $API_KEY"
echo ""
echo "Note: Use host.docker.internal or 172.17.0.1 when connecting"
echo "      from other Docker containers instead of localhost."
echo ""
