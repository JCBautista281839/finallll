# 📧 Email Setup Guide for Viktoria's Bistro OTP System

## 🚀 Quick Setup to Receive Real Emails

### **Current Status:**
- ✅ Firebase OTP system working perfectly
- ✅ Server API endpoints functional
- ✅ Email system configured (needs Gmail setup)
- ❌ **You need to set up Gmail App Password to receive emails**

---

## 🔧 **Step 1: Enable Gmail App Password**

### **1.1 Enable 2-Factor Authentication:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Sign in with your Gmail account: `christianbautista265853@gmail.com`
3. Under "Signing in to Google", click **"2-Step Verification"**
4. Follow the steps to enable 2FA (you'll need your phone)

### **1.2 Generate App Password:**
1. After enabling 2FA, go back to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google", click **"App passwords"**
3. Select **"Mail"** as the app
4. Select **"Other (custom name)"** as the device
5. Type **"Viktoria's Bistro Server"**
6. Click **"Generate"**
7. **COPY THE 16-CHARACTER PASSWORD** (it looks like: `abcd efgh ijkl mnop`)

---

## 🔧 **Step 2: Configure Server**

### **2.1 Update Server Configuration:**
Open `server.js` and update line 36:

```javascript
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'your-app-password-here';
```

Replace `'your-app-password-here'` with your 16-character app password (remove spaces):
```javascript
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'abcdefghijklmnop';
```

### **2.2 Restart Server:**
```bash
# Stop current server (Ctrl+C)
# Then restart:
node server.js
```

---

## 🧪 **Step 3: Test Email Delivery**

### **3.1 Test via Browser:**
1. Go to: `http://localhost:5001/test-firebase-otp`
2. Enter your email: `christianbautista265853@gmail.com`
3. Click **"🔥 Firebase Send OTP"**
4. Check your email inbox!

### **3.2 Expected Results:**
- ✅ Console shows: `📧 Email sent successfully to christianbautista265853@gmail.com`
- ✅ You receive a beautiful HTML email with your OTP code
- ✅ Email subject: `Your Viktoria's Bistro Verification Code - 123456`

---

## 📧 **Email Features:**

### **Beautiful HTML Email Includes:**
- 🍽️ Viktoria's Bistro branding
- Large, clear OTP code display
- 10-minute expiry notice
- Professional styling

### **Email Content:**
```
Subject: Your Viktoria's Bistro Verification Code - 123456

Hello Test User!

Thank you for signing up with Viktoria's Bistro. Please use the verification code below to complete your registration:

VERIFICATION CODE: 123456

This code will expire in 10 minutes.

Best regards,
The Viktoria's Bistro Team
```

---

## 🔧 **Troubleshooting:**

### **If emails still don't arrive:**

1. **Check Gmail App Password:**
   - Make sure you copied the 16-character password correctly
   - Remove all spaces from the password
   - Ensure 2FA is enabled

2. **Check Gmail Security:**
   - Go to [Gmail Security Checkup](https://myaccount.google.com/security-checkup)
   - Make sure "Less secure app access" is enabled (if available)

3. **Check Server Logs:**
   - Look for `📧 Email sent successfully` in server console
   - If you see errors, check the error message

4. **Check Spam Folder:**
   - Emails might go to spam initially
   - Mark as "Not Spam" if found

---

## 🚀 **Alternative: Keep Current System**

If you prefer not to set up email, the current system works perfectly:
- ✅ OTP codes shown in browser alerts
- ✅ All verification functionality works
- ✅ No email setup required
- ✅ Perfect for development/testing

---

## 📞 **Need Help?**

If you encounter issues:
1. Check the server console for error messages
2. Verify Gmail App Password is correct
3. Ensure 2FA is enabled on your Gmail account
4. Check your spam folder for emails

**The system is already working perfectly - you just need to add the Gmail App Password to start receiving real emails!**
