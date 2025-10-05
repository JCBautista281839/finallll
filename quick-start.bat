@echo off
title Viktoria's Bistro Server - Quick Start
echo.
echo ========================================
echo    Viktoria's Bistro Server
echo    Quick Start Menu
echo ========================================
echo.

cd /d "%~dp0"

:menu
echo Choose an option:
echo.
echo 1. Start Server (Normal)
echo 2. Start Server (Auto-restart)
echo 3. Setup PM2 Process Manager
echo 4. Setup Windows Service (Auto-start on boot)
echo 5. Stop All Servers
echo 6. View Server Status
echo 7. View Server Logs
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto start_normal
if "%choice%"=="2" goto start_restart
if "%choice%"=="3" goto setup_pm2
if "%choice%"=="4" goto setup_service
if "%choice%"=="5" goto stop_all
if "%choice%"=="6" goto view_status
if "%choice%"=="7" goto view_logs
if "%choice%"=="8" goto exit
goto menu

:start_normal
echo.
echo Starting server normally...
node server.js
goto menu

:start_restart
echo.
echo Starting server with auto-restart...
:restart_loop
node server.js
echo Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto restart_loop

:setup_pm2
echo.
echo Setting up PM2 Process Manager...
call setup-pm2.bat
goto menu

:setup_service
echo.
echo Setting up Windows Service...
call setup-windows-service.bat
goto menu

:stop_all
echo.
echo Stopping all servers...
pm2 stop all 2>nul
taskkill /f /im node.exe 2>nul
echo All servers stopped.
pause
goto menu

:view_status
echo.
echo Server Status:
pm2 status 2>nul
if %errorlevel% neq 0 (
    echo PM2 not running. Checking for direct Node processes...
    tasklist /fi "imagename eq node.exe" 2>nul
)
pause
goto menu

:view_logs
echo.
echo Viewing server logs (Press Ctrl+C to exit):
pm2 logs 2>nul
if %errorlevel% neq 0 (
    echo PM2 not available. No logs to show.
    pause
)
goto menu

:exit
echo.
echo Goodbye!
exit /b 0
