@echo off
title Windows Service Setup for Viktoria's Bistro Server
echo.
echo ========================================
echo    Windows Service Setup
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Checking PM2 installation...
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 not found. Installing PM2 globally...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install PM2
        pause
        exit /b 1
    )
)

echo.
echo Setting up Windows Service...
echo This will create a Windows service that starts automatically on boot.
echo.

REM Start the server with PM2
pm2 start ecosystem.config.json

REM Save PM2 configuration
pm2 save

REM Setup PM2 to start on Windows boot
pm2 startup

echo.
echo ========================================
echo    Service Setup Complete!
echo ========================================
echo.
echo Your Viktoria's Bistro Server is now configured as a Windows service.
echo The server will automatically start when Windows boots up.
echo.
echo Service Management:
echo   pm2 status          - Check server status
echo   pm2 logs            - View server logs
echo   pm2 restart all     - Restart server
echo   pm2 stop all        - Stop server
echo.
echo To remove the service:
echo   pm2 unstartup       - Remove auto-start
echo   pm2 delete all      - Remove server from PM2
echo.
pause
