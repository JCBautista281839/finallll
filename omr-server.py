#!/usr/bin/env python3
"""
OMR Server - Flask server to handle real OMR scanning requests
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
import base64
import cv2
import numpy as np
from datetime import datetime

# Add the scan directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'scan'))

try:
    from scan.omr_circle_scanner import OMRCircleScanner
except ImportError:
    print("Error: Could not import OMRCircleScanner")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

def convert_numpy_types(obj):
    """Convert numpy types to native Python types recursively"""
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj

@app.route('/scan-omr', methods=['POST'])
def scan_omr():
    """Handle real OMR scanning request"""
    try:
        print("OMR scan request received")
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        print(f"File saved to: {temp_path}")
        
        # Initialize scanner
        scanner = OMRCircleScanner()
        
        # Scan for shaded circles
        print("Starting real OMR scan...")
        result = scanner.scan_shaded_circles(temp_path)
        print("OMR scan completed")
        
        # Handle scan errors
        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 500
        
        # Convert numpy types to JSON-serializable types
        result = convert_numpy_types(result)
        
        # Add prices to items for better POS integration
        price_map = {
            'isda': 180.00,
            'egg': 25.00,
            'water': 15.00,
            'sinigang': 120.00,
            'chicken': 150.00,
            'pusit': 220.00,
            'gatas': 35.00,
            'beef': 200.00
        }
        
        # Add prices and quantities to shaded selections
        for selection in result.get('shaded_selections', []):
            item_name = selection['item']
            selection['quantity'] = 1
            selection['price'] = price_map.get(item_name.lower(), 100.00)
            selection['firebase_id'] = f"menu_{item_name.lower()}"
        
        # Prepare debug image - fix the OpenCV issue
        debug_image_b64 = None
        if 'debug_image' in result and result['debug_image'] is not None:
            try:
                # Ensure debug_image is a proper numpy array
                debug_img = result['debug_image']
                if isinstance(debug_img, np.ndarray):
                    # Convert debug image to base64 for web display
                    success, buffer = cv2.imencode('.jpg', debug_img)
                    if success:
                        debug_image_b64 = base64.b64encode(buffer).decode('utf-8')
                        print("Debug image encoded successfully")
                    else:
                        print("Failed to encode debug image")
                        debug_image_b64 = None
                        
            except Exception as e:
                print(f"Error encoding debug image: {e}")
                debug_image_b64 = None
        
        # Remove debug_image from results as it's not JSON serializable
        if 'debug_image' in result:
            del result['debug_image']
        
        # Prepare response
        response_data = {
            'success': True,
            'filename': file.filename,
            'results': result,
            'debug_image': debug_image_b64,
            'summary': {
                'total_circles': result.get('total_circles', 0),
                'total_selected': result.get('total_selected', 0),
                'scan_type': result.get('scan_type', 'CIRCLE SCAN')
            }
        }
        
        # Clean up temporary file
        try:
            os.unlink(temp_path)
            print(f"Cleaned up temporary file: {temp_path}")
        except:
            pass
        
        print("Response prepared successfully")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"OMR scan error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'OK', 'message': 'OMR Server is running'})

if __name__ == '__main__':
    print("Starting OMR Server...")
    print("Server will be available at: http://localhost:5002")
    print("OMR scan endpoint: http://localhost:5002/scan-omr")
    app.run(host='0.0.0.0', port=5002, debug=True)
