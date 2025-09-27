# Environment Setup Instructions

## 🔐 API Key Security Setup

To protect your API keys from being exposed on GitHub, follow these steps:

### 1. Create Environment File
Create a `.env` file in your project root with the following content:

```env
# SendGrid Email Configuration
# Get your API key from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=your_actual_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=support@viktoriasbistro.restaurant
SENDGRID_FROM_NAME=Viktoria's Bistro

# Server Configuration
PORT=5001
BASE_URL=http://localhost:5001

# Security Configuration
NODE_ENV=development
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=5

# Lalamove Configuration (for delivery)
LALAMOVE_API_KEY=your_lalamove_api_key_here
LALAMOVE_API_SECRET=your_lalamove_api_secret_here
LALAMOVE_MARKET=PH

# Google Maps API Key (optional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Monitoring and Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### 2. Replace Placeholder Values
- Replace `your_actual_sendgrid_api_key_here` with your real SendGrid API key
- Replace `your_lalamove_api_key_here` and `your_lalamove_api_secret_here` with your Lalamove credentials
- Replace `your_google_maps_api_key_here` with your Google Maps API key (if using)

### 3. Security Notes
- ✅ The `.env` file is automatically ignored by Git (see `.gitignore`)
- ✅ Never commit API keys to version control
- ✅ Use `env.example` as a template for other developers
- ✅ Keep your `.env` file secure and don't share it

### 4. For Production Deployment
When deploying to production:
1. Set environment variables directly in your hosting platform
2. Never upload `.env` files to production servers
3. Use secure environment variable management tools

### 5. Troubleshooting
If you get "SENDGRID_API_KEY not found" errors:
1. Make sure your `.env` file exists in the project root
2. Check that the variable name is exactly `SENDGRID_API_KEY`
3. Restart your server after creating/modifying the `.env` file

## 📧 SendGrid Setup
1. Go to [SendGrid Settings](https://app.sendgrid.com/settings/api_keys)
2. Create a new API key with "Mail Send" permissions
3. Copy the API key to your `.env` file

## 🚚 Lalamove Setup
1. Sign up at [Lalamove Developer Portal](https://developers.lalamove.com/)
2. Get your API key and secret
3. Add them to your `.env` file

## 🗺️ Google Maps Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Create an API key
4. Add it to your `.env` file
