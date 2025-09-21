#!/usr/bin/env python3
"""
OMR Circle Scanner - Detects Shaded Circles
Specifically designed to scan filled/shaded circles in OMR forms
"""

import cv2
import numpy as np
import os

class OMRCircleScanner:
    def __init__(self):
        # Extended menu items list for better matching
        self.menu_items = [
            'isda','egg','water','sinigang','chicken','pusit','gatas','beef'
        ]
        
    def detect_circles(self, image_path):
        """
        Detect circles in the image using improved HoughCircles parameters
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {'error': 'Could not load image'}
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter to reduce noise while keeping edges sharp
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Apply adaptive threshold to better detect circle edges
        thresh = cv2.adaptiveThreshold(filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # Detect circles using optimized HoughCircles parameters
        circles = cv2.HoughCircles(
            thresh,
            cv2.HOUGH_GRADIENT,
            dp=1,
            minDist=40,  # Increased to avoid duplicate detections
            param1=80,   # Higher threshold for edge detection
            param2=25,   # Lower accumulator threshold for better detection
            minRadius=15, # Adjusted based on your image
            maxRadius=60  # Adjusted based on your image
        )
        
        circle_data = []
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            # Sort circles by y-coordinate (top to bottom)
            circles = sorted(circles, key=lambda c: c[1])
            
            for i, (x, y, r) in enumerate(circles):
                circle_data.append({
                    'center': (int(x), int(y)),
                    'radius': int(r),
                    'bbox': (int(x-r), int(y-r), int(2*r), int(2*r)),
                    'index': i
                })
        
        return circle_data
    
    def check_circle_fill(self, gray_image, circle):
        """
        Improved circle fill detection for black filled vs red empty circles
        """
        x, y, r = circle['center'][0], circle['center'][1], circle['radius']
        
        # Create a mask for the circle (slightly smaller to avoid border effects)
        mask = np.zeros(gray_image.shape[:2], dtype=np.uint8)
        cv2.circle(mask, (x, y), max(1, r-5), 255, -1)  # Inner circle to avoid borders
        
        # Extract pixels within the circle
        circle_pixels = gray_image[mask == 255]
        
        if len(circle_pixels) == 0:
            return False, 0
        
        # Calculate statistics
        mean_intensity = np.mean(circle_pixels)
        median_intensity = np.median(circle_pixels)
        std_intensity = np.std(circle_pixels)
        
        # Count dark pixels (for black filled circles)
        dark_pixels = np.sum(circle_pixels < 100)  # Very dark pixels
        total_pixels = len(circle_pixels)
        dark_ratio = dark_pixels / total_pixels
        
        # Calculate fill percentage based on darkness
        fill_percentage = dark_ratio * 100
        
        # A circle is considered "filled/selected" if:
        # 1. High percentage of dark pixels (>60% for filled black circles)
        # 2. Low mean intensity (<120 for black filled)
        # 3. Low median intensity (<100 for black filled)
        is_shaded = (dark_ratio > 0.6 and 
                    mean_intensity < 120 and 
                    median_intensity < 100)
        
        return is_shaded, fill_percentage
    
    def scan_shaded_circles(self, image_path):
        """
        Main scanning function - detects shaded circles
        """
        print(f"🔍 Scanning image: {os.path.basename(image_path)}")
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {'error': 'Could not load image'}
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect circles
        circles = self.detect_circles(image_path)
        if isinstance(circles, dict) and 'error' in circles:
            return circles
        
        print(f"⚫ Found {len(circles)} circles")
        
        # Check each circle for shading
        shaded_selections = []
        
        for i, circle in enumerate(circles):
            item_name = self.menu_items[i] if i < len(self.menu_items) else f"Item_{i+1}"
            
            is_shaded, fill_percent = self.check_circle_fill(gray, circle)
            
            if is_shaded:
                shaded_selections.append({
                    'item': item_name,
                    'fill_percent': float(round(fill_percent, 1)),
                    'center': (int(circle['center'][0]), int(circle['center'][1])),
                    'radius': int(circle['radius']),
                    'bbox': (int(circle['bbox'][0]), int(circle['bbox'][1]), 
                            int(circle['bbox'][2]), int(circle['bbox'][3]))
                })
                print(f"✓ SHADED: {item_name} (fill: {fill_percent:.1f}%)")
            else:
                print(f"○ Empty: {item_name} (fill: {fill_percent:.1f}%)")
        
        # Create debug image with detailed analysis
        debug_image = image.copy()
        
        # Draw all circles with detailed info
        for i, circle in enumerate(circles):
            x, y, r = circle['center'][0], circle['center'][1], circle['radius']
            item_name = self.menu_items[i] if i < len(self.menu_items) else f"Item_{i+1}"
            
            # Get fill analysis for this circle
            is_shaded, fill_percent = self.check_circle_fill(gray, circle)
            
            if is_shaded:
                # Green for shaded/selected circles
                cv2.circle(debug_image, (x, y), r, (0, 255, 0), 3)
                cv2.putText(debug_image, f"SELECTED ({fill_percent:.1f}%)", (x-40, y-r-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                cv2.putText(debug_image, item_name, (x-20, y+r+15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            else:
                # Red for unselected circles
                cv2.circle(debug_image, (x, y), r, (0, 0, 255), 2)
                cv2.putText(debug_image, f"empty ({fill_percent:.1f}%)", (x-30, y-r-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
                cv2.putText(debug_image, item_name, (x-20, y+r+15), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
        
        # Add comprehensive header
        cv2.putText(debug_image, "OMR CIRCLE DETECTION ANALYSIS", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
        cv2.putText(debug_image, f"Found: {len(circles)} circles, Selected: {len(shaded_selections)}", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 1)
        
        # Save debug image
        debug_filename = f"circle_debug_{os.path.basename(image_path)}"
        cv2.imwrite(debug_filename, debug_image)
        print(f"💾 Debug image saved: {debug_filename}")
        
        return {
            'shaded_selections': shaded_selections,
            'total_circles': int(len(circles)),
            'total_selected': int(len(shaded_selections)),
            'debug_image': debug_image,
            'scan_type': 'SHADED CIRCLES ONLY'
        }

def test_circle_scanner():
    """Test the circle scanner with available images"""
    
    print("⚫ OMR CIRCLE SCANNER - SHADED DETECTION")
    print("=" * 50)
    print("🎯 SCANS: Filled/shaded circles for menu selections")
    print("🚫 IGNORES: Empty circles and quantity boxes")
    print()
    
    scanner = OMRCircleScanner()
    
    # Look for test images in uploads folder
    test_images = []
    if os.path.exists('uploads'):
        for file in os.listdir('uploads'):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                test_images.append(os.path.join('uploads', file))
    
    if not test_images:
        print("❌ No test images found in uploads folder")
        return
    
    # Use the most recent image
    test_image = test_images[-1]
    print(f"📁 Testing with: {os.path.basename(test_image)}")
    
    result = scanner.scan_shaded_circles(test_image)
    
    if 'error' in result:
        print(f"❌ Error: {result['error']}")
        return
    
    print()
    print("📊 CIRCLE SCAN RESULTS:")
    print("=" * 30)
    
    if result['shaded_selections']:
        print("⚫ SHADED CIRCLES (SELECTED):")
        for selection in result['shaded_selections']:
            print(f"   ✓ {selection['item']} (fill: {selection['fill_percent']}%)")
    else:
        print("⚫ No shaded circles detected")
    
    print()
    print("📈 SUMMARY:")
    print(f"   ⚫ Total Circles Found: {result['total_circles']}")
    print(f"   ✓ Shaded Selections: {result['total_selected']}")
    print(f"   📋 Scan Type: {result['scan_type']}")

if __name__ == "__main__":
    test_circle_scanner()