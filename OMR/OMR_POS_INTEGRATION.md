# OMR Scanner Integration with POS System

This integration connects the OMR (Optical Mark Recognition) scanner to the POS (Point of Sale) system, allowing users to scan order sheets and automatically add items to orders.

## Features

- **Easy Scanning**: Click the "Scan Order Sheet" button in the POS interface
- **Drag & Drop Upload**: Drag and drop OMR sheet images directly into the modal
- **Real-time Processing**: View processing status as the scanner analyzes the sheet
- **Automatic Item Addition**: Scanned items are automatically added to the current order
- **Error Handling**: Clear error messages if scanning fails

## Files Added

### 1. JavaScript Integration (`javascript/omr-scanner-integration.js`)
- Handles communication with the OMR scanner backend
- Manages file upload and processing
- Displays scan results in a modal
- Adds scanned items to the POS order

### 2. CSS Styling (`css/omr-scanner.css`)
- Professional modal design with gradient header
- Drag-and-drop upload area with hover effects
- Responsive design for mobile devices
- Smooth animations and transitions

### 3. HTML Modifications (`html/pos.html`)
- Added "Scan Order Sheet" button in the search container
- Included CSS and JavaScript file references
- Modal structure created dynamically by JavaScript

## How It Works

### User Flow:
1. User clicks "Scan Order Sheet" button in POS interface
2. Modal opens with file upload area
3. User selects or drags an OMR sheet image
4. System uploads image to OMR backend server
5. OMR scanner analyzes the sheet and detects marked items
6. Results are displayed showing detected items and total
7. User clicks "Add All Items to Order" to add them to the current order
8. Items appear in the order panel with correct prices

### Technical Flow:
1. **File Upload**: Image is sent to `http://localhost:5003/api/upload`
2. **Processing**: Backend performs full OMR scan via `/api/full-scan`
3. **Results Parsing**: JavaScript parses the scan results
4. **Item Matching**: System matches detected items with menu database
5. **Order Integration**: Uses existing `addItemToOrder()` function from POS

## Requirements

### Backend Server:
The OMR scanner backend must be running on `http://localhost:5003`

To start the server:
```powershell
# Navigate to OMR directory
cd OMR

# Start the server (Windows)
.\start_server.bat

# OR using PowerShell script
.\start_server.ps1

# OR directly with Python
cd python
python app.py
```

### Dependencies:
- Flask backend running on port 5003
- OpenCV and NumPy for image processing
- Bootstrap 5 for UI components
- Firebase for menu data

## API Endpoints Used

### 1. Upload File
- **Endpoint**: `POST /api/upload`
- **Purpose**: Upload OMR sheet image
- **Returns**: File path for processing

### 2. Full Scan
- **Endpoint**: `POST /api/full-scan`
- **Purpose**: Perform complete OMR analysis
- **Returns**: Detected items, quantities, and totals

## Configuration

### Change API URL:
Edit `omr-scanner-integration.js`:
```javascript
const OMR_API_BASE_URL = 'http://localhost:5003/api';
```

### Supported File Formats:
- JPG/JPEG
- PNG
- GIF
- BMP
- TIFF

### File Size Limit:
- Maximum: 16MB

## No Changes to Existing POS Logic

**Important**: This integration only **adds** functionality. It does not modify any existing POS logic:

- ✅ Uses existing `addItemToOrder()` function
- ✅ Uses existing `menuItemsData` for item lookup
- ✅ Uses existing order management system
- ✅ Uses existing price calculations
- ✅ Uses existing discount and tax logic
- ❌ Does not alter any POS business logic
- ❌ Does not modify order processing flow

## Troubleshooting

### Scanner Button Not Appearing:
- Check that `omr-scanner.css` is loaded
- Verify Bootstrap 5 is included
- Check browser console for errors

### Upload Fails:
- Ensure OMR backend is running on port 5003
- Check network connectivity
- Verify file format is supported

### Items Not Added to Order:
- Ensure menu items in OMR scanner match menu database names exactly
- Check browser console for item lookup errors
- Verify `menuItemsData` is populated before scanning

### Connection Error:
```
Failed to connect to OMR server. Make sure the scanner server is running.
```
**Solution**: Start the OMR backend server (`start_server.bat` or `start_server.ps1`)

## Testing

### Test the Integration:
1. Start the OMR backend server
2. Open POS page in browser
3. Click "Scan Order Sheet" button
4. Upload a sample OMR sheet from `OMR/uploads/` directory
5. Verify items are detected correctly
6. Click "Add All Items to Order"
7. Check that items appear in order panel

### Sample OMR Sheets:
Test images should be placed in `OMR/uploads/` directory

## Future Enhancements

Possible improvements (not implemented):
- Quantity selection per item before adding
- Individual item selection (not all items)
- Preview of OMR sheet before processing
- History of scanned sheets
- Batch scanning multiple sheets
- Mobile camera integration

## Support

For issues or questions:
1. Check that backend server is running
2. Review browser console for errors
3. Verify menu item names match exactly
4. Check network tab for API call failures

## Version

- **Version**: 1.0.0
- **Date**: October 3, 2025
- **Compatible with**: POS System v2.0+
