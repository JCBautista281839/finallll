// SendGrid OTP Service for Viktoria's Bistro
// Handles email OTP generation and verification using SendGrid

class SendGridOTPService {
    constructor() {
        this.baseURL = window.location.origin; // Use current domain
        this.isConfigured = false;
        this.otpStorage = new Map(); // In-memory storage for development
        
        console.log('📬 SendGrid OTP Service initialized');
        this.checkConfiguration();
    }

    // Check if SendGrid is properly configured
    async checkConfiguration() {
        try {
            const response = await fetch(`${this.baseURL}/api/otp/status`);
            if (response.ok) {
                const data = await response.json();
                this.isConfigured = data.configured;
                console.log('📬 SendGrid configuration status:', this.isConfigured ? '✅ Configured' : '⚠️ Not configured');
            }
        } catch (error) {
            console.log('📬 SendGrid status check failed:', error.message);
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

    // Send OTP via SendGrid API
    async sendEmailOTP(email, userName) {
        try {
            console.log('📬 Sending OTP via SendGrid to:', email);
            
            // Generate OTP
            const otp = this.generateOTP();
            
            // Store OTP locally for verification
            this.storeOTP(email, otp);
            
            // Try to send via SendGrid API
            const response = await fetch(`${this.baseURL}/api/otp/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    userName: userName,
                    otp: otp
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ SendGrid OTP sent successfully');
                return { success: true, message: 'OTP sent successfully' };
            } else {
                const error = await response.json();
                console.log('⚠️ SendGrid API failed:', error.message);
                
                // Fallback: return OTP for development
                return {
                    success: false,
                    otp: otp,
                    expiry: Date.now() + (10 * 60 * 1000),
                    message: 'SendGrid not configured - using fallback'
                };
            }
        } catch (error) {
            console.error('📬 SendGrid OTP send error:', error);
            
            // Fallback: generate and return OTP
            const otp = this.generateOTP();
            this.storeOTP(email, otp);
            
            return {
                success: false,
                otp: otp,
                expiry: Date.now() + (10 * 60 * 1000),
                message: 'SendGrid service unavailable - using fallback'
            };
        }
    }

    // Verify OTP via API
    async verifyOTP(email, otp) {
        try {
            console.log('📬 Verifying OTP via SendGrid for:', email);
            
            const response = await fetch(`${this.baseURL}/api/otp/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    otp: otp
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ SendGrid OTP verified successfully');
                return { success: true, message: 'OTP verified successfully' };
            } else {
                const error = await response.json();
                console.log('⚠️ SendGrid verification failed:', error.message);
                
                // Fallback to local verification
                return this.verifyOTPLocal(email, otp);
            }
        } catch (error) {
            console.error('📬 SendGrid OTP verification error:', error);
            
            // Fallback to local verification
            return this.verifyOTPLocal(email, otp);
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

    // Resend OTP
    async resendOTP(email, userName) {
        try {
            console.log('📬 Resending OTP via SendGrid to:', email);
            
            // Generate new OTP
            const otp = this.generateOTP();
            
            // Store new OTP
            this.storeOTP(email, otp);
            
            // Try to send via SendGrid API
            const response = await fetch(`${this.baseURL}/api/otp/resend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    userName: userName,
                    otp: otp
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ SendGrid OTP resent successfully');
                return { success: true, message: 'OTP resent successfully' };
            } else {
                const error = await response.json();
                console.log('⚠️ SendGrid resend failed:', error.message);
                
                // Fallback: return OTP for development
                return {
                    success: false,
                    otp: otp,
                    expiry: Date.now() + (10 * 60 * 1000),
                    message: 'SendGrid not configured - using fallback'
                };
            }
        } catch (error) {
            console.error('📬 SendGrid OTP resend error:', error);
            
            // Fallback: generate and return OTP
            const otp = this.generateOTP();
            this.storeOTP(email, otp);
            
            return {
                success: false,
                otp: otp,
                expiry: Date.now() + (10 * 60 * 1000),
                message: 'SendGrid service unavailable - using fallback'
            };
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

// Initialize SendGrid OTP Service
window.sendGridOTPService = new SendGridOTPService();

console.log('📬 SendGrid OTP Service loaded and ready');
