#!/usr/bin/env python3
"""
OMR (Optical Mark Recognition) System for Menu Selection Forms
This script automatically processes menu form images to detect selected items.
"""

import cv2
import numpy as np
import os
import json
from datetime import datetime
import argparse
import sys
from pathlib import Path

class OMRProcessor:
    def __init__(self, debug_mode=False):
        self.menu_items = ['isda', 'egg', 'water', 'sinigang', 'Chicken', 'pusit']
        self.results = []
        self.debug_mode = debug_mode
        
    def preprocess_image(self, image_path):
        """Load and preprocess the image for OMR detection."""
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) for better contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
            
            # Apply adaptive threshold for better handling of varying lighting
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply morphological operations to clean up the image
            kernel = np.ones((2, 2), np.uint8)
            thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return img, enhanced, thresh
            
        except Exception as e:
            print(f"Error preprocessing image {image_path}: {str(e)}")
            return None, None, None
    
    def detect_menu_regions(self, gray_image):
        """Detect specific regions for each menu item based on your actual form layout."""
        height, width = gray_image.shape
        
        # Based on your actual form image analysis:
        # The form appears to have 6 visible items (not 8 as originally thought)
        # Let me check if we're only using the first 6 items from the menu list
        
        visible_items = self.menu_items[:6]  # Only first 6 items are visible in your form
        
        # More precise layout analysis from your form:
        # - Header takes about 20% of height
        # - Menu items are tightly packed in the remaining space
        # - Each item row is evenly spaced
        
        header_height = int(height * 0.2)   # Larger header area
        footer_height = int(height * 0.05)  # Small footer margin
        menu_area_height = height - header_height - footer_height
        
        # Divide by 6 visible items
        item_height = menu_area_height // len(visible_items)
        
        regions = []
        for i, item in enumerate(visible_items):
            y_start = header_height + (i * item_height)
            y_end = y_start + item_height
            
            # More precise circle positioning based on actual form
            # Circles are on the right side, closer to the edge
            x_start = int(width * 0.75)   # Further right where circles actually are
            x_end = int(width * 0.95)     # Close to right edge
            
            regions.append({
                'item': item,
                'region': (x_start, y_start, x_end - x_start, y_end - y_start),
                'y_center': y_start + (item_height // 2),
                'row_index': i
            })
            
            # Debug: print region info
            if self.debug_mode:
                print(f"Region {i}: {item} -> y={y_start}-{y_end}, x={x_start}-{x_end}")
        
        return regions

    def detect_circles(self, image, gray_image):
        """Detect circular marks (filled/unfilled) in the image with improved accuracy."""
        try:
            # Get menu regions first
            menu_regions = self.detect_menu_regions(gray_image)
            
            # Optimized HoughCircles for your clean form layout
            circles = cv2.HoughCircles(
                gray_image,
                cv2.HOUGH_GRADIENT,
                dp=1,
                minDist=35,   # Good spacing for 8-item form
                param1=45,    # Balanced sensitivity
                param2=30,    # Good precision for clean circles
                minRadius=10, # Accommodate various circle sizes
                maxRadius=25  # Reasonable max for form circles
            )
            
            detections = []
            
            # Initialize all visible items as not selected
            for region in menu_regions:
                detections.append({
                    'item': region['item'],
                    'selected': False,
                    'confidence': 0.0,
                    'position': None,
                    'mean_intensity': 255,
                    'fill_ratio': 0.0
                })
            
            # Add remaining items (not visible in this form) as not selected
            visible_items = [r['item'] for r in menu_regions]
            for item in self.menu_items:
                if item not in visible_items:
                    detections.append({
                        'item': item,
                        'selected': False,
                        'confidence': 0.0,
                        'position': None,
                        'mean_intensity': 255,
                        'fill_ratio': 0.0,
                        'note': 'Not visible in form'
                    })
            
            if circles is not None:
                circles = np.round(circles[0, :]).astype("int")
                
                for (x, y, r) in circles:
                    # Find which menu item this circle belongs to
                    best_match = None
                    min_distance = float('inf')
                    
                    for i, region in enumerate(menu_regions):
                        region_x, region_y, region_w, region_h = region['region']
                        
                        # Check if circle is within this region
                        if (region_x <= x <= region_x + region_w and 
                            region_y <= y <= region_y + region_h):
                            
                            # Calculate distance to region center
                            region_center_y = region['y_center']
                            distance = abs(y - region_center_y)
                            
                            if distance < min_distance:
                                min_distance = distance
                                best_match = i
                    
                    if best_match is not None:
                        # Analyze this circle for fill status
                        mask = np.zeros(gray_image.shape, dtype=np.uint8)
                        cv2.circle(mask, (x, y), max(r-3, 5), 255, -1)
                        
                        # Get the region inside the circle
                        circle_region = gray_image[max(0, y-r):min(gray_image.shape[0], y+r), 
                                                 max(0, x-r):min(gray_image.shape[1], x+r)]
                        circle_mask = mask[max(0, y-r):min(gray_image.shape[0], y+r), 
                                         max(0, x-r):min(gray_image.shape[1], x+r)]
                        
                        if circle_region.size > 0 and circle_mask.size > 0:
                            # Calculate fill ratio using binary threshold
                            _, binary = cv2.threshold(circle_region, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                            
                            # Count dark pixels (filled area)
                            mask_pixels = np.sum(circle_mask > 0)
                            dark_pixels = np.sum((binary == 0) & (circle_mask > 0))
                            
                            if mask_pixels > 0:
                                fill_ratio = dark_pixels / mask_pixels
                                mean_intensity = cv2.mean(circle_region, mask=circle_mask)[0]
                                
                                # Strict detection for solid black circles only
                                # Based on your form where only truly filled circles should be detected
                                # Only detect circles that are very dark AND have high fill ratio
                                is_filled = (fill_ratio > 0.8 and mean_intensity < 50) or \
                                           (fill_ratio > 0.9)
                                
                                # Calculate confidence based on fill ratio and intensity
                                intensity_confidence = max(0, (150 - mean_intensity) / 150)
                                fill_confidence = min(fill_ratio * 2, 1.0)
                                confidence = (intensity_confidence + fill_confidence) / 2
                                
                                # Only update if this circle is better than the current detection for this item
                                current_detection = detections[best_match]
                                current_confidence = current_detection.get('confidence', 0)
                                
                                # Update if this is a better detection (higher confidence and filled, or first detection)
                                if (is_filled and confidence > current_confidence) or current_detection['position'] is None:
                                    detections[best_match].update({
                                        'selected': bool(is_filled),
                                        'confidence': round(float(confidence), 3),
                                        'position': {'x': int(x), 'y': int(y), 'radius': int(r)},
                                        'mean_intensity': round(float(mean_intensity), 2),
                                        'fill_ratio': round(float(fill_ratio), 3)
                                    })
                                
                                print(f"Circle at ({x},{y}) -> {menu_regions[best_match]['item']}: "
                                      f"fill_ratio={fill_ratio:.3f}, intensity={mean_intensity:.1f}, "
                                      f"selected={is_filled}, conf={confidence:.3f}")
                                
                                # Save debug image with circle annotations (optional)
                                if hasattr(self, 'debug_mode') and self.debug_mode:
                                    color = (0, 255, 0) if is_filled else (0, 0, 255)  # Green if filled, Red if not
                                    cv2.circle(image, (x, y), r, color, 2)
                                    cv2.putText(image, f"{menu_regions[best_match]['item']}", 
                                              (x-30, y-r-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            return detections
            
        except Exception as e:
            print(f"Error detecting circles: {str(e)}")
            return []
    
    def detect_checkboxes(self, image, thresh_image):
        """Detect rectangular checkbox marks in the image."""
        try:
            # Find contours
            contours, _ = cv2.findContours(thresh_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            detections = []
            checkbox_count = 0
            
            for contour in contours:
                # Calculate contour area and aspect ratio
                area = cv2.contourArea(contour)
                if area < 100 or area > 2000:  # Filter by size
                    continue
                
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h
                
                # Check if it's roughly square (checkbox-like)
                if 0.7 <= aspect_ratio <= 1.3:
                    # Extract checkbox region
                    checkbox_region = thresh_image[y:y+h, x:x+w]
                    
                    # Calculate fill percentage
                    filled_pixels = np.sum(checkbox_region == 0)  # Dark pixels
                    total_pixels = w * h
                    fill_percentage = filled_pixels / total_pixels
                    
                    # Determine if checkbox is marked
                    is_filled = fill_percentage > 0.3  # 30% threshold
                    confidence = min(fill_percentage * 2, 1.0)
                    
                    # Map to menu item
                    menu_index = min(checkbox_count, len(self.menu_items) - 1)
                    
                    detections.append({
                        'item': self.menu_items[menu_index] if menu_index < len(self.menu_items) else f'unknown_{checkbox_count}',
                        'selected': is_filled,
                        'confidence': round(confidence, 3),
                        'position': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                        'fill_percentage': round(fill_percentage, 3)
                    })
                    
                    checkbox_count += 1
                    
                    if checkbox_count >= len(self.menu_items):
                        break
            
            return detections
            
        except Exception as e:
            print(f"Error detecting checkboxes: {str(e)}")
            return []
    
    def process_image(self, image_path):
        """Process a single image and return detection results."""
        print(f"Processing: {image_path}")
        
        # Preprocess image
        original, gray, thresh = self.preprocess_image(image_path)
        if original is None:
            return None
        
        # Try both circle and checkbox detection
        circle_detections = self.detect_circles(original, gray)
        checkbox_detections = self.detect_checkboxes(original, thresh)
        
        # Use the detection method that found more valid results
        if len(circle_detections) >= len(checkbox_detections):
            detections = circle_detections
            method = "circle"
        else:
            detections = checkbox_detections
            method = "checkbox"
        
        # Ensure we have detections for all menu items
        detected_items = {d['item'] for d in detections}
        for item in self.menu_items:
            if item not in detected_items:
                detections.append({
                    'item': item,
                    'selected': False,
                    'confidence': 0.0,
                    'position': None,
                    'note': 'Not detected'
                })
        
        # Sort detections by menu item order
        item_order = {item: i for i, item in enumerate(self.menu_items)}
        detections.sort(key=lambda x: item_order.get(x['item'], 999))
        
        result = {
            'file_name': os.path.basename(image_path),
            'file_path': image_path,
            'timestamp': datetime.now().isoformat(),
            'detection_method': method,
            'selections': detections,
            'summary': {
                'total_items': len(self.menu_items),
                'selected_count': sum(1 for d in detections if d['selected']),
                'selected_items': [d['item'] for d in detections if d['selected']]
            }
        }
        
        return result
    
    def process_folder(self, folder_path):
        """Process all images in a folder."""
        folder = Path(folder_path)
        if not folder.exists():
            print(f"Error: Folder '{folder_path}' does not exist.")
            return []
        
        # Supported image extensions
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
        
        # Find all image files
        image_files = []
        for ext in image_extensions:
            image_files.extend(folder.glob(f'*{ext}'))
            image_files.extend(folder.glob(f'*{ext.upper()}'))
        
        if not image_files:
            print(f"No image files found in '{folder_path}'")
            return []
        
        print(f"Found {len(image_files)} image(s) to process")
        
        results = []
        for image_file in image_files:
            result = self.process_image(str(image_file))
            if result:
                results.append(result)
                self.print_result(result)
        
        return results
    
    def print_result(self, result):
        """Print processing result to console."""
        print(f"\n{'='*60}")
        print(f"File: {result['file_name']}")
        print(f"Method: {result['detection_method']}")
        print(f"Processed: {result['timestamp']}")
        print(f"{'='*60}")
        
        print("\nDetections:")
        for selection in result['selections']:
            status = "✓ SELECTED" if selection['selected'] else "○ Not selected"
            confidence = f"({selection['confidence']:.1%})" if selection['confidence'] > 0 else ""
            print(f"  {selection['item']:<12} {status} {confidence}")
        
        summary = result['summary']
        if summary['selected_items']:
            print(f"\nSelected items ({summary['selected_count']}):")
            print(f"  {', '.join(summary['selected_items'])}")
        else:
            print("\nNo items selected")
    
    def save_results(self, results, output_file='omr_results.json'):
        """Save results to JSON file."""
        try:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\nResults saved to: {output_file}")
        except Exception as e:
            print(f"Error saving results: {str(e)}")
    
    def generate_report(self, results, output_file='omr_report.html'):
        """Generate an HTML report of the results."""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OMR Processing Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .summary { background: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .result-card { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
        .result-header { background: #667eea; color: white; padding: 15px; }
        .result-body { padding: 20px; }
        .selections { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 15px; }
        .selection-item { background: #f8f9ff; padding: 10px; border-radius: 5px; border-left: 3px solid #ccc; }
        .selection-item.selected { background: #e8f5e8; border-left-color: #28a745; }
        .selected-summary { background: #d4edda; padding: 10px; border-radius: 5px; margin-top: 15px; border-left: 4px solid #28a745; }
        .metadata { font-size: 0.9em; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>OMR Menu Selection Report</h1>
        <div class="summary">
            <h3>Processing Summary</h3>
            <p><strong>Total Forms Processed:</strong> {total_forms}</p>
            <p><strong>Report Generated:</strong> {report_time}</p>
            <p><strong>Total Selections:</strong> {total_selections}</p>
        </div>
        {results_html}
    </div>
</body>
</html>"""
        
        try:
            results_html = ""
            total_selections = 0
            
            for i, result in enumerate(results, 1):
                selected_items = result['summary']['selected_items']
                total_selections += len(selected_items)
                
                selections_html = ""
                for selection in result['selections']:
                    selected_class = "selected" if selection['selected'] else ""
                    confidence_text = f"({selection['confidence']:.1%})" if selection['confidence'] > 0 else ""
                    selections_html += f"""
                    <div class="selection-item {selected_class}">
                        <strong>{selection['item']}</strong><br>
                        Status: {"✓ Selected" if selection['selected'] else "○ Not selected"}<br>
                        <small>Confidence: {confidence_text}</small>
                    </div>"""
                
                selected_summary = ""
                if selected_items:
                    selected_summary = f"""
                    <div class="selected-summary">
                        <strong>Selected Items:</strong> {', '.join(selected_items)}
                    </div>"""
                
                results_html += f"""
                <div class="result-card">
                    <div class="result-header">
                        <h3>Form {i}: {result['file_name']}</h3>
                    </div>
                    <div class="result-body">
                        <div class="selections">{selections_html}</div>
                        {selected_summary}
                        <div class="metadata">
                            <p>Detection Method: {result['detection_method']} | 
                            Processed: {result['timestamp']} | 
                            Items Selected: {result['summary']['selected_count']}/{result['summary']['total_items']}</p>
                        </div>
                    </div>
                </div>"""
            
            final_html = html_template.format(
                total_forms=len(results),
                report_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                total_selections=total_selections,
                results_html=results_html
            )
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(final_html)
            print(f"HTML report saved to: {output_file}")
            
        except Exception as e:
            print(f"Error generating report: {str(e)}")


def main():
    """Main function to run the OMR processor."""
    parser = argparse.ArgumentParser(description="OMR Menu Selection Processor")
    parser.add_argument('input_path', help='Path to image file or folder containing images')
    parser.add_argument('--output', '-o', default='omr_results.json', help='Output JSON file path')
    parser.add_argument('--report', '-r', help='Generate HTML report (specify filename)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input_path):
        print(f"Error: Path '{args.input_path}' does not exist.")
        sys.exit(1)
    
    # Initialize OMR processor
    processor = OMRProcessor()
    
    print("OMR Menu Selection Processor")
    print("=" * 50)
    
    # Process input
    if os.path.isfile(args.input_path):
        # Single file
        result = processor.process_image(args.input_path)
        results = [result] if result else []
    else:
        # Folder
        results = processor.process_folder(args.input_path)
    
    if not results:
        print("No results to save.")
        sys.exit(1)
    
    # Save results
    processor.save_results(results, args.output)
    
    # Generate HTML report if requested
    if args.report:
        processor.generate_report(results, args.report)
    
    # Print summary
    total_forms = len(results)
    total_selected = sum(len(r['summary']['selected_items']) for r in results)
    
    print(f"\n" + "=" * 50)
    print(f"PROCESSING COMPLETE")
    print(f"=" * 50)
    print(f"Forms processed: {total_forms}")
    print(f"Total selections: {total_selected}")
    print(f"Results saved to: {args.output}")
    
    if args.report:
        print(f"Report saved to: {args.report}")


def auto_run_demo():
    """Auto-run demonstration with sample data."""
    print("OMR System - Auto Demo Mode")
    print("=" * 40)
    
    # Create sample directory structure
    demo_dir = "omr_demo"
    os.makedirs(demo_dir, exist_ok=True)
    
    # Create a simple demonstration with debug mode
    processor = OMRProcessor(debug_mode=True)
    
    # Check for actual images in project directory
    project_root = Path(__file__).parent.parent
    image_folders = ['uploads', 'src/IMG']
    
    found_images = []
    for folder in image_folders:
        folder_path = project_root / folder
        if folder_path.exists():
            for ext in ['.jpg', '.jpeg', '.png']:
                found_images.extend(folder_path.glob(f'*{ext}'))
                found_images.extend(folder_path.glob(f'*{ext.upper()}'))
    
    if found_images:
        print(f"Found {len(found_images)} actual images. Testing with real processing...")
        
        # Test with first few images
        demo_results = []
        for img_path in found_images[:2]:  # Limit to 2 for demo
            try:
                print(f"Testing image processing with: {img_path.name}")
                result = processor.process_image(str(img_path))
                if result:
                    demo_results.append(result)
            except Exception as e:
                print(f"Error processing {img_path.name}: {e}")
        
        if demo_results:
            # Use actual processing results
            for result in demo_results:
                processor.print_result(result)
            
            processor.save_results(demo_results, 'demo_results.json')
            processor.generate_report(demo_results, 'demo_report.html')
            
            print(f"\n" + "=" * 40)
            print("DEMO COMPLETE")
            print("=" * 40)
            print("Files created:")
            print("- demo_results.json (JSON data)")
            print("- demo_report.html (Visual report)")
            
            return demo_results
    
    print("No suitable images found. Using simulated demo data...")
    
    # Simulate processing results for demo
    demo_results = [
        {
            'file_name': 'menu_form_1.jpg',
            'file_path': f'{demo_dir}/menu_form_1.jpg',
            'timestamp': datetime.now().isoformat(),
            'detection_method': 'circle',
            'selections': [
                {'item': 'isda', 'selected': True, 'confidence': 0.95, 'position': {'x': 100, 'y': 150}},
                {'item': 'egg', 'selected': False, 'confidence': 0.98, 'position': {'x': 100, 'y': 200}},
                {'item': 'water', 'selected': True, 'confidence': 0.92, 'position': {'x': 100, 'y': 250}},
                {'item': 'sinigang', 'selected': False, 'confidence': 0.96, 'position': {'x': 100, 'y': 300}},
                {'item': 'Chicken', 'selected': False, 'confidence': 0.94, 'position': {'x': 100, 'y': 350}},
                {'item': 'pusit', 'selected': False, 'confidence': 0.97, 'position': {'x': 100, 'y': 400}}
            ],
            'summary': {
                'total_items': 6,
                'selected_count': 2,
                'selected_items': ['isda', 'water']
            }
        },
        {
            'file_name': 'menu_form_2.jpg',
            'file_path': f'{demo_dir}/menu_form_2.jpg',
            'timestamp': datetime.now().isoformat(),
            'detection_method': 'circle',
            'selections': [
                {'item': 'isda', 'selected': False, 'confidence': 0.93, 'position': {'x': 100, 'y': 150}},
                {'item': 'egg', 'selected': True, 'confidence': 0.96, 'position': {'x': 100, 'y': 200}},
                {'item': 'water', 'selected': False, 'confidence': 0.94, 'position': {'x': 100, 'y': 250}},
                {'item': 'sinigang', 'selected': True, 'confidence': 0.91, 'position': {'x': 100, 'y': 300}},
                {'item': 'Chicken', 'selected': True, 'confidence': 0.89, 'position': {'x': 100, 'y': 350}},
                {'item': 'pusit', 'selected': False, 'confidence': 0.95, 'position': {'x': 100, 'y': 400}}
            ],
            'summary': {
                'total_items': 6,
                'selected_count': 3,
                'selected_items': ['egg', 'sinigang', 'Chicken']
            }
        }
    ]
    
    # Print demo results
    for result in demo_results:
        processor.print_result(result)
    
    # Save demo results
    processor.save_results(demo_results, 'demo_results.json')
    processor.generate_report(demo_results, 'demo_report.html')
    
    print(f"\n" + "=" * 40)
    print("DEMO COMPLETE")
    print("=" * 40)
    print("Files created:")
    print("- demo_results.json (JSON data)")
    print("- demo_report.html (Visual report)")
    
    return demo_results


if __name__ == "__main__":
    try:
        # Check if OpenCV is available
        import cv2
        # If command line arguments provided, run normally
        if len(sys.argv) > 1:
            main()
        else:
            # Otherwise run demo
            print("No arguments provided. Running demonstration...")
            auto_run_demo()
            
    except ImportError:
        print("OpenCV not installed. Installing required packages...")
        print("Run: pip install opencv-python numpy")
        print("\nRunning demonstration mode without image processing...")
        auto_run_demo()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
        