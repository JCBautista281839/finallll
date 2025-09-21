#!/bin/bash

echo "⚫ OMR Circle Scanner Server Launcher"
echo "========================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed"
    echo "Please install Python3 from your package manager"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "omr_web_circle_scanner.py" ]; then
    echo "❌ Error: omr_web_circle_scanner.py not found!"
    echo "Please run this script from the scanner directory"
    exit 1
fi

echo "🚀 Starting OMR Server..."
echo

# Set environment variables for online access
export HOST=0.0.0.0
export PORT=5000
export DEBUG=True

# Make the script executable and start the server
chmod +x start_omr_server.py
python3 start_omr_server.py
