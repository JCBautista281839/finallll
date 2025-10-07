/**
 * OMR Scanner Integration for POS System
 * Connects the OMR scanning functionality to the POS ordering system
 */

// Configuration
const OMR_API_BASE_URL = 'http://localhost:5003/api';

// Global variables
let omrWebcamStream = null;

// Initialize OMR Scanner Integration
document.addEventListener('DOMContentLoaded', function () {
    console.log('OMR Scanner Integration: Initializing...');

    // Check if we're on the POS page
    if (!document.querySelector('.pos-container')) {
        console.log('OMR Scanner Integration: Not on POS page, skipping initialization');
        return;
    }

    initializeOMRScanner();
});

/**
 * Initialize OMR Scanner functionality
 */
function initializeOMRScanner() {
    const scannerBtn = document.getElementById('omrScannerBtn');

    if (!scannerBtn) {
        console.warn('OMR Scanner Integration: Scanner button not found');
        return;
    }

    // Create modal HTML
    createScannerModal();

    // Add click event listener
    scannerBtn.addEventListener('click', function () {
        openScannerModal();
    });

    console.log('OMR Scanner Integration: Initialized successfully');
}

/**
 * Create the scanner modal HTML
 */
function createScannerModal() {
    const modalHTML = `
        <div class="modal fade" id="omrScannerModal" tabindex="-1" aria-labelledby="omrScannerModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="omrScannerModalLabel">
                            <i class="bi bi-upc-scan"></i> OMR Order Sheet Scanner
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="omr-upload-area" id="omrUploadArea">
                            <i class="bi bi-cloud-upload" style="font-size: 3rem; color: #6c757d;"></i>
                            <p class="mt-3">Click to upload or drag and drop OMR sheet image</p>
                            <p class="text-muted small">Supported formats: JPG, PNG, JPEG (Max 16MB)</p>
                            <input type="file" id="omrFileInput" accept="image/*" style="display: none;">
                            <button class="btn btn-primary mt-2 me-2" id="omrSelectFileBtn">
                                <i class="bi bi-folder2-open"></i> Select File
                            </button>
                            <button class="btn btn-info mt-2" id="omrWebcamBtn">
                                <i class="bi bi-camera"></i> Use Webcam
                            </button>
                        </div>
                        
                        <div class="omr-webcam-area" id="omrWebcamArea" style="display: none;">
                            <div class="text-center">
                                <video id="omrWebcamVideo" autoplay playsinline style="max-width: 100%; max-height: 400px; border-radius: 8px; background: #000;"></video>
                                <canvas id="omrWebcamCanvas" style="display: none;"></canvas>
                                <div class="mt-3">
                                    <button class="btn btn-success me-2" id="omrCaptureBtn">
                                        <i class="bi bi-camera"></i> Capture Image
                                    </button>
                                    <button class="btn btn-secondary" id="omrCloseWebcamBtn">
                                        <i class="bi bi-x-lg"></i> Close Webcam
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="omr-processing" id="omrProcessing" style="display: none;">
                            <div class="text-center">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Processing...</span>
                                </div>
                                <p class="mt-3">Processing OMR sheet...</p>
                                <p class="text-muted small" id="omrProcessingStatus">Uploading image...</p>
                            </div>
                        </div>
                        
                        <div class="omr-results" id="omrResults" style="display: none;">
                            <div class="alert alert-success">
                                <i class="bi bi-check-circle"></i> Scan completed successfully!
                            </div>
                            
                            <h6 class="mt-3">Detected Items:</h6>
                            <div class="omr-items-list" id="omrItemsList">
                                <!-- Scanned items will be displayed here -->
                            </div>
                            
                            <div class="omr-scan-summary mt-3">
                                <div class="row">
                                    <div class="col-md-6">
                                        <strong>Total Items:</strong> <span id="omrTotalItems">0</span>
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Estimated Total:</strong> <span id="omrEstimatedTotal">₱0.00</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mt-3 text-center">
                                <button class="btn btn-success" id="omrAddToOrderBtn">
                                    <i class="bi bi-cart-plus"></i> Add All Items to Order
                                </button>
                                <button class="btn btn-secondary" id="omrScanAgainBtn">
                                    <i class="bi bi-arrow-clockwise"></i> Scan Another
                                </button>
                            </div>
                        </div>
                        
                        <div class="omr-error" id="omrError" style="display: none;">
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle"></i> 
                                <strong>Error:</strong> <span id="omrErrorMessage"></span>
                            </div>
                            <button class="btn btn-primary" id="omrRetryBtn">
                                <i class="bi bi-arrow-clockwise"></i> Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Initialize event listeners
    setupModalEventListeners();
}

/**
 * Setup event listeners for modal elements
 */
function setupModalEventListeners() {
    const fileInput = document.getElementById('omrFileInput');
    const selectFileBtn = document.getElementById('omrSelectFileBtn');
    const uploadArea = document.getElementById('omrUploadArea');
    const addToOrderBtn = document.getElementById('omrAddToOrderBtn');
    const scanAgainBtn = document.getElementById('omrScanAgainBtn');
    const retryBtn = document.getElementById('omrRetryBtn');
    const webcamBtn = document.getElementById('omrWebcamBtn');
    const captureBtn = document.getElementById('omrCaptureBtn');
    const closeWebcamBtn = document.getElementById('omrCloseWebcamBtn');

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // Select file button
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', function () {
            fileInput.click();
        });
    }

    // Drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', function () {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    }

    // Add to order button
    if (addToOrderBtn) {
        addToOrderBtn.addEventListener('click', function () {
            addScannedItemsToOrder();
        });
    }

    // Scan again button
    if (scanAgainBtn) {
        scanAgainBtn.addEventListener('click', function () {
            resetScanner();
        });
    }

    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', function () {
            resetScanner();
        });
    }

    // Webcam button
    if (webcamBtn) {
        webcamBtn.addEventListener('click', function () {
            startOMRWebcam();
        });
    }

    // Capture button
    if (captureBtn) {
        captureBtn.addEventListener('click', function () {
            captureOMRWebcamImage();
        });
    }

    // Close webcam button
    if (closeWebcamBtn) {
        closeWebcamBtn.addEventListener('click', function () {
            stopOMRWebcam();
        });
    }
}

/**
 * Open the scanner modal
 */
function openScannerModal() {
    const modalElement = document.getElementById('omrScannerModal');
    const modal = new bootstrap.Modal(modalElement);
    resetScanner();
    modal.show();

    // Add event listener to stop webcam when modal is closed
    modalElement.addEventListener('hidden.bs.modal', function () {
        stopOMRWebcam();
    });
}

/**
 * Reset scanner to initial state
 */
function resetScanner() {
    document.getElementById('omrUploadArea').style.display = 'block';
    document.getElementById('omrWebcamArea').style.display = 'none';
    document.getElementById('omrProcessing').style.display = 'none';
    document.getElementById('omrResults').style.display = 'none';
    document.getElementById('omrError').style.display = 'none';
    document.getElementById('omrFileInput').value = '';
    stopOMRWebcam();
}

/**
 * Start webcam for OMR scanning
 */
async function startOMRWebcam() {
    try {
        console.log('OMR Scanner: Starting webcam...');

        // Request webcam access
        omrWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        const video = document.getElementById('omrWebcamVideo');
        video.srcObject = omrWebcamStream;

        document.getElementById('omrUploadArea').style.display = 'none';
        document.getElementById('omrWebcamArea').style.display = 'block';

        console.log('OMR Scanner: Webcam started successfully');

    } catch (error) {
        console.error('OMR Scanner: Webcam error:', error);
        showError(`Failed to access webcam: ${error.message}`);
    }
}

/**
 * Stop webcam
 */
function stopOMRWebcam() {
    if (omrWebcamStream) {
        omrWebcamStream.getTracks().forEach(track => track.stop());
        omrWebcamStream = null;

        const video = document.getElementById('omrWebcamVideo');
        video.srcObject = null;

        console.log('OMR Scanner: Webcam stopped');
    }

    document.getElementById('omrWebcamArea').style.display = 'none';
    document.getElementById('omrUploadArea').style.display = 'block';
}

/**
 * Capture image from webcam
 */
async function captureOMRWebcamImage() {
    if (!omrWebcamStream) {
        showError('Webcam is not active');
        return;
    }

    try {
        console.log('OMR Scanner: Capturing image from webcam...');

        const video = document.getElementById('omrWebcamVideo');
        const canvas = document.getElementById('omrWebcamCanvas');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);

        // Convert canvas to base64
        const imageDataURL = canvas.toDataURL('image/png');

        // Stop webcam
        stopOMRWebcam();

        // Show processing UI
        document.getElementById('omrProcessing').style.display = 'block';
        updateProcessingStatus('Uploading webcam image...');

        // Upload to backend
        const uploadResult = await uploadWebcamImage(imageDataURL);

        if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Upload failed');
        }

        console.log('OMR Scanner: Webcam image uploaded successfully:', uploadResult.data);

        // Perform full OMR scan
        updateProcessingStatus('Scanning OMR sheet...');
        const scanResult = await performFullScan(uploadResult.data.filepath);

        if (!scanResult.success) {
            throw new Error(scanResult.error || 'Scan failed');
        }

        console.log('OMR Scanner: Scan successful:', scanResult.data);

        // Display results
        displayScanResults(scanResult.data);

    } catch (error) {
        console.error('OMR Scanner: Webcam capture error:', error);
        showError(`Failed to capture and process image: ${error.message}`);
    }
}

/**
 * Upload webcam image to OMR server
 */
async function uploadWebcamImage(imageDataURL) {
    try {
        const response = await fetch(`${OMR_API_BASE_URL}/upload-webcam`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageDataURL })
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('OMR Scanner: Webcam upload error:', error);
        return {
            success: false,
            error: 'Failed to connect to OMR server. Make sure the scanner server is running.'
        };
    }
}

/**
 * Handle file upload and processing
 */
async function handleFileUpload(file) {
    console.log('OMR Scanner: File selected:', file.name);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
        showError('Please upload a valid image file (JPG, PNG, GIF, BMP)');
        return;
    }

    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
        showError('File size exceeds 16MB limit');
        return;
    }

    // Show processing UI
    document.getElementById('omrUploadArea').style.display = 'none';
    document.getElementById('omrProcessing').style.display = 'block';

    try {
        // Step 1: Upload file
        updateProcessingStatus('Uploading image...');
        const uploadResult = await uploadFile(file);

        if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Upload failed');
        }

        console.log('OMR Scanner: Upload successful:', uploadResult.data);

        // Step 2: Perform full OMR scan
        updateProcessingStatus('Scanning OMR sheet...');
        const scanResult = await performFullScan(uploadResult.data.filepath);

        if (!scanResult.success) {
            throw new Error(scanResult.error || 'Scan failed');
        }

        console.log('OMR Scanner: Scan successful:', scanResult.data);

        // Step 3: Display results
        displayScanResults(scanResult.data);

    } catch (error) {
        console.error('OMR Scanner Error:', error);
        showError(error.message || 'An error occurred during scanning');
    }
}

/**
 * Upload file to OMR server
 */
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${OMR_API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: 'Failed to connect to OMR server. Make sure the scanner server is running.'
        };
    }
}

/**
 * Perform full OMR scan
 */
async function performFullScan(filepath) {
    try {
        const response = await fetch(`${OMR_API_BASE_URL}/full-scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filepath })
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Scan error:', error);
        return {
            success: false,
            error: 'Failed to perform OMR scan'
        };
    }
}

