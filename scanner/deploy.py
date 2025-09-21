#!/usr/bin/env python3
"""
OMR Scanner Deployment Helper
Helps deploy the OMR scanner to various cloud platforms
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def check_requirements():
    """Check if all required files exist"""
    required_files = [
        'omr_web_circle_scanner.py',
        'omr_circle_scanner.py',
        'requirements.txt',
        'Procfile',
        'runtime.txt'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print("✅ All required files found")
    return True

def create_gitignore():
    """Create .gitignore file for deployment"""
    gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
env/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Application specific
uploads/
results/
*.jpg
*.jpeg
*.png
*.gif
*.bmp
*.tiff

# Environment
.env
.env.local
.env.production

# Logs
*.log
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    print("✅ Created .gitignore file")

def setup_render():
    """Setup for Render deployment"""
    print("🚀 Setting up for Render deployment...")
    
    # Create render.yaml if it doesn't exist
    if not os.path.exists('render.yaml'):
        print("❌ render.yaml not found. Please create it first.")
        return False
    
    print("✅ Render configuration ready")
    print("📋 Next steps:")
    print("   1. Push your code to GitHub")
    print("   2. Go to render.com")
    print("   3. Connect your repository")
    print("   4. Select the scanner folder")
    print("   5. Deploy!")
    
    return True

def setup_railway():
    """Setup for Railway deployment"""
    print("🚀 Setting up for Railway deployment...")
    
    # Check if railway.json exists
    if not os.path.exists('railway.json'):
        print("❌ railway.json not found. Please create it first.")
        return False
    
    print("✅ Railway configuration ready")
    print("📋 Next steps:")
    print("   1. Push your code to GitHub")
    print("   2. Go to railway.app")
    print("   3. Connect your repository")
    print("   4. Deploy!")
    
    return True

def setup_heroku():
    """Setup for Heroku deployment"""
    print("🚀 Setting up for Heroku deployment...")
    
    # Check if Heroku CLI is installed
    try:
        subprocess.run(['heroku', '--version'], check=True, capture_output=True)
        print("✅ Heroku CLI found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Heroku CLI not found. Please install it from https://devcenter.heroku.com/articles/heroku-cli")
        return False
    
    # Check if we're in a git repository
    try:
        subprocess.run(['git', 'status'], check=True, capture_output=True)
        print("✅ Git repository found")
    except subprocess.CalledProcessError:
        print("❌ Not in a git repository. Please initialize git first.")
        return False
    
    print("✅ Heroku configuration ready")
    print("📋 Next steps:")
    print("   1. Run: heroku create your-omr-scanner")
    print("   2. Run: heroku config:set HOST=0.0.0.0 DEBUG=False")
    print("   3. Run: git push heroku main")
    
    return True

def test_local():
    """Test the application locally"""
    print("🧪 Testing application locally...")
    
    try:
        # Test import
        import omr_web_circle_scanner
        print("✅ Application imports successfully")
        
        # Test basic functionality
        scanner = omr_web_circle_scanner.OMRCircleScanner()
        print("✅ Scanner initializes successfully")
        
        print("✅ Local test passed")
        return True
        
    except Exception as e:
        print(f"❌ Local test failed: {e}")
        return False

def main():
    """Main deployment helper"""
    print("⚫ OMR Scanner Deployment Helper")
    print("=" * 40)
    
    # Check requirements
    if not check_requirements():
        print("\n❌ Please fix missing files before deploying")
        return
    
    # Create .gitignore
    create_gitignore()
    
    # Test locally
    if not test_local():
        print("\n❌ Please fix local issues before deploying")
        return
    
    print("\n🎯 Choose deployment platform:")
    print("1. Render (Recommended)")
    print("2. Railway")
    print("3. Heroku")
    print("4. Show all options")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == '1':
        setup_render()
    elif choice == '2':
        setup_railway()
    elif choice == '3':
        setup_heroku()
    elif choice == '4':
        print("\n📚 All deployment options:")
        print("   - Render: https://render.com (Free tier available)")
        print("   - Railway: https://railway.app (Free tier available)")
        print("   - Heroku: https://heroku.com (Paid only)")
        print("   - PythonAnywhere: https://pythonanywhere.com (Free tier available)")
        print("   - See DEPLOYMENT.md for detailed instructions")
    else:
        print("❌ Invalid choice")
    
    print("\n🎉 Deployment setup complete!")
    print("📖 For detailed instructions, see DEPLOYMENT.md")

if __name__ == "__main__":
    main()
