@echo off
echo ========================================
echo  Viktoria's Bistro POS System Launcher
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
echo Node.js version:
node --version
echo.

:: Check if package.json exists
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the project root directory
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
)

:: Start the system
echo Starting Viktoria's Bistro POS System...
echo.
echo IMPORTANT: 
echo - Main Server will run on: http://localhost:5000
echo - POS System: http://localhost:5000/html/pos.html
echo - OMR Launcher: http://localhost:3001
echo - OMR Scanner: Auto-starts when needed
echo.
echo Press Ctrl+C to stop all services
echo.

:: Run the startup script
npm start

:: If we get here, the system has stopped
echo.
echo System stopped.
pause
