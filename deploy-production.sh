#!/bin/bash
# Production Deployment Script for Viktoria's Bistro
# Run this script on your production server

set -e  # Exit on error

echo "🚀 Starting Viktoria's Bistro Production Deployment..."
echo "📅 Deployment started at: $(date)"
echo ""

# Check if Node.js is installed
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
echo "🔍 Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi
echo "✅ npm version: $(npm -v)"
echo ""

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory ready"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production
echo "✅ Dependencies installed"
echo ""

# Check if .env file exists
echo "🔍 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from env.production..."
    if [ -f "env.production" ]; then
        cp env.production .env
        echo "✅ .env file created from env.production"
    else
        echo "❌ env.production file not found. Please create .env file manually."
        exit 1
    fi
else
    echo "✅ .env file exists"
fi
echo ""

# Validate critical environment variables
echo "🔐 Validating environment variables..."
source .env
if [ -z "$SENDGRID_API_KEY" ]; then
    echo "⚠️  WARNING: SENDGRID_API_KEY is not set!"
else
    echo "✅ SendGrid API key configured"
fi

if [ -z "$BASE_URL" ]; then
    echo "⚠️  WARNING: BASE_URL is not set!"
else
    echo "✅ Base URL configured: $BASE_URL"
fi

if [ -z "$PORT" ]; then
    echo "⚠️  WARNING: PORT is not set, using default 5001"
    export PORT=5001
else
    echo "✅ Port configured: $PORT"
fi
echo ""

# Check if PM2 is installed
echo "🔍 Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 for production process management..."
    npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed: $(pm2 -v)"
fi
echo ""

# Stop existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop viktorias-bistro 2>/dev/null || echo "⚠️  No existing process to stop"
pm2 delete viktorias-bistro 2>/dev/null || echo "⚠️  No existing process to delete"
echo ""

# Start the application with PM2 using ecosystem config
echo "🚀 Starting Viktoria's Bistro server with PM2..."
if [ -f "ecosystem.config.json" ]; then
    pm2 start ecosystem.config.json --env production
    echo "✅ Started using ecosystem.config.json"
else
    pm2 start server.js --name "viktorias-bistro" --env production
    echo "✅ Started using default configuration"
fi
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save
echo "✅ PM2 configuration saved"
echo ""

# Setup PM2 startup script
echo "🔧 Setting up PM2 startup script..."
pm2 startup || echo "⚠️  PM2 startup setup requires sudo privileges"
echo ""

# Show status
echo "📊 Application Status:"
pm2 status
echo ""

# Show logs (last 20 lines)
echo "📜 Recent logs:"
pm2 logs viktorias-bistro --lines 20 --nostream
echo ""

# Test health check endpoint
echo "🏥 Testing health check endpoint..."
if command -v curl &> /dev/null; then
    sleep 2
    if curl -s "http://localhost:${PORT:-5001}/health" > /dev/null 2>&1; then
        echo "✅ Health check passed"
        curl -s "http://localhost:${PORT:-5001}/health" | head -n 10
    else
        echo "⚠️  Health check failed - server may not be responding"
        echo "   Check logs with: pm2 logs viktorias-bistro"
    fi
else
    echo "⚠️  curl not installed, skipping health check test"
fi
echo ""

echo "=========================================="
echo "✅ Viktoria's Bistro is now running!"
echo "=========================================="
echo "🌐 Server: ${BASE_URL:-https://viktoriasbistro.restaurant}"
echo "🔌 Port: ${PORT:-5001}"
echo "📧 SendGrid: ${SENDGRID_API_KEY:+Configured}${SENDGRID_API_KEY:-Not Configured}"
echo "🔥 Firebase: $([ -f "firebase-service-account.json" ] && echo "Configured" || echo "Not Configured")"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status                    - Check application status"
echo "  pm2 logs viktorias-bistro     - View application logs"
echo "  pm2 restart viktorias-bistro  - Restart application"
echo "  pm2 stop viktorias-bistro     - Stop application"
echo "  pm2 monit                     - Monitor application"
echo ""
echo "🏥 Health checks:"
echo "  curl http://localhost:${PORT:-5001}/health"
echo "  curl ${BASE_URL:-https://viktoriasbistro.restaurant}/health"
echo ""
echo "🎉 Deployment complete at: $(date)"
echo "=========================================="
