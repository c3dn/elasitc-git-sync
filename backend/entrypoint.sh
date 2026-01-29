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

exec pocketbase "$@"
