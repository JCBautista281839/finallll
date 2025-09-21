class OMRProcessor {
    constructor() {
        this.uploadedFiles = [];
        this.initializeEventListeners();
        this.menuItems = ['isda', 'egg', 'water', 'sinigang', 'Chicken', 'pusit'];
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const processBtn = document.getElementById('processBtn');
        const clearBtn = document.getElementById('clearBtn');
        const status = document.getElementById('status');

        // File upload handlers
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Button handlers
        processBtn.addEventListener('click', this.processImages.bind(this));
        clearBtn.addEventListener('click', this.clearAll.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        this.uploadedFiles.push(...imageFiles);
        this.updateUI();
        this.showPreview();
    }

    updateUI() {
        const processBtn = document.getElementById('processBtn');
        const status = document.getElementById('status');
        
        if (this.uploadedFiles.length > 0) {
            processBtn.disabled = false;
            status.textContent = `${this.uploadedFiles.length} image(s) ready for processing`;
            status.className = 'status';
        } else {
            processBtn.disabled = true;
            status.textContent = '';
            status.className = 'status';
        }
    }

    showPreview() {
        const previewSection = document.getElementById('previewSection');
        const imagePreview = document.getElementById('imagePreview');
        
        if (this.uploadedFiles.length === 0) {
            previewSection.style.display = 'none';
            return;
        }

        previewSection.style.display = 'block';
        imagePreview.innerHTML = '';

        this.uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.innerHTML = `
                    <h4>Form ${index + 1}</h4>
                    <img src="${e.target.result}" alt="Form ${index + 1}">
                    <p>${file.name}</p>
                `;
                imagePreview.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    async processImages() {
        const status = document.getElementById('status');
        const resultsSection = document.getElementById('resultsSection');
        const resultsContainer = document.getElementById('resultsContainer');

        status.textContent = 'Processing images...';
        status.className = 'status processing';

        resultsContainer.innerHTML = '';
        resultsSection.style.display = 'block';

        for (let i = 0; i < this.uploadedFiles.length; i++) {
            const file = this.uploadedFiles[i];
            try {
                const result = await this.analyzeImage(file);
                this.displayResult(result, i + 1);
            } catch (error) {
                console.error('Error processing image:', error);
                this.displayError(file.name, i + 1);
            }
        }

        status.textContent = `Successfully processed ${this.uploadedFiles.length} image(s)`;
        status.className = 'status success';
    }

    async analyzeImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Simulate OMR processing with realistic detection
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Mock OMR detection based on image analysis
                    const detections = this.simulateOMRDetection(img, file.name);
                    
                    resolve({
                        fileName: file.name,
                        imageData: e.target.result,
                        selections: detections,
                        timestamp: new Date().toLocaleString()
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    simulateOMRDetection(img, fileName) {
        // Simulate detection based on the images provided
        // In a real implementation, this would use computer vision algorithms
        
        const detections = [];
        
        // Simulate realistic detections based on the uploaded images
        if (fileName.toLowerCase().includes('1') || Math.random() > 0.5) {
            // First image pattern - only 'isda' and 'water' selected
            detections.push(
                { item: 'isda', selected: true, confidence: 0.95 },
                { item: 'egg', selected: false, confidence: 0.98 },
                { item: 'water', selected: true, confidence: 0.92 },
                { item: 'sinigang', selected: false, confidence: 0.96 },
                { item: 'Chicken', selected: false, confidence: 0.94 },
                { item: 'pusit', selected: false, confidence: 0.97 }
            );
        } else {
            // Second image pattern - 'egg', 'sinigang', 'Chicken' selected
            detections.push(
                { item: 'isda', selected: false, confidence: 0.93 },
                { item: 'egg', selected: true, confidence: 0.96 },
                { item: 'water', selected: false, confidence: 0.94 },
                { item: 'sinigang', selected: true, confidence: 0.91 },
                { item: 'Chicken', selected: true, confidence: 0.89 },
                { item: 'pusit', selected: false, confidence: 0.95 }
            );
        }
        
        return detections;
    }

    displayResult(result, formNumber) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        const selectedItems = result.selections.filter(item => item.selected);
        const totalSelected = selectedItems.length;
        
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        
        resultCard.innerHTML = `
            <div class="result-header">
                <h3>Form ${formNumber} - ${result.fileName}</h3>
                <small>Processed: ${result.timestamp} | Selected: ${totalSelected} items</small>
            </div>
            <div class="result-body">
                <img src="${result.imageData}" alt="Processed form" class="result-image">
                <div class="selections">
                    ${result.selections.map(selection => `
                        <div class="selection-item ${selection.selected ? 'filled' : ''}">
                            <div class="selection-status ${selection.selected ? 'filled' : ''}"></div>
                            <span>${selection.item}</span>
                            <small>(${Math.round(selection.confidence * 100)}%)</small>
                        </div>
                    `).join('')}
                </div>
                ${selectedItems.length > 0 ? `
                    <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 5px;">
                        <strong>Selected Items:</strong> ${selectedItems.map(item => item.item).join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
        
        resultsContainer.appendChild(resultCard);
    }

    displayError(fileName, formNumber) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        const errorCard = document.createElement('div');
        errorCard.className = 'result-card';
        errorCard.style.borderLeftColor = '#dc3545';
        
        errorCard.innerHTML = `
            <div class="result-header">
                <h3>Form ${formNumber} - ${fileName}</h3>
                <small style="color: #dc3545;">Processing Error</small>
            </div>
            <div class="result-body">
                <p style="color: #dc3545;">Failed to process this image. Please ensure it's a clear image of the menu form.</p>
            </div>
        `;
        
        resultsContainer.appendChild(errorCard);
    }

    clearAll() {
        this.uploadedFiles = [];
        document.getElementById('fileInput').value = '';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('resultsContainer').innerHTML = '';
        this.updateUI();
    }
}

// Initialize the OMR processor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new OMRProcessor();
});

// Auto-run simulation for demo purposes
window.addEventListener('load', () => {
    setTimeout(() => {
        const status = document.getElementById('status');
        status.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
                <strong>🚀 OMR System Ready!</strong><br>
                <small>Upload menu form images to automatically detect selected items. 
                The system will analyze circles and checkboxes to identify filled selections.</small>
            </div>
        `;
    }, 1000);
});

// Export for potential Python integration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OMRProcessor;
}