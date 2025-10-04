/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// API Base URL Configuration
const API_CONFIG = {
    // Development
    BASE_URL: 'http://localhost:5001',
    
    // Production (uncomment and update for production)
    // BASE_URL: 'https://your-production-domain.com',
    
    // API Endpoints
    ENDPOINTS: {
        SEND_PASSWORD_RESET_OTP: '/api/send-password-reset-otp',
        VERIFY_PASSWORD_RESET_OTP: '/api/verify-password-reset-otp',
        RESET_PASSWORD_WITH_OTP: '/api/reset-password-with-otp',
        SENDGRID_SEND_OTP: '/api/sendgrid-send-otp',
        SENDGRID_VERIFY_OTP: '/api/sendgrid-verify-otp',
        SENDGRID_RESEND_OTP: '/api/sendgrid-resend-otp'
    }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// Make configuration available globally
window.API_CONFIG = API_CONFIG;
window.getApiUrl = getApiUrl;

console.log('🔧 API Configuration loaded:', API_CONFIG.BASE_URL);
