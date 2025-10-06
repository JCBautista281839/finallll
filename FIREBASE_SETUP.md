# Firebase Admin SDK Setup

This project uses Firebase Admin SDK for server-side operations like password resets.

## Setup Instructions

1. **Go to Firebase Console**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `victoria-s-bistro`

2. **Generate Service Account Key**
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Download the JSON file

3. **Configure the Service Account**
   - Rename the downloaded file to `firebase-service-account.json`
   - Place it in the project root directory
   - The file should contain your project's service account credentials

4. **Verify Setup**
   - Start the server: `node server.js`
   - Look for: `✅ Firebase Admin SDK initialized successfully at startup`
   - If you see warnings, check the service account file

## Security Notes

- **NEVER commit** `firebase-service-account.json` to version control
- The file is already added to `.gitignore`
- Use `firebase-service-account.example.json` as a template
- Keep your service account keys secure

## Troubleshooting

If you see Firebase Admin SDK warnings:
- Check that `firebase-service-account.json` exists in the project root
- Verify the JSON file is valid and contains all required fields
- Ensure the service account has proper permissions in Firebase Console
- Check that your server time is synchronized (Firebase requires accurate time)

## Required Permissions

The service account needs these permissions:
- Firebase Authentication Admin
- Cloud Firestore User (if using Firestore)
- Firebase Realtime Database User (if using Realtime Database)
