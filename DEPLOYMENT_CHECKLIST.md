# Deployment Checklist for Forgot Password Fix

## Files to Upload to Server

### 1. HTML Files

- [ ] `html/reset-password.html` (updated with v=2.5)
- [ ] `html/verify-password-reset-otp.html` (if modified)

### 2. JavaScript Files

- [ ] `javascript/reset-password.js` (with null checks)
- [ ] `javascript/sendgrid-otp.js` (updated OTP handling)
- [ ] `javascript/config.js` (improved environment detection)
- [ ] `javascript/forgot-password.js` (if modified)

### 3. CSS Files

- [ ] `css/login.css` (added password strength styles)

### 4. Server Files

- [ ] `server.js` (updated API endpoints)
- [ ] `env.production` (SendGrid configuration)

## Deployment Steps

### Step 1: Upload Files

1. Connect to your server (FTP, SSH, or hosting panel)
2. Upload all the files listed above
3. Ensure file permissions are correct (644 for files, 755 for directories)

### Step 2: Restart Server

If using Node.js server:

```bash
# If using PM2
pm2 restart your-app-name

# If using systemd
sudo systemctl restart your-app-name

# If running directly
# Stop current process (Ctrl+C) and restart
node server.js
```

### Step 3: Clear Cache

1. Clear browser cache (Ctrl+Shift+R)
2. Or open Developer Tools → Network → Disable cache
3. Test the page again

### Step 4: Verify Deployment

1. Go to: https://viktoriasbistro.restaurant/html/reset-password.html
2. Open Developer Tools → Console
3. Look for: "Reset Password page loaded" from `reset-password.js?v=2.5`
4. If you see `v=2.3` or `v=2.4`, the file wasn't uploaded properly

## Troubleshooting

### If files still not updating:

1. Check file upload was successful
2. Verify file permissions
3. Check server logs for errors
4. Try accessing the file directly: https://viktoriasbistro.restaurant/javascript/reset-password.js
5. Clear CDN cache if using one

### If JavaScript errors persist:

1. Check browser console for specific errors
2. Verify all dependencies are loaded
3. Check network tab for failed requests
4. Ensure API endpoints are accessible

## Testing Checklist

After deployment, test:

- [ ] Forgot password page loads without errors
- [ ] OTP sending works
- [ ] OTP verification works
- [ ] Password reset works
- [ ] Login with new password works
- [ ] Error messages display correctly
- [ ] All links and navigation work

## Contact Information

If issues persist after following this checklist:

1. Check server logs
2. Verify environment variables are set
3. Test API endpoints directly
4. Check SendGrid configuration
