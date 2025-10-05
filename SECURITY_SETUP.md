# 🔒 Viktoria's Bistro - Security Configuration Guide

## Overview
This guide explains how to securely configure your Viktoria's Bistro application to prevent sensitive data from being exposed when pushing to GitHub or other version control systems.

## ✅ Security Measures Implemented

### 1. Environment Variables (.env file)
- **All sensitive API keys are now stored in `.env` file**
- **`.env` file is excluded from Git via `.gitignore`**
- **Environment variables take priority over JSON files**

### 2. Protected Files
The following files are now protected and will NOT be committed to Git:
- `.env` - Contains all sensitive environment variables
- `firebase-service-account.json` - Firebase service account key
- `config.env` - Old configuration file
- `config.env.secure` - Old secure configuration file
- `uploads/` - User uploaded files
- `node_modules/` - Dependencies

### 3. Firebase Configuration
- **Primary**: Uses environment variables from `.env` file
- **Fallback**: Falls back to `firebase-service-account.json` if env vars not available
- **Secure**: No sensitive data in source code

## 🚀 Quick Setup

### Option 1: Use the Setup Script (Recommended)
```bash
# Windows Command Prompt
create-secure-env.bat

# Windows PowerShell
.\create-secure-env.ps1
```

### Option 2: Manual Setup
1. Copy `env.template` to `.env`
2. Fill in your actual API keys and secrets
3. Never commit `.env` to version control

## 📋 Environment Variables Reference

### Required Variables
```env
# Server Configuration
NODE_ENV=development
PORT=5001
BASE_URL=http://localhost:5001

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=support@viktoriasbistro.restaurant
SENDGRID_FROM_NAME=Viktoria's Bistro

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Delivery Service (Lalamove)
LALAMOVE_API_KEY=your_lalamove_api_key
LALAMOVE_API_SECRET=your_lalamove_api_secret
LALAMOVE_MARKET=PH
```

### Optional Variables
```env
# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=20

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

## 🔧 Firebase Setup

### Method 1: Environment Variables (Recommended for Production)
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key
3. Copy the JSON content and extract individual fields to `.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   ```

### Method 2: Service Account File (Development)
1. Download `firebase-service-account.json` from Firebase Console
2. Place it in your project root
3. The server will automatically use it as fallback

## 🛡️ Security Best Practices

### ✅ DO:
- Use environment variables for all sensitive data
- Keep `.env` file local and never commit it
- Use different API keys for development and production
- Regularly rotate API keys
- Use strong, unique passwords for all services
- Enable 2FA on all service accounts

### ❌ DON'T:
- Commit `.env` files to version control
- Hardcode API keys in source code
- Share API keys in chat/email
- Use production keys in development
- Store sensitive data in client-side code

## 🚨 Emergency Response

If you accidentally commit sensitive data:

### Immediate Actions:
1. **Revoke exposed API keys immediately**
2. **Generate new API keys**
3. **Update your `.env` file with new keys**
4. **Remove sensitive files from Git history**

### Git History Cleanup:
```bash
# Remove file from Git history (use with caution)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch firebase-service-account.json' --prune-empty --tag-name-filter cat -- --all

# Force push to update remote repository
git push origin --force --all
```

## 📁 File Structure After Security Setup

```
project-root/
├── .env                          # 🔒 SECURE - Never commit
├── .gitignore                    # ✅ Protects sensitive files
├── env.template                  # 📋 Template for new developers
├── create-secure-env.bat         # 🛠️ Windows setup script
├── create-secure-env.ps1         # 🛠️ PowerShell setup script
├── server.js                     # ✅ Uses environment variables
├── firebase-service-account.json # 🔒 Optional fallback
├── config.env                    # 🗑️ Can be deleted
├── config.env.secure             # 🗑️ Can be deleted
└── ... (other project files)
```

## 🔍 Verification Checklist

Before pushing to Git, verify:
- [ ] `.env` file exists and contains your API keys
- [ ] `.env` file is listed in `.gitignore`
- [ ] No hardcoded API keys in source code
- [ ] `firebase-service-account.json` is in `.gitignore`
- [ ] Old config files can be safely deleted
- [ ] Server starts successfully with new configuration

## 🆘 Troubleshooting

### Server won't start:
- Check if `.env` file exists
- Verify environment variable names match exactly
- Check for syntax errors in `.env` file

### Firebase authentication fails:
- Verify `FIREBASE_PRIVATE_KEY` has proper newline characters (`\n`)
- Check if Firebase project ID is correct
- Ensure service account has proper permissions

### Email sending fails:
- Verify SendGrid API key is valid
- Check if sender email is verified in SendGrid
- Ensure API key has mail sending permissions

## 📞 Support

If you encounter issues:
1. Check the server logs for specific error messages
2. Verify all environment variables are set correctly
3. Test with the setup scripts provided
4. Contact support with specific error details

---

**Remember: Security is an ongoing process. Regularly review and update your security measures!**
