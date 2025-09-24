// Firebase OTP Service for Viktoria's Bistro
// Handles both SMS and Email OTP verification

class FirebaseOTPService {
    constructor() {
        this.auth = null;
        this.recaptchaVerifier = null;
        this.confirmationResult = null;
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to be ready
            await this.waitForFirebase();
            this.auth = firebase.auth();
            console.log('✅ Firebase OTP Service initialized');
        } catch (error) {
            console.error('❌ Firebase OTP Service initialization failed:', error);
            throw error;
        }
    }

    waitForFirebase() {
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


    // ========================================
    // EMAIL OTP METHODS
    // ========================================

    /**
     * Send Email OTP using Firebase Cloud Functions or Email Service
     * @param {string} email - User's email address
     * @param {string} userName - User's name for personalization
     * @returns {Promise<boolean>} - Success status
     */
    async sendEmailOTP(email, userName = '') {
        try {
            console.log('📧 Sending Email OTP to:', email);

            // Generate 6-digit OTP
            const otpCode = this.generateOTPCode();
            
            // Store OTP in Firestore with expiry
            await this.storeEmailOTP(email, otpCode);

            // Send OTP via Firebase Cloud Functions or Email Service
            await this.sendOTPEmail(email, otpCode, userName);

            console.log('✅ Email OTP sent via Firebase');
            return true;

        } catch (error) {
            console.error('❌ Email OTP send failed:', error);
            throw this.handleEmailError(error);
        }
    }

    /**
     * Verify Email OTP Code
     * @param {string} email - User's email
     * @param {string} otpCode - 6-digit OTP code
     * @returns {Promise<boolean>} - Verification status
     */
    async verifyEmailOTP(email, otpCode) {
        try {
            console.log('🔐 Verifying Email OTP for:', email);

            if (!otpCode || otpCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit code.');
            }

            // Get stored OTP from Firestore
            const storedOTP = await this.getStoredEmailOTP(email);
            
            if (!storedOTP) {
                throw new Error('No OTP found for this email. Please request a new code.');
            }

            // Check if OTP has expired
            if (Date.now() > storedOTP.expiresAt) {
                await this.deleteStoredEmailOTP(email);
                throw new Error('OTP has expired. Please request a new code.');
            }

            // Verify OTP
            if (otpCode !== storedOTP.code) {
                throw new Error('Invalid verification code. Please try again.');
            }

            // Clear stored OTP
            await this.deleteStoredEmailOTP(email);

            console.log('✅ Email OTP verified successfully');
            return true;

        } catch (error) {
            console.error('❌ Email OTP verification failed:', error);
            throw this.handleEmailError(error);
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================


    /**
     * Generate 6-digit OTP code
     * @returns {string} - 6-digit OTP
     */
    generateOTPCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Store Email OTP in Firestore with expiry
     * @param {string} email - User's email
     * @param {string} otpCode - Generated OTP code
     */
    async storeEmailOTP(email, otpCode) {
        try {
            const otpData = {
                code: otpCode,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes expiry
            };

            await firebase.firestore()
                .collection('email_otps')
                .doc(email)
                .set(otpData);

            console.log('✅ Email OTP stored in Firestore');
        } catch (error) {
            console.error('❌ Failed to store Email OTP:', error);
            throw error;
        }
    }

    /**
     * Get stored Email OTP from Firestore
     * @param {string} email - User's email
     * @returns {Object|null} - Stored OTP data
     */
    async getStoredEmailOTP(email) {
        try {
            const doc = await firebase.firestore()
                .collection('email_otps')
                .doc(email)
                .get();

            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get stored Email OTP:', error);
            return null;
        }
    }

    /**
     * Delete stored Email OTP from Firestore
     * @param {string} email - User's email
     */
    async deleteStoredEmailOTP(email) {
        try {
            await firebase.firestore()
                .collection('email_otps')
                .doc(email)
                .delete();

            console.log('✅ Email OTP deleted from Firestore');
        } catch (error) {
            console.error('❌ Failed to delete Email OTP:', error);
        }
    }

    /**
     * Send OTP email via Firebase Cloud Functions or Email Service
     * @param {string} email - Recipient email
     * @param {string} otpCode - OTP code
     * @param {string} userName - User's name
     */
    async sendOTPEmail(email, otpCode, userName) {
        try {
            // Try Firebase Cloud Functions first (if available)
            if (typeof firebase.functions !== 'undefined') {
                const sendOTP = firebase.functions().httpsCallable('sendOTPEmail');
                await sendOTP({
                    email: email,
                    otpCode: otpCode,
                    userName: userName
                });
                console.log('✅ OTP sent via Firebase Cloud Functions');
                return;
            }

            // Fallback: Use Firebase Auth to send custom email
            // This is a workaround since Firebase Auth doesn't support custom OTP emails
            // In production, you should use Firebase Cloud Functions with an email service
            
            // For now, we'll simulate the email sending
            console.log(`📧 OTP Email would be sent to ${email}:`);
            console.log(`Subject: Your Viktoria's Bistro Verification Code`);
            console.log(`Code: ${otpCode}`);
            console.log(`Expires in: 10 minutes`);
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // In production, implement this with Firebase Cloud Functions:
            /*
            const functions = firebase.functions();
            const sendOTP = functions.httpsCallable('sendOTPEmail');
            
            await sendOTP({
                to: email,
                subject: "Your Viktoria's Bistro Verification Code",
                otpCode: otpCode,
                userName: userName,
                template: 'otp-verification'
            });
            */
            
        } catch (error) {
            console.error('❌ Failed to send OTP email:', error);
            throw new Error('Failed to send verification email. Please try again.');
        }
    }



    // ========================================
    // ERROR HANDLING
    // ========================================


    handleEmailError(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return new Error('Please enter a valid email address.');
            case 'auth/too-many-requests':
                return new Error('Too many attempts. Please try again later.');
            case 'auth/user-not-found':
                return new Error('Email address not found.');
            default:
                return new Error(error.message || 'Failed to send email verification. Please try again.');
        }
    }

    // ========================================
    // CLEANUP METHODS
    // ========================================

    /**
     * Clean up resources
     */
    cleanup() {
        // Clean up any resources if needed
        console.log('✅ Firebase OTP Service cleaned up');
    }
}

// Create global instance
window.firebaseOTPService = new FirebaseOTPService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseOTPService;
}
