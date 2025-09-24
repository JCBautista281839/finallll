# 🚀 Signup → OTP Flow Guide

## ✅ **System Status: READY**

Your signup.html is now fully connected to SendGrid! Here's how to test the complete flow:

## 🎯 **Complete Flow Test**

### **Step 1: Go to Signup Page**
Open your browser and go to:
```
http://localhost:5001/html/signup.html
```

### **Step 2: Fill Out the Signup Form**
1. **Name**: Enter your full name (e.g., "John Doe")
2. **Email**: Enter `support@viktoriasbistro.restaurant` (your verified email)
3. **Phone**: Enter any phone number (e.g., "+639171234567")
4. **Password**: Enter any password (e.g., "Test123!")
5. **Confirm Password**: Enter the same password
6. **Check the box**: Agree to Terms and Conditions

### **Step 3: Click "Continue"**
- Click the "Continue" button
- The system will:
  - ✅ Create your Firebase account
  - ✅ Send OTP via SendGrid to your email
  - ✅ Redirect you to the OTP verification page

### **Step 4: Check Your Email**
- Open your email inbox
- Look for an email from "Viktoria's Bistro"
- You'll see a beautiful HTML email with:
  - 🍽️ Viktoria's Bistro branding
  - 🔐 6-digit OTP code (e.g., 123456)
  - ⏰ 10-minute expiry time
  - ⚠️ Security information

### **Step 5: Verify OTP**
- You'll be automatically redirected to: `http://localhost:5001/html/otp.html`
- Enter the 6-digit OTP code from your email
- Click "Verify Email"
- You'll be redirected to the login page

## 📧 **What You'll Receive**

Your OTP email will look like this:

```
🍽️ Viktoria's Bistro
Email Verification

Hello [Your Name]!

Thank you for signing up with Viktoria's Bistro. To complete your account verification, please use the following verification code:

[123456]

⚠️ Important:
• This code will expire in 10 minutes
• Do not share this code with anyone
• If you didn't request this code, please ignore this email

Welcome to Viktoria's Bistro family!
```

## 🔧 **Technical Details**

### **SendGrid Integration:**
- ✅ **Primary**: Uses SendGrid for professional email delivery
- ✅ **Fallback**: Falls back to Firebase if SendGrid fails
- ✅ **Security**: 10-minute expiry, 5-attempt limit
- ✅ **Templates**: Beautiful HTML email templates

### **Flow Process:**
1. **signup.html** → User fills form → Click "Continue"
2. **signup.js** → Creates Firebase account → Calls SendGrid OTP
3. **SendGrid** → Sends professional email → User receives OTP
4. **otp.html** → User enters code → Verifies with SendGrid
5. **Success** → Account verified → Redirect to login

## 🧪 **Testing Commands**

If you want to test the API directly:

```powershell
# Send OTP
Invoke-WebRequest -Uri "http://localhost:5001/api/send-otp" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"support@viktoriasbistro.restaurant","userName":"Test User"}'

# Verify OTP (replace 123456 with actual code)
Invoke-WebRequest -Uri "http://localhost:5001/api/verify-otp" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"support@viktoriasbistro.restaurant","otp":"123456"}'
```

## 🎉 **Ready to Test!**

Your signup.html is now fully connected to SendGrid! When you click "Continue", it will:

1. ✅ Send a professional OTP email to the address you entered
2. ✅ Redirect you to the OTP verification page
3. ✅ Allow you to verify the code and complete signup

**Go ahead and test it now!** 🚀
