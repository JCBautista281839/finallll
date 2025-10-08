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
            'WhtRc', 'Bangsi', 'TnaPng', 'PnkBagn', 'Bulalo',  
            'MacChs', 'OvrBngs', 'Carbo', 'OrgChk', 'PltWhtRc',  
            'RB-Bina', 'Viktoria’s Classic', 'SngTun', 'Alfrdo', 'Tapsi',  
            'SzTofu', 'Porksi', 'PrkSsg', 'SprRc', 'Lechsi',  
            'Fst3', 'Parmesan Wings', 'Crispy Diniguan w/ Rice', 'ChkSsg', 'PrkRc',  
            'VktChk', 'BcnEggChs', 'BgrRc', 'PltGrlcRc', 'BfKald',  
            'ChickBul', 'Chk&Moj', 'RB-KK', 'Fst2', 'SisiSi',  
            'Cal&Frs', 'GrnSld', 'OrgChkR', 'ChkFil', 'Chksi',  
            'TstBrd', 'SngBab', 'Fst1', 'RB-BulDng', 'ClbHse',  
            'Liemsi', 'RB-Tofu', 'AmpCar', 'Bagn', 'Htdog',  
            'Mojos', 'TndRc', 'RB-Kald', 'Chopsy', 'FshFil',  
            'Hotsi', 'Longsi', 'BtrShrp', 'CrisKK', 'HnyWngs',  
            'Tocsi', 'Spag', 'CrsPata', 'TbnRc', 'Egg',  
            'CdnBlu', 'Nachos', 'SngHip', 'GrlcRc', 'Fst4',  
            'Viktoria’s Cheesy Bacon', 'Fish&Moj', 'FrFrs', 'ChkTapa', 'BufWngs',  
            'Viktoria’s Double Cheesy Bacon', 'HamEggChs', 'BfBroc', 'CrisDng'

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
            'WhtRc': 30.00,
            'Bangsi': 145.00,
            'TnaPng': 320.00,
            'PnkBagn': 510.00,
            'Bulalo': 510.00,
            'MacChs': 180.00,
            'OvrBngs': 420.00,
            'Carbo': 190.00,
            'OrgChk': 460.00,
            'PltWhtRc': 110.00,
            'RB-Bina': 190.00,
            'Viktoria’s Classic': 220.00,
            'SngTun': 490.00,
            'Alfrdo': 230.00,
            'Tapsi': 150.00,
            'SzTofu': 190.00,
            'Porksi': 155.00,
            'PrkSsg': 230.00,
            'SprRc': 290.00,
            'Lechsi': 160.00,
            'Fst3': 1889.00,
            'Parmesan Wings': 240.00,
            'Crispy Diniguan w/ Rice': 170.00,
            'ChkSsg': 230.00,
            'PrkRc': 250.00,
            'VktChk': 490.00,
            'BcnEggChs': 150.00,
            'BgrRc': 180.00,
            'PltGrlcRc': 120.00,
            'BfKald': 505.00,
            'ChickBul': 160.00,
            'Chk&Moj': 270.00,
            'RB-KK': 230.00,
            'Fst2': 1669.00,
            'SisiSi': 140.00,
            'Cal&Frs': 300.00,
            'GrnSld': 230.00,
            'OrgChkR': 170.00,
            'ChkFil': 140.00,
            'Chksi': 150.00,
            'TstBrd': 30.00,
            'SngBab': 495.00,
            'Fst1': 1449.00,
            'RB-BulDng': 160.00,
            'ClbHse': 180.00,
            'Liemsi': 160.00,
            'RB-Tofu': 160.00,
            'AmpCar': 460.00,
            'Bagn': 360.00,
            'Htdog': 80.00,
            'Mojos': 120.00,
            'TndRc': 290.00,
            'RB-Kald': 250.00,
            'Chopsy': 420.00,
            'FshFil': 170.00,
            'Hotsi': 90.00,
            'Longsi': 170.00,
            'BtrShrp': 505.00,
            'CrisKK': 505.00,
            'HnyWngs': 220.00,
            'Tocsi': 140.00,
            'Spag': 210.00,
            'CrsPata': 800.00,
            'TbnRc': 290.00,
            'Egg': 60.00,
            'CdnBlu': 170.00,
            'Nachos': 205.00,
            'SngHip': 490.00,
            'GrlcRc': 35.00,
            'Fst4': 1779.00,
            'Viktoria’s Cheesy Bacon': 280.00,
            'Fish&Moj': 260.00,
            'FrFrs': 80.00,
            'ChkTapa': 140.00,
            'BufWngs': 220.00,
            'Viktoria’s Double Cheesy Bacon': 350.00,
            'HamEggChs': 150.00,
            'BfBroc': 505.00,
            'CrisDng': 495.00
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
                
    
                circles = sorted(circles, key=lambda c: (c[0], c[1]))
                
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

    def analyze_shaded_circles(self, filepath: str, circles_data: Optional[List[Dict]] = None) -> Dict:
        """Analyze shaded/filled circles in the image"""
        try:
            print(f"Analyzing shaded circles in: {os.path.basename(filepath)}")
            
            # Load image
            image = self.load_image(filepath)
            if image is None:
                return {"error": "Could not load image"}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Use provided circles or detect them
            if circles_data is None:
                circles_result = self.detect_circles(filepath)
                if 'error' in circles_result:
                    return circles_result
                circles = circles_result['circles']
            else:
                circles = circles_data
            
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
                cv2.putText(debug_image, str(circle['id']), (x-10, y+5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1) # Add circle ID
            
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
            
            # Analyze shaded circles, passing the detected circles
            shaded_result = self.analyze_shaded_circles(filepath, circles_data=circles)
            if 'error' in shaded_result:
                return shaded_result
            
            # Map shaded circles to menu items
            selected_items = [] # Re-introduce for calculations
            selected_items_display = []
            for i, circle in enumerate(circles): # Iterate through all circles, not just shaded ones
                item_name = self.menu_items[i] if i < len(self.menu_items) else "N/A"
                is_shaded = any(c['id'] == circle['id'] for c in shaded_result['shaded_circle_data'])
                
                if is_shaded and i < len(self.menu_items): # Only add shaded items for price/confidence calculation
                    selected_items.append({
                        'item': item_name,
                        'quantity': 1,
                        'price': self.price_map.get(item_name, 100.00),
                        'fill_percentage': next(c['fill_percentage'] for c in shaded_result['shaded_circle_data'] if c['id'] == circle['id']), # Get fill_percentage for shaded item
                        'confidence': min(100, max(70, 100 - next(c['fill_percentage'] for c in shaded_result['shaded_circle_data'] if c['id'] == circle['id']) + 70))
                    })

                status = "Shaded" if is_shaded else "Not Shaded"
                selected_items_display.append(f"ID {circle['id']}: {item_name} ({status})")

            # Calculate totals
            total_price = sum(item['price'] for item in selected_items) # Keep original calculation for total price
            
            # Create comprehensive debug image
            debug_image = image.copy()
            # Create a set of shaded circle IDs for quick lookup
            shaded_circle_ids = {c['id'] for c in shaded_result['shaded_circle_data']}

            for i, circle in enumerate(circles):
                x, y, r = circle['center'][0], circle['center'][1], circle['radius']
                current_circle_id = circle['id']
                is_shaded = current_circle_id in shaded_circle_ids
                
                color = (0, 255, 0) if is_shaded else (0, 0, 255) # Green for shaded, Red for empty
                cv2.circle(debug_image, (x, y), r, color, 3)
                
                # Find the corresponding item name for the circle ID
                item_name = "N/A"
                for item_data in selected_items:
                    # This logic assumes a direct mapping from circle index to menu_items index.
                    # We need to refine this to map based on circle ID if possible, but for now, 
                    # we'll stick to the existing index-based mapping for item names.
                    # However, the is_shaded logic is now correctly based on detected shaded circles.
                    if i < len(self.menu_items):
                        item_name = self.menu_items[i]
                        break
                
                if is_shaded:
                    cv2.putText(debug_image, f" {item_name}", (x-30, y-r-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                else:
                    cv2.putText(debug_image, f" {item_name}", (x-30, y-r-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                cv2.putText(debug_image, str(current_circle_id), (x-10, y+5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1) # Add circle ID
            
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
                'selected_item_data': selected_items_display, # Use the new display-ready list
                'total_price': round(total_price, 2),
                'menu_items_available': self.menu_items,
                'debug_image': debug_filename,
                'processing_time': datetime.now().isoformat(),
                'confidence_score': round(np.mean([item['confidence'] for item in selected_items]) if selected_items else 0, 1),
                'selected_items_display': selected_items_display # Ensure this is also available
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
