# 🔑 Viktoria's Bistro - API Keys Setup Guide

## Overview
This guide helps you obtain the required API keys for your Viktoria's Bistro application. Follow these steps to get your actual API keys and configure them securely.

## 🚀 Quick Setup

### Step 1: Create .env file
```bash
# Windows Command Prompt
setup-env.bat

# Windows PowerShell
.\setup-env.ps1
```

### Step 2: Get your API keys (see sections below)
### Step 3: Update .env file with actual values
### Step 4: Test your configuration

---

## 📧 SendGrid API Key

### How to get SendGrid API Key:
1. Go to [SendGrid Console](https://app.sendgrid.com/)
2. Sign in to your account
3. Navigate to **Settings** → **API Keys**
4. Click **Create API Key**
5. Choose **Restricted Access**
6. Grant **Mail Send** permission
7. Copy the generated API key
8. Update in `.env`:
   ```env
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   ```

### Verify SendGrid Setup:
- **From Email**: Must be verified in SendGrid
- **From Name**: Can be any display name
- **API Key**: Must have Mail Send permission

---

## 🔥 Firebase Configuration

### How to get Firebase Service Account:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`viktorias-bistro`)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract values for `.env`:

```env
# From the downloaded JSON file:
FIREBASE_PROJECT_ID=viktorias-bistro
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@viktorias-bistro.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40viktorias-bistro.iam.gserviceaccount.com
```

### Important Notes:
- **Private Key**: Must include `\n` for newlines in the .env file
- **Project ID**: Should be `viktorias-bistro`
- **Service Account**: Must have Firebase Admin SDK permissions

---

## 🚚 Lalamove API Keys

### How to get Lalamove API Keys:
1. Go to [Lalamove Developer Portal](https://developers.lalamove.com/)
2. Sign up for a developer account
3. Create a new application
4. Get your API Key and Secret
5. Update in `.env`:
   ```env
   LALAMOVE_API_KEY=pk_test_your_api_key_here
   LALAMOVE_API_SECRET=sk_test_your_api_secret_here
   LALAMOVE_MARKET=PH
   ```

### Lalamove Configuration:
- **Environment**: Use `pk_test_` for development
- **Market**: `PH` for Philippines
- **Webhook**: Configure webhook URL for order updates

---

## 🗺️ Google Maps API Key (Optional)

### How to get Google Maps API Key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Maps JavaScript API** and **Geocoding API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Restrict the API key to your domains
6. Update in `.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

### Google Maps Setup:
- **APIs Required**: Maps JavaScript API, Geocoding API
- **Restrictions**: Restrict to your domain for security
- **Billing**: Enable billing for Google Cloud project

---

## ✅ Verification Steps

### 1. Check .env file exists:
```bash
# Should show your .env file
ls .env
```

### 2. Verify no placeholder values:
```bash
# Should NOT contain "your_*_here" or "placeholder"
grep "your_.*_here" .env
```

### 3. Test server startup:
```bash
node server.js
```

### 4. Test API endpoints:
```bash
# Test basic endpoint
curl http://localhost:5001/api/test

# Test SendGrid (if configured)
curl -X POST http://localhost:5001/api/sendgrid-send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userName":"Test User"}'
```

---

## 🔒 Security Checklist

Before committing to Git, verify:
- [ ] `.env` file exists and contains real API keys
- [ ] No placeholder values (`your_*_here`) in `.env`
- [ ] `.env` file is listed in `.gitignore`
- [ ] Server starts successfully
- [ ] API endpoints respond correctly
- [ ] No hardcoded secrets in source code

---

## 🆘 Troubleshooting

### Server won't start:
- Check `.env` file exists
- Verify all required environment variables are set
- Check for syntax errors in `.env` file

### SendGrid errors:
- Verify API key is correct
- Check sender email is verified in SendGrid
- Ensure API key has Mail Send permission

### Firebase errors:
- Verify private key format (include `\n` for newlines)
- Check project ID is correct
- Ensure service account has proper permissions

### Lalamove errors:
- Verify API key and secret are correct
- Check market setting (PH for Philippines)
- Ensure using test keys for development

---

## 📞 Support

If you need help:
1. Check the error messages in server logs
2. Verify all API keys are correctly formatted
3. Test each service individually
4. Contact support with specific error details

---

**Remember: Never commit your .env file to version control!**
