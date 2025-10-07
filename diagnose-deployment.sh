#!/bin/bash
# Deployment Diagnostic Script for Viktoria's Bistro
# Run this on your production server to diagnose issues

echo "🔍 Viktoria's Bistro Deployment Diagnostics"
echo "==========================================="
echo ""

# Check Node.js and npm
echo "📦 Node.js and npm versions:"
node -v 2>/dev/null || echo "❌ Node.js not found"
npm -v 2>/dev/null || echo "❌ npm not found"
echo ""

# Check PM2
echo "🔧 PM2 status:"
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 installed: $(pm2 -v)"
    echo ""
    echo "PM2 Process List:"
    pm2 list
else
    echo "❌ PM2 not installed"
fi
echo ""

# Check if server process is running
echo "🔍 Checking viktorias-bistro process:"
pm2 show viktorias-bistro 2>/dev/null || echo "❌ viktorias-bistro process not found in PM2"
echo ""

# Check environment file
echo "🔐 Environment configuration:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo ""
    echo "Key environment variables:"
    if grep -q "SENDGRID_API_KEY=" .env; then
        SENDGRID_KEY=$(grep "SENDGRID_API_KEY=" .env | cut -d'=' -f2)
        if [ ! -z "$SENDGRID_KEY" ] && [ "$SENDGRID_KEY" != "your_sendgrid_api_key_here" ]; then
            echo "✅ SENDGRID_API_KEY is set"
        else
            echo "❌ SENDGRID_API_KEY is not configured"
        fi
    else
        echo "❌ SENDGRID_API_KEY not found in .env"
    fi
    
    if grep -q "BASE_URL=" .env; then
        echo "✅ BASE_URL is set: $(grep "BASE_URL=" .env | cut -d'=' -f2)"
    else
        echo "❌ BASE_URL not found in .env"
    fi
    
    if grep -q "PORT=" .env; then
        echo "✅ PORT is set: $(grep "PORT=" .env | cut -d'=' -f2)"
    else
        echo "❌ PORT not found in .env"
    fi
    
    if grep -q "NODE_ENV=" .env; then
        echo "✅ NODE_ENV is set: $(grep "NODE_ENV=" .env | cut -d'=' -f2)"
    else
        echo "⚠️  NODE_ENV not set (will default to development)"
    fi
else
    echo "❌ .env file not found"
fi
echo ""

# Check Firebase service account
echo "🔥 Firebase configuration:"
if [ -f "firebase-service-account.json" ]; then
    echo "✅ firebase-service-account.json exists"
    echo "   File size: $(du -h firebase-service-account.json | cut -f1)"
else
    echo "⚠️  firebase-service-account.json not found"
fi
echo ""

# Check port availability
echo "🔌 Port availability:"
PORT=$(grep "PORT=" .env 2>/dev/null | cut -d'=' -f2)
PORT=${PORT:-5001}
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "✅ Port $PORT is in use (server may be running)"
    echo "   Process using port:"
    lsof -i :$PORT | tail -n +2
else
    echo "❌ Port $PORT is not in use (server is NOT running)"
fi
echo ""

# Test local health check
echo "🏥 Testing local health check:"
PORT=$(grep "PORT=" .env 2>/dev/null | cut -d'=' -f2)
PORT=${PORT:-5001}
if command -v curl &> /dev/null; then
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null)
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo "✅ Health check passed (200 OK)"
        echo ""
        echo "Response:"
        curl -s http://localhost:$PORT/health 2>/dev/null | python3 -m json.tool 2>/dev/null || curl -s http://localhost:$PORT/health
    else
        echo "❌ Health check failed (HTTP $HEALTH_CHECK)"
        echo "   Server is not responding on port $PORT"
    fi
else
    echo "⚠️  curl not installed, cannot test health check"
fi
echo ""

# Test OTP endpoint
echo "📧 Testing OTP endpoint:"
if command -v curl &> /dev/null; then
    OTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$PORT/api/sendgrid-send-otp \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","userName":"Test"}' 2>/dev/null)
    if [ "$OTP_TEST" = "200" ]; then
        echo "✅ OTP endpoint responding (200 OK)"
    elif [ "$OTP_TEST" = "429" ]; then
        echo "⚠️  OTP endpoint rate limited (429)"
    elif [ "$OTP_TEST" = "000" ]; then
        echo "❌ OTP endpoint not reachable (connection failed)"
    else
        echo "❌ OTP endpoint error (HTTP $OTP_TEST)"
    fi
else
    echo "⚠️  curl not installed, cannot test OTP endpoint"
fi
echo ""

# Check recent PM2 logs
echo "📜 Recent PM2 logs (last 50 lines):"
if command -v pm2 &> /dev/null; then
    pm2 logs viktorias-bistro --lines 50 --nostream 2>/dev/null || echo "No logs available"
else
    echo "❌ PM2 not installed"
fi
echo ""

# Check disk space
echo "💾 Disk space:"
df -h . | grep -v Filesystem
echo ""

# Check memory
echo "🧠 Memory usage:"
free -h | grep -E "Mem|Swap"
echo ""

# Check Nginx status (if applicable)
echo "🌐 Nginx status:"
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
        echo ""
        echo "Nginx configuration test:"
        sudo nginx -t 2>&1 | tail -3
    else
        echo "❌ Nginx is not running"
    fi
else
    echo "⚠️  Nginx not installed"
fi
echo ""

# Summary
echo "==========================================="
echo "📊 Diagnostic Summary:"
echo "==========================================="

# Determine overall status
ISSUES=0

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed"
    ISSUES=$((ISSUES + 1))
fi

if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not installed"
    ISSUES=$((ISSUES + 1))
fi

if ! [ -f ".env" ]; then
    echo "❌ .env file missing"
    ISSUES=$((ISSUES + 1))
fi

if ! lsof -i :${PORT:-5001} > /dev/null 2>&1; then
    echo "❌ Server not running on port ${PORT:-5001}"
    ISSUES=$((ISSUES + 1))
fi

if command -v curl &> /dev/null; then
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-5001}/health 2>/dev/null)
    if [ "$HEALTH_CHECK" != "200" ]; then
        echo "❌ Health check failing (HTTP $HEALTH_CHECK)"
        ISSUES=$((ISSUES + 1))
    fi
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo "✅ No critical issues detected"
    echo "   If you're still experiencing problems, check:"
    echo "   - Firewall settings"
    echo "   - DNS configuration"
    echo "   - SSL certificate"
    echo "   - Nginx reverse proxy"
else
    echo "⚠️  Found $ISSUES issue(s) that need attention"
    echo ""
    echo "📋 Recommended actions:"
    echo "   1. Review the diagnostic output above"
    echo "   2. Fix any ❌ issues marked"
    echo "   3. Check PM2 logs: pm2 logs viktorias-bistro"
    echo "   4. Restart the server: ./deploy-production.sh"
fi

echo ""
echo "==========================================="
echo "Diagnostic complete at: $(date)"
echo "==========================================="

