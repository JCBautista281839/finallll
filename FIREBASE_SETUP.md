# Firebase Setup Guide

## Security Notice
**Never commit real Firebase service account credentials to git!** This guide shows you how to set up Firebase securely.

## Option 1: Environment Variables (Recommended)

1. Go to Firebase Console > Project Settings > Service accounts
2. Generate new private key and download JSON file
3. Copy the JSON content
4. Set environment variable:
   ```bash
   # Windows (PowerShell)
   $env:FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   
   # Windows (Command Prompt)
   set FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   
   # Linux/Mac
   export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
   ```
5. Restart the server

## Option 2: Local File (Not Recommended)

1. Copy `firebase-service-account.example.json` to `firebase-service-account.json`
2. Replace placeholder values with your real credentials
3. **Make sure `firebase-service-account.json` is in `.gitignore`**
4. Restart the server

## Verification

The server will log which method it's using:
- "Using Firebase service account from environment variable" ✅
- "Using Firebase service account from file" ⚠️

## Security Best Practices

- Use environment variables in production
- Never commit real credentials
- Rotate credentials regularly
- Use least privilege principle
- Monitor for exposed secrets

## Troubleshooting

If you see "Firebase Admin SDK not configured", check:
1. Environment variable is set correctly
2. JSON format is valid
3. Service account has required permissions
4. Project ID matches your Firebase project
