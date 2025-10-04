# Viktoria's Bistro - Restaurant Management System

A comprehensive restaurant management system with POS, inventory management, customer ordering, and delivery integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Firebase project setup
- SendGrid account (for email functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd finallll
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the secure environment file
   cp config.env.secure config.env
   
   # Edit config.env with your actual API keys
   nano config.env
   ```

4. **Required API Keys**
   
   **SendGrid (for email OTP):**
   - Get API key from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
   - Update `SENDGRID_API_KEY` in config.env
   
   **Firebase:**
   - Download service account key from Firebase Console
   - Save as `firebase-service-account.json` in project root
   
   **Lalamove (for delivery):**
   - Get API credentials from Lalamove Developer Portal
   - Update `LALAMOVE_API_KEY` and `LALAMOVE_API_SECRET` in config.env

5. **Start the server**
   ```bash
   npm start
   # or
   node server.js
   ```

6. **Access the application**
   - Main app: http://localhost:5001
   - Admin Dashboard: http://localhost:5001/html/Dashboard.html
   - Customer Portal: http://localhost:5001/index.html

## 📧 Email Configuration

The system supports two email methods:

### Option 1: SendGrid (Recommended)
1. Create SendGrid account
2. Generate API key
3. Update `SENDGRID_API_KEY` in config.env

### Option 2: Gmail SMTP
1. Enable 2-Factor Authentication on Gmail
2. Generate App Password
3. Update `GMAIL_USER` and `GMAIL_APP_PASSWORD` in config.env

## 🔐 Authentication Flow

1. **Customer Signup**: Fill form → OTP sent to email
2. **OTP Verification**: Enter code → Firebase account created
3. **Login**: Use email/password → Access customer features
4. **Admin Access**: Staff accounts redirect to Dashboard

## 📁 Project Structure

```
finallll/
├── html/                 # HTML pages
├── css/                  # Stylesheets
├── javascript/           # Frontend JavaScript
├── customer/             # Customer-facing pages
├── OMR/                  # OMR scanner integration
├── server.js             # Main server file
├── config.env            # Environment variables (secure)
├── config.env.secure     # Template with real keys
└── .gitignore           # Git ignore rules
```

## 🛡️ Security Notes

- **Never commit** `config.env` with real API keys
- **Never commit** `firebase-service-account.json`
- Use `config.env.secure` as template only
- All sensitive files are in `.gitignore`

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run server` - Start server manually

### Environment Variables
All configuration is in `config.env`. Key variables:
- `SENDGRID_API_KEY` - Email service API key
- `PORT` - Server port (default: 5001)
- `LALAMOVE_API_KEY` - Delivery service API key
- `GOOGLE_MAPS_API_KEY` - Maps integration (optional)

## 📱 Features

- **POS System**: Point of sale with order management
- **Inventory Management**: Stock tracking and alerts
- **Customer Portal**: Online ordering and account management
- **Delivery Integration**: Lalamove API integration
- **Email OTP**: Secure account verification
- **Analytics Dashboard**: Sales and performance metrics
- **Multi-role Access**: Admin, staff, and customer roles

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 5001 is available
   - Verify Node.js version (18.x+)
   - Check `config.env` file exists

2. **Email not sending**
   - Verify SendGrid API key
   - Check email configuration in config.env
   - Test with Gmail SMTP as fallback

3. **Firebase errors**
   - Verify `firebase-service-account.json` exists
   - Check Firebase project configuration
   - Ensure Firestore rules allow access

### Support
For issues and questions, check the console logs and verify all environment variables are properly set.

## 📄 License

This project is proprietary software for Viktoria's Bistro.
