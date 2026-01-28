#!/bin/bash

# Script to create the first admin user for Elastic Git Sync

echo "🔐 Elastic Git Sync - Create Admin User"
echo ""

# Check if PocketBase is running
if ! docker compose ps | grep -q "elastic-git-sync-backend.*Up"; then
    echo "❌ PocketBase container is not running."
    echo "   Please start the services first: docker compose up -d"
    exit 1
fi

echo "This script will create a user account in PocketBase."
echo ""

# Get user input
read -p "Email address: " EMAIL
read -s -p "Password: " PASSWORD
echo ""
read -s -p "Confirm password: " PASSWORD_CONFIRM
echo ""
echo ""

# Validate inputs
if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "❌ Email and password are required"
    exit 1
fi

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords do not match"
    exit 1
fi

echo "Creating user account..."

# Create user using PocketBase API
RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/users/records \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"passwordConfirm\": \"$PASSWORD\",
    \"emailVisibility\": true
  }")

# Check if successful
if echo "$RESPONSE" | grep -q '"id"'; then
    echo ""
    echo "✅ User account created successfully!"
    echo ""
    echo "You can now sign in with:"
    echo "   Email: $EMAIL"
    echo "   URL: http://localhost:3000/login"
    echo ""
else
    echo ""
    echo "❌ Failed to create user account"
    echo ""
    if echo "$RESPONSE" | grep -q "users_email_key"; then
        echo "Error: A user with this email already exists"
    else
        echo "Error details:"
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    fi
    echo ""
fi
