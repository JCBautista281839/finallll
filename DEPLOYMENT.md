# Deployment Guide for Viktoria's Bistro with Lalamove Integration

## Current Issue: Lalamove Webhook "Destination Host Unreachable"

### Root Causes Identified:
1. **Node.js server not running** on the deployed website
2. **Hardcoded localhost references** in test routes (FIXED)
3. **Missing production environment configuration**

## Solution Steps:

### 1. Deploy Node.js Server to Production

Your website `viktoriasbistro.restaurant` needs to be running the Node.js server, not just static HTML files.

**Deployment Options:**
- **VPS/Cloud Server** (Recommended): DigitalOcean, AWS, Google Cloud, Linode
- **Platform as a Service**: Heroku, Railway, Render, Vercel (with serverless functions)
- **Shared Hosting with Node.js support**

### 2. Environment Configuration

**For Production Deployment:**
1. Copy `.env.production` to your server as `.env`
2. **IMPORTANT**: Replace test API keys with production keys from Lalamove:
   ```env
   LALAMOVE_API_KEY=pk_live_your_production_key
   LALAMOVE_API_SECRET=sk_live_your_production_secret
   ```

### 3. Webhook URL Setup

Once your Node.js server is running on `viktoriasbistro.restaurant`, use this webhook URL in Lalamove portal:

```
https://viktoriasbistro.restaurant/api/webhook/lalamove
```

### 4. Server Deployment Commands

```bash
# On your production server:
npm install
NODE_ENV=production npm start
```

### 5. Verify Deployment

Test these endpoints to ensure your server is running:
- `https://viktoriasbistro.restaurant` (main site)
- `https://viktoriasbistro.restaurant/api/webhook/lalamove` (should return 404 for GET, but server should respond)

### 6. Common Issues & Solutions

**Issue**: "Destination host unreachable"
- **Solution**: Ensure Node.js server is running and accessible on port 80/443

**Issue**: "Webhook timeout"
- **Solution**: Check firewall settings, ensure port 80/443 is open

**Issue**: "Invalid signature"
- **Solution**: Verify Lalamove API keys are correctly set in production

### 7. Testing the Integration

1. **Deploy the server** with production environment
2. **Update webhook URL** in Lalamove portal
3. **Create a test order** through your POS system
4. **Check server logs** for webhook receipt confirmation

## Files Modified:
- `server.js`: Fixed hardcoded localhost, improved logging
- `.env.production`: Production environment configuration
- `DEPLOYMENT.md`: This deployment guide

## Next Steps:
1. Choose hosting provider
2. Deploy Node.js application
3. Configure environment variables
4. Update Lalamove webhook URL
5. Test integration