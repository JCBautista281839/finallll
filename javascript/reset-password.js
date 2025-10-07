
// Reset Password JavaScript
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
            
            // Reset password using Firebase Auth
            console.log('🔄 Resetting password for:', email);
            
            // Try server endpoint first (with Firebase Admin SDK)
            try {
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
                
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Server approved password reset');
                    console.log('Server response:', result);
                    console.log('Client-side update required:', result.clientSideUpdate);
                    console.log('Firebase update failed:', result.firebaseUpdateFailed);
                    console.log('Firebase updated:', result.firebaseUpdated);
                    console.log('Note:', result.note);
                    
                    // If server-side Firebase update failed, do client-side update
                    if (result.clientSideUpdate && result.firebaseUpdateFailed) {
                        console.log('🔄 Server-side Firebase update failed, attempting client-side update');
                        await updatePasswordWithFirebaseClient(email, newPassword);
                    } else if (result.firebaseUpdated) {
                        // Server-side update was successful

                        console.log('Password reset completed automatically via server');

                        console.log('✅ Password reset completed automatically via server');

                        showSuccess('Password updated successfully in Firebase Authentication! You can now log in with your new password.');
                        
                        // Clear session storage
                        sessionStorage.removeItem('passwordResetEmail');
                        sessionStorage.removeItem('passwordResetVerified');
                        
                        // Redirect to login after 3 seconds
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 3000);
                    } else {
                        // Fallback case - neither server nor client update worked as expected
                        console.log('⚠️ Unexpected server response, attempting client-side update as fallback');
                        await updatePasswordWithFirebaseClient(email, newPassword);
                    }
                    
                    return; // Exit successfully
                } else {
                    throw new Error(result.message || 'Failed to reset password');
                }
                
            } catch (serverError) {
                console.log('🔄 Server password reset failed, trying client-side approach:', serverError.message);
                
                // Fallback: Use Firebase client-side password reset
                // Note: This requires the user to be signed in, so we'll provide instructions instead
                
                // Clear session storage
                sessionStorage.removeItem('passwordResetEmail');
                sessionStorage.removeItem('passwordResetVerified');
                
                // Show success message with instructions
                alert(`Password Reset Instructions:\n\n1. Your OTP verification was successful\n2. To complete the password reset:\n   - Go to the login page\n   - Click "Forgot Password" again\n   - Use Firebase's built-in password reset\n   - Check your email for the reset link\n\nOr contact support for assistance.`);
                
                // Redirect to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMsg = 'An error occurred. Please try again.';
            
            switch (error.code) {
                case 'auth/weak-password':
                    errorMsg = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/expired-action-code':
                    errorMsg = 'Password reset link has expired. Please request a new one.';
                    break;
                case 'auth/invalid-action-code':
                    errorMsg = 'Invalid password reset link. Please request a new one.';
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
    
    // Function to update password using Firebase Auth client-side
    async function updatePasswordWithFirebaseClient(email, newPassword) {
        try {
            console.log('🔄 Attempting client-side Firebase password update for:', email);
            
            // Get the current user (if any)
            const currentUser = firebase.auth().currentUser;
            
            if (currentUser && currentUser.email === email) {
                // User is already signed in, update password directly
                console.log('✅ User is signed in, updating password directly');
                await currentUser.updatePassword(newPassword);
                console.log('✅ Password updated successfully via Firebase Auth');
                
                // Show success message
                showSuccess('Password updated successfully! You can now log in with your new password.');
                
                // Clear session storage
                sessionStorage.removeItem('passwordResetEmail');
                sessionStorage.removeItem('passwordResetVerified');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
                
            } else {
                // User is not signed in - this is the most common case for password reset
                console.log('⚠️ User not signed in, cannot update password directly via client-side');
                console.log('ℹ️ This is normal for password reset flow - server-side update should handle this');
                
                // Since we can't update password without being signed in, 
                // we'll show a message indicating the reset was processed
                showSuccess('Password reset request processed. If the server-side update failed, please try logging in with your current password or contact support.');
                
                // Clear session storage
                sessionStorage.removeItem('passwordResetEmail');
                sessionStorage.removeItem('passwordResetVerified');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            }
            
        } catch (error) {
            console.error('❌ Client-side Firebase password update error:', error);
            
            // Show error message
            let errorMsg = 'Password update failed. Please try again.';
            
            if (error.code === 'auth/user-not-found') {
                errorMsg = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMsg = 'Please sign in again to update your password.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMsg = 'Network error. Please check your connection and try again.';
            }
            
            // Use the showError function from the DOM scope
            showError(errorMsg);
            
            // Reset button state
            const resetButton = document.querySelector('button[type="submit"]');
            if (resetButton) {
                resetButton.disabled = false;
                resetButton.innerHTML = 'Reset Password';
            }
        }
    }
});
