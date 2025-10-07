#!/usr/bin/env python3
"""
OMR Testing System - Server Startup Script
Easy way to start the Flask backend server
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 7):
        print("Python 3.7 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"Python version: {sys.version}")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'flask', 'flask_cors', 'opencv-python', 
        'numpy', 'Pillow', 'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'opencv-python':
                import cv2
            elif package == 'flask_cors':
                import flask_cors
            elif package == 'Pillow':
                import PIL
            else:
                __import__(package)
            print(f"✅ {package} is installed")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} is not installed")
    
    if missing_packages:
        print(f"\nMissing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    return True

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    try:
        requirements_file = Path(__file__).parent / "requirements.txt"
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)])
        print("Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the Flask server"""
    print("🚀 Starting OMR Testing Server...")
    
    # Change to the python directory
    python_dir = Path(__file__).parent / "python"
    os.chdir(python_dir)
    
    # Add the python directory to Python path
    sys.path.insert(0, str(python_dir))
    
    # Start the Flask app
    try:
        from app import app
        app.run(host='0.0.0.0', port=5003, debug=True)
    except ImportError as e:
        print(f"❌ Failed to import Flask app: {e}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Python path: {sys.path}")
        return False
    except Exception as e:
        print(f"❌ Server startup error: {e}")
        return False

def main():
    """Main function"""
    print("=" * 50)
    print("OMR Testing System - Server Setup")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        return
    
    # Check dependencies
    if not check_dependencies():
        print("\nAttempting to install missing dependencies...")
        if not install_dependencies():
            print("Failed to install dependencies. Please install manually:")
            print("   pip install -r requirements.txt")
            return
    
    print("\nAll checks passed!")
    print("\nServer will be available at: http://localhost:5003")
    print("API endpoints:")
    print("   - POST /api/upload")
    print("   - POST /api/detect-circles")
    print("   - POST /api/analyze-shaded")
    print("   - POST /api/full-scan")
    print("   - GET /api/health")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 50)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main()
