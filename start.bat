@echo off
setlocal

echo.
echo 🚀 Elastic Git Sync - Starting up...
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  No .env file found. Creating from .env.example...
    copy .env.example .env
    echo ✅ Created .env file. Please edit it with your configuration.
    echo.
    echo Important: Set a secure ENCRYPTION_KEY in .env before continuing!
    echo.
    pause
)

echo 🐳 Starting Docker containers...
docker-compose up -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak > nul

echo.
echo ✅ Elastic Git Sync is running!
echo.
echo 🌐 Access the application:
echo    Frontend:   http://localhost:3000
echo    PocketBase: http://localhost:8090/_/
echo.
echo 📝 Next steps:
echo    1. Open http://localhost:3000 in your browser
echo    2. Go to Settings → Elastic Instances to add your Elastic cluster
echo    3. Go to Settings → Git Repositories to add your Git repo
echo    4. Create a Project to link them together
echo    5. Start syncing! 🎉
echo.
echo 📖 View logs: docker-compose logs -f
echo 🛑 Stop services: docker-compose down
echo.

pause
