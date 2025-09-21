document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');
    const status = document.getElementById('status');
    
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
                <strong>🚀 OMR System Ready!</strong><br>
                <small>Upload images here OR run: <code>python omr_processor.py</code> for auto-demo</small>
            </div>
        `;
    }, 1000);
});