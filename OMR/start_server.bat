@echo off
echo ================================================
echo OMR Testing System - Server Startup
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    REM Try to find Python in common locations
    if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe" (
        set PYTHON_PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python313\python.exe
        echo Found Python 3.13 in AppData folder
    ) else if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe" (
        set PYTHON_PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python312\python.exe
        echo Found Python 3.12 in AppData folder
    ) else if exist "%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe" (
        set PYTHON_PATH=%USERPROFILE%\AppData\Local\Programs\Python\Python311\python.exe
        echo Found Python 3.11 in AppData folder
    ) else (
        echo ERROR: Python is not installed or not in PATH
        echo Please install Python 3.7+ from https://python.org
        echo Or add Python to your system PATH
        pause
        exit /b 1
    )
) else (
    set PYTHON_PATH=python
    echo Using system Python
)

echo Starting OMR Testing Server...
echo.
echo Server will be available at: http://localhost:5003
echo Press Ctrl+C to stop the server
echo.

REM Start the server
%PYTHON_PATH% start_server.py

pause
