@echo off
echo ⚫ OMR Circle Scanner Server Launcher
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "omr_web_circle_scanner.py" (
    echo ❌ Error: omr_web_circle_scanner.py not found!
    echo Please run this script from the scanner directory
    pause
    exit /b 1
)

echo 🚀 Starting OMR Server...
echo.

REM Set environment variables for online access
set HOST=0.0.0.0
set PORT=5000
set DEBUG=True

REM Start the server
python start_omr_server.py

pause
