// Verify Password Reset OTP JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Verify Password Reset OTP page loaded');
    
    const form = document.getElementById('otpVerificationForm');
    const otpInputs = document.querySelectorAll('.otp-input');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const resendOtpLink = document.getElementById('resendOtp');
    
    // Get email from session storage
    const email = sessionStorage.getItem('passwordResetEmail');
    
    if (!email) {
        console.log('No email found in session, redirecting to forgot password');
        window.location.href = 'forgot-password.html';
        return;
    }
    
    console.log('Verifying OTP for email:', email);
    
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
    
    // Auto-focus first input
    otpInputs[0].focus();
    
    // Handle OTP input navigation
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input if current has value
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
            
            // Handle paste
            if (e.key === 'v' && e.ctrlKey) {
                e.preventDefault();
                handlePaste(e);
            }
        });
    });
    
    // Handle paste event
    function handlePaste(e) {
        const pastedData = e.clipboardData.getData('text');
        const digits = pastedData.replace(/\D/g, '').slice(0, 6);
        
        digits.split('').forEach((digit, index) => {
            if (otpInputs[index]) {
                otpInputs[index].value = digit;
            }
        });
        
        // Focus last filled input or submit if complete
        const lastFilledIndex = digits.length - 1;
        if (lastFilledIndex >= 0 && lastFilledIndex < otpInputs.length) {
            otpInputs[lastFilledIndex].focus();
        }
        
        if (digits.length === 6) {
            setTimeout(() => {
                form.dispatchEvent(new Event('submit'));
            }, 100);
        }
    }
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const otp = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            showError('Please enter the complete 6-digit OTP.');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            
            // Hide previous messages
            hideMessages();
            
            // Use SendGrid OTP service to verify OTP
            if (window.sendGridOTPService) {
                console.log('📧 Using SendGrid OTP service for password reset verification...');
                
                const result = await window.sendGridOTPService.verifyEmailOTP(email, otp);
                
                if (result.success) {
                    // Store verification token
                    sessionStorage.setItem('passwordResetVerified', 'true');
                    
                    console.log('✅ SendGrid OTP verified successfully for password reset');
                    
                    // Show success message
                    showSuccess();
                    
                    // Redirect to password reset page
                    setTimeout(() => {
                        window.location.href = 'reset-password.html';
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Invalid OTP');
                }
            } else {
                // Fallback to server API if SendGrid service not available
                console.log('🔄 SendGrid OTP service not available, using server API...');
                
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.VERIFY_PASSWORD_RESET_OTP), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email, otp: otp })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Store verification token
                    sessionStorage.setItem('passwordResetVerified', 'true');
                    
                    // Show success message
                    showSuccess();
                    
                    // Redirect to password reset page
                    setTimeout(() => {
                        window.location.href = 'reset-password.html';
                    }, 2000);
                } else {
                    throw new Error(result.message || 'Invalid OTP');
                }
            }
            
        } catch (error) {
            console.error('OTP verification error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            if (error.message.includes('Invalid OTP')) {
                errorMsg = 'Invalid OTP. Please check and try again.';
            } else if (error.message.includes('expired')) {
                errorMsg = 'OTP has expired. Please request a new one.';
            } else if (error.message.includes('Too many attempts')) {
                errorMsg = 'Too many failed attempts. Please request a new OTP.';
            }
            
            showError(errorMsg);
            
            // Clear OTP inputs on error
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
            
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Verify OTP';
        }
    });
    
    // Handle resend OTP
    resendOtpLink.addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            // Show loading state
            resendOtpLink.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';
            resendOtpLink.style.pointerEvents = 'none';
            
            // Hide previous messages
            hideMessages();
            
            // Use SendGrid OTP service to resend OTP
            if (window.sendGridOTPService) {
                console.log('📧 Using SendGrid OTP service to resend password reset OTP...');
                
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
                
                const result = await window.sendGridOTPService.resendOTP(email, userName);
                
                if (result.success) {
                    console.log('✅ SendGrid OTP resent successfully for password reset');
                    
                    // Show OTP if email failed to send
                    if (!result.emailSent && result.otp) {
                        // OTP popup removed - OTP is now handled server-side
                        console.log(`New Password Reset OTP Code: ${result.otp} (Email not sent)`);
                    }
                    
                    showSuccess('OTP resent successfully! Check your email.');
                    
                    // Clear OTP inputs
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                } else {
                    throw new Error(result.message || 'Failed to resend OTP');
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
                    showSuccess('OTP resent successfully! Check your email.');
                    
                    // Clear OTP inputs
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                } else {
                    throw new Error(result.message || 'Failed to resend OTP');
                }
            }
            
        } catch (error) {
            console.error('Resend OTP error:', error);
            showError('Failed to resend OTP. Please try again.');
        } finally {
            // Reset button state
            resendOtpLink.innerHTML = 'Resend OTP';
            resendOtpLink.style.pointerEvents = 'auto';
        }
    });
    
    // Show success message
    function showSuccess(message = 'OTP verified! Redirecting to password reset...') {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
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
    
    // Clear messages when user starts typing
    otpInputs.forEach(input => {
        input.addEventListener('focus', function() {
            hideMessages();
        });
    });
});
