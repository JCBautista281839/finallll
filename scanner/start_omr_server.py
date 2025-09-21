#!/usr/bin/env python3
"""
OMR Server Startup Script
Easy way to start the OMR Circle Scanner web server
"""

import os
import sys
import subprocess
import webbrowser
import time
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'flask', 'flask-cors', 'opencv-python', 'numpy', 'pillow'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n📦 Installing missing packages...")
        
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing_packages)
            print("✅ All packages installed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install packages: {e}")
            return False
    
    return True

def start_server():
    """Start the OMR server"""
    print("🚀 Starting OMR Circle Scanner Server...")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('omr_web_circle_scanner.py'):
        print("❌ Error: omr_web_circle_scanner.py not found!")
        print("   Please run this script from the scanner directory")
        return False
    
    # Set environment variables for online access
    os.environ['HOST'] = '0.0.0.0'  # Allow external connections
    os.environ['PORT'] = '5000'     # Default port
    os.environ['DEBUG'] = 'True'    # Enable debug mode for development
    
    try:
        # Import and run the server
        from omr_web_circle_scanner import app
        
        print("🌐 Server will be accessible at:")
        print("   Local:  http://localhost:5000")
        print("   Network: http://0.0.0.0:5000")
        print("\n📱 For mobile access, use your computer's IP address:")
        print("   Example: http://192.168.1.100:5000")
        print("\n⏹️  Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Open browser after a short delay
        def open_browser():
            time.sleep(2)
            webbrowser.open('http://localhost:5000')
        
        import threading
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # Start the server
        app.run(debug=True, host='0.0.0.0', port=5000)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Server stopped by user")
        return True
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        return False

def get_local_ip():
    """Get the local IP address for network access"""
    import socket
    try:
        # Connect to a remote server to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "localhost"

def main():
    """Main function"""
    print("⚫ OMR Circle Scanner Server Launcher")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Failed to install dependencies. Please install manually:")
        print("   pip install -r requirements.txt")
        return
    
    # Get local IP for network access
    local_ip = get_local_ip()
    
    print(f"\n🌐 Network access will be available at:")
    print(f"   http://{local_ip}:5000")
    print(f"\n📱 Use this URL on mobile devices to access the scanner")
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()
