# 🔧 SendGrid Setup Guide for Production

## 🚨 **Current Issue**

The website is showing a **503 Server API error** when trying to send password reset emails because the SendGrid API key is not properly configured in the production environment.

## 📋 **Quick Fix Steps**

### 1. **Get Your SendGrid API Key**

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Click **"Create API Key"**
3. Choose **"Restricted Access"**
4. Give it **"Mail Send"** permissions
5. Copy the generated API key (starts with `SG.`)

### 2. **Update Production Environment**

Edit your `env.production` file and replace:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

With your actual API key:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

### 3. **Restart Production Server**

After updating the environment file, restart your production server to load the new API key.

## 🔍 **Verification Steps**

### Test SendGrid Configuration

Run this command on your production server:

```bash
node test-sendgrid-config.js
```

Expected output:

```
✅ SendGrid Configuration Test
✅ API Key: Found (SG.xxxxx...)
✅ From Email: support@viktoriasbistro.restaurant
✅ From Name: Viktoria's Bistro
✅ SendGrid initialized successfully
✅ Email configuration looks good!
🚀 SendGrid is ready for production use!
```

### Test Password Reset

1. Go to your website's "Forgot Password" page
2. Enter an email address
3. Check that you receive the OTP email
4. Verify the OTP works for password reset

## 🛠️ **Troubleshooting**

### If you still get 503 errors:

1. **Check API Key Format**

   - Must start with `SG.`
   - Should be about 70 characters long
   - No spaces or extra characters

2. **Verify SendGrid Account**

   - Log into SendGrid dashboard
   - Check if account is active
   - Verify sender authentication is set up

3. **Check Server Logs**

   - Look for SendGrid-related error messages
   - Check if API key is being loaded correctly

4. **Test API Key Manually**
   ```bash
   curl -X POST "https://api.sendgrid.com/v3/mail/send" \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"support@viktoriasbistro.restaurant"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
   ```

## 🔒 **Security Best Practices**

1. **Never commit API keys to git**
2. **Use environment variables only**
3. **Rotate API keys regularly**
4. **Use restricted API keys with minimal permissions**

## 📧 **Email Configuration**

Current email settings:

- **From Email**: support@viktoriasbistro.restaurant
- **From Name**: Viktoria's Bistro
- **Subject**: Your Viktoria's Bistro Verification Code - [OTP]

## 🚀 **After Setup**

Once SendGrid is properly configured:

- ✅ Password reset emails will be sent automatically
- ✅ Users can reset passwords by checking their email
- ✅ No more 503 errors in the console
- ✅ Professional email delivery with restaurant branding

## 📞 **Support**

If you continue to have issues:

1. Check the server logs for detailed error messages
2. Verify your SendGrid account status
3. Test the API key manually using the curl command above
4. Contact SendGrid support if the API key is valid but emails aren't sending

---

**Status**: 🔧 **Ready for SendGrid API key configuration**
