# Payment Modal Setup Instructions

## QR Code & Receipt Upload Implementation

I've created a complete payment modal system with QR code display and receipt upload functionality.

### 🎯 Features Implemented:

#### **1. Payment Modal Popup**
- ✅ Opens when GCash or Card payment options are selected
- ✅ Professional modal design with close options (X, Cancel, Escape key)
- ✅ Responsive design for mobile and desktop

#### **2. QR Code Display**
- ✅ Dynamic QR code based on payment method
- ✅ Separate QR codes for GCash and Card payments
- ✅ Clean, centered display with instructions

#### **3. Payment Form**
- ✅ **Reference Code Input** (required, minimum 3 characters)
- ✅ **Receipt Upload** (required, image files only)
- ✅ Drag & drop file upload support
- ✅ File preview with remove option
- ✅ File size validation (5MB limit)
- ✅ **Image type validation** (any image format)

#### **4. Data Storage**
- ✅ Payment reference code stored in sessionStorage
- ✅ Receipt image converted to base64 and stored
- ✅ Payment method and timestamp recorded
- ✅ All data available for order processing

### 📁 Setup Required:

#### **Step 1: Add Your QR Code Images**
Save your QR code images to: `src/IMG/` directory

**Required files:**
- `gcash-qr.png` - Your GCash QR code
- `card-qr.png` - Your Card payment QR code

**Image specifications:**
- Format: Any image format (PNG, JPG, JPEG, GIF, BMP, WebP, etc.)
- Recommended size: 300x300 pixels or larger
- High resolution for easy scanning

#### **Step 2: Test the System**
1. Go to shipping page
2. Select GCash or Card payment
3. Modal should open with QR code
4. Test file upload and reference code input
5. Confirm all data is stored correctly

### 🔄 How It Works:

1. **Customer selects payment method** → Modal opens with QR code
2. **Customer scans QR code** → Makes payment via their app
3. **Customer uploads receipt screenshot** → File validated and stored
4. **Customer enters reference code** → Input validated
5. **Confirm Payment** → All data stored in sessionStorage
6. **Place Order** → Payment info included with order

### 💾 Stored Data Structure:
```javascript
{
  type: 'gcash' or 'card',
  reference: 'customer_reference_code',
  receiptData: 'base64_encoded_image',
  receiptName: 'original_filename.jpg',
  timestamp: 'ISO_timestamp'
}
```

### 📱 Features:
- ✅ **File validation** (type, size, format)
- ✅ **Drag & drop** upload support
- ✅ **Image preview** before submission
- ✅ **Form validation** (both fields required)
- ✅ **Mobile responsive** design
- ✅ **Error handling** and user feedback

The payment modal is now fully functional and ready to use! Just add your QR code images to complete the setup.