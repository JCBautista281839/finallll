@echo off
echo ========================================
echo Firebase Email OTP Setup Script
echo ========================================
echo.

echo Step 1: Installing Firebase CLI...
npm install -g firebase-tools
echo.

echo Step 2: Logging into Firebase...
firebase login
echo.

echo Step 3: Setting project...
firebase use victoria-s-bistro
echo.

echo Step 4: Initializing Functions...
firebase init functions
echo.

echo Step 5: Installing email dependencies...
cd functions
npm install nodemailer cors express
echo.

echo Step 6: Going back to project root...
cd ..
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Copy the Cloud Function code to functions/index.js
echo 2. Configure your email service (Gmail/SendGrid)
echo 3. Deploy: firebase deploy --only functions
echo 4. Test the complete flow
echo.
echo For detailed instructions, see:
echo firebase-email-otp-setup-complete.md
echo.
pause
