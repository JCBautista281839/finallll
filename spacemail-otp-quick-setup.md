# Space Mail OTP Quick Setup Guide

## 🚀 How to Use Space Mail OTP in otp.html

### **✅ What's Been Added**

Your `otp.html` page now includes:
- **Space Mail OTP Service** - Direct OTP sending via Space Mail
- **Configuration Panel** - Easy setup on the OTP page
- **Automatic Fallback** - Falls back to Firebase if Space Mail fails
- **Test Functionality** - Test Space Mail directly from the page

---

## **Step 1: Create Space Mail Account**

### **1.1 Sign Up**
1. Go to [spacemail.com](https://spacemail.com)
2. Create account with: `viktoriasbistro@spacemail.com`
3. Set a strong password
4. Verify your account

### **1.2 Enable SMTP**
1. **Login** to Space Mail
2. Go to **Settings** → **Email** → **SMTP**
3. **Enable SMTP** access
4. **Note your credentials** for the configuration

---

## **Step 2: Configure Space Mail on OTP Page**

### **2.1 Open OTP Page**
1. **Navigate** to your OTP verification page
2. **Scroll down** to see the "Space Mail OTP" section
3. **Enter your credentials:**
   - **Space Mail email:** `viktoriasbistro@spacemail.com`
   - **Space Mail password:** Your Space Mail password

### **2.2 Click "Configure Space Mail"**
- The page will configure Space Mail OTP service
- You'll see "✅ Space Mail configured successfully!"

### **2.3 Test Space Mail**
- Click **"Test Space Mail"** button
- Check browser console for test results
- You should see "✅ Space Mail OTP test successful!"

---

## **Step 3: How It Works**

### **3.1 Automatic Priority**
The system now works with **automatic fallback**:

1. **First:** Tries Space Mail OTP
2. **If Space Mail fails:** Falls back to Firebase OTP
3. **User experience:** Seamless, no interruption

### **3.2 Resend Functionality**
- **Click "Click to resend"** → Tries Space Mail first
- **If Space Mail configured:** Sends via Space Mail
- **If not configured:** Uses Firebase OTP

### **3.3 Verification**
- **Enter OTP code** → Checks Space Mail first
- **If Space Mail OTP:** Verifies against Space Mail storage
- **If Firebase OTP:** Verifies against Firebase

---

## **Step 4: Testing Your Setup**

### **4.1 Complete Flow Test**
1. **Sign up** with real email address
2. **Go to OTP page**
3. **Configure Space Mail** (if not done already)
4. **Click "Click to resend"** → Should use Space Mail
5. **Check email** → Should receive Space Mail OTP
6. **Enter 6-digit code** → Should verify successfully

### **4.2 Console Testing**
1. **Open browser console** (F12)
2. **Run test command:**
   ```javascript
   window.testSpaceMailOTP('your-email@example.com', 'Your Name');
   ```
3. **Check console output** for success/failure

---

## **Step 5: Space Mail Configuration**

### **5.1 Default Settings**
The Space Mail service uses these default settings:
- **SMTP Host:** `smtp.spacemail.com`
- **Port:** `587` (TLS)
- **Security:** TLS encryption

### **5.2 Custom Configuration**
If you need different settings, modify `javascript/spacemail-otp.js`:

```javascript
this.smtpConfig = {
    host: 'smtp.spacemail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your-email@spacemail.com',
        pass: 'your-password'
    },
    tls: {
        rejectUnauthorized: false
    }
};
```

---

## **Step 6: Troubleshooting**

### **6.1 Common Issues**

#### **"Space Mail not configured"**
- **Solution:** Enter credentials and click "Configure Space Mail"
- **Check:** Make sure email and password are correct

#### **"Space Mail test failed"**
- **Check:** Space Mail account is active
- **Verify:** SMTP is enabled in Space Mail settings
- **Test:** Try with different email address

#### **"OTP not received"**
- **Check:** Spam folder
- **Verify:** Email address is correct
- **Test:** Use "Test Space Mail" button first

### **6.2 Debug Steps**
1. **Check browser console** for error messages
2. **Verify Space Mail credentials** are correct
3. **Test with simple email** first
4. **Check Space Mail account** is not suspended

---

## **Step 7: Production Setup**

### **7.1 For Production Use**
1. **Verify your domain** with Space Mail
2. **Set up SPF/DKIM records** for better deliverability
3. **Monitor email delivery** rates
4. **Set up error logging** for failed sends

### **7.2 Security Considerations**
- **Never expose** Space Mail password in client-side code
- **Use environment variables** for production
- **Implement rate limiting** to prevent abuse
- **Monitor for suspicious activity**

---

## **✅ Benefits of Space Mail OTP**

### **🚀 Advantages**
- **Free service** - No monthly costs
- **Direct SMTP** - No third-party dependencies
- **Fast delivery** - Usually within 30 seconds
- **Professional emails** - Custom templates
- **Easy setup** - Configure directly on the page

### **📧 Perfect for OTP**
- **High deliverability** - Rarely marked as spam
- **Reliable service** - Good uptime
- **Custom branding** - Professional appearance
- **Cost effective** - Completely free

---

## **🎯 Quick Start Summary**

1. **Create Space Mail account** → `viktoriasbistro@spacemail.com`
2. **Open OTP page** → Scroll to Space Mail section
3. **Enter credentials** → Email and password
4. **Click "Configure Space Mail"** → Should show success
5. **Test the system** → Click "Test Space Mail"
6. **Use the complete flow** → Sign up and verify

Your OTP page now has **dual OTP capability** - Space Mail for direct sending and Firebase as backup! 🎉

### **Expected Results:**
- **Space Mail OTP:** Fast, professional emails
- **Automatic fallback:** Seamless user experience
- **Easy configuration:** Set up directly on the page
- **Cost effective:** Free Space Mail service
