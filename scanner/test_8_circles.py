import os
from omr_circle_scanner import OMRCircleScanner

def test_8_circle_scanner():
    scanner = OMRCircleScanner()
    
    print("🔍 Testing 8-Circle OMR Scanner")
    print("=" * 50)
    print(f"Menu items: {scanner.menu_items}")
    print(f"Expected: 8 circles total")
    print(f"Expected: 2 shaded circles (gatas and beef)")
    print("=" * 50)
    
    # Test with a sample image if available
    test_image = "test_form.jpg"
    if os.path.exists(test_image):
        print(f"📸 Testing with: {test_image}")
        results = scanner.scan_shaded_circles(test_image)
        
        if 'error' in results:
            print(f"❌ Error: {results['error']}")
        else:
            print(f"✅ Circles found: {results.get('circles_found', 0)}")
            print(f"✅ Selections found: {results.get('selections_found', 0)}")
            
            if results['shaded_selections']:
                print("📋 Selected items:")
                for item in results['shaded_selections']:
                    print(f"  ✓ {item['item']} (Fill: {item['fill_percent']}%)")
            else:
                print("  No items selected")
    else:
        print(f"⚠️ Test image '{test_image}' not found")
        print("Please upload your OMR form to test the scanner")

if __name__ == "__main__":
    test_8_circle_scanner()
