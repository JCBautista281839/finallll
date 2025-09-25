# 🔐 Environment Setup Instructions

## Setting up your SendGrid API Key

To secure your SendGrid API key and prevent it from being exposed on GitHub, follow these steps:

### 1. Create a `.env` file in your project root

Create a file named `.env` in the same directory as your `server.js` file with the following content:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=support@viktoriasbistro.restaurant
SENDGRID_FROM_NAME=Viktoria's Bistro

# Server Configuration
PORT=5001
NODE_ENV=development
```

**Important:** Replace `your_sendgrid_api_key_here` with your actual SendGrid API key from your SendGrid dashboard.

### 2. Verify `.gitignore` is updated

Make sure your `.gitignore` file includes:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 3. Test your setup

1. Restart your server: `node server.js`
2. Check the console output to verify SendGrid is configured
3. Test the OTP functionality using the test page: `http://localhost:5001/test-sendgrid-otp.html`

### 4. For Production Deployment

When deploying to production (like Heroku, Vercel, etc.), set these environment variables in your hosting platform:

- `SENDGRID_API_KEY`: Your SendGrid API key
- `SENDGRID_FROM_EMAIL`: Your verified sender email
- `SENDGRID_FROM_NAME`: Your business name

### 5. Security Benefits

✅ API key is not exposed in your GitHub repository  
✅ Different environments can use different keys  
✅ Easy to rotate keys without changing code  
✅ Follows security best practices  

### 6. Troubleshooting

If you see "API Key: Configured" in the server startup logs, your environment variables are working correctly.

If you see any errors, make sure:
- The `.env` file is in the correct location (same directory as server.js)
- The file doesn't have any extra spaces or quotes around the values
- You've restarted the server after creating the `.env` file
