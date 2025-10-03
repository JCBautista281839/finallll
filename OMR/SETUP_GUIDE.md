# OMR Testing System - Setup Guide

## 🚀 Quick Start

### Option 1: Windows (Easy)
1. **Double-click** `start_server.bat`
2. **Open** `index.html` in your browser
3. **Start testing!**

### Option 2: Manual Setup
1. **Install Python 3.7+** from [python.org](https://python.org)
2. **Open terminal** in the T-omr folder
3. **Run**: `python start_server.py`
4. **Open** `index.html` in your browser

## 📋 Prerequisites

- **Python 3.7 or higher**
- **Web browser** (Chrome, Firefox, Safari, Edge)
- **Image files** for testing (JPG, PNG, GIF, BMP, TIFF)

## 🔧 Installation Steps

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python start_server.py
```

### 3. Open the Frontend
- Open `index.html` in your web browser
- The interface will automatically connect to the backend

## 🌐 Server Information

- **Backend URL**: http://localhost:5003
- **Frontend**: Open `index.html` in browser
- **API Endpoints**:
  - `POST /api/upload` - Upload image files
  - `POST /api/detect-circles` - Detect circles in image
  - `POST /api/analyze-shaded` - Analyze filled circles
  - `POST /api/full-scan` - Complete OMR scan
  - `GET /api/health` - Server health check

## 🎯 How to Use

### 1. Upload an Image
- **Drag & drop** an image onto the upload area
- **Or click** "Browse Files" to select an image
- **Supported formats**: JPG, PNG, GIF, BMP, TIFF
- **Max size**: 16MB

### 2. Test OMR Functions
- **Circle Detection**: Finds circular patterns in the image
- **Shaded Analysis**: Identifies filled vs empty circles
- **Full OMR Scan**: Complete form processing with menu recognition

### 3. View Results
- **Results section** shows detailed scan information
- **Debug console** displays real-time processing logs
- **Debug images** are saved in the `results/` folder

## 📁 File Structure

```
T-omr/
├── index.html              # Main frontend interface
├── css/style.css           # Frontend styling
├── js/omr-testing.js       # Frontend JavaScript
├── python/
│   ├── app.py              # Flask server
│   └── omr_scanner.py      # OMR processing algorithms
├── uploads/                # Temporary file storage
├── results/                # Debug images and results
├── requirements.txt        # Python dependencies
├── start_server.py         # Server startup script
├── start_server.bat        # Windows batch file
└── README.md              # Documentation
```

## 🔍 Testing Features

### Circle Detection
- **Purpose**: Find circular patterns in images
- **Algorithm**: HoughCircles with optimized parameters
- **Output**: Circle count, positions, radii, and debug image

### Shaded Analysis
- **Purpose**: Identify filled vs empty circles
- **Algorithm**: Pixel intensity analysis with thresholds
- **Output**: Shaded/empty circle counts and analysis

### Full OMR Scan
- **Purpose**: Complete OMR form processing
- **Features**: Menu item recognition, price calculation
- **Output**: Selected items, totals, confidence scores

## 🛠️ Troubleshooting

### Server Won't Start
- **Check Python version**: `python --version`
- **Install dependencies**: `pip install -r requirements.txt`
- **Check port 5003**: Make sure it's not in use

### Frontend Can't Connect
- **Check server status**: Visit http://localhost:5003/api/health
- **Check browser console**: Look for error messages
- **Verify file paths**: Make sure all files are in correct locations

### Image Processing Errors
- **Check file format**: Use supported image formats
- **Check file size**: Must be under 16MB
- **Check image quality**: Clear, well-lit images work best

## 📊 Debug Information

### Debug Console
- **Real-time logging** of all operations
- **Color-coded messages** (info, success, error, warning)
- **Timestamped entries** for precise tracking

### Debug Images
- **Saved automatically** in `results/` folder
- **Show processing steps** with visual annotations
- **Include analysis results** overlaid on original image

## 🔧 Configuration

### OMR Parameters
Edit `python/omr_scanner.py` to adjust:
- **Circle detection sensitivity**
- **Shaded analysis thresholds**
- **Menu item mappings**
- **Price calculations**

### Server Settings
Edit `python/app.py` to modify:
- **Port number** (default: 5003)
- **File size limits** (default: 16MB)
- **Upload folder** locations

## 📈 Performance Tips

1. **Use clear images** with good contrast
2. **Ensure proper lighting** when capturing OMR forms
3. **Keep circles well-spaced** for better detection
4. **Use high-resolution images** for better accuracy
5. **Check debug images** to verify processing quality

## 🆘 Support

### Common Issues
- **"Server Offline"**: Start the backend server first
- **"Upload Failed"**: Check file format and size
- **"No Circles Found"**: Try adjusting image contrast
- **"Processing Error"**: Check debug console for details

### Getting Help
1. **Check debug console** for error messages
2. **Verify server status** at http://localhost:5003/api/health
3. **Check file permissions** for uploads and results folders
4. **Review Python error logs** in terminal

## 🎉 Success Indicators

- ✅ **Green status dot** = Server connected
- ✅ **"File Ready"** status = Image uploaded successfully
- ✅ **Results displayed** = Processing completed
- ✅ **Debug images saved** = Analysis successful

---

**Happy Testing!** 🚀
