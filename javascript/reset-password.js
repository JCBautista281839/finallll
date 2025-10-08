// Reset Password JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reset Password page loaded');
    
    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const passwordStrength = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // Get email from session storage
    const email = sessionStorage.getItem('passwordResetEmail');
    const isVerified = sessionStorage.getItem('passwordResetVerified');
    
    if (!email) {
        console.log('No email found in session, redirecting to forgot password');
        window.location.href = 'forgot-password.html';
        return;
    }
    
    if (!isVerified) {
        console.log('Password reset not verified, redirecting to OTP verification');
        window.location.href = 'verify-password-reset-otp.html';
        return;
    }
    
    console.log('Resetting password for verified email:', email);
    
    // Password visibility toggle
    togglePassword.addEventListener('click', function() {
        const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        newPasswordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
    });
    
    toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
    });
    
    // Password strength checker
    function checkPasswordStrength(password) {
        let strength = 0;
        let feedback = [];
        
        if (password.length >= 8) {
            strength += 25;
        } else {
            feedback.push('At least 8 characters');
        }
        
        if (/[a-z]/.test(password)) {
            strength += 25;
        } else {
            feedback.push('Lowercase letter');
        }
        
        if (/[A-Z]/.test(password)) {
            strength += 25;
        } else {
            feedback.push('Uppercase letter');
        }
        
        if (/[0-9]/.test(password)) {
            strength += 25;
        } else {
            feedback.push('Number');
        }
        
        return { strength, feedback };
    }
    
    // Real-time password strength checking
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        
        if (password.length > 0) {
            const result = checkPasswordStrength(password);
            passwordStrength.style.display = 'block';
            
            strengthFill.style.width = result.strength + '%';
            
            if (result.strength < 50) {
                strengthFill.style.backgroundColor = '#dc3545';
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#dc3545';
            } else if (result.strength < 75) {
                strengthFill.style.backgroundColor = '#ffc107';
                strengthText.textContent = 'Medium password';
                strengthText.style.color = '#ffc107';
            } else {
                strengthFill.style.backgroundColor = '#28a745';
                strengthText.textContent = 'Strong password';
                strengthText.style.color = '#28a745';
            }
        } else {
            passwordStrength.style.display = 'none';
        }
    });
    
    // Real-time password confirmation checking
    confirmPasswordInput.addEventListener('input', function() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword.length > 0) {
            if (newPassword === confirmPassword) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#dc3545';
            }
        } else {
            this.style.borderColor = '#e0e0e0';
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        // Validation
        if (!newPassword) {
            showError('Please enter a new password.');
            return;
        }
        
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }
        
        // Check password strength
        const strengthResult = checkPasswordStrength(newPassword);
        if (strengthResult.strength < 50) {
            showError('Password is too weak. Please choose a stronger password.');
            return;
        }
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting Password...';
            
            // Hide previous messages
            hideMessages();
            
            console.log(`🔐 Resetting password for ${email}...`);
            
            // Use SendGrid OTP service to reset password
            if (window.sendGridOTPService) {
                console.log('📧 Using SendGrid OTP service for password reset...');
                
                // Check if we have a verified OTP status
                const otpStatus = window.sendGridOTPService.getOTPStatus();
                console.log('OTP Status:', otpStatus);
                
                // Check if the OTP was verified in the previous step
                if (!otpStatus.isVerified) {
                    throw new Error('OTP verification is required before password reset. Please go back and verify your OTP first.');
                }
                
                // If OTP is expired or missing, try to get a fresh one from server
                if (!otpStatus.hasOTP || otpStatus.isExpired) {
                    console.log('OTP expired or missing, checking server-side verification...');
                    
                    // Check if the server still has the OTP data
                    const serverCheckResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.VERIFY_PASSWORD_RESET_OTP), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            email: email, 
                            otp: 'check_status' // Special value to check status
                        })
                    });
                    
                    const serverCheckResult = await serverCheckResponse.json();
                    
                    if (!serverCheckResult.success && serverCheckResult.message.includes('expired')) {
                        throw new Error('OTP has expired. Please request a new password reset.');
                    }
                }
                
                // Reset password using server API
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.RESET_PASSWORD_WITH_OTP), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email: email, 
                        newPassword: newPassword 
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Password reset successfully');
                    
                    // Clear session storage
                    sessionStorage.removeItem('passwordResetEmail');
                    sessionStorage.removeItem('passwordResetVerified');
                    
                    // Clear OTP data
                    window.sendGridOTPService.clearOTP();
                    
                    // Show success message
                    showSuccess();
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000);
                } else {
                    throw new Error(result.message || 'Failed to reset password');
                }
            } else {
                // Fallback to server API if SendGrid service not available
                console.log('🔄 SendGrid OTP service not available, using server API...');
                
                const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.RESET_PASSWORD_WITH_OTP), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        email: email, 
                        newPassword: newPassword 
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Password reset successfully');
                    
                    // Clear session storage
                    sessionStorage.removeItem('passwordResetEmail');
                    sessionStorage.removeItem('passwordResetVerified');
                    
                    // Show success message
                    showSuccess();
                    
                    // Redirect to login page
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000);
                } else {
                    throw new Error(result.message || 'Failed to reset password');
                }
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            if (error.message.includes('expired')) {
                errorMsg = 'OTP has expired. Please request a new password reset.';
            } else if (error.message.includes('user-not-found')) {
                errorMsg = 'No account found with this email address.';
            } else if (error.message.includes('weak-password')) {
                errorMsg = 'Password is too weak. Please choose a stronger password.';
            } else if (error.message.includes('OTP verification is required')) {
                errorMsg = 'OTP verification is required before password reset. Please go back and verify your OTP first.';
            } else {
                errorMsg = error.message || 'An error occurred. Please try again.';
            }
            
            showError(errorMsg);
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.innerHTML = 'Reset Password';
        }
    });
    
    // Show success message
    function showSuccess(message = 'Password reset successfully! Redirecting to login...') {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
    
    // Show error message
    function showError(message) {
        // Check if it's an OTP verification error and add helpful link
        if (message.includes('OTP verification is required')) {
            errorText.innerHTML = `${message}<br><br><a href="verify-password-reset-otp.html" style="color: #8B2E20; text-decoration: underline;">← Go back to verify OTP</a>`;
        } else if (message.includes('expired')) {
            errorText.innerHTML = `${message}<br><br><a href="forgot-password.html" style="color: #8B2E20; text-decoration: underline;">← Request new password reset</a>`;
        } else {
            errorText.textContent = message;
        }
        
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto-hide after 8 seconds (longer for errors with links)
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    }
    
    // Hide all messages
    function hideMessages() {
        successMessage.style.display = 'none';
        errorMessage.style.display = 'none';
    }
    
    // Clear messages when user starts typing
    newPasswordInput.addEventListener('focus', function() {
        hideMessages();
    });
    
    confirmPasswordInput.addEventListener('focus', function() {
        hideMessages();
    });
});