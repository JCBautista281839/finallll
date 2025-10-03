# Firebase Integration Update for OMR Scanner

## Changes Made

### Updated: `javascript/omr-scanner-integration.js`

The scanner now queries Firebase directly when adding items to orders. The matching logic follows this priority:

1. **First Priority**: Match by `code` field in Firebase menu collection
2. **Second Priority**: Match by exact `name` (case-insensitive)
3. **Third Priority**: Match by partial `name` (contains)

### Key Features:

- **Async Firebase Queries**: Uses Firebase Firestore to look up items in real-time
- **Smart Matching**: Multiple fallback strategies ensure items are found
- **Loading States**: Shows spinner while processing items
- **Error Handling**: Graceful handling of Firebase errors

## How It Works

### When "Add All Items to Order" is clicked:

1. For each scanned item code (e.g., "WhtRc", "Bangsi", etc.):
   ```
   - Query Firebase: WHERE code == "WhtRc" AND available == true
   - If found → Add to order
   - If not found → Try name match: WHERE name == "WhtRc" (case-insensitive)
   - If found → Add to order
   - If not found → Try partial match: name contains "WhtRc"
   - If found → Add to order
   - If not found → Add to "not found" list
   ```

2. Items are added using the existing `addItemToOrder()` function
3. Order summary updates automatically
4. Success/warning message shows results

## Firebase Menu Document Structure

The integration works with menu documents that have:

```javascript
{
  name: "White Rice",           // Item name (required)
  code: "WhtRc",                 // Item code/shortcode (optional, recommended)
  price: 30.00,                  // Price (required)
  available: true,               // Availability flag (required)
  photoUrl: "...",               // Image URL (optional)
  category: "Rice",              // Category (optional)
  // ... other fields
}
```

### Important Notes:

1. **Code Field (Recommended)**: Add a `code` field to your Firebase menu documents for faster, more accurate matching. This should match the codes in your OMR scanner's `menu_items` list.

2. **Without Code Field**: The system will fall back to name matching, which also works but may be less precise.

## Adding Code Field to Firebase Menu Items

If you want to add the `code` field to existing menu items:

### Option 1: Manual Update (Firebase Console)
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to `menu` collection
4. For each document, add a field:
   - Field name: `code`
   - Field value: The short code (e.g., "WhtRc", "Bangsi")

### Option 2: Batch Update Script
Create a script to update all menu items with codes:

```javascript
// Run this in browser console on your admin page
const codeMapping = {
  'White Rice': 'WhtRc',
  'Bangsilog': 'Bangsi',
  'Tuna Panga': 'TnaPng',
  // ... add all your mappings
};

const db = firebase.firestore();
const batch = db.batch();

db.collection('menu').get().then(snapshot => {
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const code = codeMapping[data.name];
    if (code) {
      batch.update(doc.ref, { code: code });
    }
  });
  
  return batch.commit();
}).then(() => {
  console.log('All menu items updated with codes!');
});
```

## Testing

### Test the Integration:

1. **Start OMR Backend**:
   ```powershell
   cd OMR
   .\start_server.bat
   ```

2. **Open POS Page** in browser

3. **Click "Scan Order Sheet"**

4. **Upload OMR Sheet** with marked items

5. **Click "Add All Items to Order"**

6. **Verify**:
   - Items appear in order panel
   - Prices are correct
   - Console shows: `"Found item by code: [ItemName]"` or `"Found item by name: [ItemName]"`

### Console Logging:

The integration provides detailed console logs:
- `"Searching Firebase for item code: [Code]"`
- `"Found item by code: [Name]"` (best case)
- `"Found item by exact name match: [Name]"` (fallback 1)
- `"Found item by partial name match: [Name]"` (fallback 2)
- `"No menu item found for code/name: [Code]"` (not found)

## OMR Scanner Codes

The OMR scanner uses these codes (from `omr_scanner.py`):

```python
menu_items = [
    'WhtRc', 'Bangsi', 'TnaPng', 'PnkBagn', 'Bulalo',
    'MacChs', 'OvrBngs', 'Carbo', 'OrgChk', 'PltWhtRc',
    'RB-Bina', 'Viktoria's Classic', 'SngTun', 'Alfrdo', 'Tapsi',
    # ... and more
]
```

Make sure these codes match the `code` field in your Firebase menu documents for optimal matching.

## Benefits of This Approach

1. ✅ **Real-time Data**: Always queries latest menu from Firebase
2. ✅ **Flexible Matching**: Works with or without code field
3. ✅ **No Hardcoded Data**: No need to maintain duplicate menu data
4. ✅ **Availability Check**: Only matches items marked as available
5. ✅ **Case-Insensitive**: Works regardless of text case
6. ✅ **Error Resilient**: Gracefully handles missing fields or connection issues

## Troubleshooting

### Items Not Found:
1. Check Firebase console logs for search queries
2. Verify `code` or `name` in Firebase matches OMR scanner codes
3. Ensure `available` field is set to `true`
4. Check browser console for detailed error messages

### Firebase Errors:
- Ensure user is authenticated before scanning
- Check Firebase security rules allow read access to menu collection
- Verify internet connection

### Performance:
- Adding `code` field improves query performance significantly
- Consider indexing the `code` field in Firebase for faster lookups
