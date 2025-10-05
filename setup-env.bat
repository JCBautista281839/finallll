@echo off
echo Creating secure .env file for Viktoria's Bistro...
echo.
echo This script will create a .env file using the template.
echo You need to manually fill in your actual API keys.
echo.

REM Copy template to .env
copy env.template .env

echo .env file created from template!
echo.
echo IMPORTANT: You must now edit .env file and replace placeholder values with your actual API keys:
echo.
echo Required values to update:
echo   - SENDGRID_API_KEY=your_sendgrid_api_key_here
echo   - FIREBASE_PROJECT_ID=your_firebase_project_id
echo   - FIREBASE_PRIVATE_KEY="your_private_key_here"
echo   - FIREBASE_CLIENT_EMAIL=your_client_email_here
echo   - LALAMOVE_API_KEY=your_lalamove_api_key_here
echo   - LALAMOVE_API_SECRET=your_lalamove_api_secret_here
echo.
echo Optional values:
echo   - GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
echo.
echo After updating .env file, your application will be secure for Git commits.
echo.
pause
