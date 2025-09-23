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

// Send SMS OTP function
async function sendSMSOTP(phoneNumber, userName) {
    try {
        // Format phone number (ensure it starts with +63 for Philippines)
        let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+63' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('63')) {
            formattedPhone = '+' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+63' + formattedPhone;
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP in localStorage for verification
        localStorage.setItem('smsOTP', otp);
        localStorage.setItem('smsOTPExpiry', Date.now() + (5 * 60 * 1000)); // 5 minutes expiry
        
        // For demo purposes, log the OTP to console
        console.log('SMS OTP:', otp, 'for phone:', formattedPhone);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
        
    } catch (error) {
        console.error('Error sending SMS OTP:', error);
        throw new Error('Failed to send SMS verification code. Please try again.');
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

        // Save customer data to multiple collections for better organization
        try {
            // 1. Main Customer Collection
            await firebase.firestore().collection('customers').doc(user.uid).set({
                // Basic Information
                customerId: user.uid,
                name: name,
                email: email,
                phone: phone,
                
                // User Status
                role: 'customer',
                userType: 'customer',
                isActive: true,
                isEmailVerified: false,
                isPhoneVerified: false,
                
                // Timestamps
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Account Status
                accountStatus: 'pending_verification',
                verificationMethod: 'sms',
                
                // Referral System
                referralCode: generateReferralCode(name),
                referredBy: null,
                referralCount: 0
            });

            // 2. Customer Profile Collection
            await firebase.firestore().collection('customer_profiles').doc(user.uid).set({
                customerId: user.uid,
                displayName: name,
                firstName: name.split(' ')[0] || name,
                lastName: name.split(' ').slice(1).join(' ') || '',
                phoneNumber: phone,
                emailAddress: email,
                profilePicture: null,
                dateOfBirth: null,
                gender: null,
                
                // Address Information
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'Philippines',
                    isDefault: true
                },
                
                // Emergency Contact
                emergencyContact: {
                    name: '',
                    phone: '',
                    relationship: ''
                },
                
                // Profile Completion
                profileCompletion: 25, // 25% complete after basic signup
                lastProfileUpdate: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 3. Customer Preferences Collection
            await firebase.firestore().collection('customer_preferences').doc(user.uid).set({
                customerId: user.uid,
                
                // Notification Preferences
                notifications: {
                    email: true,
                    sms: true,
                    push: true,
                    marketing: false,
                    orderUpdates: true,
                    promotions: false
                },
                
                // Dietary Preferences
                dietaryRestrictions: [],
                allergies: [],
                favoriteCuisines: [],
                
                // Order Preferences
                favoriteItems: [],
                preferredDeliveryTime: '',
                deliveryInstructions: '',
                
                // App Preferences
                language: 'en',
                currency: 'PHP',
                timezone: 'Asia/Manila',
                theme: 'light',
                
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 4. Customer Loyalty Collection
            await firebase.firestore().collection('customer_loyalty').doc(user.uid).set({
                customerId: user.uid,
                
                // Loyalty Points
                loyaltyPoints: 0,
                totalPointsEarned: 0,
                totalPointsRedeemed: 0,
                
                // Membership
                membershipLevel: 'Bronze',
                membershipTier: 'New Member',
                membershipStartDate: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Rewards
                availableRewards: [],
                redeemedRewards: [],
                
                // Referral Program
                referralCode: generateReferralCode(name),
                referrals: [],
                referralRewards: 0,
                
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 5. Customer Orders Summary Collection
            await firebase.firestore().collection('customer_orders_summary').doc(user.uid).set({
                customerId: user.uid,
                
                // Order Statistics
                totalOrders: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                
                // Order History
                orderHistory: [],
                favoriteRestaurants: [],
                
                // Delivery Statistics
                totalDeliveries: 0,
                averageDeliveryTime: 0,
                
                // Payment Methods
                savedPaymentMethods: [],
                defaultPaymentMethod: null,
                
                lastOrderDate: null,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
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
            
            console.log('✅ User data saved to Firestore successfully');
            
        } catch (firestoreError) {
            console.warn('Firestore save failed:', firestoreError.message);
            // Continue with the process even if Firestore fails
        }

        // Send SMS OTP verification
        await sendSMSOTP(phone, name);

        // Store phone and user info in localStorage for OTP page
        localStorage.setItem('signupPhone', phone);
        localStorage.setItem('signupEmail', email);
        localStorage.setItem('signupName', name);

        // Show success message
        showSuccess('Account created successfully! Please check your phone for SMS verification code.');

        // Redirect to OTP page after a short delay
        setTimeout(() => {
            // Smart path resolution based on current server
            const currentUrl = window.location.href;
            let redirectPath;
            
            if (currentUrl.includes('viktoriasbistro.restaurant')) {
                // Live server - use relative path
                redirectPath = '../html/otp.html';
            } else {
                // Local development - use absolute path
                redirectPath = '/html/otp.html';
            }
            
            window.location.href = redirectPath;
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
