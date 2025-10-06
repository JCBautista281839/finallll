/**
 * SendGrid OTP Service
 * Handles OTP generation, verification, and email sending via SendGrid API
 */
class SendGridOTPService {
    constructor() {
        // Use dynamic base URL - defaults to current domain if config not available
        this.baseUrl = this.getBaseUrl();
        this.otpExpiryMinutes = 10;
        this.maxAttempts = 5;
        console.log('🔧 SendGrid OTP Service initialized with baseUrl:', this.baseUrl);
    }
    
    getBaseUrl() {
        // Check for API_CONFIG first
        if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
            console.log('✅ Using API_CONFIG.BASE_URL:', window.API_CONFIG.BASE_URL);
            return window.API_CONFIG.BASE_URL;
        }
        
        // Fallback to current origin
        const origin = window.location.origin;
        console.log('⚠️ API_CONFIG not found, using window.location.origin:', origin);
        return origin;
    }
    
    // Method to update baseUrl when config becomes available
    updateBaseUrl() {
        const newBaseUrl = this.getBaseUrl();
        if (newBaseUrl !== this.baseUrl) {
            console.log('🔄 Updating baseUrl from', this.baseUrl, 'to', newBaseUrl);
            this.baseUrl = newBaseUrl;
        } else {
            console.log('🔧 BaseUrl is already correct:', this.baseUrl);
        }
    }
    
    // Method to get current baseUrl (always fresh)
    getCurrentBaseUrl() {
        return this.getBaseUrl();
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

            // Always get fresh baseUrl to ensure we use the latest config
            const currentBaseUrl = this.getCurrentBaseUrl();
            
            // Debug: Show current configuration
            console.log('🔧 Current API_CONFIG:', window.API_CONFIG);
            console.log('🔧 Current baseUrl:', currentBaseUrl);
            console.log('🔧 Window location origin:', window.location.origin);
            
            console.log(`🌐 Making request to: ${currentBaseUrl}/api/sendgrid-send-otp`);

            const response = await fetch(`${currentBaseUrl}/api/sendgrid-send-otp`, {
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

            // Always get fresh baseUrl to ensure we use the latest config
            const currentBaseUrl = this.getCurrentBaseUrl();
            
            // Debug: Show current configuration
            console.log('🔧 Current API_CONFIG:', window.API_CONFIG);
            console.log('🔧 Current baseUrl:', currentBaseUrl);
            console.log('🔧 Window location origin:', window.location.origin);
            
            console.log(`🌐 Making request to: ${currentBaseUrl}/api/sendgrid-verify-otp`);

            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            const response = await fetch(`${currentBaseUrl}/api/sendgrid-verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
            
            // Handle timeout specifically
            if (error.name === 'AbortError') {
                console.log('⏰ SendGrid request timed out, falling back to local verification');
            }
            
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

            // Always get fresh baseUrl to ensure we use the latest config
            const currentBaseUrl = this.getCurrentBaseUrl();
            
            // Debug: Show current configuration
            console.log('🔧 Current API_CONFIG:', window.API_CONFIG);
            console.log('🔧 Current baseUrl:', currentBaseUrl);
            console.log('🔧 Window location origin:', window.location.origin);
            
            console.log(`🌐 Making request to: ${currentBaseUrl}/api/sendgrid-resend-otp`);

            const response = await fetch(`${currentBaseUrl}/api/sendgrid-resend-otp`, {
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

// Initialize SendGrid OTP service with delay to ensure config loads
function initializeSendGridOTPService() {
    if (window.sendGridOTPService) {
        return; // Already initialized
    }
    
    window.sendGridOTPService = new SendGridOTPService();
    console.log('📧 SendGrid OTP Service initialized');
    
    // Force update baseUrl after initialization
    window.sendGridOTPService.updateBaseUrl();
}

// Wait for config to be available before initializing
function waitForConfigAndInitialize() {
    if (window.API_CONFIG && window.API_CONFIG.BASE_URL) {
        console.log('✅ API_CONFIG available, initializing SendGrid OTP Service');
        initializeSendGridOTPService();
    } else {
        console.log('⏳ Waiting for API_CONFIG to be available...');
        setTimeout(waitForConfigAndInitialize, 50);
    }
}

// Try to initialize immediately
initializeSendGridOTPService();

// Also try after DOM is loaded (in case config loads later)
document.addEventListener('DOMContentLoaded', function() {
    if (window.sendGridOTPService) {
        window.sendGridOTPService.cleanupExpiredOTPs();
        // Update baseUrl in case config loaded after initial initialization
        window.sendGridOTPService.updateBaseUrl();
    } else {
        waitForConfigAndInitialize();
    }
});

// Also try after a short delay to ensure all scripts are loaded
setTimeout(function() {
    if (window.sendGridOTPService) {
        window.sendGridOTPService.updateBaseUrl();
    } else {
        waitForConfigAndInitialize();
    }
}, 100);

// Also try after a longer delay to ensure config is definitely loaded
setTimeout(function() {
    if (window.sendGridOTPService) {
        window.sendGridOTPService.updateBaseUrl();
        console.log('🔧 Final baseUrl check:', window.sendGridOTPService.baseUrl);
    }
}, 500);
