// OTP Verification JavaScript Functions
// This file handles OTP verification using SendGrid, Firebase, or fallback methods

// Global variables
let otpInputs;
let verifyButton;
let resendLink;

// Initialize OTP functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeOTP();
});

function initializeOTP() {
    console.log('🔐 Initializing OTP verification system...');
    
    // Get DOM elements
    otpInputs = document.querySelectorAll('.otp-input');
    verifyButton = document.getElementById('verifyButton');
    resendLink = document.querySelector('.resend-link');
    
    // Set up OTP input handling
    setupOTPInputs();
    
    // Set up contact display
    setContactDisplayEmail();
    
    // Check service availability
    checkServiceAvailability();
    
    console.log('✅ OTP system initialized');
}

// Set up OTP input handling
function setupOTPInputs() {
    if (!otpInputs || otpInputs.length === 0) {
        console.warn('⚠️ OTP inputs not found');
        return;
    }
    
    otpInputs.forEach((input, index) => {
        // Handle input events
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow single digit
            if (value.length > 1) {
                e.target.value = value.slice(-1);
            }
            
            // Move to next input if current is filled
            if (value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        // Handle backspace
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);
            
            digits.split('').forEach((digit, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = digit;
                }
            });
            
            // Focus last filled input
            const lastFilledIndex = Math.min(digits.length - 1, otpInputs.length - 1);
            if (otpInputs[lastFilledIndex]) {
                otpInputs[lastFilledIndex].focus();
            }
        });
    });
}

// Verify OTP using SendGrid, Firebase, or fallback
async function verifyOTP() {
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        showMessage('Please enter the complete 6-digit code', 'error');
        return;
    }
    
    // Show loading state
    setButtonLoading(true);
    
    try {
        // Wait for Firebase to be ready
        await waitForFirebase();
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please refresh the page and try again.');
        }
        
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('No user found. Please sign up again.');
        }
        
        console.log('🔐 Verifying Email OTP for user:', user.email);
        
        // Verify Email OTP using SendGrid, Firebase, or fallback
        const email = localStorage.getItem('signupEmail');
        let verificationSuccess = false;
        
        // Try SendGrid OTP verification first
        if (window.sendGridOTPService) {
            try {
                console.log('📬 Attempting SendGrid OTP verification...');
                const result = await window.sendGridOTPService.verifyOTP(email, otp);
                
                if (result.success) {
                    console.log('✅ SendGrid Email OTP verified successfully');
                    verificationSuccess = true;
                }
            } catch (sendGridError) {
                console.log('🔄 SendGrid OTP verification failed:', sendGridError.message);
            }
        }
        
        // Fallback to Firebase OTP verification
        if (!verificationSuccess && window.firebaseOTPService) {
            try {
                console.log('🔥 Attempting Firebase OTP verification...');
                await window.firebaseOTPService.verifyEmailOTP(email, otp);
                console.log('✅ Firebase Email OTP verified successfully');
                verificationSuccess = true;
            } catch (firebaseError) {
                console.log('🔄 Firebase Email OTP verification failed:', firebaseError.message);
            }
        }
        
        if (!verificationSuccess) {
            throw new Error('OTP verification failed. Please check your code and try again.');
        }
        
        // Update user's email verification status in Firestore
        await firebase.firestore().collection('customers').doc(user.uid).update({
            isEmailVerified: true,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Clear stored data
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('signupName');
        
        // Show success message
        showMessage('Email verified successfully! You can now log in.', 'success');
        
        // Redirect to login page after delay
        setTimeout(() => {
            window.location.href = 'html/login.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ OTP verification error:', error);
        showMessage('Verification failed: ' + error.message, 'error');
    } finally {
        setButtonLoading(false);
    }
}

// Resend OTP using SendGrid, Firebase, or fallback
async function resendCode() {
    if (!resendLink) {
        console.warn('⚠️ Resend link not found');
        return;
    }
    
    // Show loading state
    resendLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    resendLink.style.pointerEvents = 'none';
    
    try {
        // Wait for Firebase to be ready
        await waitForFirebase();
        
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please refresh the page and try again.');
        }
        
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
            throw new Error('No user found. Please sign up again.');
        }
        
        // Send Email OTP
        const email = localStorage.getItem('signupEmail');
        const userName = localStorage.getItem('signupName');
        
        if (!email) {
            throw new Error('Email not found. Please sign up again.');
        }
        
        console.log('🔄 Resending Email OTP to:', email);
        
        let resendSuccess = false;
        
        // Try SendGrid OTP resend first
        if (window.sendGridOTPService) {
            try {
                console.log('📬 Attempting SendGrid OTP resend...');
                const result = await window.sendGridOTPService.resendOTP(email, userName);
                
                if (result.success) {
                    console.log('✅ SendGrid OTP resent successfully');
                    showMessage('New verification code sent! Please check your email.', 'success');
                    resendSuccess = true;
                }
            } catch (sendGridError) {
                console.log('🔄 SendGrid OTP resend failed:', sendGridError.message);
            }
        }
        
        // Fallback to Firebase OTP
        if (!resendSuccess && typeof sendEmailOTP === 'function') {
            try {
                console.log('🔥 Attempting Firebase OTP resend...');
                await sendEmailOTP(email, userName);
                showMessage('Verification code sent! Please check your email.', 'success');
                resendSuccess = true;
            } catch (firebaseError) {
                console.log('🔄 Firebase OTP resend failed:', firebaseError.message);
            }
        }
        
        if (!resendSuccess) {
            throw new Error('Failed to resend verification code. Please try again.');
        }
        
    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        showMessage('Failed to resend code: ' + error.message, 'error');
    } finally {
        // Reset button state
        resendLink.innerHTML = 'Click to resend.';
        resendLink.style.pointerEvents = 'auto';
    }
}

// Set button loading state
function setButtonLoading(loading) {
    if (!verifyButton) return;
    
    if (loading) {
        verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        verifyButton.disabled = true;
    } else {
        verifyButton.innerHTML = 'Verify Email';
        verifyButton.disabled = false;
    }
}

// Show message to user
function showMessage(message, type = 'info') {
    // Try to use existing modal system
    if (typeof showMessageModal === 'function') {
        showMessageModal(type === 'error' ? 'Error' : 'Success', message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Set contact display for Email
function setContactDisplayEmail() {
    const contactDisplay = document.getElementById('contactDisplay');
    if (contactDisplay) {
        const email = localStorage.getItem('signupEmail') || 'your@email.com';
        contactDisplay.textContent = email;
    }
}

// Check service availability
function checkServiceAvailability() {
    console.log('🔍 Checking OTP service availability...');
    
    if (window.sendGridOTPService) {
        console.log('✅ SendGrid OTP service available');
    } else {
        console.log('⚠️ SendGrid OTP service not available');
    }
    
    if (window.firebaseOTPService) {
        console.log('✅ Firebase OTP service available');
    } else {
        console.log('⚠️ Firebase OTP service not available');
    }
}

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

// Navigation functions
function goBack() {
    window.history.back();
}

function goToLogin() {
    window.location.href = 'html/login.html';
}

// Export functions for global access
window.verifyOTP = verifyOTP;
window.resendCode = resendCode;
window.goBack = goBack;
window.goToLogin = goToLogin;
window.setContactDisplayEmail = setContactDisplayEmail;
