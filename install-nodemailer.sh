#!/bin/bash

echo "🚀 Installing nodemailer for Viktoria's Bistro OTP Service"
echo "=================================================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script in your project directory."
    exit 1
fi

echo "📦 Installing nodemailer..."
npm install nodemailer

if [ $? -eq 0 ]; then
    echo "✅ nodemailer installed successfully!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Restart your server: node server.js"
    echo "2. Test the OTP service: https://viktoriasbistro.restaurant/api/health"
    echo "3. Send test OTP: https://viktoriasbistro.restaurant/api/send-otp"
else
    echo "❌ Failed to install nodemailer. Please check your npm configuration."
    exit 1
fi
