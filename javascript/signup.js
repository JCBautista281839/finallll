// Signup Page JavaScript Functions

// Generate referral code for customer
function generateReferralCode(name) {
    const namePart = name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePart}${randomPart}`;
}

// Show email error message inline (below password requirements)
function showEmailErrorInline(message) {
    const emailErrorDiv = document.getElementById('emailErrorMessage');
    if (emailErrorDiv) {
        emailErrorDiv.querySelector('span').innerHTML = '<i class="fas fa-times" style="margin-right: 5px;"></i>' + message;
        emailErrorDiv.style.display = 'block';
    }
}

// Hide email error message inline
function hideEmailErrorInline() {
    const emailErrorDiv = document.getElementById('emailErrorMessage');
    if (emailErrorDiv) {
        emailErrorDiv.style.display = 'none';
    }
}

// Show email success message inline (below confirm password)
function showEmailSuccessInline(message) {
    const emailSuccessDiv = document.getElementById('emailSuccessMessage');
    if (emailSuccessDiv) {
        emailSuccessDiv.querySelector('span').innerHTML = '<i class="fas fa-check-circle" style="margin-right: 5px;"></i>' + message;
        emailSuccessDiv.style.display = 'block';
    }
}

// Hide email success message inline
function hideEmailSuccessInline() {
    const emailSuccessDiv = document.getElementById('emailSuccessMessage');
    if (emailSuccessDiv) {
        emailSuccessDiv.style.display = 'none';
    }
}

// Error display function using unified popup system
function showError(message) {
    // Sanitize message to remove any URLs or technical details
    if (typeof message === 'string') {
        message = message.replace(/https?:\/\/[^\s]+/g, '[URL]');
        message = message.replace(/127\.\d+\.\d+\.\d+/g, '[IP]');
        message = message.replace(/localhost:\d+/g, '[LOCAL]');
        message = message.replace(/ID:\s*[A-Za-z0-9-]+/g, 'ID: [HIDDEN]');
        message = message.replace(/Reference:\s*[A-Za-z0-9-]+/g, 'Reference: [HIDDEN]');
    }
    
    // Use unified popup system if available
    if (typeof unifiedPopup !== 'undefined') {
        unifiedPopup.error(message, {
            timeout: 5000,
            onClose: () => {
                // Focus back to the form after error is closed
                const firstInvalidField = document.querySelector('.form-input:invalid, .form-input.is-invalid');
                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
            }
        });
    } else {
        // Fallback to old method if unified popup is not available
        showMessageModal('Error', message, 'error');
    }
}

// Success display function using unified popup system
function showSuccess(message) {
    // Sanitize message to remove any URLs or technical details
    if (typeof message === 'string') {
        message = message.replace(/https?:\/\/[^\s]+/g, '[URL]');
        message = message.replace(/127\.\d+\.\d+\.\d+/g, '[IP]');
        message = message.replace(/localhost:\d+/g, '[LOCAL]');
        message = message.replace(/ID:\s*[A-Za-z0-9-]+/g, 'ID: [HIDDEN]');
        message = message.replace(/Reference:\s*[A-Za-z0-9-]+/g, 'Reference: [HIDDEN]');
    }
    
    // Use unified popup system if available
    if (typeof unifiedPopup !== 'undefined') {
        unifiedPopup.success(message, {
            timeout: 60000
        });
    } else {
        // Fallback to old method if unified popup is not available
        showMessageModal('Success', message, 'success');
    }
}

// Info display function using unified popup system
function showInfo(message) {
    // Sanitize message to remove any URLs or technical details
    if (typeof message === 'string') {
        message = message.replace(/https?:\/\/[^\s]+/g, '[URL]');
        message = message.replace(/127\.\d+\.\d+\.\d+/g, '[IP]');
        message = message.replace(/localhost:\d+/g, '[LOCAL]');
        message = message.replace(/ID:\s*[A-Za-z0-9-]+/g, 'ID: [HIDDEN]');
        message = message.replace(/Reference:\s*[A-Za-z0-9-]+/g, 'Reference: [HIDDEN]');
    }
    
    // Use unified popup system if available
    if (typeof unifiedPopup !== 'undefined') {
        unifiedPopup.info(message, {
            timeout: 4000
        });
    } else {
        // Fallback to old method if unified popup is not available
        showMessageModal('Information', message, 'info');
    }
}

// Send Email OTP function using SendGrid (primary) or local generation (fallback)
async function sendEmailOTP(email, userName) {
    try {
        console.log('📧 Starting SendGrid OTP send process...');

        // Try SendGrid OTP Service first (primary method)
        if (window.sendGridOTPService) {
            try {
                console.log('📬 Attempting SendGrid OTP...');
                const result = await window.sendGridOTPService.sendEmailOTP(email, userName);

                if (result.success) {
                    if (result.emailSent) {
                        console.log('✅ Email OTP sent successfully via SendGrid');
                        return {
                            success: true,
                            message: 'Verification code sent to your email!',
                            otp: result.otp,
                            emailSent: true
                        };
                    } else {
                        console.log('⚠️ SendGrid OTP generated but email failed to send:', result.otp);

                        // Store OTP locally and display it
                        localStorage.setItem('emailOTP', result.otp);
                        localStorage.setItem('emailOTPExpiry', result.expiry);
                        localStorage.setItem('emailOTPEmail', email);

                        // Show OTP prominently in console
                        console.log('🔐 ===== YOUR OTP CODE =====');
                        console.log('📧 Email:', email);
                        console.log('👤 Name:', userName);
                        console.log('🔢 OTP Code:', result.otp);
                        console.log('⏰ Expires in: 10 minutes');
                        console.log('=============================');

                        // OTP popup removed - OTP is now handled server-side
                        console.log(`OTP Code: ${result.otp} (Email not sent)`);

                        return {
                            success: true,
                            message: 'Verification code generated (email delivery failed)',
                            otp: result.otp,
                            emailSent: false
                        };
                    }
                }
            } catch (sendGridError) {
                console.log('🔄 SendGrid OTP failed:', sendGridError.message);
            }
        } else {
            console.log('⚠️ SendGrid OTP service not available');
        }

        // Final fallback to local OTP generation
        console.log('🔄 Falling back to local Email OTP generation');
        return await sendLocalEmailOTP(email, userName);

    } catch (error) {
        console.error('❌ SendGrid OTP service failed:', error);

        // Final fallback to local OTP generation
        console.log('🔄 Using local Email OTP generation');
        return await sendLocalEmailOTP(email, userName);
    }
}

// Fallback local Email OTP function (for demo/development)
async function sendLocalEmailOTP(email, userName) {
    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + (10 * 60 * 1000); // 10 minutes expiry

        // Store OTP in localStorage for verification
        localStorage.setItem('emailOTP', otp);
        localStorage.setItem('emailOTPExpiry', expiry);
        localStorage.setItem('emailOTPEmail', email);

        // Show OTP prominently in console
        console.log('🔐 ===== YOUR OTP CODE =====');
        console.log('📧 Email:', email);
        console.log('👤 Name:', userName);
        console.log('🔢 OTP Code:', otp);
        console.log('⏰ Expires in: 10 minutes');
        console.log('=============================');

        // OTP popup removed - OTP is now handled server-side
        console.log(`OTP Code: ${otp} (Generated locally)`);

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            message: 'Verification code generated locally',
            otp: otp,
            expiry: expiry,
            emailSent: false
        };

    } catch (error) {
        console.error('Error sending local Email OTP:', error);
        return {
            success: false,
            message: 'Failed to generate verification code',
            emailSent: false
        };
    }
}

// Message modal functions
function showMessageModal(title, message, type) {
    const modal = document.getElementById('messageModal');
    const titleEl = document.getElementById('messageModalTitle');
    const bodyEl = document.getElementById('messageModalBody');
    const headerEl = modal.querySelector('.modal-header');

    titleEl.textContent = title;
    bodyEl.textContent = message;

    // Change header color based on message type
    if (type === 'error') {
        headerEl.style.backgroundColor = '#dc3545';
    } else if (type === 'success') {
        headerEl.style.backgroundColor = '#28a745';
    } else {
        headerEl.style.backgroundColor = '#8B2E20';
    }

    modal.style.display = 'block';
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
}

// Check if email already exists in Firebase Auth
async function checkEmailExists(email) {
    try {
        console.log('🔍 Checking if email exists:', email);

        // Method 1: Try fetchSignInMethodsForEmail first
        try {
            const signInMethods = await firebase.auth().fetchSignInMethodsForEmail(email);

            if (signInMethods && signInMethods.length > 0) {
                console.log('❌ Email already exists in system (method 1)');
                return true;
            }
        } catch (fetchError) {
            console.log('⚠️ fetchSignInMethodsForEmail failed, trying alternative...');
        }

        // Method 2: Try to create a user with a temporary password
        try {
            const tempPassword = 'TempCheck123!@#' + Math.random().toString(36).substring(7);
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, tempPassword);

            // If we reach here, the email was available and user was created
            console.log('✅ Email is available for registration (method 2)');

            // Delete the temporary user immediately
            await userCredential.user.delete();
            console.log('🗑️ Temporary user deleted');

            return false;
        } catch (createError) {
            if (createError.code === 'auth/email-already-in-use') {
                console.log('❌ Email already exists in system (method 2)');
                return true;
            } else {
                console.error('❌ Create user method failed:', createError);
                // If all methods fail, allow signup to proceed
                return false;
            }
        }

    } catch (error) {
        console.error('❌ Error checking email existence:', error);

        // If there's an error checking, we'll allow the signup to proceed
        // This prevents blocking legitimate users due to network issues
        console.log('⚠️ Email check failed, allowing signup to proceed');
        return false;
    }
}

// Generate OTP and store signup data (without creating Firebase user yet)
async function initiateSignupProcess(name, email, phone, password) {
    try {
        // Show loading state
        const continueBtn = document.querySelector('.login-btn');
        const originalText = continueBtn.textContent;
        continueBtn.textContent = 'Checking Email...';
        continueBtn.disabled = true;

        // Check if email already exists
        const emailExists = await checkEmailExists(email);

        if (emailExists) {
            // Reset button state
            continueBtn.textContent = originalText;
            continueBtn.disabled = false;

            // Show error message inline instead of popup
            showEmailErrorInline('Email is already in use. Please try logging in instead.');
            return;
        }

        console.log('✅ Email is available, proceeding with signup for email:', email);

        // Update loading state
        continueBtn.textContent = 'Sending Verification Code...';

        // Store user info in localStorage for OTP verification
        localStorage.setItem('signupEmail', email);
        localStorage.setItem('signupName', name);
        localStorage.setItem('signupPhone', phone);
        localStorage.setItem('signupPassword', password);

        // Generate OTP via SendGrid
        try {
            console.log('📧 Generating OTP via SendGrid...');

            const otpResult = await sendEmailOTP(email, name);

            if (otpResult.success) {
                console.log('✅ OTP generated successfully:', otpResult.otp);

                if (otpResult.emailSent) {
                    showSuccess('Verification code sent to your email! Please check your inbox and verify your email to complete registration.');
                } else {
                    showSuccess('Verification code generated! Please use the code shown above to verify your email.');
                }
            } else {
                console.log('❌ OTP generation failed:', otpResult.message);
                showError('Failed to generate verification code. Please try again.');
                return;
            }
        } catch (error) {
            console.error('❌ Error generating OTP:', error);
            showError('Failed to generate verification code. Please try again.');
            return;
        }

        // Redirect to OTP page after a short delay
        setTimeout(() => {
            console.log('🔄 Redirecting to OTP verification page...');
            window.location.href = '../html/otp.html';
        }, 2000);

    } catch (error) {
        console.error('Error initiating signup process:', error);

        // Reset button state
        const continueBtn = document.querySelector('.login-btn');
        continueBtn.textContent = 'Continue';
        continueBtn.disabled = false;

        showError('An error occurred while processing your request. Please try again.');
    }
}

// Terms and Conditions Modal Functions
function showTermsModal() {
    document.getElementById('termsModal').style.display = 'block';
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
}

// Privacy Policy Modal Functions
function showPrivacyModal() {
    document.getElementById('privacyModal').style.display = 'block';
}

function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function (event) {
    const termsModal = document.getElementById('termsModal');
    const privacyModal = document.getElementById('privacyModal');
    const messageModal = document.getElementById('messageModal');

    if (event.target == termsModal) {
        closeTermsModal();
    }
    if (event.target == privacyModal) {
        closePrivacyModal();
    }
    if (event.target == messageModal) {
        closeMessageModal();
    }
}

// Password toggle functionality
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = passwordInput.nextElementSibling;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Real-time validation and button state management
document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');
    const continueBtn = document.querySelector('.login-btn');
    const passwordRequirements = document.querySelector('.password-requirements');
    const passwordMatch = document.getElementById('passwordMatch');
    const matchText = document.getElementById('matchText');

    // Initially disable the button
    updateButtonState();

    // Add event listeners for real-time validation
    nameInput.addEventListener('input', updateButtonState);
    emailInput.addEventListener('input', function () {
        updateButtonState();
        // Hide inline email messages when user starts typing
        hideEmailErrorInline();
        hideEmailSuccessInline();
        // Add real-time email validation with debouncing
        clearTimeout(emailInput.validationTimeout);
        emailInput.validationTimeout = setTimeout(() => {
            validateEmailRealTime(emailInput.value.trim());
        }, 1000); // Wait 1 second after user stops typing
    });
    phoneInput.addEventListener('input', updateButtonState);
    passwordInput.addEventListener('input', function () {
        updatePasswordRequirements();
        updatePasswordMatch();
        updateButtonState();
    });
    confirmPasswordInput.addEventListener('input', function () {
        updatePasswordMatch();
        updateButtonState();
    });
    termsCheckbox.addEventListener('change', updateButtonState);

    function updatePasswordRequirements() {
        const password = passwordInput.value;
        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        let requirementsText = '';

        if (!hasMinLength) {
            requirementsText += '<span style="color: #dc3545;">✗ Must be at least 8 characters.</span><br>';
        } else {
            requirementsText += '<span style="color: #28a745;">✓ Must be at least 8 characters.</span><br>';
        }

        if (!hasNumber) {
            requirementsText += '<span style="color: #dc3545;">✗ Must contain a number.</span><br>';
        } else {
            requirementsText += '<span style="color: #28a745;">✓ Must contain a number.</span><br>';
        }

        if (!hasSymbol) {
            requirementsText += '<span style="color: #dc3545;">✗ Must contain a symbol.</span>';
        } else {
            requirementsText += '<span style="color: #28a745;">✓ Must contain a symbol.</span>';
        }

        passwordRequirements.innerHTML = requirementsText;
    }

    function updatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword.length === 0) {
            passwordMatch.style.display = 'none';
            return;
        }

        passwordMatch.style.display = 'block';

        if (password === confirmPassword) {
            matchText.innerHTML = '<span style="color: #28a745;">✓ Passwords match</span>';
        } else {
            matchText.innerHTML = '<span style="color: #dc3545;">✗ Passwords do not match</span>';
        }
    }

    function updateButtonState() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const termsChecked = termsCheckbox.checked;

        // Validate all requirements
        const nameValid = name.length > 0;
        const emailValid = email.length > 0 && isValidEmail(email); // Check if email is not empty and has valid format
        const phoneValid = isValidPhone(phone);
        const passwordValid = validatePassword(password);
        const confirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;
        const termsValid = termsChecked;

        // Check if there's an email error (indicating email is already taken)
        const emailError = emailInput.parentNode.querySelector('.email-error');
        const emailAvailable = !emailError || !emailError.textContent.includes('already registered');

        const allValid = nameValid && emailValid && phoneValid && passwordValid && confirmPasswordValid && termsValid && emailAvailable;

        if (allValid) {
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            continueBtn.style.backgroundColor = '#8B2E20';
        } else {
            continueBtn.disabled = true;
            continueBtn.style.opacity = '0.6';
            continueBtn.style.cursor = 'not-allowed';
            continueBtn.style.backgroundColor = '#ccc';
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidPhone(phone) {
        // Remove all non-digit characters for validation
        const phoneDigits = phone.replace(/\D/g, '');
        // Check if phone has 10-15 digits (international format)
        return phoneDigits.length >= 10 && phoneDigits.length <= 15;
    }

    function validatePassword(password) {
        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasMinLength && hasNumber && hasSymbol;
    }

    // Real-time email validation function
    async function validateEmailRealTime(email) {
        if (!email || email.length === 0) {
            clearEmailError();
            return;
        }

        // Basic email format validation first
        if (!isValidEmail(email)) {
            showEmailError('Please enter a valid email address.');
            return;
        }

        // Show checking state
        // Remove the email checking indicator
        // showEmailChecking(); // Removed as requested

        try {
            const emailExists = await checkEmailExists(email);

            if (emailExists) {
                showEmailErrorInline('Email is already in use. Please try logging in instead.');
            } else {
                showEmailSuccessInline('Email is available for registration.');
            }
        } catch (error) {
            console.error('Error during real-time email validation:', error);
            clearEmailError(); // Clear any error state on network issues
        }
    }

    // Helper functions for email error display
    function showEmailError(message) {
        // Remove existing error message
        const existingError = emailInput.parentNode.querySelector('.email-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error styling
        emailInput.style.borderColor = '#dc3545';

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'email-error';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;

        emailInput.parentNode.appendChild(errorDiv);
    }

    function showEmailSuccess(message) {
        // Remove existing error message
        const existingError = emailInput.parentNode.querySelector('.email-error');
        if (existingError) {
            existingError.remove();
        }

        // Add success styling
        emailInput.style.borderColor = '#28a745';

        // Create success message
        const successDiv = document.createElement('div');
        successDiv.className = 'email-error';
        successDiv.style.color = '#28a745';
        successDiv.style.fontSize = '12px';
        successDiv.style.marginTop = '5px';
        successDiv.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;

        emailInput.parentNode.appendChild(successDiv);
    }

    function clearEmailError() {
        // Remove existing error message
        const existingError = emailInput.parentNode.querySelector('.email-error');
        if (existingError) {
            existingError.remove();
        }

        // Reset border color
        emailInput.style.borderColor = '';
    }

    // Form submission
    document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const termsChecked = termsCheckbox.checked;

        // Final validation
        if (!name) {
            showError('Please enter your name.');
            nameInput.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address.');
            emailInput.focus();
            return;
        }

        if (!isValidPhone(phone)) {
            showError('Please enter a valid phone number.');
            phoneInput.focus();
            return;
        }

        if (!validatePassword(password)) {
            showError('Password must be at least 8 characters and contain a number and symbol.');
            passwordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            confirmPasswordInput.focus();
            return;
        }

        if (!termsChecked) {
            showError('Please agree to the Terms and Conditions and Privacy Policy.');
            termsCheckbox.focus();
            return;
        }

        // If all validations pass, initiate signup process (OTP first, then Firebase user creation)
        initiateSignupProcess(name, email, phone, password);
    });
});

// Password requirements and match indicators visibility
document.addEventListener('DOMContentLoaded', function () {
    var passwordInput = document.getElementById('password');
    var confirmPasswordInput = document.getElementById('confirmPassword');
    var requirements = document.querySelector('.password-requirements');
    var passwordMatch = document.getElementById('passwordMatch');

    if (passwordInput && requirements) {
        requirements.style.display = 'none';
        passwordInput.addEventListener('focus', function () {
            requirements.style.display = 'block';
        });
        passwordInput.addEventListener('blur', function () {
            requirements.style.display = 'none';
        });
    }

    if (confirmPasswordInput && passwordMatch) {
        passwordMatch.style.display = 'none';
        confirmPasswordInput.addEventListener('focus', function () {
            passwordMatch.style.display = 'block';
        });
        confirmPasswordInput.addEventListener('blur', function () {
            passwordMatch.style.display = 'none';
        });
    }
});

// Check for missing elements and skip validation if any are not found
document.addEventListener('DOMContentLoaded', function () {
    const nameInput = document.getElementById('nameInput');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');

    if (!nameInput || !emailInput || !phoneInput || !passwordInput || !confirmPasswordInput || !termsCheckbox) {
        // One or more elements are missing, don't run validation
        return;
    }

    // Existing validation code here...
});
