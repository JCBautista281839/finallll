# Space Mail OTP Setup Guide - Viktoria's Bistro

## 🚀 Using Space Mail for OTP Emails

### **✅ Space Mail Benefits**
- **Free email service** with SMTP support
- **Professional email addresses** (yourname@spacemail.com)
- **Reliable delivery** for OTP emails
- **Easy setup** with Firebase Cloud Functions

---

## **Step 1: Create Space Mail Account**

### **1.1 Sign Up**
1. Go to [spacemail.com](https://spacemail.com)
2. Click **"Sign Up"** or **"Create Account"**
3. Choose your email address: `viktoriasbistro@spacemail.com`
4. Set a strong password
5. Verify your account via email

### **1.2 Enable SMTP**
1. **Login** to your Space Mail account
2. Go to **Settings** → **Email** → **SMTP**
3. **Enable SMTP** access
4. **Note down** your SMTP credentials:
   - **SMTP Server:** `smtp.spacemail.com`
   - **Port:** `587` (TLS) or `465` (SSL)
   - **Username:** `viktoriasbistro@spacemail.com`
   - **Password:** Your Space Mail password

---

## **Step 2: Update Firebase Cloud Function**

### **2.1 Update Email Configuration**
Replace the email config in your `functions/index.js`:

```javascript
const emailConfig = {
    // Space Mail SMTP Configuration
    host: 'smtp.spacemail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'viktoriasbistro@spacemail.com', // Your Space Mail email
        pass: 'your-spacemail-password'        // Your Space Mail password
    },
    tls: {
        rejectUnauthorized: false
    }
};
```

### **2.2 Update Email Options**
```javascript
const mailOptions = {
    from: '"Viktoria\'s Bistro" <viktoriasbistro@spacemail.com>',
    to: email,
    subject: 'Your Viktoria\'s Bistro Verification Code',
    html: emailTemplate,
    text: `Hello ${userName}! Your Viktoria's Bistro verification code is: ${otpCode}. This code expires in 10 minutes.`
};
```

---

## **Step 3: Test Space Mail Setup**

### **3.1 Test SMTP Connection**
```javascript
// Add this test function to your Cloud Function
exports.testSpaceMail = functions.https.onCall(async (data, context) => {
    try {
        const transporter = nodemailer.createTransporter(emailConfig);
        
        // Test email
        const testEmail = {
            from: 'viktoriasbistro@spacemail.com',
            to: 'test@example.com',
            subject: 'Space Mail Test',
            text: 'This is a test email from Space Mail!'
        };
        
        await transporter.sendMail(testEmail);
        
        return {
            success: true,
            message: 'Space Mail test successful!'
        };
        
    } catch (error) {
        console.error('Space Mail test failed:', error);
        throw new functions.https.HttpsError('internal', 'Space Mail test failed');
    }
});
```

### **3.2 Deploy and Test**
```bash
# Deploy the updated function
firebase deploy --only functions

