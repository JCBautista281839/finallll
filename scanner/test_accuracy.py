#!/usr/bin/env python3
"""
Test script to verify OMR scanner accuracy
"""

from omr_circle_scanner import OMRCircleScanner
import os

def test_scanner():
    """Test the OMR scanner with a sample image"""
    scanner = OMRCircleScanner()
    
    # Test with a sample image if it exists
    test_image = "test_form.jpg"  # You can replace this with your actual test image
    
    if os.path.exists(test_image):
        print("🧪 Testing OMR Scanner Accuracy")
        print("=" * 50)
        
        result = scanner.scan_shaded_circles(test_image)
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return
        
        print(f"\n📊 RESULTS:")
        print(f"Total circles found: {result.get('total_circles', 0)}")
        print(f"Shaded selections: {len(result.get('shaded_selections', []))}")
        
        print(f"\n✅ SHADED ITEMS:")
        for item in result.get('shaded_selections', []):
            print(f"  - {item['item']} (Fill: {item['fill_percent']}%)")
        
        print(f"\n🔍 DEBUG INFO:")
        print(f"Menu items: {scanner.menu_items}")
        
    else:
        print(f"⚠️ Test image '{test_image}' not found")
        print("Please place a test OMR form image in the scanner directory")

if __name__ == "__main__":
    test_scanner()
