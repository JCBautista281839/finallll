#!/bin/bash
# setup.sh - Environment setup script for Viktoria's Bistro

echo "🍽️  Viktoria's Bistro - Environment Setup"
echo "=========================================="

# Check if config.env already exists
if [ -f "config.env" ]; then
    echo "⚠️  config.env already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Copy secure config to config.env
if [ -f "config.env.secure" ]; then
    cp config.env.secure config.env
    echo "✅ Copied config.env.secure to config.env"
else
    echo "❌ config.env.secure not found!"
    echo "Please create config.env.secure with your API keys first."
    exit 1
fi

# Check for required files
echo ""
echo "🔍 Checking required files..."

if [ ! -f "firebase-service-account.json" ]; then
    echo "⚠️  firebase-service-account.json not found!"
    echo "   Please download it from Firebase Console > Project Settings > Service Accounts"
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found! Are you in the right directory?"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check Node.js version
echo ""
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected. Version 18+ recommended."
else
    echo "✅ Node.js version $NODE_VERSION is compatible"
fi

# Final instructions
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit config.env with your actual API keys:"
echo "   - SENDGRID_API_KEY (get from SendGrid Dashboard)"
echo "   - LALAMOVE_API_KEY and LALAMOVE_API_SECRET (get from Lalamove)"
echo "   - GOOGLE_MAPS_API_KEY (optional, for maps integration)"
echo ""
echo "2. Ensure firebase-service-account.json is in the project root"
echo ""
echo "3. Start the server:"
echo "   npm start"
echo ""
echo "4. Access the application:"
echo "   - Main app: http://localhost:5001"
echo "   - Admin Dashboard: http://localhost:5001/html/Dashboard.html"
echo ""
echo "🔒 Security reminder:"
echo "   - Never commit config.env to version control"
echo "   - Never commit firebase-service-account.json"
echo "   - All sensitive files are in .gitignore"
