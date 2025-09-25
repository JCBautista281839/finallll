#!/usr/bin/env python3
"""
Local OMR Scanner - Direct file processing without Flask server
Can be called from JavaScript to process uploaded images directly
"""

import sys
import os
import json
import base64
from datetime import datetime
import cv2
import numpy as np

# Add the scan directory to the path so we can import the scanner
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from omr_circle_scanner import OMRCircleScanner
except ImportError as e:
    print(f"Error importing OMRCircleScanner: {e}")
    sys.exit(1)

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

def scan_image(image_path):
    """Scan an image for shaded circles and return results"""
    try:
        print(f"🔍 Scanning image: {image_path}")
        
        # Initialize scanner
        scanner = OMRCircleScanner()
        
        # Scan for shaded circles
        result = scanner.scan_shaded_circles(image_path)
        print("✅ Scan completed")
        
        # Handle scan errors
        if 'error' in result:
            return {'success': False, 'error': result['error']}
        
        # Convert numpy types to JSON-serializable types
        result = convert_numpy_types(result)
        
        # Prepare debug image
        debug_image_b64 = None
        if 'debug_image' in result:
            # Convert debug image to base64 for web display
            _, buffer = cv2.imencode('.jpg', result['debug_image'])
            debug_image_b64 = base64.b64encode(buffer).decode('utf-8')
            
            # Remove debug_image from results as it's not JSON serializable
            del result['debug_image']
        
        # Prepare response
        response_data = {
            'success': True,
            'filename': os.path.basename(image_path),
            'results': result,
            'debug_image': debug_image_b64,
            'summary': {
                'total_circles': result.get('total_circles', 0),
                'total_selected': result.get('total_selected', 0),
                'scan_type': result.get('scan_type', 'CIRCLE SCAN')
            }
        }
        
        return response_data
        
    except Exception as e:
        print(f"❌ Scan error: {e}")
        return {'success': False, 'error': str(e)}

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 2:
        print("Usage: python local_omr_scanner.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)
    
    # Scan the image
    result = scan_image(image_path)
    
    # Output result as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()
