// Signup Page JavaScript Functions

// Generate referral code for customer
function generateReferralCode(name) {
    const namePart = name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${namePart}${randomPart}`;
}

// Error display function
function showError(message) {
    showMessageModal('Error', message, 'error');
}

// Success display function
function showSuccess(message) {
    showMessageModal('Success', message, 'success');
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

// Firebase user creation function
async function createUserAccount(name, email, phone, password) {
    try {
        // Show loading state
        const continueBtn = document.querySelector('.login-btn');
        const originalText = continueBtn.textContent;
        continueBtn.textContent = 'Creating Account...';
        continueBtn.disabled = true;

        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please refresh the page and try again.');
        }

        // Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Update user profile with display name
        await user.updateProfile({
            displayName: name
        });

        // Save customer user data to Firestore
        await firebase.firestore().collection('customers').doc(user.uid).set({
            // Basic Information
            name: name,
            email: email,
            phone: phone,
            
            // User Status
            role: 'customer',
            userType: 'customer',
            isActive: true,
            isEmailVerified: false,
            
            // Timestamps
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            
            // Customer Profile
            profile: {
                displayName: name,
                firstName: name.split(' ')[0] || name,
                lastName: name.split(' ').slice(1).join(' ') || '',
                phoneNumber: phone,
                emailAddress: email,
                profilePicture: null,
                dateOfBirth: null,
                gender: null,
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'Philippines'
                }
            },
            
            // Customer Preferences
            preferences: {
                notifications: {
                    email: true,
                    sms: true,
                    push: true
                },
                dietaryRestrictions: [],
                favoriteItems: [],
                allergies: []
            },
            
            // Order History
            orderHistory: [],
            totalOrders: 0,
            totalSpent: 0,
            
            // Loyalty & Rewards
            loyaltyPoints: 0,
            membershipLevel: 'Bronze',
            referralCode: generateReferralCode(name),
            
            // Account Settings
            settings: {
                language: 'en',
                currency: 'PHP',
                timezone: 'Asia/Manila',
                theme: 'light'
            }
        });

        // Also create a backup record in the main users collection for authentication
        await firebase.firestore().collection('users').doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            role: 'customer',
            userType: 'customer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true
        });

        // Send email verification
        await user.sendEmailVerification();

        // Show success message
        showSuccess('Account created successfully! Please check your email to verify your account before logging in.');

        // Redirect to customer menu page after a short delay
        setTimeout(() => {
            // Try multiple path options to avoid 404 errors
            const possiblePaths = [
                '../customer/html/menu.html',
                '/customer/html/menu.html',
                './customer/html/menu.html',
                'customer/html/menu.html'
            ];
            
            // Try the first path, if it fails, try others
            window.location.href = possiblePaths[0];
        }, 2000);

    } catch (error) {
        console.error('Error creating account:', error);
        
        // Reset button state
        const continueBtn = document.querySelector('.login-btn');
        continueBtn.textContent = 'Continue';
        continueBtn.disabled = false;

        // Handle specific Firebase errors
        let errorMessage = 'An error occurred while creating your account. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please choose a stronger password.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your internet connection and try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many attempts. Please try again later.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }
        
        showError(errorMessage);
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
window.onclick = function(event) {
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
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.querySelector('input[placeholder="Name"]');
    const emailInput = document.querySelector('input[placeholder="Email Address"]');
    const phoneInput = document.querySelector('input[placeholder="Phone Number"]');
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
    emailInput.addEventListener('input', updateButtonState);
    phoneInput.addEventListener('input', updateButtonState);
    passwordInput.addEventListener('input', function() {
        updatePasswordRequirements();
        updatePasswordMatch();
        updateButtonState();
    });
    confirmPasswordInput.addEventListener('input', function() {
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
        const emailValid = isValidEmail(email);
        const phoneValid = isValidPhone(phone);
        const passwordValid = validatePassword(password);
        const confirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;
        const termsValid = termsChecked;

        const allValid = nameValid && emailValid && phoneValid && passwordValid && confirmPasswordValid && termsValid;

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

    // Form submission
    document.querySelector('form').addEventListener('submit', function(e) {
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

        // If all validations pass, create user with Firebase
        createUserAccount(name, email, phone, password);
    });
});

// Password requirements and match indicators visibility
document.addEventListener('DOMContentLoaded', function() {
    var passwordInput = document.getElementById('password');
    var confirmPasswordInput = document.getElementById('confirmPassword');
    var requirements = document.querySelector('.password-requirements');
    var passwordMatch = document.getElementById('passwordMatch');
    
    if (passwordInput && requirements) {
        requirements.style.display = 'none';
        passwordInput.addEventListener('focus', function() {
            requirements.style.display = 'block';
        });
        passwordInput.addEventListener('blur', function() {
            requirements.style.display = 'none';
        });
    }
    
    if (confirmPasswordInput && passwordMatch) {
        passwordMatch.style.display = 'none';
        confirmPasswordInput.addEventListener('focus', function() {
            passwordMatch.style.display = 'block';
        });
        confirmPasswordInput.addEventListener('blur', function() {
            passwordMatch.style.display = 'none';
        });
    }
});
