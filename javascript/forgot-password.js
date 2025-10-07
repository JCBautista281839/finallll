// Forgot Password JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Forgot Password page loaded');
    
    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    // Robust Firebase initialization (from debug tool)
    function initializeFirebase() {
        if (typeof window.firebaseConfig !== 'undefined') {
            try {
                // Check if Firebase is already initialized
                if (firebase.apps && firebase.apps.length > 0) {
                    console.log('✅ Firebase already initialized');
                    return true;
                }
                
                firebase.initializeApp(window.firebaseConfig);
                console.log('✅ Firebase initialized successfully');
                return true;
            } catch (error) {
                console.error('❌ Firebase initialization failed:', error);
                return false;
            }
        } else {
            console.error('❌ firebaseConfig not found');
            return false;
        }
    }
    
    // Initialize Firebase when page loads
    setTimeout(() => {
        if (!initializeFirebase()) {
            showError('Firebase initialization failed. Please refresh the page.');
            return;
        } else {
            console.log('✅ Firebase ready for forgot password flow');
        }
    }, 100);
    
    // Wait for Firebase to be ready
    function waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email) {
            showError('Please enter your email address.');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address.');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
            
            // Hide previous messages
            hideMessages();
            
            console.log(`📤 Sending OTP to ${email}...`);
            
            // Use SendGrid OTP service to send OTP
            if (window.sendGridOTPService) {
                console.log('📧 Using SendGrid OTP service for password reset...');
                
                // Get user name from Firebase or use email as fallback
                let userName = email.split('@')[0]; // Use email prefix as name
                
                // Try to get user display name from Firebase
                try {
                    await waitForFirebase();
                    const user = firebase.auth().currentUser;
                    if (user && user.displayName) {
                        userName = user.displayName;
                    }
                } catch (firebaseError) {
                    console.log('Could not get user display name, using email prefix');
                }
                
                const result = await window.sendGridOTPService.sendEmailOTP(email, userName);
                
                if (result.success) {
                    // Store email for OTP verification
                    sessionStorage.setItem('passwordResetEmail', email);
                    
                    console.log('✅ SendGrid OTP sent successfully for password reset');
                    
                    // Check if email was actually sent
                    if (result.emailSent) {
                        // Email sent successfully - show success message
                        showSuccess('Password reset link has been sent to your email!');
                    } else {
                        // Email failed to send but OTP generated - show warning for development
                        console.warn('⚠️ Email service unavailable. OTP generated for testing:', result.otp);
                        showSuccess('OTP generated! Check console for code (Email service unavailable).');
                    }
                    
                    // Always redirect to OTP verification page (for testing)
                    setTimeout(() => {
                        window.location.href = 'verify-password-reset-otp.html';
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Failed to send OTP');
                }
            } else {
                // Fallback to server API if SendGrid service not available
                console.log('🔄 SendGrid OTP service not available, using server API...');
                
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.SEND_PASSWORD_RESET_OTP), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Store email for OTP verification
                    sessionStorage.setItem('passwordResetEmail', email);
                    
                    // Show success message
                    showSuccess();
                    
                    // Redirect to OTP verification page
                    setTimeout(() => {
                        window.location.href = 'verify-password-reset-otp.html';
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Failed to send OTP');
                }
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email address.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Please enter a valid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many requests. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your connection and try again.';
                    break;
                default:
                    errorMsg = error.message || 'An error occurred. Please try again.';
            }
            
            showError(errorMsg);
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Send Reset Link';
        }
    });
    
    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Show success message
    function showSuccess(message) {
        if (message) {
            // Update success message text if provided
            const successText = successMessage.querySelector('p') || successMessage;
            if (successText.tagName === 'P') {
                successText.textContent = message;
            }
        }
        
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
    
    // Show error message
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // Hide all messages
    function hideMessages() {
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
    }
    
    // Real-time email validation
    emailInput.addEventListener('input', function() {
        const email = emailInput.value.trim();
        
        if (email && !isValidEmail(email)) {
            emailInput.style.borderColor = '#dc3545';
        } else {
            emailInput.style.borderColor = '#e0e0e0';
        }
    });
    
    // Clear messages when user starts typing
    emailInput.addEventListener('focus', function() {
        hideMessages();
    });
});
