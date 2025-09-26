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
                        
                        // Show OTP prominently in console
                        console.log('🔐 ===== YOUR OTP CODE =====');
                        console.log('📧 Email:', email);
                        console.log('👤 Name:', userName);
                        console.log('🔢 OTP Code:', result.otp);
                        console.log('⏰ Expires in: 10 minutes');
                        console.log('=============================');
                        
                        // Also show an alert for immediate visibility
                        alert(`OTP Code: ${result.otp}\n\nUse this code to verify your email.\nExpires in 10 minutes.`);
                        
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
        
        // Show OTP prominently in console
        console.log('🔐 ===== YOUR OTP CODE =====');
        console.log('📧 Email:', email);
        console.log('👤 Name:', userName);
        console.log('🔢 OTP Code:', otp);
        console.log('⏰ Expires in: 10 minutes');
        console.log('=============================');
        
        // Also show an alert for immediate visibility
        alert(`OTP Code: ${otp}\n\nUse this code to verify your email.\nExpires in 10 minutes.`);
        
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

        // Save customer data to streamlined collections
        try {
            // 1. Main Customer Collection (Combines basic info, profile, and preferences)
            await firebase.firestore().collection('customers').doc(user.uid).set({
                // Basic Information
                customerId: user.uid,
                name: name,
                email: email,
                phone: phone,
                
                // Profile Information
                displayName: name,
                firstName: name.split(' ')[0] || name,
                lastName: name.split(' ').slice(1).join(' ') || '',
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
                // User Status
                role: 'customer',
                userType: 'customer',
                isActive: true,
                isEmailVerified: false,
                isPhoneVerified: false,
                accountStatus: 'pending_verification',
                verificationMethod: 'sms',
                
                // Preferences
                preferences: {
                    notifications: {
                        email: true,
                        sms: true,
                        push: true,
                        marketing: false,
                        orderUpdates: true,
                        promotions: false
                    },
                    dietaryRestrictions: [],
                    allergies: [],
                    favoriteCuisines: [],
                    favoriteItems: [],
                    preferredDeliveryTime: '',
                    deliveryInstructions: '',
                    language: 'en',
                    currency: 'PHP',
                    timezone: 'Asia/Manila',
                    theme: 'light'
                },
                
                // Profile Completion
                profileCompletion: 25, // 25% complete after basic signup
                
                // Timestamps
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Customer Activity Collection (Combines loyalty, orders, reviews, support, and analytics)
            await firebase.firestore().collection('customer_activity').doc(user.uid).set({
                customerId: user.uid,
                
                // Loyalty System
                loyalty: {
                    loyaltyPoints: 0,
                    totalPointsEarned: 0,
                    totalPointsRedeemed: 0,
                    membershipLevel: 'Bronze',
                    membershipTier: 'New Member',
                    membershipStartDate: firebase.firestore.FieldValue.serverTimestamp(),
                    availableRewards: [],
                    redeemedRewards: [],
                    referralCode: generateReferralCode(name),
                    referrals: [],
                    referralRewards: 0
                },
                
                // Order Statistics
                orders: {
                    totalOrders: 0,
                    totalSpent: 0,
                    averageOrderValue: 0,
                    orderHistory: [],
                    favoriteRestaurants: [],
                    totalDeliveries: 0,
                    averageDeliveryTime: 0,
                    savedPaymentMethods: [],
                    defaultPaymentMethod: null,
                    lastOrderDate: null
                },
                
                // Reviews
                reviews: {
                    totalReviews: 0,
                    averageRating: 0,
                    reviewHistory: [],
                    reviewPreferences: {
                        autoReview: false,
                        reviewReminders: true,
                        shareReviews: false
                    },
                    lastReviewDate: null
                },
                
                // Support
                support: {
                    totalTickets: 0,
                    openTickets: 0,
                    resolvedTickets: 0,
                    supportTickets: [],
                    supportPreferences: {
                        preferredContactMethod: 'email',
                        autoEscalation: false,
                        priorityLevel: 'normal'
                    },
                    lastSupportContact: null
                },
                
                // Analytics
                analytics: {
                    loginFrequency: 0,
                    averageSessionDuration: 0,
                    lastActiveDate: firebase.firestore.FieldValue.serverTimestamp(),
                    totalAppOpens: 0,
                    totalMenuViews: 0,
                    totalCartAdditions: 0,
                    deviceInfo: {
                        platform: 'unknown',
                        browser: 'unknown',
                        lastDeviceUpdate: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    marketingCampaigns: [],
                    referralSources: []
                },
                
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

        // Store user info in localStorage for OTP page
        localStorage.setItem('signupEmail', email);
        localStorage.setItem('signupName', name);

        // Generate OTP via SendGrid
        try {
            console.log('📧 Generating OTP via SendGrid...');
            
            const otpResult = await sendEmailOTP(email, name);
            
            if (otpResult.success) {
                console.log('✅ OTP generated successfully:', otpResult.otp);
                
                if (otpResult.emailSent) {
                    showSuccess('Account created successfully! Please check your email for the verification code.');
                } else {
                    showSuccess('Account created successfully! Please use the verification code shown above.');
                }
            } else {
                console.log('❌ OTP generation failed:', otpResult.message);
                showError('Account created but failed to generate verification code. Please try again.');
            }
        } catch (error) {
            console.error('❌ Error generating OTP:', error);
            showError('Account created but failed to generate verification code. Please try again.');
        }

        // Redirect to OTP page after a short delay
        setTimeout(() => {
            window.location.href = '../html/otp.html';
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

// Check for missing elements and skip validation if any are not found
document.addEventListener('DOMContentLoaded', function() {
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
