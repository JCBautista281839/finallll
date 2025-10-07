#!/bin/bash
# Production Deployment Script for Viktoria's Bistro
# Run this script on your production server

echo "🚀 Starting Viktoria's Bistro Production Deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from env.production..."
    if [ -f "env.production" ]; then
        cp env.production .env
        echo "✅ .env file created from env.production"
    else
        echo "❌ env.production file not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 for production process management..."
    npm install -g pm2
fi

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop viktorias-bistro 2>/dev/null || true
pm2 delete viktorias-bistro 2>/dev/null || true

# Start the application with PM2
echo "🚀 Starting Viktoria's Bistro server..."
pm2 start server.js --name "viktorias-bistro" --env production

# Save PM2 configuration
pm2 save

# Show status
echo "📊 Application Status:"
pm2 status

echo ""
echo "✅ Viktoria's Bistro is now running in production!"
echo "🌐 Server: https://viktoriasbistro.restaurant"
echo "📧 SendGrid: Configured and ready"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs viktorias-bistro - View application logs"
echo "  pm2 restart viktorias-bistro - Restart application"
echo "  pm2 stop viktorias-bistro - Stop application"
echo ""
echo "🎉 Deployment complete!"
