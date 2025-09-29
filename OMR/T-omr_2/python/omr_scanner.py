#!/usr/bin/env python3
"""
OMR Scanner - Core image processing algorithms
Handles circle detection, shaded analysis, and full OMR processing
"""

import cv2
import numpy as np
import os
import json
import base64
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class OMRScanner:
    def __init__(self):
        """Initialize OMR Scanner with default parameters"""
        self.menu_items = [
            'isda', 'egg', 'water', 'sinigang', 
            'chicken', 'pusit', 'gatas', 'beef'
        ]
        
        # Circle detection parameters
        self.circle_params = {
            'dp': 1,
            'minDist': 30,
            'param1': 50,
            'param2': 30,
            'minRadius': 10,
            'maxRadius': 80
        }
        
        # Shaded analysis parameters
        self.shaded_params = {
            'dark_threshold': 100,
            'fill_ratio_threshold': 0.6,
            'mean_intensity_threshold': 120,
            'median_intensity_threshold': 100
        }
        
        # Price mapping for menu items
        self.price_map = {
            'isda': 180.00,
            'egg': 25.00,
            'water': 15.00,
            'sinigang': 120.00,
            'chicken': 150.00,
            'pusit': 220.00,
            'gatas': 35.00,
            'beef': 200.00
        }

    def load_image(self, filepath: str) -> Optional[np.ndarray]:
        """Load image from filepath"""
        try:
            image = cv2.imread(filepath)
            if image is None:
                raise ValueError(f"Could not load image: {filepath}")
            return image
        except Exception as e:
            print(f"Error loading image: {e}")
            return None

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better circle detection"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter to reduce noise while keeping edges sharp
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Apply adaptive threshold for better edge detection
        thresh = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh

    def detect_circles(self, filepath: str) -> Dict:
        """Detect circles in the image"""
        try:
            print(f"Detecting circles in: {os.path.basename(filepath)}")
            
            # Load and preprocess image
            image = self.load_image(filepath)
            if image is None:
                return {"error": "Could not load image"}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            processed = self.preprocess_image(image)
            
            # Detect circles using HoughCircles
            circles = cv2.HoughCircles(
                processed,
                cv2.HOUGH_GRADIENT,
                **self.circle_params
            )
            
            circle_data = []
            if circles is not None:
                circles = np.round(circles[0, :]).astype("int")
                
                # Sort circles by y-coordinate (top to bottom)
                circles = sorted(circles, key=lambda c: c[1])
                
                for i, (x, y, r) in enumerate(circles):
                    circle_data.append({
                        'id': i + 1,
                        'center': (int(x), int(y)),
                        'radius': int(r),
                        'bbox': (int(x-r), int(y-r), int(2*r), int(2*r)),
                        'area': int(np.pi * r * r)
                    })
            
            # Create debug image
            debug_image = image.copy()
            for circle in circle_data:
                x, y, r = circle['center'][0], circle['center'][1], circle['radius']
                cv2.circle(debug_image, (x, y), r, (0, 255, 0), 2)
                cv2.putText(debug_image, str(circle['id']), (x-10, y+5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # Save debug image
            debug_filename = f"circle_debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            debug_path = os.path.join(os.path.dirname(os.path.dirname(filepath)), 'results', debug_filename)
            cv2.imwrite(debug_path, debug_image)
            
            return {
                'circles_found': len(circle_data),
                'circles': circle_data,
                'debug_image': debug_filename,
                'processing_time': datetime.now().isoformat(),
                'parameters': self.circle_params
            }
            
        except Exception as e:
            print(f"Circle detection error: {e}")
            return {"error": str(e)}

    def analyze_circle_fill(self, gray_image: np.ndarray, circle: Dict) -> Tuple[bool, float]:
        """Analyze if a circle is filled/shaded"""
        x, y, r = circle['center'][0], circle['center'][1], circle['radius']
        
        # Create mask for the circle (slightly smaller to avoid border effects)
        mask = np.zeros(gray_image.shape[:2], dtype=np.uint8)
        cv2.circle(mask, (x, y), max(1, r-5), 255, -1)
        
        # Extract pixels within the circle
        circle_pixels = gray_image[mask == 255]
        
        if len(circle_pixels) == 0:
            return False, 0.0
        
        # Calculate statistics
        mean_intensity = np.mean(circle_pixels)
        median_intensity = np.median(circle_pixels)
        
        # Count dark pixels
        dark_pixels = np.sum(circle_pixels < self.shaded_params['dark_threshold'])
        total_pixels = len(circle_pixels)
        fill_percentage = (dark_pixels / total_pixels) * 100
        
        # Determine if circle is shaded
        is_shaded = bool(
            fill_percentage > (self.shaded_params['fill_ratio_threshold'] * 100) and
            mean_intensity < self.shaded_params['mean_intensity_threshold'] and
            median_intensity < self.shaded_params['median_intensity_threshold']
        )
        
        return is_shaded, fill_percentage

    def analyze_shaded_circles(self, filepath: str) -> Dict:
        """Analyze shaded/filled circles in the image"""
        try:
            print(f"Analyzing shaded circles in: {os.path.basename(filepath)}")
            
            # Load image
            image = self.load_image(filepath)
            if image is None:
                return {"error": "Could not load image"}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # First detect all circles
            circles_result = self.detect_circles(filepath)
            if 'error' in circles_result:
                return circles_result
            
            circles = circles_result['circles']
            
            # Analyze each circle for shading
            shaded_circles = []
            empty_circles = []
            
            for circle in circles:
                is_shaded, fill_percent = self.analyze_circle_fill(gray, circle)
                
                circle_info = {
                    'id': circle['id'],
                    'center': circle['center'],
                    'radius': circle['radius'],
                    'fill_percentage': round(fill_percent, 1),
                    'is_shaded': bool(is_shaded)
                }
                
                if is_shaded:
                    shaded_circles.append(circle_info)
                else:
                    empty_circles.append(circle_info)
            
            # Create debug image
            debug_image = image.copy()
            for circle in circles:
                x, y, r = circle['center'][0], circle['center'][1], circle['radius']
                is_shaded = any(c['id'] == circle['id'] for c in shaded_circles)
                
                color = (0, 255, 0) if is_shaded else (0, 0, 255)
                cv2.circle(debug_image, (x, y), r, color, 2)
                
                status = "SHADED" if is_shaded else "EMPTY"
                cv2.putText(debug_image, status, (x-20, y-r-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            # Save debug image
            debug_filename = f"shaded_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            debug_path = os.path.join(os.path.dirname(os.path.dirname(filepath)), 'results', debug_filename)
            cv2.imwrite(debug_path, debug_image)
            
            return {
                'total_circles': len(circles),
                'shaded_circles': len(shaded_circles),
                'empty_circles': len(empty_circles),
                'shaded_circle_data': shaded_circles,
                'empty_circle_data': empty_circles,
                'debug_image': debug_filename,
                'processing_time': datetime.now().isoformat(),
                'parameters': self.shaded_params
            }
            
        except Exception as e:
            print(f"Shaded analysis error: {e}")
            return {"error": str(e)}

    def full_omr_scan(self, filepath: str) -> Dict:
        """Perform complete OMR scan with menu item recognition"""
        try:
            print(f"Performing full OMR scan on: {os.path.basename(filepath)}")
            
            # Load image
            image = self.load_image(filepath)
            if image is None:
                return {"error": "Could not load image"}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect circles
            circles_result = self.detect_circles(filepath)
            if 'error' in circles_result:
                return circles_result
            
            circles = circles_result['circles']
            
            # Analyze shaded circles
            shaded_result = self.analyze_shaded_circles(filepath)
            if 'error' in shaded_result:
                return shaded_result
            
            # Map shaded circles to menu items
            selected_items = []
            for i, shaded_circle in enumerate(shaded_result['shaded_circle_data']):
                if i < len(self.menu_items):
                    item_name = self.menu_items[i]
                    selected_items.append({
                        'item': item_name,
                        'quantity': 1,
                        'price': self.price_map.get(item_name, 100.00),
                        'fill_percentage': shaded_circle['fill_percentage'],
                        'confidence': min(100, max(70, 100 - shaded_circle['fill_percentage'] + 70))
                    })
            
            # Calculate totals
            total_price = sum(item['price'] for item in selected_items)
            
            # Create comprehensive debug image
            debug_image = image.copy()
            for i, circle in enumerate(circles):
                x, y, r = circle['center'][0], circle['center'][1], circle['radius']
                is_shaded = i < len(selected_items)
                
                color = (0, 255, 0) if is_shaded else (0, 0, 255)
                cv2.circle(debug_image, (x, y), r, color, 3)
                
                if is_shaded:
                    item_name = selected_items[i]['item']
                    cv2.putText(debug_image, f"✓ {item_name}", (x-30, y-r-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                else:
                    cv2.putText(debug_image, "○", (x-5, y+5), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Add summary text
            cv2.putText(debug_image, f"Total Items: {len(selected_items)}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
            cv2.putText(debug_image, f"Total Price: ${total_price:.2f}", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
            
            # Save debug image
            debug_filename = f"full_omr_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            debug_path = os.path.join(os.path.dirname(os.path.dirname(filepath)), 'results', debug_filename)
            cv2.imwrite(debug_path, debug_image)
            
            return {
                'scan_type': 'FULL_OMR_SCAN',
                'total_circles': len(circles),
                'selected_items': len(selected_items),
                'selected_item_data': selected_items,
                'total_price': round(total_price, 2),
                'menu_items_available': self.menu_items,
                'debug_image': debug_filename,
                'processing_time': datetime.now().isoformat(),
                'confidence_score': round(np.mean([item['confidence'] for item in selected_items]) if selected_items else 0, 1)
            }
            
        except Exception as e:
            print(f"Full OMR scan error: {e}")
            return {"error": str(e)}

    def get_debug_image_base64(self, image: np.ndarray) -> str:
        """Convert debug image to base64 string"""
        try:
            _, buffer = cv2.imencode('.jpg', image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            return image_base64
        except Exception as e:
            print(f"Error encoding debug image: {e}")
            return ""

    def save_results(self, results: Dict, filename: str) -> str:
        """Save results to JSON file"""
        try:
            results_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'results', filename)
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            return results_path
        except Exception as e:
            print(f"Error saving results: {e}")
            return ""

# Test function
if __name__ == "__main__":
    scanner = OMRScanner()
    print("OMR Scanner initialized successfully")
    print(f"Menu items: {scanner.menu_items}")
    print(f"Circle detection parameters: {scanner.circle_params}")
    print(f"Shaded analysis parameters: {scanner.shaded_params}")
