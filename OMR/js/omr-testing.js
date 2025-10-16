/**
 * OMR Testing System - JavaScript
 * Frontend functionality for OMR testing interface
 */

class OMRTestingSystem {
    constructor() {
        this.currentFile = null;
        this.currentFilePath = null;
        this.fullScanFile = null;
        this.fullScanFilePath = null;
        this.isProcessing = false;
        this.debugMessages = [];
        this.apiBaseUrl = 'http://localhost:5003/api';

        this.initializeElements();
        this.setupEventListeners();
        this.checkServerStatus();
        this.addDebugMessage('System initialized and ready', 'info');
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.uploadPreview = document.getElementById('uploadPreview');
        this.fileInput = document.getElementById('fileInput');
        this.previewImage = document.getElementById('previewImage');
        this.browseBtn = document.getElementById('browseBtn');
        this.scanBtn = document.getElementById('scanBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Full Scan Upload elements
        this.fullScanUploadArea = document.getElementById('fullScanUploadArea');
        this.fullScanPreview = document.getElementById('fullScanPreview');
        this.fullScanFileInput = document.getElementById('fullScanFileInput');
        this.fullScanPreviewImage = document.getElementById('fullScanPreviewImage');
        this.fullScanBrowseBtn = document.getElementById('fullScanBrowseBtn');
        this.fullScanProcessBtn = document.getElementById('fullScanProcessBtn');
        this.fullScanClearBtn = document.getElementById('fullScanClearBtn');

        // Debug: Check if elements exist
        console.log('Full Scan Upload Area:', this.fullScanUploadArea);
        console.log('Full Scan Browse Button:', this.fullScanBrowseBtn);

        // Function buttons
        this.detectCirclesBtn = document.getElementById('detectCirclesBtn');
        this.analyzeShadedBtn = document.getElementById('analyzeShadedBtn');
        this.fullScanBtn = document.getElementById('fullScanBtn');

        // Results and debug
        this.resultsContent = document.getElementById('resultsContent');
        this.consoleContent = document.getElementById('consoleContent');
        this.clearConsoleBtn = document.getElementById('clearConsoleBtn');

        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');

        // Loading modal
        this.loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
        this.loadingText = document.getElementById('loadingText');
        this.loadingSubtext = document.getElementById('loadingSubtext');
    }

    /**
     * Check server status
     */
    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (response.ok) {
                const data = await response.json();
                this.updateStatus('ready', 'Server Connected');
                this.addDebugMessage('Backend server connected successfully', 'success');
                return true;
            } else {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            this.updateStatus('offline', 'Server Offline');
            this.addDebugMessage(`Backend server not available: ${error.message}`, 'error');
            this.addDebugMessage('Make sure to run: python start_server.py', 'warning');
            return false;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // File upload events
        this.browseBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // Full Scan upload events
        this.fullScanBrowseBtn.addEventListener('click', () => this.fullScanFileInput.click());
        this.fullScanFileInput.addEventListener('change', (e) => this.handleFullScanFileSelect(e));
        this.fullScanUploadArea.addEventListener('click', () => this.fullScanFileInput.click());
        this.fullScanProcessBtn.addEventListener('click', () => this.processFullScanFile());
        this.fullScanClearBtn.addEventListener('click', () => this.clearFullScanUpload());

        // Action buttons
        this.scanBtn.addEventListener('click', () => this.performScan());
        this.clearBtn.addEventListener('click', () => this.clearUpload());
        this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());

        // OMR function buttons
        this.detectCirclesBtn.addEventListener('click', () => this.detectCircles());
        this.analyzeShadedBtn.addEventListener('click', () => this.analyzeShaded());
        this.fullScanBtn.addEventListener('click', () => this.performFullScan());
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * Handle drag over
     */
    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    /**
     * Handle file drop
     */
    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * Process uploaded file
     */
    async processFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showAlert('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 16MB)
        if (file.size > 16 * 1024 * 1024) {
            this.showAlert('File size must be less than 16MB', 'error');
            return;
        }

        this.currentFile = file;
        this.addDebugMessage(`File selected: ${file.name} (${this.formatFileSize(file.size)})`, 'info');

        // Upload file to backend
        try {
            this.updateStatus('processing', 'Uploading...');
            this.addDebugMessage('Uploading file to backend...', 'info');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.currentFilePath = result.data.filepath;
                this.addDebugMessage(`File uploaded successfully: ${result.data.filename}`, 'success');

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.previewImage.src = e.target.result;
                    this.uploadArea.style.display = 'none';
                    this.uploadPreview.style.display = 'block';
                    this.addDebugMessage('Image preview generated', 'success');
                };
                reader.readAsDataURL(file);

                this.updateStatus('ready', 'File Ready');
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (error) {
            this.addDebugMessage(`Upload error: ${error.message}`, 'error');
            this.showAlert(`Upload failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Upload Failed');
        }
    }

    /**
     * Clear upload
     */
    clearUpload() {
        this.currentFile = null;
        this.currentFilePath = null;
        this.fileInput.value = '';
        this.uploadArea.style.display = 'block';
        this.uploadPreview.style.display = 'none';
        this.resultsContent.innerHTML = this.getEmptyResultsHTML();
        this.addDebugMessage('Upload cleared', 'info');
        this.updateStatus('ready', 'Ready');
    }

    /**
     * Handle Full Scan file selection
     */
    handleFullScanFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFullScanFile(file);
        }
    }

    /**
     * Process Full Scan uploaded file
     */
    async processFullScanFile(file) {
        if (!file) {
            this.showAlert('Please select an image first', 'warning');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showAlert('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 16MB)
        if (file.size > 16 * 1024 * 1024) {
            this.showAlert('File size must be less than 16MB', 'error');
            return;
        }

        this.fullScanFile = file;
        this.addDebugMessage(`Full Scan file selected: ${file.name} (${this.formatFileSize(file.size)})`, 'info');

        // Upload file to backend
        try {
            this.updateStatus('processing', 'Uploading Full Scan Image...');
            this.addDebugMessage('Uploading Full Scan file to backend...', 'info');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.fullScanFilePath = result.data.filepath;
                this.addDebugMessage(`Full Scan file uploaded successfully: ${result.data.filename}`, 'success');

                // Create preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.fullScanPreviewImage.src = e.target.result;
                    this.fullScanUploadArea.style.display = 'none';
                    this.fullScanPreview.style.display = 'block';
                    this.addDebugMessage('Full Scan image preview generated', 'success');
                };
                reader.readAsDataURL(file);

                this.updateStatus('ready', 'Full Scan File Ready');
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (error) {
            this.addDebugMessage(`Full Scan upload error: ${error.message}`, 'error');
            this.showAlert(`Full Scan upload failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Upload Failed');
        }
    }

    /**
     * Clear Full Scan upload
     */
    clearFullScanUpload() {
        this.fullScanFile = null;
        this.fullScanFilePath = null;
        this.fullScanFileInput.value = '';
        this.fullScanUploadArea.style.display = 'block';
        this.fullScanPreview.style.display = 'none';
        this.addDebugMessage('Full Scan upload cleared', 'info');
        this.updateStatus('ready', 'Ready');
    }

    /**
     * Perform basic scan
     */
    performScan() {
        if (!this.currentFile) {
            this.showAlert('Please select an image first', 'warning');
            return;
        }

        this.addDebugMessage('Starting basic image scan...', 'info');
        this.updateStatus('processing', 'Scanning...');

        // Simulate scan process
        setTimeout(() => {
            this.showScanResults({
                type: 'basic_scan',
                message: 'Basic scan completed',
                details: {
                    fileName: this.currentFile.name,
                    fileSize: this.formatFileSize(this.currentFile.size),
                    timestamp: new Date().toLocaleString()
                }
            });
            this.updateStatus('ready', 'Scan Complete');
        }, 2000);
    }

    /**
     * Detect circles function
     */
    async detectCircles() {
        if (!this.currentFilePath) {
            this.showAlert('Please upload an image first', 'warning');
            return;
        }

        this.addDebugMessage('Starting circle detection...', 'info');
        this.updateStatus('processing', 'Detecting Circles...');
        this.showLoading('Detecting Circles', 'Analyzing image for circular patterns...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/detect-circles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filepath: this.currentFilePath
                })
            });

