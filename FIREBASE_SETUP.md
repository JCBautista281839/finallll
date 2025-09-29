# Firebase Admin SDK Setup for Password Reset

## Overview
The password reset functionality requires Firebase Admin SDK to update user passwords in Firebase Auth. Follow these steps to set it up:

## Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click on **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

## Step 2: Configure the Service Account

1. Rename the downloaded file to `firebase-service-account.json`
2. Place it in the project root directory (same level as `server.js`)
3. Make sure it's in your `.gitignore` file (never commit this file!)

## Step 3: Verify Setup

1. Start your server: `npm start` or `node server.js`
2. Look for this message in the console:
   ```
   ✅ Firebase Admin SDK initialized successfully
   ```

## Step 4: Test Password Reset

1. Go to forgot password page
2. Enter your email and request OTP
3. Verify OTP
4. Set new password
5. Try logging in with the new password

## Security Notes

- ⚠️ **NEVER** commit `firebase-service-account.json` to version control
- Keep your service account key secure
- Consider using environment variables for production

## Alternative: Using Firebase Client SDK

If you prefer not to use Firebase Admin SDK, the system will fall back to providing instructions for using Firebase's built-in password reset functionality.

## Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Make sure `firebase-service-account.json` exists in the project root
- Check that the JSON file is valid
- Verify the service account has the correct permissions

### Error: "User not found"
- Make sure the email exists in your Firebase Auth users
- Check that the user was created through the signup process

### Error: "Permission denied"
- Ensure the service account has Firebase Auth Admin permissions
- Check that the service account key is valid and not expired
