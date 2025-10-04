document.addEventListener('DOMContentLoaded', function() {
    // Skip if this is an OMR page to avoid conflicts
    if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
        return;
    }
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');
    const status = document.getElementById('status');
    
    // Only proceed if these elements exist and we're not on an OMR page
    if (!uploadArea || !fileInput || !processBtn || !status) {
        return;
    }
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', function(e) {
        const files = e.target.files;
        if (files.length > 0) {
            processBtn.disabled = false;
            status.innerHTML = `${files.length} file(s) selected. Click "Process Forms" or run Python script.`;
        }
    });
    
    processBtn.addEventListener('click', function() {
        status.innerHTML = 'Processing... Check console for Python script output.';
    });
    
    // Auto-show instructions
    setTimeout(() => {
        status.innerHTML = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                <strong>🚀 System Ready!</strong><br>
                <small>Upload images here OR run: <code>python processor.py</code> for auto-demo</small>
            </div>
        `;
    }, 1000);
});