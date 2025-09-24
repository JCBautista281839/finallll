@echo off
echo 🚀 Deploying Firebase Cloud Function...
echo =====================================
echo.

echo 📦 Installing dependencies...
cd functions
npm install
echo.

echo 🔍 Testing linting...
npm run lint
echo.

echo 🚀 Deploying function...
firebase deploy --only functions
echo.

echo ✅ Deployment complete!
echo.
echo 🧪 Test your OTP system now:
echo 1. Open your signup page
echo 2. Sign up with your Gmail
echo 3. Check your email inbox for OTP
echo.

pause
