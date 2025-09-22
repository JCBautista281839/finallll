#!/usr/bin/env python3
"""
OMR Web Circle Scanner - Web Interface for Shaded Circle Detection
Flask web application to upload and scan OMR forms for shaded circles
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import json
from datetime import datetime
import base64

# Import our circle scanner
# Ensure you have the OMRCircleScanner class defined in omr_circle_scanner.py
from omr_circle_scanner import OMRCircleScanner

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'

# Create directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Initialize scanner
scanner = OMRCircleScanner()

class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder for numpy types"""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

def convert_numpy_types(obj):
    """Convert numpy types to native Python types recursively"""
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(v) for v in obj]
    elif isinstance(obj, tuple):
        return tuple(convert_numpy_types(v) for v in obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int8, np.int16)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif hasattr(obj, 'item'):  # Handle numpy scalars
        try:
            return obj.item()
        except ValueError:
            return str(obj)
    elif obj is None:
        return None
    elif isinstance(obj, (str, int, float)):
        return obj
    else:
        # Fallback: convert to string for unknown types
        return str(obj)

@app.route('/')
def index():
    """Main page with upload interface"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>OMR Circle Scanner</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                color: white;
                margin-bottom: 30px;
            }
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .header p {
                font-size: 1.2em;
                opacity: 0.9;
            }
            .upload-area {
                background: white;
                border-radius: 15px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                margin-bottom: 30px;
            }
            .upload-icon {
                font-size: 4em;
                color: #667eea;
                margin-bottom: 20px;
            }
            .upload-text {
                font-size: 1.3em;
                color: #333;
                margin-bottom: 20px;
            }
            .upload-hint {
                color: #666;
                margin-bottom: 30px;
            }
            .upload-btn {
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 1.1em;
                border-radius: 25px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .upload-btn:hover {
                transform: translateY(-2px);
            }
            .file-input {
                display: none;
            }
            
            /* Responsive grid for upload options */
            @media (max-width: 768px) {
                .container > div[style*="grid"] {
                    grid-template-columns: 1fr !important;
                }
            }
            
            .results {
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                display: none;
            }
            .success {
                color: #28a745;
                background: #d4edda;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .error {
                color: #dc3545;
                background: #f8d7da;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .result-item {
                padding: 10px;
                margin: 10px 0;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #28a745;
            }
            .debug-image {
                max-width: 100%;
                border-radius: 8px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚫ OMR Circle Scanner</h1>
                <p>Upload your OMR form or use webcam to detect shaded circles</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div class="upload-area" onclick="document.getElementById('fileInput').click()">
                    <div class="upload-icon">📄</div>
                    <div class="upload-text">Upload OMR Form</div>
                    <div class="upload-hint">Drag and drop your image here or click to select</div>
                    <button class="upload-btn">Choose File</button>
                    <input type="file" id="fileInput" class="file-input" accept="image/*" onchange="uploadFile()">
                </div>
                
                <div class="upload-area" onclick="window.open('/webcam', '_blank', 'width=1000,height=800')">
                    <div class="upload-icon">📹</div>
                    <div class="upload-text">Use Webcam</div>
                    <div class="upload-hint">Scan OMR forms using your camera in real-time</div>
                    <button class="upload-btn">Open Camera</button>
                </div>
            </div>
            
            <div id="results" class="results"></div>
        </div>
        
        <script>
            function uploadFile() {
                const fileInput = document.getElementById('fileInput');
                const file = fileInput.files[0];
                
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                
                document.getElementById('results').innerHTML = '<div style="text-align: center; padding: 20px;">🔍 Scanning for shaded circles...</div>';
                document.getElementById('results').style.display = 'block';
                
                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    displayResults(data);
                })
                .catch(error => {
                    document.getElementById('results').innerHTML = '<div class="error">Error: ' + error + '</div>';
                });
            }
            
            function displayResults(data) {
                const resultsDiv = document.getElementById('results');
                
                if (data.error) {
                    resultsDiv.innerHTML = '<div class="error">Error: ' + data.error + '</div>';
                    return;
                }
                
                let html = '<div class="success">✅ Scan completed successfully!</div>';
                
                // Show shaded selections
                if (data.results.shaded_selections && data.results.shaded_selections.length > 0) {
                    html += '<h3>⚫ Shaded Circles Detected:</h3>';
                    data.results.shaded_selections.forEach(selection => {
                        html += '<div class="result-item">';
                        html += '<strong>✓ ' + selection.item + '</strong>';
                        html += ' (Fill: ' + selection.fill_percent + '%)';
                        html += '</div>';
                    });
                } else {
                    html += '<div class="result-item">No shaded circles detected</div>';
                }
                
                // Show summary
                html += '<h3>📊 Summary:</h3>';
                html += '<div class="result-item">';
                html += 'Total Circles: ' + data.summary.total_circles + '<br>';
                html += 'Shaded Selections: ' + data.summary.total_selected + '<br>';
                html += 'Scan Type: ' + data.summary.scan_type;
                html += '</div>';
                
                // Show debug image if available
                if (data.debug_image) {
                    html += '<h3>🖼️ Debug Image:</h3>';
                    html += '<img src="data:image/jpeg;base64,' + data.debug_image + '" class="debug-image" alt="Debug Image">';
                }
                
                // Add "Send to POS" button if items were detected
                if (data.results && data.results.shaded_selections && data.results.shaded_selections.length > 0) {
                    html += '<div style="text-align: center; margin: 30px 0;">';
                    html += '<button onclick="sendToPOS()" style="background: linear-gradient(45deg, #28a745, #20c997); color: white; border: none; padding: 15px 30px; font-size: 1.1em; border-radius: 25px; cursor: pointer; transition: transform 0.2s;">📋 Send to POS System</button>';
                    html += '</div>';
                    
                    // Store results globally for sending to POS
                    window.scanResults = data.results;
                }
                
                resultsDiv.innerHTML = html;
            }
            
            function sendToPOS() {
                if (window.scanResults && window.opener) {
                    console.log('Sending results to POS:', window.scanResults);
                    
                    // Send results to parent POS window
                    window.opener.postMessage({
                        type: 'OMR_SCAN_RESULT',
                        results: window.scanResults
                    }, '*');
                    
                    // Show confirmation
                    alert('✅ Results sent to POS system successfully!\\n\\nItems sent: ' + 
                          window.scanResults.shaded_selections.map(s => s.item).join(', '));
                    
                    // Close this window after a short delay
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    alert('❌ Unable to send data to POS system.\\n\\nPlease ensure you opened this scanner from the POS interface.');
                }
            }
        </script>
    </body>
    </html>
    '''

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and scanning"""
    try:
        print("📤 Upload request received")
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"circle_scan_{timestamp}_{file.filename}"
            
            print(f"📁 Processing file: {filename}")
            
            # Save uploaded file
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            print(f"💾 File saved to: {filepath}")
            
            # Scan for shaded circles
            print("🔍 Starting circle scan...")
            result = scanner.scan_shaded_circles(filepath)
            print("✅ Scan completed")
            
            # Handle scan errors
            if 'error' in result:
                return jsonify({'error': result['error']}), 500
            
            # Save debug image
            debug_filename = f"circle_debug_{filename}"
            debug_path = os.path.join(RESULTS_FOLDER, debug_filename)
            
            if 'debug_image' in result:
                cv2.imwrite(debug_path, result['debug_image'])
                print(f"💾 Debug image saved: {debug_filename}")
                
                # Convert debug image to base64 for web display
                _, buffer = cv2.imencode('.jpg', result['debug_image'])
                debug_image_b64 = base64.b64encode(buffer).decode('utf-8')
                
                # Remove debug_image from results as it's not JSON serializable
                del result['debug_image']
            else:
                debug_image_b64 = None
            
            # Convert numpy types to JSON-serializable types
            print("🔄 Converting numpy types...")
            result = convert_numpy_types(result)
            print("✅ Conversion completed")
            
            # Prepare response
            try:
                response_data = {
                    'success': True,
                    'filename': filename,
                    'results': result,
                    'debug_image': debug_image_b64,
                    'summary': {
                        'total_circles': result.get('total_circles', 0),
                        'total_selected': result.get('total_selected', 0),
                        'scan_type': result.get('scan_type', 'CIRCLE SCAN')
                    }
                }
                print("✅ Response prepared successfully")
            except Exception as e:
                print(f"❌ Response preparation error: {e}")
                return jsonify({'error': f'Response preparation failed: {str(e)}'}), 500
            
            # Save results as JSON
            print("💾 Saving results...")
            try:
                results_filename = f"circle_results_{timestamp}.json"
                results_path = os.path.join(RESULTS_FOLDER, results_filename)
                # Create a safe copy for JSON serialization
                safe_response = convert_numpy_types(response_data.copy())
                with open(results_path, 'w', encoding='utf-8') as f:
                    json.dump(safe_response, f, indent=2, ensure_ascii=False, default=str)
                print("✅ Results saved successfully")
            except Exception as e:
                print(f"⚠️ Results save warning: {e}")
                # Continue execution even if save fails
            print("🚀 Sending response...")
            # Ensure response is JSON serializable
            try:
                # Test JSON serialization before sending
                json.dumps(response_data, default=str)
                return jsonify(response_data)
            except Exception as json_error:
                print(f"❌ JSON serialization error: {json_error}")
                # Return a simplified response
                return jsonify({
                    'success': True,
                    'filename': filename,
                    'results': {
                        'success': True,
                        'total_circles': len(result.get('shaded_selections', [])),
                        'total_selected': len([s for s in result.get('shaded_selections', []) if s]),
                        'shaded_selections': [
                            {
                                'item': str(sel.get('item', 'Unknown')),
                                'fill_percent': float(sel.get('fill_percent', 0))
                            } for sel in result.get('shaded_selections', [])
                        ]
                    },
                    'summary': {
                        'total_circles': len(result.get('shaded_selections', [])),
                        'total_selected': len([s for s in result.get('shaded_selections', []) if s]),
                        'scan_type': 'CIRCLE SCAN'
                    }
                })
        
        else:
            return jsonify({'error': 'Invalid file type. Please upload PNG, JPG, JPEG, or GIF'}), 400
            
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/webcam')
def webcam_scanner():
    """Webcam scanner interface"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>OMR Webcam Scanner</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 1000px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                color: white;
                margin-bottom: 30px;
            }
            .scanner-card {
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                padding: 30px;
                margin-bottom: 20px;
            }
            .webcam-container {
                text-align: center;
                margin-bottom: 20px;
            }
            #video {
                width: 100%;
                max-width: 640px;
                height: auto;
                border: 3px solid #667eea;
                border-radius: 10px;
                background: #f0f0f0;
            }
            #canvas {
                display: none;
            }
            .controls {
                margin: 20px 0;
                text-align: center;
            }
            .btn {
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                margin: 5px;
                transition: all 0.3s ease;
                min-width: 120px;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            .btn:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
            }
            .status {
                text-align: center;
                margin: 15px 0;
                padding: 10px;
                border-radius: 5px;
                font-weight: bold;
            }
            .status.success { background: #d4edda; color: #155724; }
            .status.error { background: #f8d7da; color: #721c24; }
            .status.info { background: #d1ecf1; color: #0c5460; }
            .result-section {
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                display: none;
            }
            .back-btn {
                position: absolute;
                top: 20px;
                left: 20px;
                background: rgba(255,255,255,0.2);
                color: white;
                border: 2px solid white;
                padding: 10px 20px;
                border-radius: 20px;
                text-decoration: none;
                transition: all 0.3s ease;
            }
            .back-btn:hover {
                background: white;
                color: #667eea;
            }
        </style>
    </head>
    <body>
        <a href="/" class="back-btn">← Back to Upload</a>
        
        <div class="container">
            <div class="header">
                <h1>📹 OMR Webcam Scanner</h1>
                <p>Use your webcam to scan OMR forms in real-time</p>
            </div>
            
            <div class="scanner-card">
                <div class="webcam-container">
                    <video id="video" autoplay playsinline></video>
                    <canvas id="canvas"></canvas>
                </div>
                
                <div class="controls">
                    <button id="startBtn" class="btn">📷 Start Camera</button>
                    <button id="captureBtn" class="btn" disabled>📸 Capture & Scan</button>
                    <button id="stopBtn" class="btn" disabled>⏹️ Stop Camera</button>
                </div>
                
                <div id="status"></div>
                
                <div id="results" class="result-section">
                    <h3>📊 Scan Results</h3>
                    <div id="resultContent"></div>
                    <div style="margin-top: 15px;">
                        <button id="sendToPOSBtn" class="btn" style="background: linear-gradient(45deg, #28a745, #20c997);">
                            🔥 Send to POS System
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const video = document.getElementById('video');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            const startBtn = document.getElementById('startBtn');
            const captureBtn = document.getElementById('captureBtn');
            const stopBtn = document.getElementById('stopBtn');
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            const resultContent = document.getElementById('resultContent');
            const sendToPOSBtn = document.getElementById('sendToPOSBtn');
            
            let stream = null;
            let lastScanResult = null;

            function showStatus(message, type = 'info') {
                status.innerHTML = `<div class="status ${type}">${message}</div>`;
            }

            async function startCamera() {
                try {
                    showStatus('📷 Starting camera...', 'info');
                    
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: 'environment' // Use back camera on mobile
                        } 
                    });
                    
                    video.srcObject = stream;
                    
                    startBtn.disabled = true;
                    captureBtn.disabled = false;
                    stopBtn.disabled = false;
                    
                    showStatus('✅ Camera ready! Position your OMR form and click Capture', 'success');
                    
                } catch (error) {
                    console.error('Camera error:', error);
                    showStatus(`❌ Camera access failed: ${error.message}`, 'error');
                }
            }

            function stopCamera() {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                
                video.srcObject = null;
                
                startBtn.disabled = false;
                captureBtn.disabled = true;
                stopBtn.disabled = true;
                
                showStatus('📷 Camera stopped', 'info');
            }

            async function captureAndScan() {
                try {
                    showStatus('📸 Capturing image...', 'info');
                    
                    // Set canvas size to match video
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Draw current video frame to canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Convert canvas to blob
                    canvas.toBlob(async (blob) => {
                        const formData = new FormData();
                        formData.append('file', blob, 'webcam_capture.jpg');
                        
                        showStatus('🔍 Scanning for circles...', 'info');
                        
                        try {
                            const response = await fetch('/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            const result = await response.json();
                            
                            if (response.ok) {
                                lastScanResult = result;
                                displayResults(result);
                                showStatus('✅ Scan completed successfully!', 'success');
                            } else {
                                showStatus(`❌ Scan failed: ${result.error}`, 'error');
                                results.style.display = 'none';
                            }
                            
                        } catch (error) {
                            console.error('Scan error:', error);
                            showStatus(`❌ Scan error: ${error.message}`, 'error');
                            results.style.display = 'none';
                        }
                        
                    }, 'image/jpeg', 0.9);
                    
                } catch (error) {
                    console.error('Capture error:', error);
                    showStatus(`❌ Capture failed: ${error.message}`, 'error');
                }
            }

            function displayResults(result) {
                const items = result.items || [];
                const summary = result.summary || {};
                
                let html = `
                    <div style="margin-bottom: 15px;">
                        <strong>📊 Summary:</strong><br>
                        Total Circles: ${summary.total_circles || 0}<br>
                        Selected Items: ${summary.total_selected || 0}<br>
                        Scan Type: ${summary.scan_type || 'Unknown'}
                    </div>
                `;
                
                if (items.length > 0) {
                    html += '<div><strong>🛒 Detected Items:</strong><ul>';
                    items.forEach(item => {
                        html += `<li>${item.item} - ₱${item.price} (Qty: ${item.quantity})</li>`;
                    });
                    html += '</ul></div>';
                } else {
                    html += '<div>⚠️ No items detected</div>';
                }
                
                resultContent.innerHTML = html;
                results.style.display = 'block';
            }

            function sendToPOS() {
                if (!lastScanResult) {
                    showStatus('❌ No scan result to send', 'error');
                    return;
                }

                try {
                    if (window.opener && window.opener.postMessage) {
                        window.opener.postMessage({
                            type: 'OMR_SCAN_RESULT',
                            data: lastScanResult
                        }, '*');
                        
                        showStatus('✅ Data sent to POS system!', 'success');
                        setTimeout(() => {
                            window.close();
                        }, 1500);
                    } else {
                        alert('❌ Unable to send data to POS system.\\n\\nPlease ensure you opened this scanner from the POS interface.');
                    }
                } catch (error) {
                    console.error('Send to POS error:', error);
                    alert('❌ Unable to send data to POS system.\\n\\nPlease ensure you opened this scanner from the POS interface.');
                }
            }

            // Event listeners
            startBtn.addEventListener('click', startCamera);
            captureBtn.addEventListener('click', captureAndScan);
            stopBtn.addEventListener('click', stopCamera);
            sendToPOSBtn.addEventListener('click', sendToPOS);

            // Auto-start camera on page load
            window.addEventListener('load', () => {
                setTimeout(startCamera, 500);
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => {
                stopCamera();
            });
        </script>
    </body>
    </html>
    '''

@app.route('/capture', methods=['POST'])
def capture_webcam():
    """Handle webcam capture data"""
    try:
        print("📸 Webcam capture request received")
        
        # Get base64 image data from request
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_data = data['image']
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Save the captured image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"webcam_capture_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        cv2.imwrite(filepath, image)
        
        print(f"📸 Processing webcam capture: {filename}")
        
        # Process with scanner
        result = scanner.scan_image(image)
        
        if result and 'circles' in result:
            print(f"✅ Found {len(result['circles'])} circles")
            
            # Save results
            result_filename = f"webcam_result_{timestamp}.json"
            result_path = os.path.join(RESULTS_FOLDER, result_filename);
            
            with open(result_path, 'w') as f:
                json.dump(result, f, indent=2, cls=NumpyEncoder);
            
            return jsonify({
                'success': True,
                'filename': filename,
                'result_file': result_filename,
                'circles_found': len(result['circles']),
                'message': f'Successfully processed webcam capture with {len(result["circles"])} circles',
                'result': convert_numpy_types(result)
            })
        else:
            return jsonify({'error': 'No circles detected in webcam capture'}), 400
            
    except Exception as e:
        print(f"❌ Webcam capture error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/status')
def server_status():
    """Check if the OMR server is running"""
    return jsonify({
        'status': 'running',
        'message': 'OMR Scanner Server is active',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    # Configuration for online deployment
    import os
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')  # Allow external connections
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting OMR Scanner Server...")
    print(f"📡 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🐛 Debug: {debug}")
    print(f"🌐 Access: http://{host}:{port}")
    
    app.run(debug=debug, host=host, port=port)
