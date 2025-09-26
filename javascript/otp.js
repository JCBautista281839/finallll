// OTP Verification Functions for Viktoria's Bistro
// Handles OTP input, validation, and verification

// OTP Input Management
class OTPInputManager {
    constructor() {
        this.inputs = [];
        this.currentIndex = 0;
        this.maxLength = 6;
        this.init();
    }

    init() {
        // Get all OTP input elements
        this.inputs = Array.from(document.querySelectorAll('.otp-input, .code-input'));
        
        if (this.inputs.length === 0) {
            console.warn('⚠️ No OTP input elements found');
            return;
        }

        this.setupEventListeners();
        this.focusFirstInput();
    }

    setupEventListeners() {
        this.inputs.forEach((input, index) => {
            // Input event
            input.addEventListener('input', (e) => {
                this.handleInput(e, index);
            });

            // Keydown event
            input.addEventListener('keydown', (e) => {
                this.handleKeydown(e, index);
            });

            // Paste event
            input.addEventListener('paste', (e) => {
                this.handlePaste(e, index);
            });

            // Focus event
            input.addEventListener('focus', (e) => {
                this.handleFocus(e, index);
            });
        });
    }

    handleInput(e, index) {
        const value = e.target.value;
        
        // Only allow numbers
        if (!/^\d$/.test(value)) {
            e.target.value = '';
            return;
        }

        // Add visual feedback
        this.addFilledClass(e.target);

        // Move to next input if value entered
        if (value && index < this.inputs.length - 1) {
            this.inputs[index + 1].focus();
        }

        // Check if all inputs are filled
        this.checkCompletion();
    }

    handleKeydown(e, index) {
        // Handle backspace
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            this.inputs[index - 1].focus();
        }

        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            this.inputs[index - 1].focus();
        }
        if (e.key === 'ArrowRight' && index < this.inputs.length - 1) {
            this.inputs[index + 1].focus();
        }
    }

    handlePaste(e, index) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, this.maxLength);
        
        // Fill inputs with pasted digits
        digits.split('').forEach((digit, i) => {
            if (this.inputs[i]) {
                this.inputs[i].value = digit;
                this.addFilledClass(this.inputs[i]);
            }
        });
        
        // Focus on the next empty input or the last one
        const nextEmptyIndex = Math.min(digits.length, this.inputs.length - 1);
        this.inputs[nextEmptyIndex].focus();
        
        this.checkCompletion();
    }

    handleFocus(e, index) {
        // Select all text when focusing
        e.target.select();
        this.currentIndex = index;
    }

    addFilledClass(input) {
        if (input.value) {
            input.classList.add('filled');
        } else {
            input.classList.remove('filled');
        }
    }

    checkCompletion() {
        const allFilled = this.inputs.every(input => input.value);
        const verifyButton = document.getElementById('verifyButton');
        
        if (verifyButton) {
            verifyButton.disabled = !allFilled;
        }

        // Trigger custom event
        const event = new CustomEvent('otpComplete', {
            detail: {
                complete: allFilled,
                value: this.getValue()
            }
        });
        document.dispatchEvent(event);
    }

    getValue() {
        return this.inputs.map(input => input.value).join('');
    }

    setValue(value) {
        const digits = value.replace(/\D/g, '').slice(0, this.maxLength);
        digits.split('').forEach((digit, i) => {
            if (this.inputs[i]) {
                this.inputs[i].value = digit;
                this.addFilledClass(this.inputs[i]);
            }
        });
        this.checkCompletion();
    }

    clear() {
        this.inputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        this.focusFirstInput();
    }

    focusFirstInput() {
        if (this.inputs.length > 0) {
            this.inputs[0].focus();
        }
    }

    focusNextEmpty() {
        const emptyIndex = this.inputs.findIndex(input => !input.value);
        if (emptyIndex !== -1) {
            this.inputs[emptyIndex].focus();
        } else {
            this.inputs[this.inputs.length - 1].focus();
        }
    }
}

// OTP Verification Manager
class OTPVerificationManager {
    constructor() {
        this.maxAttempts = 5;
        this.attempts = 0;
        this.isVerifying = false;
        this.init();
    }

