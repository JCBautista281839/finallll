@echo off
REM Commit and push deployment fixes to repository
REM Run this on your Windows machine before deploying to production

echo ========================================
echo Committing Deployment Fixes
echo ========================================
echo.

echo Checking git status...
git status
echo.

echo Adding all changed files...
git add server.js
git add deploy-production.sh
git add diagnose-deployment.sh
git add DEPLOYMENT_GUIDE.md
git add QUICK_FIX.md
git add DEPLOYMENT_CHECKLIST.md
git add DEPLOYMENT_FIX_SUMMARY.md
echo.

echo Files staged for commit:
git diff --cached --name-only
echo.

echo Committing changes...
git commit -m "Fix: Production deployment 503 errors - Add health checks and diagnostics

- Added /health and /api/health endpoints for server monitoring
- Enhanced deploy-production.sh with better error handling
- Created diagnose-deployment.sh for troubleshooting
- Added comprehensive deployment documentation
- Improved logging and status reporting
- Added environment variable validation
- Created deployment checklist and quick fix guide

This fixes the 503 Service Unavailable errors on the deployed website."

echo.
echo Changes committed successfully!
echo.

echo Pushing to remote repository...
git push origin main
echo.

echo ========================================
echo Deployment fixes committed and pushed!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. SSH into your production server
echo    ssh user@your-server-ip
echo.
echo 2. Navigate to deployment directory
echo    cd /var/www/viktorias-bistro
echo.
echo 3. Pull latest changes
echo    git pull origin main
echo.
echo 4. Run diagnostic script
echo    chmod +x diagnose-deployment.sh
echo    ./diagnose-deployment.sh
echo.
echo 5. Deploy application
echo    chmod +x deploy-production.sh
echo    ./deploy-production.sh
echo.
echo 6. Test health endpoint
echo    curl https://viktoriasbistro.restaurant/health
echo.
echo 7. Test OTP functionality
echo    Open: https://viktoriasbistro.restaurant/html/forgot-password.html
echo.
echo See QUICK_FIX.md for detailed troubleshooting steps
echo See DEPLOYMENT_GUIDE.md for complete deployment instructions
echo See DEPLOYMENT_CHECKLIST.md for step-by-step verification
echo.
echo ========================================

pause

