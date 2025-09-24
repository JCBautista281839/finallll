// SendGrid OTP Service for Frontend
class SendGridOTPService {
    constructor() {
        // Use the correct server port (5001) instead of the frontend port
        this.baseURL = 'http://localhost:5001';
        this.apiEndpoints = {
            sendOTP: '/api/send-otp',
            verifyOTP: '/api/verify-otp',
            resendOTP: '/api/resend-otp'
        };
    }

    // Send OTP via SendGrid
    async sendEmailOTP(email, userName) {
        try {
            console.log('📧 [SendGrid] Sending OTP to:', email);
            
            const response = await fetch(`${this.baseURL}${this.apiEndpoints.sendOTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    userName: userName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Check if SendGrid is not configured but OTP was generated
                if (data.error === 'SendGrid not configured' && data.otp) {
                    console.log('⚠️ [SendGrid] Not configured - OTP generated for display:', data.otp);
                    return {
                        success: false,
                        message: 'SendGrid not configured - OTP generated for display',
                        otp: data.otp,
                        email: data.email,
                        expiry: data.expiry
                    };
                }
                throw new Error(data.error || 'Failed to send OTP');
            }

            console.log('✅ [SendGrid] OTP sent successfully:', data);
            return {
                success: true,
                message: data.message,
                email: data.email,
                expiry: data.expiry
            };

        } catch (error) {
            console.error('❌ [SendGrid] Error sending OTP:', error);
            throw new Error(`Failed to send verification email: ${error.message}`);
        }
    }

    // Verify OTP
    async verifyOTP(email, otp) {
        try {
            console.log('🔐 [SendGrid] Verifying OTP for:', email);
            
            const response = await fetch(`${this.baseURL}${this.apiEndpoints.verifyOTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    otp: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to verify OTP');
            }

            console.log('✅ [SendGrid] OTP verified successfully:', data);
            return {
                success: true,
                message: data.message,
                email: data.email,
                userName: data.userName
            };

        } catch (error) {
            console.error('❌ [SendGrid] Error verifying OTP:', error);
            throw new Error(`OTP verification failed: ${error.message}`);
        }
    }

    // Resend OTP
    async resendOTP(email, userName) {
        try {
            console.log('🔄 [SendGrid] Resending OTP to:', email);
            
            const response = await fetch(`${this.baseURL}${this.apiEndpoints.resendOTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    userName: userName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP');
            }

            console.log('✅ [SendGrid] OTP resent successfully:', data);
            return {
                success: true,
                message: data.message,
                email: data.email,
                expiry: data.expiry
            };

        } catch (error) {
            console.error('❌ [SendGrid] Error resending OTP:', error);
            throw new Error(`Failed to resend verification email: ${error.message}`);
        }
    }

    // Check if SendGrid service is available
    async checkServiceStatus() {
        try {
            const response = await fetch(`${this.baseURL}/api/test`);
            return response.ok;
        } catch (error) {
            console.error('❌ [SendGrid] Service check failed:', error);
            return false;
        }
    }
}

// Create global instance
window.sendGridOTPService = new SendGridOTPService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SendGridOTPService;
}
