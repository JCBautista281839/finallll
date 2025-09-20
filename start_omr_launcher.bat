@echo off
title OMR Launcher Service

echo ========================================
echo    OMR Launcher Service Starter
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

:: Check if package.json exists
if not exist "package-launcher.json" (
    echo ❌ package-launcher.json not found
    echo Please make sure you're in the correct directory
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install --package-lock-only --package-lock=false express
    echo.
)

:: Start the launcher service
echo 🚀 Starting OMR Launcher Service...
echo.
echo 💡 The launcher will be available at: http://localhost:3001
echo 📋 Use this service to control the OMR server from your web app
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.

node omr-launcher.js

echo.
echo 📋 OMR Launcher Service stopped
pause