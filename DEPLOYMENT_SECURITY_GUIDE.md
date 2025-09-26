# 🔒 Production Deployment Security Guide

## Overview
This guide covers securing your Viktoria's Bistro OTP system for production deployment.

## ✅ Security Measures Implemented

### 1. API Key Protection
- ✅ **API Key Masking**: Logs show only first 8 and last 4 characters
- ✅ **Environment Variables**: API keys stored in environment files
- ✅ **Validation**: Proper validation of API key configuration

### 2. Rate Limiting
- ✅ **IP-based Rate Limiting**: 5 requests per 15 minutes per IP
- ✅ **OTP Endpoint Protection**: All OTP endpoints protected
- ✅ **Automatic Reset**: Rate limits reset after window expires

### 3. Input Validation
- ✅ **Email Validation**: Proper email format validation
- ✅ **OTP Validation**: 6-digit numeric validation
- ✅ **Request Validation**: Required field validation

## 🚀 Production Deployment Steps

### Step 1: Environment Configuration

1. **Create Production Environment File**:
   ```bash
   cp production.env.template .env
   ```

2. **Update Production Values**:
   ```env
   # Replace with your actual values
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   NODE_ENV=production
   BASE_URL=https://your-domain.com
   ```

### Step 2: Security Configuration

1. **Generate Secure Secrets**:
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate session secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update Security Variables**:
   ```env
   JWT_SECRET=your_generated_jwt_secret
   SESSION_SECRET=your_generated_session_secret
   ```

### Step 3: Server Configuration

1. **Update Server Settings**:
   ```env
   PORT=5001
   NODE_ENV=production
   LOG_LEVEL=info
   ```

2. **Configure CORS**:
   ```env
   ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```

### Step 4: Database Configuration (Optional)

For production, consider using a database instead of in-memory storage:

```env
# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/viktoria_bistro

# MongoDB
DATABASE_URL=mongodb://localhost:27017/viktoria_bistro

# Redis (for rate limiting)
REDIS_URL=redis://localhost:6379
```

## 🔐 Security Best Practices

### 1. Environment Variables
- ✅ **Never commit `.env` files** to version control
- ✅ **Use different keys** for development and production
- ✅ **Rotate API keys** regularly
- ✅ **Use environment-specific configurations**

### 2. API Key Management
- ✅ **Restrict SendGrid permissions** to minimum required
- ✅ **Monitor API usage** in SendGrid dashboard
- ✅ **Set up alerts** for unusual activity
- ✅ **Use IP whitelisting** if possible

### 3. Server Security
- ✅ **Use HTTPS** in production
- ✅ **Enable CORS** with specific origins
- ✅ **Implement rate limiting**
- ✅ **Add request logging**
- ✅ **Use reverse proxy** (nginx/Apache)

### 4. Monitoring
- ✅ **Monitor OTP generation rates**
- ✅ **Track failed verification attempts**
- ✅ **Set up alerts** for suspicious activity
- ✅ **Log security events**

## 🛡️ Additional Security Measures

### 1. IP Whitelisting
Add IP whitelisting middleware:
```javascript
const allowedIPs = ['192.168.1.0/24', '10.0.0.0/8'];

function ipWhitelistMiddleware(req, res, next) {
    const clientIP = req.ip;
    // Check if IP is in whitelist
    // Allow or deny request
}
```

### 2. Request Validation
Enhanced validation for production:
```javascript
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

function validateOTP(otp) {
    return /^\d{6}$/.test(otp);
}
```

### 3. Database Security
If using database:
- ✅ **Use connection pooling**
- ✅ **Enable SSL connections**
- ✅ **Implement query sanitization**
- ✅ **Use prepared statements**

## 📊 Production Monitoring

### 1. Health Checks
```javascript
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
```

### 2. Metrics Endpoint
```javascript
app.get('/metrics', (req, res) => {
    res.json({
        otpGenerated: otpStorage.size,
        rateLimitHits: rateLimitStorage.size,
        uptime: process.uptime()
    });
});
```

## 🚨 Security Checklist

Before going to production:

- [ ] **Environment variables** properly configured
- [ ] **API keys** secured and masked in logs
- [ ] **Rate limiting** enabled and tested
- [ ] **HTTPS** configured
- [ ] **CORS** properly configured
- [ ] **Input validation** implemented
- [ ] **Error handling** doesn't expose sensitive data
- [ ] **Logging** configured for security events
- [ ] **Monitoring** set up
- [ ] **Backup strategy** implemented
- [ ] **Disaster recovery** plan ready

## 🔧 Deployment Commands

### Development
```bash
npm install
node server.js
```

### Production
```bash
npm install --production
NODE_ENV=production node server.js
```

### With PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name "viktoria-bistro"
pm2 startup
pm2 save
```

## 📞 Support

If you encounter security issues:
1. **Check logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test rate limiting** functionality
4. **Monitor API usage** in SendGrid dashboard
5. **Check server health** endpoints

## 🎯 Security Summary

Your OTP system is now **production-ready** with:
- ✅ **Secure API key handling**
- ✅ **Rate limiting protection**
- ✅ **Input validation**
- ✅ **Environment-based configuration**
- ✅ **Comprehensive logging**
- ✅ **Monitoring capabilities**

The system is secure and ready for production deployment! 🚀