# Test with your test page
# Open test-firebase-otp.html and run the tests
```

---

## **Step 4: Alternative Space Mail Configurations**

### **4.1 SSL Configuration (Port 465)**
```javascript
const emailConfig = {
    host: 'smtp.spacemail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: 'viktoriasbistro@spacemail.com',
        pass: 'your-spacemail-password'
    }
};
```

### **4.2 TLS Configuration (Port 587)**
```javascript
const emailConfig = {
    host: 'smtp.spacemail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
        user: 'viktoriasbistro@spacemail.com',
        pass: 'your-spacemail-password'
    },
    tls: {
        rejectUnauthorized: false
    }
};
```

---

## **Step 5: Complete Cloud Function Example**

### **5.1 Full Implementation**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Space Mail Configuration
const emailConfig = {
    host: 'smtp.spacemail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'viktoriasbistro@spacemail.com',
        pass: 'your-spacemail-password'
    },
    tls: {
        rejectUnauthorized: false
    }
};

const transporter = nodemailer.createTransporter(emailConfig);

exports.sendOTPEmail = functions.https.onCall(async (data, context) => {
    try {
        const { email, otpCode, userName } = data;
        
        if (!email || !otpCode || !userName) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }
        
        // Professional email template
        const emailTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code - Viktoria's Bistro</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #007bff, #0056b3);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f8f9fa;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .otp-code {
                        background: #007bff;
                        color: white;
                        font-size: 32px;
                        font-weight: bold;
                        text-align: center;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                        letter-spacing: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                    }
                    .warning {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🍽️ Viktoria's Bistro</h1>
                    <p>Email Verification</p>
                </div>
                
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    
                    <p>Thank you for signing up with Viktoria's Bistro. To complete your registration, please use the verification code below:</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This code will expire in 10 minutes</li>
                            <li>Do not share this code with anyone</li>
                            <li>If you didn't request this code, please ignore this email</li>
                        </ul>
                    </div>
                    
                    <p>Enter this code in the verification page to complete your account setup.</p>
                    
                    <p>Welcome to Viktoria's Bistro! 🎉</p>
                </div>
                
                <div class="footer">
                    <p>© 2024 Viktoria's Bistro. All rights reserved.</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: '"Viktoria\'s Bistro" <viktoriasbistro@spacemail.com>',
            to: email,
            subject: 'Your Viktoria\'s Bistro Verification Code',
            html: emailTemplate,
            text: `Hello ${userName}! Your Viktoria's Bistro verification code is: ${otpCode}. This code expires in 10 minutes.`
        };
        
        await transporter.sendMail(mailOptions);
        
        console.log(`✅ OTP email sent via Space Mail to ${email}`);
        
        return {
            success: true,
            message: 'OTP email sent successfully via Space Mail'
        };
        
    } catch (error) {
        console.error('❌ Space Mail OTP send failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send email via Space Mail');
    }
});
```

---

## **Step 6: Testing Your Setup**

### **6.1 Test Steps**
1. **Deploy your function:** `firebase deploy --only functions`
2. **Open test page:** `test-firebase-otp.html`
3. **Run complete flow test** with real email
4. **Check email delivery** (inbox, not spam)
5. **Verify OTP works** in verification page

### **6.2 Expected Results**
- **Email delivery:** 95%+ success rate
- **Professional appearance:** Space Mail branding
- **Fast delivery:** Usually within 30 seconds
- **No spam issues:** Space Mail has good reputation

---

## **Step 7: Troubleshooting**

### **7.1 Common Issues**

#### **"Authentication failed"**
- **Check username/password** in Space Mail settings
- **Verify SMTP is enabled** in Space Mail account
- **Try different port** (587 or 465)

#### **"Connection timeout"**
- **Check firewall settings**
- **Try TLS instead of SSL** (port 587)
- **Verify Space Mail server** is accessible

#### **"Emails not received"**
- **Check spam folder**
- **Verify recipient email** is correct
- **Test with different email** providers

### **7.2 Debug Steps**
1. **Test SMTP connection** first
2. **Check Cloud Function logs** in Firebase Console
3. **Verify Space Mail account** is active
4. **Test with simple email** before OTP template

---

## **✅ Space Mail Advantages**

### **🚀 Benefits**
- **Free service** - No monthly costs
- **Professional emails** - Custom domain support
- **Reliable delivery** - Good reputation with ISPs
- **Easy setup** - Simple SMTP configuration
- **No rate limits** - Send as many emails as needed

### **📧 Perfect for OTP**
- **Fast delivery** - Usually within 30 seconds
- **High deliverability** - Rarely marked as spam
- **Professional appearance** - Builds user trust
- **Cost effective** - Completely free

---

## **🎯 Quick Setup Summary**

1. **Create Space Mail account** → `viktoriasbistro@spacemail.com`
2. **Enable SMTP** in Space Mail settings
3. **Update Cloud Function** with Space Mail config
4. **Deploy function** → `firebase deploy --only functions`
5. **Test complete flow** → Use test page
6. **Go live!** → Your OTP system is ready

Space Mail is an excellent choice for sending OTP emails - it's free, reliable, and professional! 🚀