    init() {
        // Wait for Firebase to be ready
        this.waitForFirebase().then(() => {
            console.log('✅ Firebase ready for OTP verification');
        }).catch(error => {
            console.error('❌ Firebase initialization error:', error);
        });
    }

    async waitForFirebase() {
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

    async verifyOTP(email, otp) {
        if (this.isVerifying) {
            throw new Error('Verification already in progress');
        }

        this.isVerifying = true;
        
        try {
            console.log(`🔍 Verifying OTP for ${email}`);
            
            // Wait for Firebase
            await this.waitForFirebase();

            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded. Please refresh the page and try again.');
            }

            // Get current user
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('No user found. Please sign up again.');
            }

            let verificationSuccess = false;
            let verificationMethod = '';

            // Try SendGrid OTP verification first
            if (window.sendGridOTPService) {
                try {
                    console.log('📧 Attempting SendGrid OTP verification...');
                    const result = await window.sendGridOTPService.verifyEmailOTP(email, otp);
                    
                    if (result.success) {
                        console.log('✅ SendGrid OTP verified successfully');
                        verificationSuccess = true;
                        verificationMethod = 'SendGrid';
                    } else {
                        throw new Error(result.message || 'SendGrid OTP verification failed');
                    }
                } catch (sendGridError) {
                    console.log('🔄 SendGrid OTP verification failed:', sendGridError.message);
                }
            }

            // Fallback to local OTP verification if SendGrid fails
            if (!verificationSuccess) {
                const localOTP = localStorage.getItem('emailOTP');
                const localOTPExpiry = localStorage.getItem('emailOTPExpiry');
                
                if (localOTP && localOTPExpiry && Date.now() < parseInt(localOTPExpiry)) {
                    if (localOTP === otp) {
                        console.log('✅ Local OTP verified successfully');
                        verificationSuccess = true;
                        verificationMethod = 'Local';
                        // Clear local OTP after successful verification
                        localStorage.removeItem('emailOTP');
                        localStorage.removeItem('emailOTPExpiry');
                    } else {
                        throw new Error('Invalid OTP. Please check your code and try again.');
                    }
                } else {
                    this.attempts++;
                    throw new Error('OTP verification failed. Please check your code and try again.');
                }
            }

            // Ensure user document exists in customers collection
            const customerRef = firebase.firestore().collection('customers').doc(user.uid);
            const customerDoc = await customerRef.get();
            
            if (!customerDoc.exists) {
                // Create customer document if it doesn't exist
                const userName = localStorage.getItem('signupName') || user.displayName || 'User';
                await customerRef.set({
                    email: user.email,
                    name: userName,
                    role: 'customer',
                    userType: 'customer',
                    isEmailVerified: true,
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    verificationMethod: verificationMethod,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Customer document created');
            } else {
                // Update existing customer document
                await customerRef.update({
                    isEmailVerified: true,
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    verificationMethod: verificationMethod,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Customer document updated');
            }

            // Also ensure user document exists in users collection for consistency
            const userRef = firebase.firestore().collection('users').doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                const userName = localStorage.getItem('signupName') || user.displayName || 'User';
                await userRef.set({
                    email: user.email,
                    name: userName,
                    role: 'customer',
                    userType: 'customer',
                    isEmailVerified: true,
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    verificationMethod: verificationMethod,
                    isActive: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ User document created');
            } else {
                await userRef.update({
                    isEmailVerified: true,
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    verificationMethod: verificationMethod,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ User document updated');
            }

            console.log(`✅ Email verification completed via ${verificationMethod}`);
            return { success: true, method: verificationMethod };

        } catch (error) {
            console.error('❌ OTP verification error:', error);
            throw error;
        } finally {
            this.isVerifying = false;
        }
    }

    async resendOTP(email, userName) {
        try {
            console.log(`🔄 Resending OTP to ${email}`);
            
            // Wait for Firebase
            await this.waitForFirebase();

            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not loaded. Please refresh the page and try again.');
            }

            // Try SendGrid OTP resend first
            if (window.sendGridOTPService) {
                try {
                    console.log('📧 Attempting SendGrid OTP resend...');
                    const result = await window.sendGridOTPService.resendOTP(email, userName);
                    
                    if (result.success) {
                        console.log('✅ SendGrid OTP resent successfully');
                        
                        // Show OTP if email failed to send
                        if (!result.emailSent && result.otp) {
                            alert(`New OTP Code: ${result.otp}\n\nUse this code to verify your email.\nExpires in 10 minutes.`);
                        }
                        
                        return { success: true, method: 'SendGrid' };
                    }
                } catch (sendGridError) {
                    console.log('🔄 SendGrid OTP resend failed:', sendGridError.message);
                }
            }

            // Fallback to local OTP generation
            console.log('🔄 Falling back to local OTP generation...');
            const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
            localStorage.setItem('emailOTP', newOTP);
            localStorage.setItem('emailOTPExpiry', Date.now() + (10 * 60 * 1000));
            
            // Show OTP in alert
            alert(`New OTP Code: ${newOTP}\n\nUse this code to verify your email.\nExpires in 10 minutes.`);
            
            console.log('✅ Local OTP resent successfully');
            return { success: true, method: 'Local' };

        } catch (error) {
            console.error('❌ OTP resend error:', error);
            throw error;
        }
    }
}

// Initialize OTP managers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize OTP input manager
    window.otpInputManager = new OTPInputManager();
    
    // Initialize OTP verification manager
    window.otpVerificationManager = new OTPVerificationManager();
    
    console.log('✅ OTP managers initialized');
});

// Global OTP functions for backward compatibility
async function verifyOTP() {
    const otpInputManager = window.otpInputManager;
    const otpVerificationManager = window.otpVerificationManager;
    
    if (!otpInputManager || !otpVerificationManager) {
        alert('OTP system not initialized. Please refresh the page.');
        return;
    }

    const otp = otpInputManager.getValue();
    
    if (otp.length !== 6) {
        alert('Please enter the complete 6-digit code');
        return;
    }

    const verifyButton = document.getElementById('verifyButton');
    if (verifyButton) {
        verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        verifyButton.disabled = true;
    }

    try {
        const email = localStorage.getItem('signupEmail');
        if (!email) {
            throw new Error('Email not found. Please sign up again.');
        }

        const result = await otpVerificationManager.verifyOTP(email, otp);
        
        // Clear stored data
        localStorage.removeItem('signupEmail');
        localStorage.removeItem('signupName');
        
        // Show success message
        alert('Email verified successfully! You are now logged in and will be redirected to the home page.');
        
        // Direct redirect to index.html - user is already authenticated
        console.log('🚀 Redirecting to index.html...');
        window.location.href = '/index.html';
        
    } catch (error) {
        console.error('OTP verification error:', error);
        alert('Verification failed: ' + error.message);
        
        // Reset button state
        if (verifyButton) {
            verifyButton.innerHTML = 'Verify Email';
            verifyButton.disabled = false;
        }
    }
}

async function resendCode() {
    const otpVerificationManager = window.otpVerificationManager;
    
    if (!otpVerificationManager) {
        alert('OTP system not initialized. Please refresh the page.');
        return;
    }

    const resendLink = document.querySelector('.resend-link');
    if (resendLink) {
        resendLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        resendLink.style.pointerEvents = 'none';
    }

    try {
        const email = localStorage.getItem('signupEmail');
        const userName = localStorage.getItem('signupName');
        
        if (!email || !userName) {
            throw new Error('Email or user name not found. Please sign up again.');
        }

        const result = await otpVerificationManager.resendOTP(email, userName);
        
        // Get the new OTP from localStorage and show it
        const newOTP = localStorage.getItem('emailOTP');
        alert(`New OTP Code: ${newOTP}\n\nUse this code to verify your email.\nExpires in 10 minutes.`);
        
    } catch (error) {
        console.error('Resend OTP error:', error);
        alert('Failed to resend code: ' + error.message);
    } finally {
        // Reset button state
        if (resendLink) {
            resendLink.innerHTML = 'Click to resend.';
            resendLink.style.pointerEvents = 'auto';
        }
    }
}

// Navigation functions
function goBack() {
    window.history.back();
}

function goToLogin() {
    window.location.href = 'html/login.html';
}

console.log('📱 OTP verification functions loaded');
