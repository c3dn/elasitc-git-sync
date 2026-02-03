#!/bin/sh

# Add custom CA certificate if provided
if [ -d /custom-ca ]; then
  for cert in /custom-ca/*.crt; do
    if [ -f "$cert" ]; then
      echo "Adding custom CA certificate: $cert"
      cp "$cert" /usr/local/share/ca-certificates/
    fi
  done
  update-ca-certificates
fi

# Start Python sync service in background
echo "Starting sync service on port ${SYNC_SERVICE_PORT:-8091}..."
cd /pb/sync_service && python3 main.py &
SYNC_PID=$!

# Wait for sync service to be ready
echo "Waiting for sync service..."
for i in $(seq 1 15); do
  if wget -q --spider http://localhost:${SYNC_SERVICE_PORT:-8091}/health 2>/dev/null; then
    echo "Sync service is ready"
    break
  fi
  if ! kill -0 $SYNC_PID 2>/dev/null; then
    echo "WARNING: Sync service failed to start, continuing without it"
    break
  fi
  sleep 1
done

exec /pb/pocketbase "$@"
