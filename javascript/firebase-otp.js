// Firebase OTP Service for Viktoria's Bistro
// Handles OTP generation and storage using Firebase Firestore

class FirebaseOTPService {
    constructor() {
        this.otpCollection = 'otp_codes';
        this.maxAttempts = 5;
        this.otpExpiryMinutes = 10;
        
        console.log('🔥 Firebase OTP Service initialized');
    }

    // Generate a 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Store OTP in Firebase Firestore
    async storeOTP(email, otp, userName) {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            const expiryTime = Date.now() + (this.otpExpiryMinutes * 60 * 1000);
            
            const otpData = {
                otp: otp,
                email: email,
                userName: userName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiryTime: expiryTime,
                attempts: 0,
                verified: false,
                type: 'email_verification'
            };

            // Store in Firestore
            await db.collection(this.otpCollection).doc(email).set(otpData);
            
            console.log(`🔥 Firebase OTP stored for ${email}, expires at ${new Date(expiryTime).toLocaleString()}`);
            return otpData;

        } catch (error) {
            console.error('❌ Firebase OTP storage error:', error);
            throw error;
        }
    }

    // Get OTP from Firebase
    async getOTP(email) {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            const doc = await db.collection(this.otpCollection).doc(email).get();
            
            if (!doc.exists) {
                return null;
            }

            return doc.data();

        } catch (error) {
            console.error('❌ Firebase OTP retrieval error:', error);
            throw error;
        }
    }

    // Update OTP in Firebase
    async updateOTP(email, updateData) {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            await db.collection(this.otpCollection).doc(email).update({
                ...updateData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            console.error('❌ Firebase OTP update error:', error);
            throw error;
        }
    }

    // Delete OTP from Firebase
    async deleteOTP(email) {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            await db.collection(this.otpCollection).doc(email).delete();
            console.log(`🗑️ Firebase OTP deleted for ${email}`);

        } catch (error) {
            console.error('❌ Firebase OTP deletion error:', error);
            throw error;
        }
    }

    // Send email OTP (Firebase fallback method)
    async sendEmailOTP(email, userName) {
        try {
            console.log(`🔥 Firebase OTP: Sending OTP to ${email} for ${userName}`);
            
            // Validate inputs
            if (!email || !userName) {
                throw new Error('Email and user name are required');
            }

            // Check if there's already a valid OTP
            const existingOTP = await this.getOTP(email);
            if (existingOTP && existingOTP.expiryTime > Date.now() && !existingOTP.verified) {
                console.log(`⚠️ Valid OTP already exists for ${email}, not sending new one`);
                return { success: true, message: 'OTP already sent' };
            }

            // Generate new OTP
            const otp = this.generateOTP();
            
            // Store OTP in Firebase
            await this.storeOTP(email, otp, userName);

            // For Firebase fallback, we'll just return the OTP for local display
            // In a real implementation, you might integrate with Firebase Cloud Functions
            // to send emails via SendGrid or another service
            
            console.log(`✅ Firebase OTP generated and stored for ${email}`);
            
            // Return OTP for local display (fallback behavior)
            return {
                success: true,
                otp: otp,
                expiry: Date.now() + (this.otpExpiryMinutes * 60 * 1000),
                message: 'OTP generated via Firebase (fallback mode)'
            };

        } catch (error) {
            console.error('❌ Firebase OTP sending error:', error);
            throw error;
        }
    }

    // Verify email OTP
    async verifyEmailOTP(email, inputOTP) {
        try {
            console.log(`🔍 Firebase OTP: Verifying OTP for ${email}`);
            
            const otpData = await this.getOTP(email);
            
            if (!otpData) {
                throw new Error('No OTP found for this email. Please request a new one.');
            }

            // Check if OTP is expired
            if (otpData.expiryTime < Date.now()) {
                await this.deleteOTP(email);
                throw new Error('OTP has expired. Please request a new one.');
            }

            // Check if already verified
            if (otpData.verified) {
                throw new Error('This OTP has already been used.');
            }

            // Check attempt limit
            if (otpData.attempts >= this.maxAttempts) {
                await this.deleteOTP(email);
                throw new Error('Too many failed attempts. Please request a new OTP.');
            }

            // Verify OTP
            if (otpData.otp === inputOTP) {
                await this.updateOTP(email, {
                    verified: true,
                    verifiedAt: Date.now()
                });
                
                console.log(`✅ Firebase OTP verified successfully for ${email}`);
                return { success: true, message: 'OTP verified successfully' };
            } else {
                await this.updateOTP(email, {
                    attempts: otpData.attempts + 1
                });
                
                console.log(`❌ Firebase OTP verification failed for ${email} (attempt ${otpData.attempts + 1}/${this.maxAttempts})`);
                throw new Error(`Invalid OTP. ${this.maxAttempts - (otpData.attempts + 1)} attempts remaining.`);
            }

        } catch (error) {
            console.error('❌ Firebase OTP verification error:', error);
            throw error;
        }
    }

    // Resend OTP
    async resendOTP(email, userName) {
        try {
            console.log(`🔄 Firebase OTP: Resending OTP to ${email}`);
            
            // Delete existing OTP
            await this.deleteOTP(email);
            
            // Send new OTP
            return await this.sendEmailOTP(email, userName);
            
        } catch (error) {
            console.error('❌ Firebase OTP resend error:', error);
            throw error;
        }
    }

    // Get OTP status
    async getOTPStatus(email) {
        try {
            const otpData = await this.getOTP(email);
            
            if (!otpData) {
                return { exists: false };
            }

            return {
                exists: true,
                verified: otpData.verified,
                expired: otpData.expiryTime < Date.now(),
                attempts: otpData.attempts,
                remainingAttempts: this.maxAttempts - otpData.attempts,
                expiresAt: new Date(otpData.expiryTime).toLocaleString()
            };

        } catch (error) {
            console.error('❌ Firebase OTP status error:', error);
            throw error;
        }
    }

    // Clean up expired OTPs
    async cleanupExpiredOTPs() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase not initialized');
            }

            const db = firebase.firestore();
            const now = Date.now();
            
            const expiredOTPs = await db.collection(this.otpCollection)
                .where('expiryTime', '<', now)
                .get();

            const batch = db.batch();
            expiredOTPs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            
            if (expiredOTPs.size > 0) {
                console.log(`🗑️ Cleaned up ${expiredOTPs.size} expired Firebase OTPs`);
            }

        } catch (error) {
            console.error('❌ Firebase OTP cleanup error:', error);
        }
    }

    // Clear OTP
    async clearOTP(email) {
        await this.deleteOTP(email);
    }
}

// Initialize Firebase OTP Service
window.firebaseOTPService = new FirebaseOTPService();

console.log('🔥 Firebase OTP Service initialized');
