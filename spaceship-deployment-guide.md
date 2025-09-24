# 🚀 Deploy OTP Function to Spaceship

## 📋 Prerequisites

- ✅ **Spaceship account** with Node.js support
- ✅ **Space Mail credentials** ready
- ✅ **Domain/subdomain** for your function

## 🔧 Step-by-Step Deployment

### **Step 1: Prepare Files**

Upload these files to your Spaceship project:

1. **`spaceship-function.js`** - Main function code
2. **`spaceship-package.json`** - Dependencies (rename to `package.json`)
3. **Set start script** to `node spaceship-function.js`

### **Step 2: Configure Spaceship**

#### **Environment Variables (if supported):**
```
PORT=3000
NODE_ENV=production
```

#### **Build Settings:**
- **Node.js version:** 18.x
- **Start command:** `node spaceship-function.js`
- **Build command:** `npm install`

### **Step 3: Deploy to Spaceship**

1. **Upload files** to Spaceship
2. **Install dependencies:** `npm install`
3. **Start the service**
4. **Get your function URL** (e.g., `https://your-app.spaceship.com`)

### **Step 4: Update Your Frontend**

Update your `spacemail-otp.js` to call the Spaceship function:

```javascript
// Replace Firebase function call with Spaceship API call
async sendEmail(to, subject, html, text) {
  try {
    const response = await fetch('https://your-app.spaceship.com/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: to,
        otpCode: otpCode, // Extract from text
        userName: userName // Extract from text
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email sent via Spaceship function');
      return;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Spaceship function failed:', error);
    throw error;
  }
}
```

## 🧪 Testing Your Deployment

### **Health Check:**
```
GET https://your-app.spaceship.com/
```

### **Test SMTP:**
```
POST https://your-app.spaceship.com/test-smtp
```

### **Send OTP:**
```
POST https://your-app.spaceship.com/send-otp
{
  "email": "christianbautista265853@gmail.com",
  "otpCode": "123456",
  "userName": "Christian Bautista"
}
```

## 📧 Expected Results

### **Before Deployment:**
- ❌ **No real emails** sent
- ❌ **OTP codes** only in console

### **After Deployment:**
- ✅ **Real emails** sent to Gmail
- ✅ **Beautiful HTML emails** with OTP
- ✅ **Complete verification** flow

## 🔍 Troubleshooting

### **If emails don't arrive:**
1. **Check Spaceship logs** for errors
2. **Test SMTP connection** endpoint
3. **Verify Space Mail credentials**
4. **Check spam folder**

### **If function doesn't start:**
1. **Check Node.js version** (should be 18.x)
2. **Verify package.json** dependencies
3. **Check Spaceship logs** for startup errors

## 🎯 Benefits of Spaceship Deployment

- ✅ **No Firebase upgrade** needed
- ✅ **Full control** over your function
- ✅ **Same hosting** as your website
- ✅ **Real email sending** via Space Mail
- ✅ **Cost-effective** solution

## 📱 Next Steps

1. **Deploy function** to Spaceship
2. **Update frontend** to call Spaceship API
3. **Test OTP emails** with your Gmail
4. **Complete verification** flow

Your OTP system will work exactly the same, but now with real emails sent via Spaceship! 🚀
