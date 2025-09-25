/**
 * SendGrid OTP Service
 * Handles OTP generation, verification, and email sending via SendGrid API
 */
class SendGridOTPService {
    constructor() {
        this.baseUrl = 'http://localhost:5001';
        this.otpExpiryMinutes = 10;
        this.maxAttempts = 5;
    }

    /**
     * Generate a 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Send OTP email via SendGrid
     */
    async sendEmailOTP(email, userName) {
        try {
            console.log(`📧 SendGrid OTP: Sending OTP to ${email} for ${userName}`);
            
            if (!email || !userName) {
                throw new Error('Email and user name are required');
            }

            const response = await fetch(`${this.baseUrl}/api/sendgrid-send-otp`, {
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
                console.log(`✅ SendGrid OTP generated successfully for ${email}`);
                
                // Store OTP locally as backup
                localStorage.setItem('emailOTP', result.otp);
                localStorage.setItem('emailOTPExpiry', result.expiry);
                localStorage.setItem('emailOTPEmail', email);
                
                return {
                    success: true,
                    otp: result.otp,
                    expiry: result.expiry,
                    message: result.message,
                    emailSent: result.emailSent || false
                };
            } else {
                throw new Error(result.message || 'Failed to generate OTP');
            }

        } catch (error) {
            console.error('❌ SendGrid OTP sending error:', error);
            
            // Fallback to local generation
            console.log('🔄 Generating local fallback OTP due to server error');
            const otp = this.generateOTP();
            const expiry = Date.now() + (this.otpExpiryMinutes * 60 * 1000);
            
            localStorage.setItem('emailOTP', otp);
            localStorage.setItem('emailOTPExpiry', expiry);
            localStorage.setItem('emailOTPEmail', email);
            
            return {
                success: true,
                otp: otp,
                expiry: expiry,
                message: 'OTP generated locally (server unavailable)',
                emailSent: false
            };
        }
    }

    /**
     * Verify OTP via SendGrid API
     */
    async verifyEmailOTP(email, otp) {
        try {
            console.log(`📧 SendGrid OTP: Verifying OTP for ${email}`);
            
            if (!email || !otp) {
                throw new Error('Email and OTP are required');
            }

            const response = await fetch(`${this.baseUrl}/api/sendgrid-verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp })
            });
            
            if (!response.ok) {
                throw new Error(`Server API error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ SendGrid OTP verified successfully for ${email}`);
                
                // Clear stored OTP after successful verification
                this.clearOTP();
                
                return {
                    success: true,
                    message: result.message
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'OTP verification failed'
                };
            }

        } catch (error) {
            console.error('❌ SendGrid OTP verification error:', error);
            
            // Fallback to local verification
            return this.verifyLocalOTP(email, otp);
        }
    }

    /**
     * Resend OTP via SendGrid API
     */
    async resendOTP(email, userName) {
        try {
            console.log(`📧 SendGrid OTP: Resending OTP to ${email}`);
            
            if (!email || !userName) {
                throw new Error('Email and user name are required');
            }

            const response = await fetch(`${this.baseUrl}/api/sendgrid-resend-otp`, {
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
                console.log(`✅ SendGrid OTP resent successfully for ${email}`);
                
                // Store new OTP locally
                localStorage.setItem('emailOTP', result.otp);
                localStorage.setItem('emailOTPExpiry', result.expiry);
                localStorage.setItem('emailOTPEmail', email);
                
                return {
                    success: true,
                    otp: result.otp,
                    expiry: result.expiry,
                    message: result.message,
                    emailSent: result.emailSent || false
                };
            } else {
                throw new Error(result.message || 'Failed to resend OTP');
            }

        } catch (error) {
            console.error('❌ SendGrid OTP resend error:', error);
            
            // Fallback to local generation
            console.log('🔄 Generating local fallback OTP due to server error');
            const otp = this.generateOTP();
            const expiry = Date.now() + (this.otpExpiryMinutes * 60 * 1000);
            
            localStorage.setItem('emailOTP', otp);
            localStorage.setItem('emailOTPExpiry', expiry);
            localStorage.setItem('emailOTPEmail', email);
            
            return {
                success: true,
                otp: otp,
                expiry: expiry,
                message: 'OTP generated locally (server unavailable)',
                emailSent: false
            };
        }
    }

    /**
     * Get OTP status from localStorage
     */
    getOTPStatus() {
        const storedEmail = localStorage.getItem('emailOTPEmail');
        const storedOTP = localStorage.getItem('emailOTP');
        const storedExpiry = localStorage.getItem('emailOTPExpiry');
        
        if (!storedOTP || !storedExpiry) {
            return {
                hasOTP: false,
                isExpired: false,
                email: storedEmail
            };
        }
        
        const isExpired = Date.now() > parseInt(storedExpiry);
        
        return {
            hasOTP: true,
            isExpired: isExpired,
            email: storedEmail,
            otp: storedOTP,
            expiry: storedExpiry
        };
    }

    /**
     * Verify OTP locally (fallback method)
     */
    verifyLocalOTP(email, otp) {
        const storedEmail = localStorage.getItem('emailOTPEmail');
        const storedOTP = localStorage.getItem('emailOTP');
        const storedExpiry = localStorage.getItem('emailOTPExpiry');
        
        if (!storedOTP || !storedExpiry) {
            return {
                success: false,
                message: 'No OTP found for this email'
            };
        }
        
        if (storedEmail !== email) {
            return {
                success: false,
                message: 'Email mismatch'
            };
        }
        
        if (Date.now() > parseInt(storedExpiry)) {
            this.clearOTP();
            return {
                success: false,
                message: 'OTP has expired'
            };
        }
        
        if (storedOTP === otp) {
            this.clearOTP();
            console.log(`✅ Local OTP verified successfully for ${email}`);
            return {
                success: true,
                message: 'OTP verified successfully'
            };
        } else {
            return {
                success: false,
                message: 'Invalid OTP'
            };
        }
    }

    /**
     * Clear stored OTP from localStorage
     */
    clearOTP() {
        localStorage.removeItem('emailOTP');
        localStorage.removeItem('emailOTPExpiry');
        localStorage.removeItem('emailOTPEmail');
        console.log('🧹 Local OTP data cleared');
    }

    /**
     * Cleanup expired OTPs from localStorage
     */
    cleanupExpiredOTPs() {
        const storedExpiry = localStorage.getItem('emailOTPExpiry');
        
        if (storedExpiry && Date.now() > parseInt(storedExpiry)) {
            this.clearOTP();
            console.log('🧹 Expired OTP cleaned up');
        }
    }
}

// Initialize SendGrid OTP service
window.sendGridOTPService = new SendGridOTPService();

// Cleanup expired OTPs on page load
document.addEventListener('DOMContentLoaded', function() {
    window.sendGridOTPService.cleanupExpiredOTPs();
});

console.log('📧 SendGrid OTP Service initialized');
