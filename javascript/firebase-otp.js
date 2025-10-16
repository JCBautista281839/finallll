// Firebase OTP Service for Viktoria's Bistro
// Handles OTP generation and storage using Firebase Firestore

class FirebaseOTPService {
    constructor() {
        this.otpCollection = 'otp_codes';
        this.maxAttempts = 5;
        this.otpExpiryMinutes = 3;
        
        // Use dynamic base URL - defaults to current domain if config not available
        this.baseUrl = (window.API_CONFIG && window.API_CONFIG.BASE_URL) || window.location.origin;
        
        console.log('🔥 Firebase OTP Service initialized');
    }

    // Generate a 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Store OTP via server API (no direct Firestore calls)
    async storeOTP(email, otp, userName) {
        try {
            console.log(`🔥 Storing OTP via server API for ${email}`);
            
            // Store OTP via server API instead of direct Firestore
            const response = await fetch(`${this.baseUrl}/api/firebase-send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, userName, otp })
            });
            
            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ OTP stored successfully for ${email}`);
                return {
                    otp: result.otp,
                    email: email,
                    userName: userName,
                    expiryTime: result.expiry,
                    attempts: 0,
                    verified: false,
                    type: 'email_verification'
                };
            } else {
                throw new Error(result.message || 'Failed to store OTP');
            }

        } catch (error) {
            console.error('❌ OTP storage error:', error);
            throw error;
        }
    }

    // Get OTP via server API (no direct Firestore calls)
    async getOTP(email) {
        try {
            console.log(`🔥 Getting OTP via server API for ${email}`);
            
            // Get OTP via server API instead of direct Firestore
            const response = await fetch(`${this.baseUrl}/api/firebase-verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp: 'STATUS_CHECK' })
            });
            
            if (!response.ok) {
                return null; // No OTP found
            }
            
            const result = await response.json();
            
            if (result.success) {
                return {
                    otp: result.otp,
                    email: email,
                    expiryTime: result.expiry,
                    attempts: 0,
                    verified: false
                };
            } else {
                return null; // No OTP found
            }

        } catch (error) {
            console.error('❌ OTP retrieval error:', error);
            return null; // Return null instead of throwing error
        }
    }

    // Update OTP via server API (no direct Firestore calls)
    async updateOTP(email, updateData) {
        try {
            console.log(`🔥 Updating OTP via server API for ${email}`);
            
            // For now, we'll skip server-side updates and rely on local storage
            // The server handles OTP updates internally
            console.log(`✅ OTP update handled by server for ${email}`);

        } catch (error) {
            console.error('❌ OTP update error:', error);
            // Don't throw error, just log it
        }
    }

    // Delete OTP via server API (no direct Firestore calls)
    async deleteOTP(email) {
        try {
            console.log(`🗑️ Deleting OTP via server API for ${email}`);
            
            // For now, we'll skip server-side deletion and rely on local storage
            // The server handles OTP cleanup internally
            console.log(`✅ OTP deletion handled by server for ${email}`);

        } catch (error) {
            console.error('❌ OTP deletion error:', error);
            // Don't throw error, just log it
        }
    }

    // Send email OTP (Server API method - no direct Firebase calls)
    async sendEmailOTP(email, userName) {
        try {
            console.log(`🔥 Firebase OTP: Sending OTP to ${email} for ${userName}`);
            
            // Validate inputs
            if (!email || !userName) {
                throw new Error('Email and user name are required');
            }

            // Use server API to generate and store OTP
            const response = await fetch(`${this.baseUrl}/api/firebase-send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, userName })
            });
            
            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.otp) {
                console.log(`✅ Firebase OTP generated successfully for ${email}`);
                
                // Store OTP in localStorage as backup
                localStorage.setItem('emailOTP', result.otp);
                localStorage.setItem('emailOTPExpiry', result.expiry);
                
                return {
                    success: true,
                    otp: result.otp,
                    expiry: result.expiry,
                    message: 'Firebase OTP generated successfully'
                };
            } else {
                throw new Error(result.message || 'Failed to generate OTP');
            }

        } catch (error) {
            console.error('❌ Firebase OTP sending error:', error);
            
            // Fallback to local generation if server fails
            console.log('🔄 Generating local fallback OTP due to server error');
            const otp = this.generateOTP();
            const expiry = Date.now() + (this.otpExpiryMinutes * 60 * 1000);
            
            // Store in localStorage
            localStorage.setItem('emailOTP', otp);
            localStorage.setItem('emailOTPExpiry', expiry);
            
            return {
                success: true,
                otp: otp,
                expiry: expiry,
                message: 'OTP generated locally (server unavailable)'
            };
        }
    }

    // Verify email OTP (Server API method - no direct Firebase calls)
    async verifyEmailOTP(email, inputOTP) {
        try {
            console.log(`🔍 Firebase OTP: Verifying OTP for ${email}`);
            
            // Use server API to verify OTP
            const response = await fetch(`${this.baseUrl}/api/firebase-verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp: inputOTP })
            });
            
            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Firebase OTP verified successfully for ${email}`);
                
                // Clear localStorage on successful verification
                localStorage.removeItem('emailOTP');
                localStorage.removeItem('emailOTPExpiry');
                
                return { success: true, message: 'Firebase OTP verified successfully' };
            } else {
                console.log(`❌ Firebase OTP verification failed for ${email}: ${result.message}`);
                throw new Error(result.message || 'OTP verification failed');
            }

        } catch (error) {
            console.error('❌ Firebase OTP verification error:', error);
            
            // Fallback to localStorage verification if server fails
            console.log('🔄 Falling back to localStorage verification');
            const storedOTP = localStorage.getItem('emailOTP');
            const storedExpiry = localStorage.getItem('emailOTPExpiry');
            
            if (!storedOTP) {
                throw new Error('No OTP found for this email. Please request a new one.');
            }
            
            if (Date.now() > parseInt(storedExpiry)) {
                localStorage.removeItem('emailOTP');
                localStorage.removeItem('emailOTPExpiry');
                throw new Error('OTP has expired. Please request a new one.');
            }
            
            if (storedOTP === inputOTP) {
                localStorage.removeItem('emailOTP');
                localStorage.removeItem('emailOTPExpiry');
                console.log(`✅ Local OTP verified successfully for ${email}`);
                return { success: true, message: 'OTP verified successfully (local verification)' };
            } else {
                throw new Error('Invalid OTP code. Please check and try again.');
            }
        }
    }

    // Resend OTP (Server API method - no direct Firebase calls)
    async resendOTP(email, userName) {
        try {
            console.log(`🔄 Firebase OTP: Resending OTP to ${email}`);
            
            // Use server API to resend OTP
            const response = await fetch(`${this.baseUrl}/api/firebase-resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, userName })
            });
            
            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.otp) {
                console.log(`✅ Firebase OTP resent successfully for ${email}`);
                
                // Store OTP in localStorage as backup
                localStorage.setItem('emailOTP', result.otp);
                localStorage.setItem('emailOTPExpiry', result.expiry);
                
                return {
                    success: true,
                    otp: result.otp,
                    expiry: result.expiry,
                    message: 'Firebase OTP resent successfully'
                };
            } else {
                throw new Error(result.message || 'Failed to resend OTP');
            }

        } catch (error) {
            console.error('❌ Firebase OTP resend error:', error);
            
            // Fallback to local generation if server fails
            console.log('🔄 Generating local fallback OTP due to server error');
            const otp = this.generateOTP();
            const expiry = Date.now() + (this.otpExpiryMinutes * 60 * 1000);
            
            // Store in localStorage
            localStorage.setItem('emailOTP', otp);
            localStorage.setItem('emailOTPExpiry', expiry);
            
            return {
                success: true,
                otp: otp,
                expiry: expiry,
                message: 'OTP generated locally (server unavailable)'
            };
        }
    }

    // Get OTP status (Server API method - no direct Firebase calls)
    async getOTPStatus(email) {
        try {
            console.log(`🔍 Getting OTP status for ${email}`);
            
            // Check localStorage first (fastest)
            const storedOTP = localStorage.getItem('emailOTP');
            const storedExpiry = localStorage.getItem('emailOTPExpiry');
            
            if (storedOTP) {
                const isExpired = Date.now() > parseInt(storedExpiry);
                return {
                    exists: true,
                    verified: false, // Local OTPs can't track verification status
                    expired: isExpired,
                    attempts: 0, // Local OTPs don't track attempts
                    remainingAttempts: 'unlimited',
                    expiresAt: new Date(parseInt(storedExpiry)).toLocaleString(),
                    source: 'local'
                };
            }
            
            // If no local OTP, return not found
            return { 
                exists: false, 
                source: 'none',
                message: 'No OTP found for this email'
            };

        } catch (error) {
            console.error('❌ OTP status error:', error);
            return { 
                exists: false, 
                source: 'error',
                message: 'Error checking OTP status'
            };
        }
    }

    // Clean up expired OTPs (localStorage only)
    async cleanupExpiredOTPs() {
        try {
            console.log('🗑️ Cleaning up expired local OTPs');
            
            const storedExpiry = localStorage.getItem('emailOTPExpiry');
            if (storedExpiry && Date.now() > parseInt(storedExpiry)) {
                localStorage.removeItem('emailOTP');
                localStorage.removeItem('emailOTPExpiry');
                console.log('✅ Expired local OTP cleaned up');
            }

        } catch (error) {
            console.error('❌ Local OTP cleanup error:', error);
        }
    }

    // Clear OTP (localStorage only)
    async clearOTP(email) {
        try {
            console.log(`🗑️ Clearing local OTP for ${email}`);
            localStorage.removeItem('emailOTP');
            localStorage.removeItem('emailOTPExpiry');
            console.log('✅ Local OTP cleared');
        } catch (error) {
            console.error('❌ Error clearing local OTP:', error);
        }
    }
}

// Initialize Firebase OTP Service
window.firebaseOTPService = new FirebaseOTPService();

console.log('🔥 Firebase OTP Service initialized');
