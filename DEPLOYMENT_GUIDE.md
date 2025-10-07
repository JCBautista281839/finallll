# Viktoria's Bistro - Production Deployment Guide

## Prerequisites

1. **Server Requirements:**
   - Ubuntu 20.04+ or similar Linux distribution
   - Node.js 18.x or higher
   - npm 8.x or higher
   - 2GB+ RAM recommended
   - 10GB+ disk space

2. **Domain Setup:**
   - Domain: `viktoriasbistro.restaurant`
   - DNS A record pointing to your server IP
   - SSL certificate installed (Let's Encrypt recommended)

3. **Required API Keys:**
   - SendGrid API key (for email OTP)
   - Firebase service account (for authentication)
   - Lalamove API credentials (optional, for delivery)
   - Google Maps API key (optional, for geocoding)

## Step 1: Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 8.x.x or higher

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/viktorias-bistro
cd /var/www/viktorias-bistro

# Clone your repository (replace with your repo URL)
git clone https://github.com/your-username/viktorias-bistro.git .

# Or upload files via SCP/SFTP
```

## Step 3: Configure Environment Variables

```bash
# Create .env file from production template
cp env.production .env

# Edit .env file with your actual credentials
nano .env
```

**Required environment variables:**

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key
SENDGRID_FROM_EMAIL=support@viktoriasbistro.restaurant
SENDGRID_FROM_NAME=Viktoria's Bistro

# Server Configuration
PORT=5001
BASE_URL=https://viktoriasbistro.restaurant
NODE_ENV=production

# Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=5
```

## Step 4: Firebase Setup

1. Download your Firebase service account key from:
   - Firebase Console → Project Settings → Service Accounts → Generate New Private Key

2. Save it as `firebase-service-account.json` in the project root:

```bash
nano firebase-service-account.json
# Paste the JSON content
```

3. Set proper permissions:

```bash
chmod 600 firebase-service-account.json
```

## Step 5: Deploy Application

```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Run deployment script
./deploy-production.sh
```

The script will:
- Install dependencies
- Configure environment
- Start the server with PM2
- Set up auto-restart
- Display status and logs

## Step 6: Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/viktorias-bistro
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name viktoriasbistro.restaurant www.viktoriasbistro.restaurant;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name viktoriasbistro.restaurant www.viktoriasbistro.restaurant;
    
    # SSL Configuration (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/viktoriasbistro.restaurant/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/viktoriasbistro.restaurant/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5001/health;
        access_log off;
    }
    
    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Large file upload support
    client_max_body_size 10M;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/viktorias-bistro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Setup SSL Certificate

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d viktoriasbistro.restaurant -d www.viktoriasbistro.restaurant

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 8: Verify Deployment

### 1. Check Server Status

```bash
pm2 status
pm2 logs viktorias-bistro --lines 50
```

### 2. Test Health Endpoint

```bash
# Local test
curl http://localhost:5001/health

# Public test
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

### 3. Test OTP Endpoint

```bash
curl -X POST https://viktoriasbistro.restaurant/api/sendgrid-send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userName":"Test User"}'
```

### 4. Check Logs

```bash
# PM2 logs
pm2 logs viktorias-bistro

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## Step 9: Setup Monitoring

### Enable PM2 Monitoring

```bash
# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions to run the generated command with sudo

# Monitor in real-time
pm2 monit
```

### Setup Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Troubleshooting

### Issue: 503 Service Unavailable

**Symptoms:** Server returns 503 error

**Solutions:**

1. Check if PM2 process is running:
   ```bash
   pm2 status
   ```

2. Restart the application:
   ```bash
   pm2 restart viktorias-bistro
   ```

3. Check logs for errors:
   ```bash
   pm2 logs viktorias-bistro --lines 100
   ```

4. Verify environment variables:
   ```bash
   pm2 env viktorias-bistro
   ```

### Issue: SendGrid emails not sending

**Symptoms:** OTP generated but email not received

**Solutions:**

1. Verify SendGrid API key:
   ```bash
   grep SENDGRID_API_KEY .env
   ```

2. Check SendGrid dashboard for sending activity

3. Verify email reputation and sender authentication

4. Check server logs:
   ```bash
   pm2 logs viktorias-bistro | grep SendGrid
   ```

### Issue: Firebase authentication errors

**Symptoms:** User authentication fails

**Solutions:**

1. Verify firebase-service-account.json exists:
   ```bash
   ls -la firebase-service-account.json
   ```

2. Check Firebase configuration in logs:
   ```bash
   pm2 logs viktorias-bistro | grep Firebase
   ```

3. Verify Firebase project ID matches

### Issue: Port already in use

**Symptoms:** Error: listen EADDRINUSE

**Solutions:**

1. Find process using the port:
   ```bash
   sudo lsof -i :5001
   ```

2. Kill the process or change port in .env

3. Restart PM2:
   ```bash
   pm2 restart viktorias-bistro
   ```

## Maintenance Commands

```bash
# Restart application
pm2 restart viktorias-bistro

# Stop application
pm2 stop viktorias-bistro

# View logs
pm2 logs viktorias-bistro

# Monitor resources
pm2 monit

# Update application
cd /var/www/viktorias-bistro
git pull origin main
npm install --production
pm2 restart viktorias-bistro

# Backup database (if using external DB)
# Add your backup commands here

# Check disk space
df -h

# Check memory usage
free -m
```

## Security Recommendations

1. **Firewall Configuration:**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Secure Sensitive Files:**
   ```bash
   chmod 600 .env
   chmod 600 firebase-service-account.json
   ```

4. **Setup Fail2Ban:**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

5. **Regular Backups:**
   - Setup automated backups of:
     - .env file
     - firebase-service-account.json
     - Database (if applicable)
     - User uploads directory

## Performance Optimization

1. **Enable Gzip Compression in Nginx:**
   Add to nginx configuration:
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_min_length 256;
   gzip_types text/plain text/css text/xml text/javascript 
              application/x-javascript application/xml+rss 
              application/json application/javascript;
   ```

2. **Setup Redis for Session Storage (optional):**
   ```bash
   sudo apt install -y redis-server
   sudo systemctl enable redis-server
   ```

3. **Configure PM2 Cluster Mode (for high traffic):**
   ```bash
   pm2 start server.js -i max --name "viktorias-bistro"
   ```

## Support

For issues or questions:
- Check logs: `pm2 logs viktorias-bistro`
- Review health check: `curl https://viktoriasbistro.restaurant/health`
- Contact system administrator

## Update History

- **2024-01-XX:** Initial deployment guide created
- **2024-XX-XX:** Added health check endpoints
- **2024-XX-XX:** Enhanced error handling and logging