            if (!response.ok) {
                throw new Error(`Circle detection failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.hideLoading();
                this.showScanResults({
                    type: 'circle_detection',
                    message: result.message,
                    details: {
                        circlesFound: result.data.circles_found,
                        processingTime: result.data.processing_time,
                        debugImage: result.data.debug_image,
                        parameters: result.data.parameters
                    }
                });
                this.updateStatus('ready', 'Circles Detected');
            } else {
                throw new Error(result.message || 'Circle detection failed');
            }
        } catch (error) {
            this.hideLoading();
            this.addDebugMessage(`Circle detection error: ${error.message}`, 'error');
            this.showAlert(`Circle detection failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Detection Failed');
        }
    }

    /**
     * Analyze shaded circles
     */
    async analyzeShaded() {
        if (!this.currentFilePath) {
            this.showAlert('Please upload an image first', 'warning');
            return;
        }

        this.addDebugMessage('Starting shaded circle analysis...', 'info');
        this.updateStatus('processing', 'Analyzing Shaded Circles...');
        this.showLoading('Analyzing Shaded Circles', 'Detecting filled and empty circles...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/analyze-shaded`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filepath: this.currentFilePath
                })
            });

            if (!response.ok) {
                throw new Error(`Shaded analysis failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.hideLoading();
                this.showScanResults({
                    type: 'shaded_analysis',
                    message: result.message,
                    details: {
                        totalCircles: result.data.total_circles,
                        shadedCircles: result.data.shaded_circles,
                        emptyCircles: result.data.empty_circles,
                        processingTime: result.data.processing_time,
                        debugImage: result.data.debug_image,
                        parameters: result.data.parameters
                    }
                });
                this.updateStatus('ready', 'Analysis Complete');
            } else {
                throw new Error(result.message || 'Shaded analysis failed');
            }
        } catch (error) {
            this.hideLoading();
            this.addDebugMessage(`Shaded analysis error: ${error.message}`, 'error');
            this.showAlert(`Shaded analysis failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Analysis Failed');
        }
    }

    /**
     * Perform full OMR scan
     */
    async performFullScan() {
        // Use Full Scan specific file if available, otherwise fall back to main upload
        const filePath = this.fullScanFilePath || this.currentFilePath;

        if (!filePath) {
            this.showAlert('Please upload an image first (use either the main upload area or the Full Scan upload area)', 'warning');
            return;
        }

        this.addDebugMessage('Starting full OMR scan...', 'info');
        this.updateStatus('processing', 'Full OMR Scan...');
        this.showLoading('Full OMR Scan', 'Performing complete OMR form analysis...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/full-scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filepath: filePath
                })
            });

            if (!response.ok) {
                throw new Error(`Full OMR scan failed: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.hideLoading();
                this.showScanResults({
                    type: 'full_omr_scan',
                    message: result.message,
                    details: {
                        scanType: result.data.scan_type,
                        detectedForm: result.data.detected_form,
                        formLabel: result.data.form_label,
                        totalCircles: result.data.total_circles,
                        menuCircles: result.data.menu_circles,
                        selectedItems: result.data.selected_items,
                        totalPrice: result.data.total_price,
                        confidenceScore: result.data.confidence_score,
                        processingTime: result.data.processing_time,
                        debugImage: result.data.debug_image,
                        selectedItemData: result.data.selected_item_data,
                        menuItemsAvailable: result.data.menu_items_available
                    }
                });
                this.updateStatus('ready', 'Full Scan Complete');
            } else {
                throw new Error(result.message || 'Full OMR scan failed');
            }
        } catch (error) {
            this.hideLoading();
            this.addDebugMessage(`Full OMR scan error: ${error.message}`, 'error');
            this.showAlert(`Full OMR scan failed: ${error.message}`, 'error');
            this.updateStatus('error', 'Scan Failed');
        }
    }

    /**
     * Show scan results
     */
    showScanResults(result) {
        const resultsHTML = this.generateResultsHTML(result);
        this.resultsContent.innerHTML = resultsHTML;
        this.addDebugMessage(`Results displayed: ${result.message}`, 'success');
    }

    /**
     * Generate results HTML
     */
    generateResultsHTML(result) {
        let html = `
            <div class="result-item fade-in">
                <div class="result-header">
                    <h5 class="result-title">${result.message}</h5>
                    <span class="badge bg-primary result-badge">${result.type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div class="result-details">
        `;

        // Add details based on result type
        Object.entries(result.details).forEach(([key, value]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            html += `<p class="mb-1"><strong>${formattedKey}:</strong> ${value}</p>`;
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Get empty results HTML
     */
    getEmptyResultsHTML() {
        return `
            <div class="text-center text-muted py-5">
                <i class="fas fa-info-circle fa-3x mb-3"></i>
                <h5>No results yet</h5>
                <p>Upload an image and run an OMR function to see results here</p>
            </div>
        `;
    }

    /**
     * Show loading modal
     */
    showLoading(title, subtitle) {
        this.loadingText.textContent = title;
        this.loadingSubtext.textContent = subtitle;
        this.loadingModal.show();
    }

    /**
     * Hide loading modal
     */
    hideLoading() {
        this.loadingModal.hide();
    }

    /**
     * Update status indicator
     */
    updateStatus(status, text) {
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    /**
     * Add debug message
     */
    addDebugMessage(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const messageElement = document.createElement('div');
        messageElement.className = 'console-line';
        messageElement.innerHTML = `
            <span class="console-timestamp">[${timestamp}]</span>
            <span class="console-message ${type}">${message}</span>
        `;

        this.consoleContent.appendChild(messageElement);
        this.consoleContent.scrollTop = this.consoleContent.scrollHeight;

        this.debugMessages.push({ timestamp, message, type });
    }

    /**
     * Clear console
     */
    clearConsole() {
        this.consoleContent.innerHTML = `
            <div class="console-line">
                <span class="console-timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="console-message">Console cleared</span>
            </div>
        `;
        this.debugMessages = [];
    }

    /**
     * Show alert
     */
    showAlert(message, type) {
        // Sanitize message to remove any URLs or technical details
        if (typeof message === 'string') {
            message = message.replace(/https?:\/\/[^\s]+/g, '[URL]');
            message = message.replace(/127\.\d+\.\d+\.\d+/g, '[IP]');
            message = message.replace(/localhost:\d+/g, '[LOCAL]');
            message = message.replace(/ID:\s*[A-Za-z0-9-]+/g, 'ID: [HIDDEN]');
            message = message.replace(/Reference:\s*[A-Za-z0-9-]+/g, 'Reference: [HIDDEN]');
        }
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the OMR Testing System when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.omrTesting = new OMRTestingSystem();
    console.log('OMR Testing System initialized');
});
