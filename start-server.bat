@echo off
title Viktoria's Bistro Server
echo.
echo ========================================
echo    Viktoria's Bistro Server Startup
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

echo Node.js version:
node --version

echo.
echo Starting Viktoria's Bistro Server...
echo Press Ctrl+C to stop the server
echo.

REM Start the server
node server.js

echo.
echo Server stopped.
pause
