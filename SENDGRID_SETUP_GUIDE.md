# 📬 SendGrid OTP Setup Guide for Viktoria's Bistro

## 🎯 Overview

This guide will help you set up SendGrid to send professional OTP emails for your registration system. Your system now includes:

- ✅ **SendGrid Integration**: Professional email delivery
- ✅ **Beautiful HTML Templates**: Branded email design
- ✅ **Fallback System**: Works even without SendGrid configured
- ✅ **Security Features**: 10-minute expiry, attempt limits
- ✅ **Complete API**: Send, verify, resend OTP endpoints

## 🚀 Quick Setup (5 minutes)

### Step 1: Create SendGrid Account

1. **Go to SendGrid**: Visit [https://sendgrid.com](https://sendgrid.com)
2. **Sign Up**: Create a free account (100 emails/day free)
3. **Verify Email**: Check your email and verify your account

### Step 2: Get API Key

1. **Login to SendGrid Dashboard**
2. **Go to Settings → API Keys**
3. **Click "Create API Key"**
4. **Choose "Restricted Access"**
5. **Give it a name**: "Viktoria's Bistro OTP"
6. **Set permissions**:
   - ✅ Mail Send: Full Access
   - ❌ Everything else: No Access
7. **Click "Create & View"**
8. **Copy the API key** (starts with `SG.`)

### Step 3: Configure Your Environment

1. **Create `.env` file** in your project root:
```bash
# Copy from env-template.txt
cp env-template.txt .env
```

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

2. **Edit `.env` file** and add your SendGrid API key:
```env
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@viktoriasbistro.restaurant
SENDGRID_FROM_NAME=Viktoria's Bistro
```

3. **Verify Sender Identity** (Important!):
   - Go to SendGrid Dashboard → Settings → Sender Authentication
   - Choose "Single Sender Verification"
   - Add your email: `noreply@viktoriasbistro.restaurant`
   - Check your email and verify the sender

### Step 4: Test the Setup

1. **Start your server**:
```bash
npm start
```

2. **Test the OTP service**:
```bash
# Check if SendGrid is configured
curl http://localhost:5001/api/otp/status
```

3. **Test sending OTP**:
```bash
curl -X POST http://localhost:5001/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","userName":"Test User"}'
```

## 🎨 What You'll Get

### Beautiful Email Template

Your users will receive a professional email with:

- 🍽️ **Viktoria's Bistro branding**
- 🎨 **Beautiful HTML design**
- 🔐 **Clear OTP code display**
- ⏰ **10-minute expiry notice**
- ⚠️ **Security warnings**
- 📱 **Mobile-friendly layout**

### Email Preview

```
🍽️ Viktoria's Bistro
Email Verification

Hello John Doe! 👋

Thank you for signing up with Viktoria's Bistro! To complete your account verification, 
please use the following verification code:

[123456]

Enter this code in the verification page to activate your account.

⚠️ Important Security Information:
• This code will expire in 10 minutes
• Do not share this code with anyone
• If you didn't request this code, please ignore this email
• Our team will never ask for your verification code

Welcome to the Viktoria's Bistro family! We're excited to serve you delicious meals. 🍽️
```

## 🔧 API Endpoints

Your system now includes these endpoints:

### Check Service Status
```bash
GET /api/otp/status
```

### Send OTP
```bash
POST /api/otp/send
Content-Type: application/json

{
  "email": "user@example.com",
  "userName": "John Doe"
}
```

### Verify OTP
```bash
POST /api/otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Resend OTP
```bash
POST /api/otp/resend
Content-Type: application/json

{
  "email": "user@example.com",
  "userName": "John Doe"
}
```

### Get OTP Status
```bash
GET /api/otp/status/user@example.com
```

## 🛡️ Security Features

- **10-minute expiry**: OTPs automatically expire
- **5-attempt limit**: Prevents brute force attacks
- **Rate limiting**: Prevents spam
- **Secure storage**: OTPs stored securely in memory
- **Auto-cleanup**: Expired OTPs automatically deleted

## 🔄 Fallback System

Even without SendGrid configured, your system will:

- ✅ **Generate OTPs**: Still creates valid codes
- ✅ **Store securely**: Uses in-memory storage
- ✅ **Verify codes**: Full verification functionality
- ✅ **Show in console**: Displays OTP for development
- ✅ **Alert user**: Shows OTP in browser alert

## 🧪 Testing Without SendGrid

If you want to test without SendGrid:

1. **Don't set `SENDGRID_API_KEY`** in your `.env` file
2. **Start your server**: `npm start`
3. **Go to signup page**: `http://localhost:5001/html/signup.html`
4. **Fill out the form** and click "Continue"
5. **Check browser console** or alert for the OTP code
6. **Enter the code** in the OTP verification page

## 🚨 Troubleshooting

### Common Issues

**❌ "SendGrid API key not found"**
- Make sure you created `.env` file
- Check that `SENDGRID_API_KEY` is set correctly
- Restart your server after adding the key

**❌ "Sender not verified"**
- Go to SendGrid Dashboard → Sender Authentication
- Verify your sender email address
- Wait a few minutes for verification to complete

**❌ "Email not delivered"**
- Check spam folder
- Verify sender email is correct
- Make sure SendGrid account is active

**❌ "OTP verification fails"**
- Check that you're using the correct email
- Make sure OTP hasn't expired (10 minutes)
- Verify you haven't exceeded attempt limit (5 tries)

### Debug Commands

```bash
# Check if SendGrid is configured
curl http://localhost:5001/api/otp/status

# Test sending OTP
curl -X POST http://localhost:5001/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userName":"Test User"}'

# Check server logs for detailed error messages
```

## 🎉 You're Ready!

Your SendGrid OTP system is now fully configured! Here's what happens:

1. **User signs up** → System creates Firebase account
2. **SendGrid sends email** → Professional OTP email delivered
3. **User verifies** → OTP checked and account activated
4. **Success!** → User redirected to login page

**Test it now by going to**: `http://localhost:5001/html/signup.html`

## 📞 Support

If you need help:

1. **Check the console logs** for detailed error messages
2. **Verify SendGrid configuration** using the status endpoint
3. **Test with fallback mode** if SendGrid isn't working
4. **Check your email** (including spam folder)

Your OTP system is production-ready! 🚀
