// Firebase OTP Service for Viktoria's Bistro
// Handles email OTP generation and verification using Firebase

class FirebaseOTPService {
    constructor() {
        this.isConfigured = false;
        this.otpStorage = new Map(); // In-memory storage for development
        
        console.log('🔥 Firebase OTP Service initialized');
        this.checkConfiguration();
    }

    // Check if Firebase is properly configured
    async checkConfiguration() {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                this.isConfigured = true;
                console.log('🔥 Firebase configuration status: ✅ Configured');
            } else {
                this.isConfigured = false;
                console.log('🔥 Firebase configuration status: ⚠️ Not configured');
            }
        } catch (error) {
            console.log('🔥 Firebase status check failed:', error.message);
            this.isConfigured = false;
        }
    }

    // Generate a 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Store OTP with expiry (10 minutes)
    storeOTP(email, otp) {
        const expiry = Date.now() + (10 * 60 * 1000); // 10 minutes
        this.otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            maxAttempts: 5
        });
        
        // Clean up expired OTPs
        setTimeout(() => {
            this.otpStorage.delete(email);
        }, 10 * 60 * 1000);
    }

    // Verify OTP
    verifyOTP(email, inputOTP) {
        const stored = this.otpStorage.get(email);
        if (!stored) {
            return { success: false, message: 'OTP not found or expired' };
        }

        if (Date.now() > stored.expiry) {
            this.otpStorage.delete(email);
            return { success: false, message: 'OTP has expired' };
        }

        if (stored.attempts >= stored.maxAttempts) {
            this.otpStorage.delete(email);
            return { success: false, message: 'Too many failed attempts' };
        }

        if (stored.otp === inputOTP) {
            this.otpStorage.delete(email);
            return { success: true, message: 'OTP verified successfully' };
        } else {
            stored.attempts++;
            return { success: false, message: 'Invalid OTP' };
        }
    }

    // Send OTP via Firebase (simulated email sending)
    async sendEmailOTP(email, userName) {
        try {
            console.log('🔥 Sending OTP via Firebase to:', email);
            
            // Generate OTP
            const otp = this.generateOTP();
            
            // Store OTP locally for verification
            this.storeOTP(email, otp);
            
            // Simulate email sending (in real implementation, you'd use Firebase Functions)
            console.log('🔥 Simulating email send via Firebase...');
            
            // Store OTP in Firebase Firestore for verification
            if (this.isConfigured && typeof firebase !== 'undefined') {
                try {
                    await firebase.firestore().collection('otp_codes').doc(email).set({
                        otp: otp,
                        email: email,
                        userName: userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + (10 * 60 * 1000))),
                        attempts: 0,
                        maxAttempts: 5,
                        verified: false
                    });
                    
                    console.log('✅ OTP stored in Firebase Firestore');
                } catch (firestoreError) {
                    console.log('⚠️ Firebase Firestore storage failed:', firestoreError.message);
                }
            }
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('✅ Firebase OTP generated and stored');
            return { success: true, message: 'OTP generated successfully' };
            
        } catch (error) {
            console.error('🔥 Firebase OTP send error:', error);
            throw new Error('Failed to send OTP via Firebase');
        }
    }

    // Verify OTP via Firebase
    async verifyEmailOTP(email, otp) {
        try {
            console.log('🔥 Verifying OTP via Firebase for:', email);
            
            // First check local storage
            const localResult = this.verifyOTPLocal(email, otp);
            if (localResult.success) {
                console.log('✅ Firebase OTP verified locally');
                return { success: true, message: 'OTP verified successfully' };
            }
            
            // If Firebase is configured, check Firestore
            if (this.isConfigured && typeof firebase !== 'undefined') {
                try {
                    const otpDoc = await firebase.firestore().collection('otp_codes').doc(email).get();
                    
                    if (otpDoc.exists) {
                        const otpData = otpDoc.data();
                        
                        // Check if OTP is expired
                        if (otpData.expiresAt.toDate() < new Date()) {
                            await firebase.firestore().collection('otp_codes').doc(email).delete();
                            throw new Error('OTP has expired');
                        }
                        
                        // Check attempts
                        if (otpData.attempts >= otpData.maxAttempts) {
                            await firebase.firestore().collection('otp_codes').doc(email).delete();
                            throw new Error('Too many failed attempts');
                        }
                        
                        // Verify OTP
                        if (otpData.otp === otp) {
                            // Mark as verified and delete
                            await firebase.firestore().collection('otp_codes').doc(email).update({
                                verified: true,
                                verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            
                            // Delete after successful verification
                            setTimeout(() => {
                                firebase.firestore().collection('otp_codes').doc(email).delete();
                            }, 5000);
                            
                            console.log('✅ Firebase OTP verified in Firestore');
                            return { success: true, message: 'OTP verified successfully' };
                        } else {
                            // Increment attempts
                            await firebase.firestore().collection('otp_codes').doc(email).update({
                                attempts: firebase.firestore.FieldValue.increment(1)
                            });
                            
                            throw new Error('Invalid OTP');
                        }
                    } else {
                        throw new Error('OTP not found');
                    }
                } catch (firestoreError) {
                    console.log('⚠️ Firebase Firestore verification failed:', firestoreError.message);
                    throw firestoreError;
                }
            }
            
            // Fallback to local verification
            return localResult;
            
        } catch (error) {
            console.error('🔥 Firebase OTP verification error:', error);
            throw error;
        }
    }

    // Local OTP verification (non-recursive)
    verifyOTPLocal(email, inputOTP) {
        const stored = this.otpStorage.get(email);
        if (!stored) {
            return { success: false, message: 'OTP not found or expired' };
        }

        if (Date.now() > stored.expiry) {
            this.otpStorage.delete(email);
            return { success: false, message: 'OTP has expired' };
        }

        if (stored.attempts >= stored.maxAttempts) {
            this.otpStorage.delete(email);
            return { success: false, message: 'Too many failed attempts' };
        }

        if (stored.otp === inputOTP) {
            this.otpStorage.delete(email);
            return { success: true, message: 'OTP verified successfully' };
        } else {
            stored.attempts++;
            return { success: false, message: 'Invalid OTP' };
        }
    }

    // Resend OTP via Firebase
    async resendOTP(email, userName) {
        try {
            console.log('🔥 Resending OTP via Firebase to:', email);
            
            // Generate new OTP
            const otp = this.generateOTP();
            
            // Store new OTP locally
            this.storeOTP(email, otp);
            
            // Store in Firebase Firestore
            if (this.isConfigured && typeof firebase !== 'undefined') {
                try {
                    await firebase.firestore().collection('otp_codes').doc(email).set({
                        otp: otp,
                        email: email,
                        userName: userName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + (10 * 60 * 1000))),
                        attempts: 0,
                        maxAttempts: 5,
                        verified: false
                    });
                    
                    console.log('✅ New OTP stored in Firebase Firestore');
                } catch (firestoreError) {
                    console.log('⚠️ Firebase Firestore storage failed:', firestoreError.message);
                }
            }
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('✅ Firebase OTP resent successfully');
            return { success: true, message: 'OTP resent successfully' };
            
        } catch (error) {
            console.error('🔥 Firebase OTP resend error:', error);
            throw new Error('Failed to resend OTP via Firebase');
        }
    }

    // Get OTP status
    async getOTPStatus(email) {
        const stored = this.otpStorage.get(email);
        if (!stored) {
            return { exists: false };
        }

        return {
            exists: true,
            expiry: stored.expiry,
            attempts: stored.attempts,
            maxAttempts: stored.maxAttempts,
            timeRemaining: Math.max(0, stored.expiry - Date.now())
        };
    }
}

// Initialize Firebase OTP Service
window.firebaseOTPService = new FirebaseOTPService();

console.log('🔥 Firebase OTP Service loaded and ready');
