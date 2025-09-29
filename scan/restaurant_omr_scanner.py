#!/usr/bin/env python3
"""
Restaurant OMR Scanner - Maps shaded circles to restaurant menu items
Specifically designed for restaurant POS systems with table, pax, and menu item mapping
"""

import cv2
import numpy as np
import os
import json

class RestaurantOMRScanner:
    def __init__(self):
        # Restaurant menu mapping - circles to menu items
        self.menu_mapping = {
            # Table selection (circles 1-10)
            1: {"type": "table", "value": 1},
            2: {"type": "table", "value": 2},
            3: {"type": "table", "value": 3},
            4: {"type": "table", "value": 4},
            5: {"type": "table", "value": 5},
            6: {"type": "table", "value": 6},
            7: {"type": "table", "value": 7},
            8: {"type": "table", "value": 8},
            9: {"type": "table", "value": 9},
            10: {"type": "table", "value": 10},
            
            # Pax selection (circles 11-15)
            11: {"type": "pax", "value": 1},
            12: {"type": "pax", "value": 2},
            13: {"type": "pax", "value": 3},
            14: {"type": "pax", "value": 4},
            15: {"type": "pax", "value": 5},
            
            # Menu items (circles 16+) - Updated to match your form
            16: {"type": "item", "name": "Isda", "price": 0.00},
            17: {"type": "item", "name": "Egg", "price": 0.00},
            18: {"type": "item", "name": "Water", "price": 0.00},
            19: {"type": "item", "name": "Sinigang", "price": 0.00},
            20: {"type": "item", "name": "Chicken", "price": 0.00},
            21: {"type": "item", "name": "Pusit", "price": 0.00},
        }
        
    def detect_circles(self, image_path):
        """Detect circles in the image using HoughCircles"""
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
            minDist=50,
            param1=100,
            param2=50,
            minRadius=15,
            maxRadius=100
        )
        
        circle_data = []
        if circles is not None:
            circles = np.round(circles[0, :]).astype("int")
            
            # Sort circles by y-coordinate (top to bottom), then by x-coordinate (left to right)
            circles = sorted(circles, key=lambda c: (c[1], c[0]))
            
            for i, (x, y, r) in enumerate(circles):
                circle_data.append({
                    'center': (int(x), int(y)),
                    'radius': int(r),
                    'bbox': (int(x-r), int(y-r), int(2*r), int(2*r)),
                    'index': i + 1  # Start from 1 to match menu mapping
                })
        
        return circle_data
    
    def check_circle_fill(self, gray_image, circle):
        """Check if circle is filled/shaded"""
        x, y, r = circle['center'][0], circle['center'][1], circle['radius']
        
        # Create a mask for the circle (slightly smaller to avoid border effects)
        mask = np.zeros(gray_image.shape[:2], dtype=np.uint8)
        cv2.circle(mask, (x, y), max(1, r-5), 255, -1)
        
        # Extract pixels within the circle
        circle_pixels = gray_image[mask == 255]
        
        if len(circle_pixels) == 0:
            return False, 0
        
        # Calculate statistics
        mean_intensity = np.mean(circle_pixels)
        median_intensity = np.median(circle_pixels)
        std_intensity = np.std(circle_pixels)
        
        # Count dark pixels (for black filled circles)
        dark_pixels = np.sum(circle_pixels < 100)
        total_pixels = len(circle_pixels)
        dark_ratio = dark_pixels / total_pixels
        
        # Calculate fill percentage based on darkness
        fill_percentage = dark_ratio * 100
        
        # A circle is considered "filled/selected" if:
        # Lowered thresholds to detect lighter shading
        is_shaded = (dark_ratio > 0.3 and 
                    mean_intensity < 150 and 
                    median_intensity < 140 and
                    std_intensity < 60)
        
        return is_shaded, fill_percentage
    
    def scan_restaurant_order(self, image_path):
        """Main scanning function - maps shaded circles to restaurant order data"""
        print(f"Scanning restaurant order: {os.path.basename(image_path)}")
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {'error': 'Could not load image'}
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect circles
        circles = self.detect_circles(image_path)
        if isinstance(circles, dict) and 'error' in circles:
            return circles
        
        print(f"Found {len(circles)} circles")
        
        # Check each circle for shading and map to restaurant data
        selected_table = None
        selected_pax = None
        selected_items = []
        
        for circle in circles:
            circle_index = circle['index']
            center = circle['center']
            radius = circle['radius']
            
            print(f"Analyzing circle {circle_index} at ({center[0]}, {center[1]}) radius {radius}")
            
            is_shaded, fill_percent = self.check_circle_fill(gray, circle)
            
            if is_shaded and circle_index in self.menu_mapping:
                mapping = self.menu_mapping[circle_index]
                
                if mapping["type"] == "table":
                    selected_table = mapping["value"]
                    print(f"TABLE: {selected_table} (fill: {fill_percent:.1f}%)")
                    
                elif mapping["type"] == "pax":
                    selected_pax = mapping["value"]
                    print(f"PAX: {selected_pax} (fill: {fill_percent:.1f}%)")
                    
                elif mapping["type"] == "item":
                    # Always add item, no quantity check
                    selected_items.append({
                        "name": mapping["name"],
                        "price": mapping["price"],
                        "quantity": 1
                    })
                    print(f"ITEM: {mapping['name']} (fill: {fill_percent:.1f}%)")
            else:
                if circle_index in self.menu_mapping:
                    mapping = self.menu_mapping[circle_index]
                    print(f"Empty: {mapping['type']} {mapping.get('name', mapping.get('value', ''))} (fill: {fill_percent:.1f}%)")
                else:
                    print(f"Empty: Circle_{circle_index} (fill: {fill_percent:.1f}%)")
        
        # Create debug image with restaurant-specific annotations
        debug_image = image.copy()
        
        # Draw all circles with restaurant-specific info
        for circle in circles:
            x, y, r = circle['center'][0], circle['center'][1], circle['radius']
            circle_index = circle['index']
            
            # Get fill analysis for this circle
            is_shaded, fill_percent = self.check_circle_fill(gray, circle)
            
            if is_shaded and circle_index in self.menu_mapping:
                mapping = self.menu_mapping[circle_index]
                
                if mapping["type"] == "table":
                    # Green for selected table
                    cv2.circle(debug_image, (x, y), r, (0, 255, 0), 3)
                    cv2.putText(debug_image, f"TABLE {mapping['value']}", (x-30, y-r-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                elif mapping["type"] == "pax":
                    # Blue for selected pax
                    cv2.circle(debug_image, (x, y), r, (255, 0, 0), 3)
                    cv2.putText(debug_image, f"PAX {mapping['value']}", (x-25, y-r-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
                elif mapping["type"] == "item":
                    # Yellow for selected items
                    cv2.circle(debug_image, (x, y), r, (0, 255, 255), 3)
                    cv2.putText(debug_image, f"{mapping['name']}", (x-40, y-r-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 255, 255), 1)
            else:
                # Red for unselected circles
                cv2.circle(debug_image, (x, y), r, (0, 0, 255), 2)
                if circle_index in self.menu_mapping:
                    mapping = self.menu_mapping[circle_index]
                    cv2.putText(debug_image, f"{mapping['type']} {mapping.get('name', mapping.get('value', ''))}", 
                               (x-30, y-r-10), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1)
        
        # Add restaurant-specific header
        cv2.putText(debug_image, "RESTAURANT OMR ORDER SCAN", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
        
        order_summary = f"Table: {selected_table or 'N/A'}, Pax: {selected_pax or 'N/A'}, Items: {len(selected_items)}"
        cv2.putText(debug_image, order_summary, (10, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 1)
        
        # Save debug image
        debug_filename = f"restaurant_debug_{os.path.basename(image_path)}"
        cv2.imwrite(debug_filename, debug_image)
        print(f"Debug image saved: {debug_filename}")
        
        # Calculate total amount
        total_amount = sum(item["price"] * item["quantity"] for item in selected_items)
        
        return {
            'table': selected_table,
            'pax': selected_pax,
            'items': selected_items,
            'total_amount': total_amount,
            'total_circles': len(circles),
            'total_selected': len([c for c in circles if self.check_circle_fill(gray, c)[0]]),
            'debug_image': debug_image,
            'scan_type': 'RESTAURANT ORDER'
        }

def test_restaurant_scanner():
    """Test the restaurant scanner with available images"""
    
    print("RESTAURANT OMR SCANNER")
    print("=" * 50)
    print("SCANS: Table, Pax, and Menu Items")
    print("OUTPUT: Structured restaurant order data")
    print()
    
    scanner = RestaurantOMRScanner()
    
    # Look for test images in uploads folder
    test_images = []
    if os.path.exists('uploads'):
        for file in os.listdir('uploads'):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                test_images.append(os.path.join('uploads', file))
    
    if not test_images:
        print("No test images found in uploads folder")
        return
    
    # Use the most recent image
    test_image = test_images[-1]
    print(f"Testing with: {os.path.basename(test_image)}")
    
    result = scanner.scan_restaurant_order(test_image)
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        return
    
    print()
    print("RESTAURANT ORDER RESULTS:")
    print("=" * 40)
    
    if result['table']:
        print(f"Table: {result['table']}")
    else:
        print("Table: Not selected")
    
    if result['pax']:
        print(f"Pax: {result['pax']}")
    else:
        print("Pax: Not selected")
    
    if result['items']:
        print("Items:")
        for item in result['items']:
            print(f"   {item['quantity']} × {item['name']} - ₱{item['price']:.2f}")
        print(f"Total: ₱{result['total_amount']:.2f}")
    else:
        print("No items selected")
    
    print()
    print("SUMMARY:")
    print(f"   Total Circles Found: {result['total_circles']}")
    print(f"   Selected Circles: {result['total_selected']}")
    print(f"   Scan Type: {result['scan_type']}")

if __name__ == "__main__":
    test_restaurant_scanner()
