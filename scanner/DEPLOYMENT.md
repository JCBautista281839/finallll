# OMR Scanner Cloud Deployment Guide

This guide will help you deploy the OMR Circle Scanner to various cloud platforms.

## 🚀 Quick Deploy Options

### 1. Render (Recommended - Free Tier Available)

**Steps:**
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `scanner` folder as the root directory
5. Use these settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python omr_web_circle_scanner.py`
   - **Environment:** Python 3
6. Click "Create Web Service"

**Environment Variables:**
- `HOST`: `0.0.0.0`
- `PORT`: `10000` (Render uses port 10000)
- `DEBUG`: `False`

**Result:** Your OMR scanner will be available at `https://your-app-name.onrender.com`

---

### 2. Railway (Easy Setup)

**Steps:**
1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository and the `scanner` folder
4. Railway will automatically detect the Python app
5. Deploy!

**Environment Variables:**
- `HOST`: `0.0.0.0`
- `PORT`: `$PORT` (Railway provides this)
- `DEBUG`: `False`

**Result:** Your OMR scanner will be available at `https://your-app-name.railway.app`

---

### 3. Heroku (Classic Platform)

**Steps:**
1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create app: `heroku create your-omr-scanner`
4. Set environment variables:
   ```bash
   heroku config:set HOST=0.0.0.0
   heroku config:set DEBUG=False
   ```
5. Deploy: `git push heroku main`

**Result:** Your OMR scanner will be available at `https://your-omr-scanner.herokuapp.com`

---

### 4. PythonAnywhere (Python-Focused)

**Steps:**
1. Go to [pythonanywhere.com](https://pythonanywhere.com) and sign up
2. Go to "Web" tab → "Add a new web app"
3. Choose "Flask" and Python 3.11
4. Upload your files to the web app directory
5. Update the WSGI file to point to your app
6. Reload the web app

**WSGI Configuration:**
```python
import sys
path = '/home/yourusername/your-app-name/scanner'
if path not in sys.path:
    sys.path.append(path)

from omr_web_circle_scanner import app as application
```

---

## 🐳 Docker Deployment

### Local Docker Testing
```bash
cd scanner
docker-compose up --build
```

### Deploy to any Docker-compatible platform:
- Google Cloud Run
- AWS ECS
- Azure Container Instances
- DigitalOcean App Platform

---

## 🔧 Environment Configuration

### Required Environment Variables:
- `HOST`: `0.0.0.0` (for external access)
- `PORT`: Platform-specific (5000, 10000, or $PORT)
- `DEBUG`: `False` (for production)

### Optional Environment Variables:
- `FLASK_ENV`: `production`
- `MAX_CONTENT_LENGTH`: `16777216` (16MB)

---

## 📱 Mobile Access

Once deployed, your OMR scanner will be accessible from any device:

1. **Desktop:** Open the URL in any browser
2. **Mobile:** Use the camera feature for real-time scanning
3. **POS Integration:** The scanner can send results back to your POS system

---

## 🔗 Integration with POS System

The deployed OMR scanner integrates with your existing POS system:

1. **Upload Method:** Users can upload OMR form images
2. **Webcam Method:** Real-time scanning using device camera
3. **Results:** Detected items are sent back to the POS system
4. **API Endpoints:**
   - `POST /upload` - Upload and scan images
   - `GET /webcam` - Webcam interface
   - `GET /status` - Server status

---

## 🛠️ Troubleshooting

### Common Issues:

1. **Port Issues:** Make sure to use the platform's assigned port
2. **File Uploads:** Some platforms have file size limits
3. **Dependencies:** Ensure all packages are in requirements.txt
4. **Environment Variables:** Check that all required vars are set

### Debug Mode:
Set `DEBUG=True` in environment variables to see detailed error logs.

---

## 📊 Monitoring

Most platforms provide:
- **Logs:** View real-time application logs
- **Metrics:** CPU, memory, and request metrics
- **Health Checks:** Automatic health monitoring

---

## 🔄 Updates

To update your deployed OMR scanner:
1. Push changes to your repository
2. Platform will automatically redeploy (if auto-deploy is enabled)
3. Or manually trigger a redeploy from the platform dashboard

---

## 💰 Cost Considerations

- **Render:** Free tier available, paid plans start at $7/month
- **Railway:** Free tier available, paid plans start at $5/month
- **Heroku:** Free tier discontinued, paid plans start at $7/month
- **PythonAnywhere:** Free tier available, paid plans start at $5/month

---

## 🎯 Recommended Platform

**For beginners:** Use **Render** - it's free, easy to set up, and has excellent documentation.

**For advanced users:** Use **Railway** - it's fast, modern, and has great developer experience.
