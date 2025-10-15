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

            let verificationSuccess = false;
            let verificationMethod = '';

            // Try local OTP verification first (fastest)
            try {
                console.log('🔄 Attempting local OTP verification first...');
                const localResult = window.sendGridOTPService.verifyLocalOTP(email, otp);
                
                if (localResult.success) {
                    console.log('✅ Local OTP verified successfully');
                    verificationSuccess = true;
                    verificationMethod = 'Local';
                } else {
                    console.log('❌ Local OTP verification failed:', localResult.message);
                }
            } catch (localError) {
                console.log('❌ Local OTP verification error:', localError.message);
            }

            // Try SendGrid OTP verification only if local verification failed
            if (!verificationSuccess && window.sendGridOTPService) {
                try {
                    console.log('📧 Attempting SendGrid OTP verification...');
                    
                    // Add timeout to SendGrid request
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('SendGrid request timeout')), 5000)
                    );
                    
                    const sendGridPromise = window.sendGridOTPService.verifyEmailOTP(email, otp);
                    const result = await Promise.race([sendGridPromise, timeoutPromise]);
                    
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

            if (!verificationSuccess) {
                this.attempts++;
                throw new Error('OTP verification failed. Please check your code and try again.');
            }

            // Only create Firebase user account AFTER successful OTP verification
            if (verificationSuccess) {
                console.log('🔐 Creating Firebase user account after OTP verification...');
                await this.createFirebaseUserAccount(email, verificationMethod);
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

    async createFirebaseUserAccount(email, verificationMethod) {
        try {
            console.log('🔐 Creating Firebase user account...');
            
            // Get stored signup data
            const name = localStorage.getItem('signupName');
            const phone = localStorage.getItem('signupPhone');
            const password = localStorage.getItem('signupPassword');
            
            if (!name || !phone || !password) {
                throw new Error('Signup data not found. Please sign up again.');
            }

            // Create user with Firebase Auth
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ User created and automatically logged in:', user.email);
            console.log('✅ User UID:', user.uid);

            // Update user profile with display name
            await user.updateProfile({
                displayName: name
            });
            
            console.log('✅ User profile updated with display name:', name);

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
                    isEmailVerified: true,
                    isPhoneVerified: false,
                    accountStatus: 'verified',
                    verificationMethod: verificationMethod,
                    
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
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
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
                        referralCode: this.generateReferralCode(name),
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
                    isEmailVerified: true,
                    verificationMethod: verificationMethod,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true
                });
                
                console.log('✅ User data saved to Firestore successfully');
                
            } catch (firestoreError) {
                console.warn('Firestore save failed:', firestoreError.message);
                // Continue with the process even if Firestore fails
            }

            // Clear stored signup data
            localStorage.removeItem('signupEmail');
            localStorage.removeItem('signupName');
            localStorage.removeItem('signupPhone');
            localStorage.removeItem('signupPassword');

            console.log('✅ Firebase user account created successfully');
            
            // Sign out the user so they need to log in manually
            await firebase.auth().signOut();
            
            // Redirect to login page immediately (no pop-up message)
            window.location.href = '../html/login.html';
            
            return user;

        } catch (error) {
            console.error('❌ Error creating Firebase user account:', error);
            
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
            
            throw new Error(errorMessage);
        }
    }

    generateReferralCode(name) {
        const namePart = name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${namePart}${randomPart}`;
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
                            // OTP popup removed - OTP is now handled server-side
                            console.log(`New OTP Code: ${result.otp} (Email not sent)`);
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
            
            // OTP popup removed - OTP is now handled server-side
            console.log(`New OTP Code: ${newOTP} (Generated locally)`);
            
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

// Note: Global functions removed to prevent recursion conflicts
// OTP verification is now handled directly in the HTML file

// Navigation functions
function goBack() {
    window.history.back();
}

function goToLogin() {
    window.location.href = 'html/login.html';
}

// Debug function to check OTP status
function debugOTPStatus() {
    console.log('🔍 OTP Debug Status:');
    console.log('  - signupEmail:', localStorage.getItem('signupEmail'));
    console.log('  - signupName:', localStorage.getItem('signupName'));
    console.log('  - signupPhone:', localStorage.getItem('signupPhone'));
    console.log('  - signupPassword:', localStorage.getItem('signupPassword') ? '[HIDDEN]' : 'Not found');
    console.log('  - emailOTP:', localStorage.getItem('emailOTP'));
    console.log('  - emailOTPEmail:', localStorage.getItem('emailOTPEmail'));
    console.log('  - emailOTPExpiry:', localStorage.getItem('emailOTPExpiry'));
    console.log('  - Current Time:', Date.now());
    console.log('  - Is OTP Expired:', localStorage.getItem('emailOTPExpiry') ? Date.now() > parseInt(localStorage.getItem('emailOTPExpiry')) : 'No expiry set');
    console.log('  - Firebase Ready:', typeof firebase !== 'undefined' && firebase.apps.length > 0);
    console.log('  - SendGrid Service:', !!window.sendGridOTPService);
    console.log('  - OTP Managers:', !!window.otpInputManager && !!window.otpVerificationManager);
}

// Make debug function available globally
window.debugOTPStatus = debugOTPStatus;

console.log('📱 OTP verification functions loaded');
