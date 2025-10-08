# Deployment Checklist for Viktoria's Bistro

Use this checklist to ensure your production deployment is successful.

## Pre-Deployment Checklist

### ☐ 1. Server Requirements
- [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] Node.js 18.x installed (`node -v`)
- [ ] npm 8.x+ installed (`npm -v`)
- [ ] At least 2GB RAM available
- [ ] At least 10GB disk space available
- [ ] Server has public IP address
- [ ] Domain DNS points to server IP

### ☐ 2. API Keys and Credentials
- [ ] SendGrid API key obtained from https://app.sendgrid.com/settings/api_keys
- [ ] SendGrid sender authentication configured (support@viktoriasbistro.restaurant)
- [ ] Firebase project created
- [ ] Firebase service account JSON downloaded
- [ ] Firebase Admin SDK enabled

### ☐ 3. Domain and SSL
- [ ] Domain viktoriasbistro.restaurant purchased
- [ ] DNS A record configured
- [ ] SSL certificate ready (Let's Encrypt or commercial)
- [ ] Domain accessible via browser

### ☐ 4. Files Prepared
- [ ] `env.production` file with all credentials filled
- [ ] `firebase-service-account.json` file ready
- [ ] `deploy-production.sh` script ready
- [ ] All source code uploaded to server

## Deployment Steps

### ☐ Step 1: Server Setup
```bash
# On your production server
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx
```

- [ ] Node.js installed successfully
- [ ] PM2 installed successfully
- [ ] Nginx installed successfully
- [ ] Certbot installed successfully

### ☐ Step 2: Upload Files
```bash
# Create directory
sudo mkdir -p /var/www/viktorias-bistro
cd /var/www/viktorias-bistro

# Upload files via git, scp, or ftp
# git clone https://github.com/your-repo/viktorias-bistro.git .
```

- [ ] All files uploaded to `/var/www/viktorias-bistro`
- [ ] `server.js` file exists
- [ ] `package.json` file exists
- [ ] `env.production` file uploaded
- [ ] `firebase-service-account.json` uploaded

### ☐ Step 3: Configure Environment
```bash
cd /var/www/viktorias-bistro
cp env.production .env
nano .env  # Verify all values are correct
```

**Verify these values in .env:**
- [ ] `SENDGRID_API_KEY` is set (starts with `SG.`)
- [ ] `SENDGRID_FROM_EMAIL=support@viktoriasbistro.restaurant`
- [ ] `BASE_URL=https://viktoriasbistro.restaurant`
- [ ] `NODE_ENV=production`
- [ ] `PORT=5001`

### ☐ Step 4: Deploy Application
```bash
chmod +x deploy-production.sh
chmod +x diagnose-deployment.sh
./deploy-production.sh
```

**Expected output:**
- [ ] ✅ Dependencies installed
- [ ] ✅ .env file exists
- [ ] ✅ SendGrid API key configured
- [ ] ✅ PM2 started successfully
- [ ] ✅ Health check passed
- [ ] ✅ Application running

### ☐ Step 5: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/viktorias-bistro
```

**Copy the nginx configuration from DEPLOYMENT_GUIDE.md**

Then:
```bash
sudo ln -s /etc/nginx/sites-available/viktorias-bistro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

- [ ] Nginx configuration created
- [ ] Nginx configuration test passed
- [ ] Nginx restarted successfully

### ☐ Step 6: Setup SSL Certificate
```bash
sudo certbot --nginx -d viktoriasbistro.restaurant -d www.viktoriasbistro.restaurant
```

- [ ] SSL certificate obtained
- [ ] HTTPS redirects working
- [ ] Auto-renewal configured

### ☐ Step 7: Verify Deployment

#### Test 1: Local Health Check
```bash
curl http://localhost:5001/health
```
- [ ] Returns HTTP 200
- [ ] Response contains `"status": "healthy"`
- [ ] `sendgridConfigured: true`
- [ ] `firebaseInitialized: true`

#### Test 2: Public Health Check
```bash
curl https://viktoriasbistro.restaurant/health
```
- [ ] Returns HTTP 200
- [ ] Same response as local test
- [ ] HTTPS working (no certificate errors)

#### Test 3: OTP Endpoint
```bash
curl -X POST https://viktoriasbistro.restaurant/api/sendgrid-send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","userName":"Test User"}'
```
- [ ] Returns HTTP 200
- [ ] Response contains `"success": true`
- [ ] Response contains `"emailSent": true`
- [ ] Email received in inbox

#### Test 4: Frontend Test
1. Open `https://viktoriasbistro.restaurant/html/forgot-password.html`
2. Enter your email
3. Click "Send Reset Link"

- [ ] OTP sent successfully
- [ ] Email received with OTP code
- [ ] No 503 errors in browser console
- [ ] OTP verification works
- [ ] Password reset successful

### ☐ Step 8: Monitor and Secure

```bash
# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

- [ ] PM2 startup configured
- [ ] Firewall enabled and configured
- [ ] Log rotation configured
- [ ] Server secured

## Post-Deployment Verification

### ☐ Functionality Tests
- [ ] User can sign up with email
- [ ] OTP email is received
- [ ] User can verify OTP
- [ ] User can log in
- [ ] User can reset password
- [ ] Password reset OTP is received
- [ ] Password reset works
- [ ] All pages load correctly
- [ ] No console errors

### ☐ Performance Tests
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Health check responds quickly
- [ ] No memory leaks (check with `pm2 monit`)

### ☐ Security Checks
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] SSL certificate valid
- [ ] Rate limiting working
- [ ] Sensitive files secured (`.env`, `firebase-service-account.json`)
- [ ] No sensitive data in logs
- [ ] CORS properly configured

## Monitoring Setup

### ☐ Basic Monitoring
```bash
# Check status regularly
pm2 status

# Monitor in real-time
pm2 monit

# View logs
pm2 logs viktorias-bistro
```

- [ ] PM2 monitoring setup
- [ ] Log rotation configured
- [ ] Error alerts configured

### ☐ Advanced Monitoring (Optional)
- [ ] Setup PM2 Plus for advanced monitoring
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Setup error tracking (Sentry, Rollbar)
- [ ] Setup performance monitoring (New Relic, DataDog)

## Backup Setup

### ☐ Important Files to Backup
- [ ] `.env` file
- [ ] `firebase-service-account.json` file
- [ ] `ecosystem.config.json` file
- [ ] Database backups (if applicable)
- [ ] User uploads directory

### ☐ Automated Backups
```bash
# Create backup script
nano backup.sh
chmod +x backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /var/www/viktorias-bistro/backup.sh
```

- [ ] Backup script created
- [ ] Automated backups scheduled
- [ ] Backup restoration tested

## Troubleshooting Guide

If deployment fails, run diagnostics:

```bash
./diagnose-deployment.sh
```

Common issues:
1. **503 Error** → Server not running → Run `./deploy-production.sh`
2. **Email not sending** → Check SendGrid API key → Update `.env`
3. **Firebase errors** → Check service account JSON → Verify credentials
4. **Port in use** → Check with `lsof -i :5001` → Kill process or change port
5. **Nginx errors** → Check config → Run `sudo nginx -t`

See `QUICK_FIX.md` for detailed troubleshooting steps.

## Support Contacts

- **Technical Issues:** Check PM2 logs first
- **SendGrid Issues:** https://support.sendgrid.com/
- **Firebase Issues:** https://firebase.google.com/support
- **Server Issues:** Contact your hosting provider

## Deployment Complete! 🎉

Once all checkboxes are complete:

1. Test all functionality thoroughly
2. Monitor logs for first 24 hours
3. Set up alerts for errors
4. Document any custom configurations
5. Share access with team members

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Server IP:** _______________
**Domain:** viktoriasbistro.restaurant
**Version:** _______________

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

