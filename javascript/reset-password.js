// Reset Password JavaScript - Using Firebase updatePassword() directly
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reset Password page loaded');
    
    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const passwordStrength = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // Initialize Firebase
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        showError('Firebase not loaded. Please refresh the page.');
        return;
    }
    
    // Wait for Firebase to be ready
    function waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    console.log('✔ Firebase connection successful');
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }
    
    // Check for OTP verification
    const email = sessionStorage.getItem('passwordResetEmail');
    const isVerified = sessionStorage.getItem('passwordResetVerified');
    
    if (!email || !isVerified) {
        console.log('No verified email found, redirecting to forgot password');
        window.location.href = 'forgot-password.html';
        return;
    }
    
    console.log('Password reset for verified email:', email);
    
    // Test Firebase connection
    console.log('Testing Firebase connection...');
    waitForFirebase().then(() => {
        console.log('Firebase is ready for password reset');
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validate passwords
        if (!newPassword || !confirmPassword) {
            showError('Please fill in all fields.');
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
        
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            
            // Hide previous messages
            hideMessages();
            
            // Wait for Firebase to be ready
            await waitForFirebase();
            
            // Reset password using Firebase Auth directly
            console.log('🔄 Resetting password for:', email);
            
            // Use Firebase updatePassword() method directly
            await updatePasswordWithFirebase(email, newPassword);
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            switch (error.code) {
                case 'auth/weak-password':
                    errorMsg = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/requires-recent-login':
                    errorMsg = 'Please sign in again to update your password.';
                    break;
                case 'auth/user-disabled':
                    errorMsg = 'This account has been disabled. Please contact support.';
                    break;
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email address.';
                    break;
                case 'auth/network-request-failed':
                    errorMsg = 'Network error. Please check your connection and try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg = 'Too many requests. Please try again later.';
                    break;
                case 'auth/invalid-action-code':
                    errorMsg = 'Invalid or expired reset code. Please request a new password reset.';
                    break;
                case 'auth/expired-action-code':
                    errorMsg = 'Password reset code has expired. Please request a new one.';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMsg = 'Invalid email address.';
                    break;
                case 'auth/invalid-credential':
                    errorMsg = 'Invalid credentials. Please check your email and try again.';
                    break;
                case 'auth/email-already-in-use':
                    errorMsg = 'Email address is already in use.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMsg = 'Password reset is not allowed for this account.';
                    break;
                default:
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
    
    // Function to update password using Firebase Auth directly
    async function updatePasswordWithFirebase(email, newPassword) {
        try {
            console.log('🔄 Attempting Firebase password update for:', email);
            
            const auth = firebase.auth();
            const currentUser = auth.currentUser;
            
            if (currentUser && currentUser.email === email) {
                // User is already signed in, update password directly
                console.log('✅ User is signed in, updating password directly');
                await currentUser.updatePassword(newPassword);
                console.log('✅ Password updated successfully via Firebase Auth');
                
                // Show success message
                showSuccess('Password updated successfully! Please log in again.');
                
                // Clear session storage
                sessionStorage.removeItem('passwordResetEmail');
                sessionStorage.removeItem('passwordResetVerified');
                
                // Sign out the user to force re-login with new password
                await auth.signOut();
                console.log('✅ User signed out, must log in with new password');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
            } else {
                // User is not signed in - sign them in temporarily using OTP
                console.log('⚠️ User not logged in, signing in temporarily...');
                await signInAndUpdatePassword(email, newPassword);
            }
            
        } catch (error) {
            console.error('❌ Firebase password update error:', error);
            throw error;
        }
    }
    
    // Function to update password via server API (custom OTP system)
    async function signInAndUpdatePassword(email, newPassword) {
        try {
            console.log('🔄 Updating password via server API for verified user');
            
            // Use server API to update password with Firebase Admin SDK
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.BASE_URL + '/api/reset-password-with-otp' : '/api/reset-password-with-otp';
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: email, 
                    newPassword: newPassword 
                })
            });
            
            // Check if response is ok
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Password updated successfully via server API');
                
                // Show success message
                showSuccess('Password updated successfully! You can now log in with your new password.');
                
                // Clear session storage
                sessionStorage.removeItem('passwordResetEmail');
                sessionStorage.removeItem('passwordResetVerified');
                sessionStorage.removeItem('emailOTP');
                sessionStorage.removeItem('emailOTPEmail');
                sessionStorage.removeItem('emailOTPExpiry');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
            } else {
                throw new Error(result.message || 'Failed to update password');
            }
            
        } catch (error) {
            console.error('❌ Server API password update error:', error);
            throw error;
        }
    }
    
    // Password strength checker
    newPasswordInput.addEventListener('input', function() {
        const password = newPasswordInput.value;
        
        if (password.length > 0) {
            passwordStrength.style.display = 'block';
            updatePasswordStrength(password);
        } else {
            passwordStrength.style.display = 'none';
        }
        
        // Check password match
        checkPasswordMatch();
    });
    
    confirmPasswordInput.addEventListener('input', function() {
        checkPasswordMatch();
    });
    
    function updatePasswordStrength(password) {
        let strength = 0;
        let strengthLabel = '';
        let strengthColor = '';
        
        // Length check
        if (password.length >= 6) strength += 1;
        if (password.length >= 8) strength += 1;
        
        // Character variety checks
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Determine strength level
        if (strength <= 2) {
            strengthLabel = 'Weak';
            strengthColor = '#dc3545';
        } else if (strength <= 4) {
            strengthLabel = 'Medium';
            strengthColor = '#ffc107';
        } else {
            strengthLabel = 'Strong';
            strengthColor = '#28a745';
        }
        
        // Update UI
        strengthFill.style.width = (strength / 6 * 100) + '%';
        strengthFill.style.backgroundColor = strengthColor;
        strengthText.textContent = `Password strength: ${strengthLabel}`;
        strengthText.style.color = strengthColor;
    }
    
    function checkPasswordMatch() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword.length > 0) {
            if (newPassword === confirmPassword) {
                confirmPasswordInput.style.borderColor = '#28a745';
            } else {
                confirmPasswordInput.style.borderColor = '#dc3545';
            }
        } else {
            confirmPasswordInput.style.borderColor = '#e0e0e0';
        }
    }
    
    // Show success message
    function showSuccess(message = 'Password reset successfully! Redirecting to login...') {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
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
    newPasswordInput.addEventListener('focus', function() {
        hideMessages();
    });
    
    confirmPasswordInput.addEventListener('focus', function() {
        hideMessages();
    });
});