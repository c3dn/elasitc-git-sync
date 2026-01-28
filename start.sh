#!/bin/bash

# Elastic Git Sync - Startup Script

set -e

echo "🚀 Elastic Git Sync - Starting up..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
    echo ""
    echo "Important: Set a secure ENCRYPTION_KEY in .env before continuing!"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Elastic Git Sync is running!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   PocketBase: http://localhost:8090/_/"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Go to Settings → Elastic Instances to add your Elastic cluster"
    echo "   3. Go to Settings → Git Repositories to add your Git repo"
    echo "   4. Create a Project to link them together"
    echo "   5. Start syncing! 🎉"
    echo ""
    echo "📖 View logs: docker compose logs -f"
    echo "🛑 Stop services: docker compose down"
else
    echo ""
    echo "❌ Failed to start services. Check logs with: docker compose logs"
    exit 1
fi
