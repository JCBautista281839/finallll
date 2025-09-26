(function () {
    'use strict';

    // Cloudinary Configuration
    const CLOUDINARY_CONFIG = {
        cloudName: 'dw3p3yosl', // Your Cloudinary cloud name
        uploadPreset: 'viktorias_bistro', // Your upload preset
        apiKey: '451394188398535' // Your API key
    };

    const cloudinaryConfig = {
        cloud_name: 'dw3p3yosl',
        api_key: '451394188398535',
        upload_preset: 'viktorias_bistro'
    };

    let uploadWidget = null;

    // Cloudinary upload function for direct API calls
    async function uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
        
        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw error;
        }
    }

    // Generate optimized image URL
    function getOptimizedImageUrl(publicId, width = 300, height = 300) {
        return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},h_${height},c_fill,f_auto,q_auto/${publicId}`;
    }

    // Upload image for profile pictures
    async function uploadProfileImage(file) {
        try {
            console.log('📤 Uploading profile image to Cloudinary...');
            
            // Validate file
            if (!file.type.startsWith('image/')) {
                throw new Error('Please select a valid image file');
            }
            
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image size must be less than 5MB');
            }
            
            const result = await uploadImageToCloudinary(file);
            console.log('✅ Profile image uploaded successfully:', result);
            
            return {
                publicId: result.public_id,
                url: result.secure_url,
                optimizedUrl: getOptimizedImageUrl(result.public_id, 300, 300)
            };
        } catch (error) {
            console.error('❌ Profile image upload failed:', error);
            throw error;
        }
    }

    function initCloudinaryWidget() {
        console.log('🔍 Checking Cloudinary availability...');
        console.log('typeof cloudinary:', typeof window.cloudinary);

        // Try to access the cloudinary object, which might be loaded as a property on window
        const cl = window.cloudinary;
        
        if (typeof cl !== 'undefined' && typeof cl.createUploadWidget === 'function') {
            console.log('✅ Cloudinary SDK loaded successfully');
            updateCloudinaryStatus('success', 'Cloudinary Ready');

            try {
                // Create the upload widget with proper configuration for profile pictures
                uploadWidget = cl.createUploadWidget({
                    cloudName: cloudinaryConfig.cloud_name,
                    uploadPreset: cloudinaryConfig.upload_preset,
                    apiKey: cloudinaryConfig.api_key,
                    sources: ['local', 'camera', 'url'],
                    multiple: false,
                    maxFiles: 100,
                    resourceType: 'image',
                    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                    maxFileSize: 5000000,
                    cropping: false,
                    croppingAspectRatio: 1,
                    croppingShowDimensions: false,
                    folder: 'profile-pictures',
                    publicId: 'profile_' + Date.now(),
                    transformation: [
                        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ],
                    styles: {
                        palette: {
                            window: "#FFFFFF",
                            windowBorder: "#90A0B3",
                            tabIcon: "#0078FF",
                            menuIcons: "#5A616A",
                            textDark: "#000000",
                            textLight: "#FFFFFF",
                            link: "#0078FF",
                            action: "#FF620C",
                            inactiveTabIcon: "#0E2F5A",
                            error: "#F44235",
                            inProgress: "#0078FF",
                            complete: "#20B832",
                            sourceBg: "#E4EBF1"
                        }
                    }
                }, (error, result) => {
                    if (!error && result && result.event === "success") {
                        console.log('✅ Upload successful:', result.info);

                        // Handle profile picture updates
                        const profileImg = document.getElementById('profileImg');
                        const placeholderIcon = document.getElementById('placeholderIcon');
                        const previewImage = document.getElementById('previewImage');
                        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
                        const changePhotoBtn = document.getElementById('changePhotoBtn');

                        // Update profile picture if elements exist
                        if (profileImg && placeholderIcon) {
                            profileImg.src = result.info.secure_url;
                            profileImg.style.display = 'block';
                            placeholderIcon.style.display = 'none';
                            profileImg.setAttribute('data-cloudinary-url', result.info.secure_url);
                            profileImg.setAttribute('data-public-id', result.info.public_id);
                            console.log('✅ Profile picture updated successfully');
                        }

                        // Update preview image if elements exist (for other upload contexts)
                        if (previewImage) {
                            previewImage.src = result.info.secure_url;
                            previewImage.style.display = 'block';
                            previewImage.setAttribute('data-cloudinary-url', result.info.secure_url);
                            previewImage.setAttribute('data-public-id', result.info.public_id);
                        }

                        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
                        if (changePhotoBtn) changePhotoBtn.style.display = 'block';

                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Profile picture uploaded successfully!', 'success');
                        }

                        // Generate optimized URL
                        const optimizedUrl = getOptimizedImageUrl(result.info.public_id, 300, 300);

                        // Trigger profile image update event
                        window.dispatchEvent(new CustomEvent('profileImageUpdated', {
                            detail: {
                                url: result.info.secure_url,
                                publicId: result.info.public_id,
                                optimizedUrl: optimizedUrl
                            }
                        }));

                        // Call the profile settings handler if available
                        if (typeof window.handleCloudinaryUploadResult === 'function') {
                            window.handleCloudinaryUploadResult(result.info);
                        }
                    } else if (error) {
                        console.error('❌ Upload error:', error);
                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Photo upload failed. Please try again.', 'error');
                        }
                    }
                });

                // Store the widget in a global variable for access
                window.cloudinaryWidget = uploadWidget;
                
                // Set up click handlers for the upload widget
                updatePhotoUploadFunctionality();
                console.log('✅ Cloudinary widget initialized and ready to use');
                
                // Dispatch an event indicating Cloudinary is ready
                window.dispatchEvent(new CustomEvent('cloudinaryReady'));
                
            } catch (widgetError) {
                console.error('❌ Error creating Cloudinary widget:', widgetError);
                updateCloudinaryStatus('error', 'Widget Error');
                setupFallbackPhotoUpload();
            }
        } else {
            console.warn('❌ Cloudinary SDK not ready');

            if (!window.cloudinaryRetryCount) {
                window.cloudinaryRetryCount = 1;
            } else {
                window.cloudinaryRetryCount++;
            }

            if (window.cloudinaryRetryCount <= 3) {
                console.log(`🔄 Retrying Cloudinary initialization (${window.cloudinaryRetryCount}/3)...`);
                updateCloudinaryStatus('warning', `Retrying... (${window.cloudinaryRetryCount}/3)`);
                setTimeout(initCloudinaryWidget, 1000);
            } else {
                console.error('❌ Cloudinary SDK failed after 3 attempts. Using fallback.');
                updateCloudinaryStatus('warning', 'Fallback Mode');
                setupFallbackPhotoUpload();
            }
        }
    }

    function updatePhotoUploadFunctionality() {
        const photoPreview = document.getElementById('photoPreview');
        const changePhotoBtn = document.getElementById('changePhotoBtn');
        const editProfileIcon = document.getElementById('editProfileIcon');
        const profileImageContainer = document.getElementById('profileImageContainer');

        // Handle existing photo preview functionality
        if (photoPreview) {
            replaceClickHandler(photoPreview, () => {
                if (uploadWidget) uploadWidget.open();
            });
        }

        if (changePhotoBtn) {
            replaceClickHandler(changePhotoBtn, () => {
                if (uploadWidget) uploadWidget.open();
            });
        }

        // Handle profile image editing (for user page)
        if (editProfileIcon) {
            replaceClickHandler(editProfileIcon, () => {
                if (uploadWidget) uploadWidget.open();
            });
        }

        if (profileImageContainer) {
            replaceClickHandler(profileImageContainer, () => {
                if (uploadWidget) uploadWidget.open();
            });
        }
    }

    function setupFallbackPhotoUpload() {
        console.log('🔄 Setting up fallback photo upload system...');
        updateCloudinaryStatus('warning', 'Using Fallback Upload');
        
        // If there's already a fallback input, remove it to avoid duplicates
        const existingInput = document.getElementById('fallbackPhotoInput');
        if (existingInput) {
            existingInput.remove();
        }
        
        const photoPreview = document.getElementById('photoPreview');
        const changePhotoBtn = document.getElementById('changePhotoBtn');
        const editProfileIcon = document.getElementById('editProfileIcon');
        const profileImageContainer = document.getElementById('profileImageContainer');
        
        // Create fallback input
        const fallbackInput = document.createElement('input');
        fallbackInput.type = 'file';
        fallbackInput.accept = 'image/*';
        fallbackInput.style.display = 'none';
        fallbackInput.id = 'fallbackPhotoInput';
        
        // Append to body
        document.body.appendChild(fallbackInput);
        console.log('✅ Fallback file input created and appended to body');
        
        // Handle file selection with better error handling
        fallbackInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }
            
            // Show loading indicator
            if (typeof window.showMessage === 'function') {
                window.showMessage('Uploading photo...', 'info');
            }
            
            try {
                // Validate file
                if (!file.type.startsWith('image/')) {
                    throw new Error('Please select a valid image file');
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error('Image size must be less than 5MB');
                }
                
                // For profile images, try to upload to Cloudinary directly
                if (editProfileIcon || profileImageContainer) {
                    console.log('📤 Uploading profile image using fallback method...');
                    
                    // Try direct upload method
                    const result = await uploadProfileImage(file);
                    
                    if (!result) {
                        throw new Error('Upload failed');
                    }
                    
                    // Update profile image
                    const profileImg = document.getElementById('profileImg');
                    const placeholderIcon = document.getElementById('placeholderIcon');
                    
                    if (profileImg && placeholderIcon) {
                        profileImg.src = result.optimizedUrl || result.url;
                        profileImg.style.display = 'block';
                        placeholderIcon.style.display = 'none';
                        profileImg.setAttribute('data-cloudinary-url', result.url);
                        profileImg.setAttribute('data-public-id', result.publicId);
                        
                        // Trigger profile image update event
                        window.dispatchEvent(new CustomEvent('profileImageUpdated', {
                            detail: result
                        }));
                        
                        // Call the profile settings handler if available
                        if (typeof window.handleCloudinaryUploadResult === 'function') {
                            window.handleCloudinaryUploadResult({
                                secure_url: result.url,
                                public_id: result.publicId
                            });
                        }
                        
                        console.log('✅ Profile image updated with fallback method');
                        if (typeof window.showMessage === 'function') {
                            window.showMessage('Profile picture uploaded successfully!', 'success');
                        }
                    }
                } else {
                    // Fallback for other photo uploads - data URL method
                    console.log('📤 Using data URL fallback for photo preview');
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewImage = document.getElementById('previewImage');
                        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
                        
                        if (previewImage && uploadPlaceholder) {
                            previewImage.src = e.target.result;
                            previewImage.style.display = 'block';
                            uploadPlaceholder.style.display = 'none';
                            previewImage.setAttribute('data-fallback-url', e.target.result);
                            console.log('📸 Photo preview updated with fallback URL');
                            
                            if (typeof window.showMessage === 'function') {
                                window.showMessage('Photo preview updated', 'success');
                            }
                        }
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error('❌ Error in fallback upload:', error);
                if (typeof window.showMessage === 'function') {
                    window.showMessage(error.message || 'Upload failed', 'error');
                }
            }
        });
        
        // Set up click handlers for fallback
        const elements = [photoPreview, changePhotoBtn, editProfileIcon, profileImageContainer].filter(Boolean);
        elements.forEach(element => {
            replaceClickHandler(element, () => {
                console.log('📷 Triggering fallback file input click');
                fallbackInput.click();
            });
        });
        
        console.log('✅ Fallback photo upload system ready');
    }

    function replaceClickHandler(element, newHandler) {
        if (element.oldClickHandler) {
            element.removeEventListener('click', element.oldClickHandler);
        }
        element.oldClickHandler = newHandler;
        element.addEventListener('click', newHandler);
    }

    function getUploadedPhotoUrl() {
        const previewImage = document.getElementById('previewImage');
        return previewImage?.style.display !== 'none'
            ? previewImage.getAttribute('data-cloudinary-url') ||
              previewImage.getAttribute('data-fallback-url') ||
              previewImage.src
            : null;
    }

    function getUploadedPhotoPublicId() {
        const previewImage = document.getElementById('previewImage');
        return previewImage?.style.display !== 'none'
            ? previewImage.getAttribute('data-public-id')
            : null;
    }

    function deleteUploadedPhoto() {
        const publicId = getUploadedPhotoPublicId();
        if (publicId) {
            console.log('🗑️ Deleting photo would require a server-side endpoint.');
        }
    }

    function updateCloudinaryStatus(type, message) {
        const statusBadge = document.getElementById('cloudinaryStatus');
        if (statusBadge) {
            const classMap = {
                success: 'bg-success',
                warning: 'bg-warning',
                error: 'bg-danger'
            };
            statusBadge.className = `badge ${classMap[type] || 'bg-secondary'}`;
            statusBadge.textContent = message;
        }
    }
    
    // Unified message display function
    function showMessage(message, type = 'info') {
        // If the user already has a showToast function, use that
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Otherwise create our own toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close ms-auto" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);
    }
    
    // Make the message function globally available
    window.showMessage = showMessage;

    // Export functions to global scope
    window.cloudinaryUtils = {
        initWidget: initCloudinaryWidget,
        getPhotoUrl: getUploadedPhotoUrl,
        getPhotoPublicId: getUploadedPhotoPublicId,
        deletePhoto: deleteUploadedPhoto,
        uploadImageToCloudinary: uploadImageToCloudinary,
        uploadProfileImage: uploadProfileImage,
        getOptimizedImageUrl: getOptimizedImageUrl,
        config: CLOUDINARY_CONFIG,
        showMessage: showMessage,
        updateStatus: updateCloudinaryStatus
    };

    // Also export individual functions for direct access
    window.uploadImageToCloudinary = uploadImageToCloudinary;
    window.uploadProfileImage = uploadProfileImage;
    window.getOptimizedImageUrl = getOptimizedImageUrl;
    window.showMessage = showMessage;

    // Dynamically load the Cloudinary script with better error handling
    function loadCloudinaryScript() {
        console.log('Loading Cloudinary Widget script...');
        
        // Define a global variable to track loading status
        window.cloudinaryScriptLoading = true;
        
        // Check if script is already loaded
        if (document.querySelector('script[src*="upload_widget.js"]') || 
            typeof window.cloudinary !== 'undefined') {
            console.log('Cloudinary script appears to be loaded, initializing widget...');
            window.cloudinaryScriptLoading = false;
            setTimeout(initCloudinaryWidget, 500);
            return;
        }
        
        // Create script element with better error handling
        const script = document.createElement('script');
        script.src = 'https://upload-widget.cloudinary.com/global/all.js';
        script.async = true;
        script.crossOrigin = 'anonymous'; // Add crossOrigin for better error reporting
        
        // Add timeout for script loading
        const scriptTimeout = setTimeout(() => {
            if (window.cloudinaryScriptLoading) {
                console.error('❌ Cloudinary script load timed out after 10 seconds');
                window.cloudinaryScriptLoading = false;
                setupFallbackPhotoUpload();
            }
        }, 10000); // 10 second timeout
        
        script.onload = function() {
            clearTimeout(scriptTimeout);
            window.cloudinaryScriptLoading = false;
            console.log('✅ Cloudinary Widget script loaded successfully');
            
            // Verify cloudinary object is available
            if (typeof window.cloudinary === 'undefined') {
                console.warn('⚠️ Cloudinary script loaded but cloudinary object not found');
                // Try to initialize again after a short delay
                setTimeout(() => {
                    if (typeof window.cloudinary !== 'undefined') {
                        console.log('✅ Cloudinary object available after delay');
                        initCloudinaryWidget();
                    } else {
                        console.error('❌ Cloudinary object still not available after delay');
                        setupFallbackPhotoUpload();
                    }
                }, 1000);
            } else {
                // Initialize normally if cloudinary object is available
                setTimeout(initCloudinaryWidget, 300);
            }
        };
        
        script.onerror = function() {
            clearTimeout(scriptTimeout);
            window.cloudinaryScriptLoading = false;
            console.error('❌ Failed to load Cloudinary Widget script');
            setupFallbackPhotoUpload();
        };
        
        // Append to head
        document.head.appendChild(script);
    }
    
    // Initialize when DOM is ready with fallback
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCloudinaryScript);
    } else {
        // If document is already loaded, run immediately with a small delay
        // to ensure other scripts have had time to initialize
        setTimeout(loadCloudinaryScript, 100);
    }
})();
