#!/usr/bin/env python3
"""
OMR Testing System - Backend Test Script
Quick test to verify the backend is working correctly
"""

import requests
import json
import time
import os
from pathlib import Path

def test_server_health():
    """Test if the server is running and healthy"""
    try:
        response = requests.get('http://localhost:5003/api/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Server is running and healthy")
            print(f"   Status: {data.get('data', {}).get('status', 'unknown')}")
            print(f"   Version: {data.get('data', {}).get('version', 'unknown')}")
            return True
        else:
            print(f"❌ Server responded with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running on port 5003")
        return False
    except Exception as e:
        print(f"❌ Error testing server: {e}")
        return False

def test_upload_endpoint():
    """Test the upload endpoint with a dummy file"""
    try:
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', test_image_data, 'image/png')}
        response = requests.post('http://localhost:5003/api/upload', files=files, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Upload endpoint working")
                print(f"   File saved as: {data.get('data', {}).get('filename', 'unknown')}")
                return data.get('data', {}).get('filepath')
            else:
                print(f"❌ Upload failed: {data.get('message', 'Unknown error')}")
                return None
        else:
            print(f"❌ Upload endpoint returned status: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error testing upload: {e}")
        return None

def test_circle_detection(filepath):
    """Test circle detection with uploaded file"""
    try:
        payload = {'filepath': filepath}
        response = requests.post(
            'http://localhost:5003/api/detect-circles',
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Circle detection working")
                circles_found = data.get('data', {}).get('circles_found', 0)
                print(f"   Circles found: {circles_found}")
                return True
            else:
                print(f"❌ Circle detection failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Circle detection returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing circle detection: {e}")
        return False

def test_shaded_analysis(filepath):
    """Test shaded analysis with uploaded file"""
    try:
        payload = {'filepath': filepath}
        response = requests.post(
            'http://localhost:5003/api/analyze-shaded',
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Shaded analysis working")
                total_circles = data.get('data', {}).get('total_circles', 0)
                shaded_circles = data.get('data', {}).get('shaded_circles', 0)
                print(f"   Total circles: {total_circles}, Shaded: {shaded_circles}")
                return True
            else:
                print(f"❌ Shaded analysis failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Shaded analysis returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing shaded analysis: {e}")
        return False

def test_full_scan(filepath):
    """Test full OMR scan with uploaded file"""
    try:
        payload = {'filepath': filepath}
        response = requests.post(
            'http://localhost:5003/api/full-scan',
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Full OMR scan working")
                selected_items = data.get('data', {}).get('selected_items', 0)
                total_price = data.get('data', {}).get('total_price', 0)
                print(f"   Selected items: {selected_items}, Total price: ${total_price}")
                return True
            else:
                print(f"❌ Full OMR scan failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Full OMR scan returned status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing full scan: {e}")
        return False

def main():
    """Run all backend tests"""
    print("=" * 50)
    print("🧪 OMR Testing System - Backend Test")
    print("=" * 50)
    
    # Test 1: Server Health
    print("\n1. Testing server health...")
    if not test_server_health():
        print("\n❌ Server is not running. Please start it first:")
        print("   python start_server.py")
        return
    
    # Test 2: Upload
    print("\n2. Testing file upload...")
    filepath = test_upload_endpoint()
    if not filepath:
        print("\n❌ Upload test failed. Cannot continue with other tests.")
        return
    
    # Test 3: Circle Detection
    print("\n3. Testing circle detection...")
    test_circle_detection(filepath)
    
    # Test 4: Shaded Analysis
    print("\n4. Testing shaded analysis...")
    test_shaded_analysis(filepath)
    
    # Test 5: Full OMR Scan
    print("\n5. Testing full OMR scan...")
    test_full_scan(filepath)
    
    print("\n" + "=" * 50)
    print("✅ Backend testing completed!")
    print("🌐 You can now open index.html in your browser")
    print("=" * 50)

if __name__ == "__main__":
    main()
