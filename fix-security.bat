@echo off
title Fix Firebase Security Issue
echo.
echo ========================================
echo    Firebase Security Fix
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Removing firebase-service-account.json from Git tracking...
git rm --cached firebase-service-account.json 2>nul
if %errorlevel% equ 0 (
    echo    ✓ File removed from Git tracking
) else (
    echo    ! File was not being tracked or already removed
)
echo.

echo Step 2: Staging .gitignore changes...
git add .gitignore
echo    ✓ .gitignore updated
echo.

echo Step 3: Checking what will be committed...
echo.
git status --short
echo.

echo Step 4: Committing security fix...
git commit -m "Security: Remove firebase credentials from Git tracking and fix .gitignore"
if %errorlevel% equ 0 (
    echo    ✓ Security fix committed
) else (
    echo    ! Nothing to commit or commit failed
)
echo.

echo ========================================
echo    Security Fix Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. You can now click "OK" in VS Code to bypass the warning
echo 2. OR run: git push origin main
echo.
echo ⚠️  IMPORTANT: If you already pushed the firebase file before,
echo     you MUST regenerate your Firebase service account key!
echo.
echo     Go to: https://console.firebase.google.com/project/victoria-s-bistro/settings/serviceaccounts/adminsdk
echo.
pause

