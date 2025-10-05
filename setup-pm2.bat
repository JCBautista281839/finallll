@echo off
title PM2 Setup for Viktoria's Bistro Server
echo.
echo ========================================
echo    PM2 Setup for Viktoria's Bistro
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
    echo PM2 installed successfully!
) else (
    echo PM2 is already installed.
)

echo.
echo Creating logs directory...
if not exist "logs" mkdir logs

echo.
echo Starting server with PM2...
pm2 start ecosystem.config.json

echo.
echo Server started with PM2!
echo.
echo Useful PM2 commands:
echo   pm2 status          - Check server status
echo   pm2 logs            - View server logs
echo   pm2 restart all     - Restart server
echo   pm2 stop all        - Stop server
echo   pm2 delete all      - Remove server from PM2
echo   pm2 startup         - Setup auto-start on boot
echo   pm2 save            - Save current PM2 processes
echo.
echo Press any key to continue...
pause >nul
