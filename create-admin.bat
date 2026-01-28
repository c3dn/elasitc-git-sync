@echo off
setlocal enabledelayedexpansion

echo.
echo 🔐 Elastic Git Sync - Create Admin User
echo.

REM Check if container is running
docker compose ps | findstr /C:"elastic-git-sync-backend" | findstr /C:"Up" >nul
if errorlevel 1 (
    echo ❌ PocketBase container is not running.
    echo    Please start the services first: docker compose up -d
    pause
    exit /b 1
)

echo This script will create a user account in PocketBase.
echo.

set /p EMAIL="Email address: "
set "PSCOMMAND=powershell -Command "$pword = read-host 'Password' -AsSecureString ; ^
    $BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pword); ^
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)""
for /f "usebackq delims=" %%p in (`%PSCOMMAND%`) do set PASSWORD=%%p

set "PSCOMMAND=powershell -Command "$pword = read-host 'Confirm password' -AsSecureString ; ^
    $BSTR=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pword); ^
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)""
for /f "usebackq delims=" %%p in (`%PSCOMMAND%`) do set PASSWORD_CONFIRM=%%p

echo.

if "%EMAIL%"=="" (
    echo ❌ Email is required
    pause
    exit /b 1
)

if "%PASSWORD%"=="" (
    echo ❌ Password is required
    pause
    exit /b 1
)

if not "%PASSWORD%"=="%PASSWORD_CONFIRM%" (
    echo ❌ Passwords do not match
    pause
    exit /b 1
)

echo Creating user account...

curl -s -X POST http://localhost:8090/api/collections/users/records ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%EMAIL%\",\"password\":\"%PASSWORD%\",\"passwordConfirm\":\"%PASSWORD%\",\"emailVisibility\":true}" > response.json

findstr /C:"\"id\"" response.json >nul
if errorlevel 1 (
    echo.
    echo ❌ Failed to create user account
    echo.
    findstr /C:"users_email_key" response.json >nul
    if not errorlevel 1 (
        echo Error: A user with this email already exists
    ) else (
        echo Error details:
        type response.json
    )
    del response.json
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ✅ User account created successfully!
    echo.
    echo You can now sign in with:
    echo    Email: %EMAIL%
    echo    URL: http://localhost:3000/login
    echo.
    del response.json
)

pause
