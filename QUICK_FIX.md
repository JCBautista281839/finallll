# Quick Fix for 503 Service Unavailable Error

## Problem
Your production website at `https://viktoriasbistro.restaurant` is returning **503 Service Unavailable** when trying to send OTP emails.

## Root Cause
The Node.js server is either:
1. **Not running** on the production server
2. **Crashed** due to an error
3. **Not properly configured** with environment variables
4. **Not accessible** due to firewall/network issues

## Quick Fix Steps

### Step 1: Check Server Status

SSH into your production server and run:

```bash
pm2 status
```

**If the server is not running:**
- You'll see "viktorias-bistro" with status "stopped" or not listed at all

**If the server is running but errored:**
- You'll see "viktorias-bistro" with status "errored"

### Step 2: View Logs

```bash
pm2 logs viktorias-bistro --lines 100
```

Look for errors like:
- ❌ "SENDGRID_API_KEY not found"
- ❌ "Cannot find module"
- ❌ "Port already in use"
- ❌ "Firebase Admin SDK not configured"

### Step 3: Run Diagnostic Script

```bash
cd /var/www/viktorias-bistro  # Or your deployment directory
chmod +x diagnose-deployment.sh
./diagnose-deployment.sh
```

This will check:
- ✅ Node.js and npm installation
- ✅ PM2 process status
- ✅ Environment variables
- ✅ Port availability
- ✅ Health check endpoint
- ✅ Recent logs

### Step 4: Fix Common Issues

#### Issue A: Server Not Running

**Solution:**
```bash
cd /var/www/viktorias-bistro
chmod +x deploy-production.sh
./deploy-production.sh
```

This will:
1. Install dependencies
2. Load environment variables
3. Start the server with PM2
4. Test health check

#### Issue B: Missing .env File

**Solution:**
```bash
cd /var/www/viktorias-bistro

# Copy production template
cp env.production .env

# Edit with your credentials
nano .env

# Verify SendGrid API key is set
grep SENDGRID_API_KEY .env

# Restart server
pm2 restart viktorias-bistro
```

#### Issue C: SendGrid API Key Not Working

**Solution:**
```bash
# Test SendGrid API key
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "support@viktoriasbistro.restaurant"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

If you get an authentication error:
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create a new API key with "Full Access"
3. Update .env file with new key
4. Restart: `pm2 restart viktorias-bistro`

#### Issue D: Port Already in Use

**Solution:**
```bash
# Find process using port 5001
sudo lsof -i :5001

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID

# Or change port in .env
nano .env
# Change PORT=5001 to PORT=5002

# Restart
pm2 restart viktorias-bistro
```

#### Issue E: Firebase Service Account Missing

**Solution:**
```bash
cd /var/www/viktorias-bistro

# Create firebase-service-account.json
nano firebase-service-account.json

# Paste your Firebase service account JSON
# Get it from: Firebase Console → Project Settings → Service Accounts

# Set proper permissions
chmod 600 firebase-service-account.json

# Restart
pm2 restart viktorias-bistro
```

### Step 5: Verify Fix

After fixing, test the health endpoint:

```bash
# Test locally on server
curl http://localhost:5001/health

# Test publicly
curl https://viktoriasbistro.restaurant/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "uptime": 123.45,
  "environment": "production",
  "sendgridConfigured": true,
  "firebaseInitialized": true
}
```

### Step 6: Test OTP Functionality

```bash
# Test OTP endpoint
curl -X POST https://viktoriasbistro.restaurant/api/sendgrid-send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","userName":"Test User"}'
```

Expected response:
```json
{
  "success": true,
  "otp": "123456",
  "expiry": 1234567890,
  "message": "SendGrid OTP generated and email sent successfully",
  "emailSent": true
}
```

## If Still Not Working

### 1. Check Nginx Configuration

```bash
# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 2. Check Firewall

```bash
# Check if port 5001 is allowed
sudo ufw status

# Allow port if needed
sudo ufw allow 5001
```

### 3. Check DNS

```bash
# Verify DNS points to your server
nslookup viktoriasbistro.restaurant
dig viktoriasbistro.restaurant

# Should return your server's IP address
```

### 4. Check SSL Certificate

```bash
# Test SSL
curl -v https://viktoriasbistro.restaurant/health

# Renew if expired
sudo certbot renew
```

### 5. Restart Everything

```bash
# Stop PM2
pm2 stop viktorias-bistro
pm2 delete viktorias-bistro

# Restart Nginx
sudo systemctl restart nginx

# Re-deploy
./deploy-production.sh

# Check status
pm2 status
pm2 logs viktorias-bistro --lines 50
```

## Emergency Fallback

If you can't fix it immediately, enable local OTP fallback on the frontend:

The system already has a fallback mechanism that generates OTP locally when the server is unavailable. However, emails won't be sent.

## Need Help?

1. **Check logs:**
   ```bash
   pm2 logs viktorias-bistro --lines 200
   ```

2. **Run diagnostics:**
   ```bash
   ./diagnose-deployment.sh
   ```

3. **Monitor in real-time:**
   ```bash
   pm2 monit
   ```

4. **Check system resources:**
   ```bash
   top
   df -h
   free -h
   ```

## Prevention

To avoid this in the future:

1. **Set up monitoring:**
   ```bash
   pm2 startup
   pm2 save
   ```

2. **Enable auto-restart:**
   - Already configured in `ecosystem.config.json`

3. **Set up alerts:**
   - Use PM2 Plus: https://pm2.io/
   - Or setup email alerts on server errors

4. **Regular health checks:**
   - Setup a cron job to ping /health endpoint
   - Alert if health check fails

## Contact

If none of these solutions work:
- Share the output of `./diagnose-deployment.sh`
- Share PM2 logs: `pm2 logs viktorias-bistro --lines 200`
- Check server system logs: `sudo tail -100 /var/log/syslog`

