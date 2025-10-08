/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// API Base URL Configuration
const API_CONFIG = {
    // Auto-detect environment and set appropriate base URL
    BASE_URL: (() => {
        // Check if we're running locally
        const isLocal = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '0.0.0.0';
        
        // Check if we're on a development port
        const isDevPort = window.location.port === '5500' || 
                         window.location.port === '3000' || 
                         window.location.port === '5001';
        
        // Check if we're on the production domain
        const isProduction = window.location.hostname === 'viktoriasbistro.restaurant' ||
                            window.location.hostname.includes('viktoriasbistro') ||
                            window.location.hostname === 'www.viktoriasbistro.restaurant';
        
        if (isLocal && isDevPort) {
            console.log('🔧 Development environment detected, using local server');
            return 'http://localhost:5001';
        } else if (isProduction) {
            console.log('🔧 Production environment detected, using production server');
            return 'https://viktoriasbistro.restaurant';
        } else {
            // For deployment or other environments, use the same origin
            console.log('🔧 Deployment environment detected, using same origin');
            return window.location.origin;
        }
    })(),
    
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
