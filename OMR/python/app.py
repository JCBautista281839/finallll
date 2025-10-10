#!/usr/bin/env python3
"""
OMR Testing System - Flask Backend Server
Handles OMR image processing requests from the frontend
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import tempfile
import base64
import json
from datetime import datetime
import traceback

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from omr_scanner import OMRScanner

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
RESULTS_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize OMR Scanner
omr_scanner = OMRScanner()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """Save uploaded file and return file path"""
    if file and allowed_file(file.filename):
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"omr_test_{timestamp}_{file.filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return filepath
    return None

def create_response(success=True, message="", data=None, error=None):
    """Create standardized API response"""
    response = {
        "success": success,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    
    if data is not None:
        response["data"] = data
    
    if error is not None:
        response["error"] = error
    
    return response

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory(os.path.dirname(os.path.dirname(__file__)), 'index.html')

@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files"""
    return send_from_directory(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'js'), filename)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify(create_response(
        success=True,
        message="OMR Testing Server is running",
        data={
            "status": "healthy",
            "version": "1.0.0",
            "endpoints": [
                "/api/upload",
                "/api/upload-webcam",
                "/api/detect-circles",
                "/api/analyze-shaded",
                "/api/full-scan",
                "/api/health"
            ]
        }
    ))

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload"""
    try:
        if 'file' not in request.files:
            return jsonify(create_response(
                success=False,
                message="No file uploaded",
                error="Missing file in request"
            )), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify(create_response(
                success=False,
                message="No file selected",
                error="Empty filename"
            )), 400
        
        # Save file
        filepath = save_uploaded_file(file)
        if not filepath:
            return jsonify(create_response(
                success=False,
                message="Invalid file type",
                error="File type not allowed"
            )), 400
        
        # Get file info
        file_size = os.path.getsize(filepath)
        
        return jsonify(create_response(
            success=True,
            message="File uploaded successfully",
            data={
                "filename": os.path.basename(filepath),
                "filepath": filepath,
                "size": file_size,
                "uploaded_at": datetime.now().isoformat()
            }
        ))
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify(create_response(
            success=False,
            message="Upload failed",
            error=str(e)
        )), 500

@app.route('/api/upload-webcam', methods=['POST'])
def upload_webcam():
    """Handle webcam image upload"""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify(create_response(
                success=False,
                message="No image data provided",
                error="Missing image in request"
            )), 400
        
        # Extract base64 image data
        image_data = data['image']
        if image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"omr_webcam_{timestamp}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save image file
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        # Get file info
        file_size = os.path.getsize(filepath)
        
        return jsonify(create_response(
            success=True,
            message="Webcam image uploaded successfully",
            data={
                "filename": filename,
                "filepath": filepath,
                "size": file_size,
                "uploaded_at": datetime.now().isoformat()
            }
        ))
        
    except Exception as e:
        app.logger.error(f"Webcam upload error: {str(e)}")
        return jsonify(create_response(
            success=False,
            message="Webcam upload failed",
            error=str(e)
        )), 500

@app.route('/api/detect-circles', methods=['POST'])
def detect_circles():
    """Detect circles in uploaded image"""
    try:
        data = request.get_json()
        if not data or 'filepath' not in data:
            return jsonify(create_response(
                success=False,
                message="File path required",
                error="Missing filepath in request"
            )), 400
        
        filepath = data['filepath']
        if not os.path.exists(filepath):
            return jsonify(create_response(
                success=False,
                message="File not found",
                error="File does not exist"
            )), 404
        
        # Detect circles
        result = omr_scanner.detect_circles(filepath)
        
        return jsonify(create_response(
            success=True,
            message="Circle detection completed",
            data=result
        ))
        
    except Exception as e:
        app.logger.error(f"Circle detection error: {str(e)}")
        return jsonify(create_response(
            success=False,
            message="Circle detection failed",
            error=str(e)
        )), 500

@app.route('/api/analyze-shaded', methods=['POST'])
def analyze_shaded():
    """Analyze shaded circles in uploaded image"""
    try:
        data = request.get_json()
        if not data or 'filepath' not in data:
            return jsonify(create_response(
                success=False,
                message="File path required",
                error="Missing filepath in request"
            )), 400
        
        filepath = data['filepath']
        if not os.path.exists(filepath):
            return jsonify(create_response(
                success=False,
                message="File not found",
                error="File does not exist"
            )), 404
        
        # Analyze shaded circles
        result = omr_scanner.analyze_shaded_circles(filepath)
        
        return jsonify(create_response(
            success=True,
            message="Shaded analysis completed",
            data=result
        ))
        
    except Exception as e:
        app.logger.error(f"Shaded analysis error: {str(e)}")
        return jsonify(create_response(
            success=False,
            message="Shaded analysis failed",
            error=str(e)
        )), 500

@app.route('/api/full-scan', methods=['POST'])
def full_scan():
    """Perform full OMR scan on uploaded image"""
    try:
        data = request.get_json()
        if not data or 'filepath' not in data:
            return jsonify(create_response(
                success=False,
                message="File path required",
                error="Missing filepath in request"
            )), 400
        
        filepath = data['filepath']
        if not os.path.exists(filepath):
            return jsonify(create_response(
                success=False,
                message="File not found",
                error="File does not exist"
            )), 404
        
        # Perform full OMR scan
        result = omr_scanner.full_omr_scan(filepath)
        
        return jsonify(create_response(
            success=True,
            message="Full OMR scan completed",
            data=result
        ))
        
    except Exception as e:
        app.logger.error(f"Full scan error: {str(e)}")
        return jsonify(create_response(
            success=False,
            message="Full OMR scan failed",
            error=str(e)
        )), 500

@app.route('/api/results/<filename>')
def get_result_file(filename):
    """Serve result files"""
    return send_from_directory(app.config['RESULTS_FOLDER'], filename)

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify(create_response(
        success=False,
        message="File too large",
        error="File size exceeds 16MB limit"
    )), 413

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return jsonify(create_response(
        success=False,
        message="Endpoint not found",
        error="The requested endpoint does not exist"
    )), 404

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors"""
    return jsonify(create_response(
        success=False,
        message="Internal server error",
        error="An unexpected error occurred"
    )), 500

if __name__ == '__main__':
    print("Starting OMR Testing Server...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Results folder: {RESULTS_FOLDER}")
    print("Server will be available at: http://localhost:5003")
    print("API endpoints:")
    print("   - POST /api/upload")
    print("   - POST /api/upload-webcam")
    print("   - POST /api/detect-circles")
    print("   - POST /api/analyze-shaded")
    print("   - POST /api/full-scan")
    print("   - GET /api/health")

    app.run(host='0.0.0.0', port=5003, debug=False, use_reloader=False)