/**
 * Display scan results
 */
function displayScanResults(scanData) {
    document.getElementById('omrProcessing').style.display = 'none';
    document.getElementById('omrResults').style.display = 'block';

    const itemsList = document.getElementById('omrItemsList');
    itemsList.innerHTML = '';

    // Store scan data for later use
    window.currentOMRScanData = scanData;

    // Parse and display items
    if (scanData.selected_item_data && Array.isArray(scanData.selected_item_data)) {
        scanData.selected_item_data.forEach((itemStr, index) => {
            // Parse item string format: "ID X: ItemName (Shaded)"
            const match = itemStr.match(/ID (\d+): (.+) \((Shaded|Not Shaded)\)/);
            if (match && match[3] === 'Shaded') {
                const itemName = match[2];

                // Create item display
                const itemDiv = document.createElement('div');
                itemDiv.className = 'omr-item-entry border rounded p-2 mb-2';
                itemDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${itemName}</strong>
                        </div>
                        <div>
                            <span class="badge bg-success">Detected</span>
                        </div>
                    </div>
                `;
                itemsList.appendChild(itemDiv);
            }
        });
    }

    // Update summary
    document.getElementById('omrTotalItems').textContent = scanData.selected_items || 0;
    document.getElementById('omrEstimatedTotal').textContent = `₱${(scanData.total_price || 0).toFixed(2)}`;
}

/**
 * Add scanned items to POS order
 */
async function addScannedItemsToOrder() {
    if (!window.currentOMRScanData) {
        showError('No scan data available');
        return;
    }

    const scanData = window.currentOMRScanData;
    let itemsAdded = 0;
    let itemsNotFound = [];

    console.log('OMR Scanner: Adding items to order...');

    // Show loading state
    const addBtn = document.getElementById('omrAddToOrderBtn');
    const originalText = addBtn ? addBtn.innerHTML : '';
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding items...';
    }

    try {
        // Process each scanned item
        if (scanData.selected_item_data && Array.isArray(scanData.selected_item_data)) {
            for (const itemStr of scanData.selected_item_data) {
                // Parse item string format: "ID X: ItemName (Shaded)"
                const match = itemStr.match(/ID (\d+): (.+) \((Shaded|Not Shaded)\)/);
                if (match && match[3] === 'Shaded') {
                    const itemCode = match[2]; // This is the code from OMR sheet

                    try {
                        // Look up item in Firebase by code first, then by name
                        const menuItem = await findMenuItemInFirebase(itemCode);

                        if (menuItem) {
                            // Add item to order
                            if (typeof window.addItemToOrder === 'function') {
                                window.addItemToOrder(
                                    menuItem.name,
                                    `₱${menuItem.price.toFixed(2)}`,
                                    menuItem.photoUrl || ''
                                );
                                itemsAdded++;
                                console.log(`OMR Scanner: Added item "${menuItem.name}" (code: ${itemCode}) to order`);
                            } else {
                                console.error('OMR Scanner: addItemToOrder function not found');
                            }
                        } else {
                            itemsNotFound.push(itemCode);
                            console.warn(`OMR Scanner: Menu item not found for code: "${itemCode}"`);
                        }
                    } catch (error) {
                        console.error(`OMR Scanner: Error adding item "${itemCode}":`, error);
                        itemsNotFound.push(itemCode);
                    }
                }
            }
        }

        // Restore button state
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;
        }

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('omrScannerModal'));
        if (modal) {
            modal.hide();
        }

        // Show success message
        let message = `Successfully added ${itemsAdded} item(s) to order`;
        if (itemsNotFound.length > 0) {
            message += `\n\nWarning: ${itemsNotFound.length} item(s) not found in menu: ${itemsNotFound.join(', ')}`;
        }

        if (typeof showToast === 'function') {
            showToast(message, itemsNotFound.length > 0 ? 'warning' : 'success');
        } else {
            alert(message);
        }

        console.log(`OMR Scanner: Added ${itemsAdded} items, ${itemsNotFound.length} not found`);

    } catch (error) {
        console.error('OMR Scanner: Error processing items:', error);
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = originalText;
        }
        showError('Failed to add items to order: ' + error.message);
    }
}

/**
 * Find menu item in Firebase by code or name
 * First tries to match by 'code' field, then falls back to 'name' field
 */
async function findMenuItemInFirebase(itemCode) {
    try {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.error('OMR Scanner: Firebase not available');
            return null;
        }

        const db = firebase.firestore();
        console.log(`OMR Scanner: Searching Firebase for item code: "${itemCode}"`);

        // Strategy 1: Try to find by 'code' field (exact match)
        try {
            const codeQuery = await db.collection('menu')
                .where('code', '==', itemCode)
                .where('available', '==', true)
                .limit(1)
                .get();

            if (!codeQuery.empty) {
                const menuItem = {
                    id: codeQuery.docs[0].id,
                    ...codeQuery.docs[0].data()
                };
                console.log(`OMR Scanner: Found item by code: "${menuItem.name}"`);
                return menuItem;
            }
        } catch (error) {
            console.warn('OMR Scanner: Code field search failed, trying name search:', error.message);
        }

        // Strategy 2: Try to find by 'name' field (exact match, case-insensitive)
        const nameQueryExact = await db.collection('menu')
            .where('available', '==', true)
            .get();

        // Filter by name (case-insensitive exact match)
        for (const doc of nameQueryExact.docs) {
            const data = doc.data();
            if (data.name && data.name.toLowerCase() === itemCode.toLowerCase()) {
                const menuItem = {
                    id: doc.id,
                    ...data
                };
                console.log(`OMR Scanner: Found item by exact name match: "${menuItem.name}"`);
                return menuItem;
            }
        }

        // Strategy 3: Try partial name match (contains)
        for (const doc of nameQueryExact.docs) {
            const data = doc.data();
            if (data.name &&
                (data.name.toLowerCase().includes(itemCode.toLowerCase()) ||
                    itemCode.toLowerCase().includes(data.name.toLowerCase()))) {
                const menuItem = {
                    id: doc.id,
                    ...data
                };
                console.log(`OMR Scanner: Found item by partial name match: "${menuItem.name}"`);
                return menuItem;
            }
        }

        console.warn(`OMR Scanner: No menu item found for code/name: "${itemCode}"`);
        return null;

    } catch (error) {
        console.error(`OMR Scanner: Error searching Firebase for "${itemCode}":`, error);
        return null;
    }
}

/**
 * Update processing status message
 */
function updateProcessingStatus(message) {
    const statusEl = document.getElementById('omrProcessingStatus');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

/**
 * Show error message
 */
function showError(message) {
    document.getElementById('omrUploadArea').style.display = 'none';
    document.getElementById('omrProcessing').style.display = 'none';
    document.getElementById('omrResults').style.display = 'none';
    document.getElementById('omrError').style.display = 'block';
    document.getElementById('omrErrorMessage').textContent = message;
}

console.log('OMR Scanner Integration: Script loaded');
