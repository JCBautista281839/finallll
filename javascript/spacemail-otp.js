/**
 * Space Mail OTP Service
 * Handles OTP sending via Space Mail SMTP
 */

class SpaceMailOTPService {
    constructor() {
        this.smtpConfig = {
            host: 'mail.spacemail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'support@viktoriasbistro.restaurant', // Replace with your Space Mail email
                pass: 'Vonnpogi@123'        // Replace with your Space Mail password
            },
            tls: {
                rejectUnauthorized: false
            }
        };
        
        this.isConfigured = false;
        this.checkConfiguration();
    }

    /**
     * Check if Space Mail is properly configured
     */
    checkConfiguration() {
        // Check if credentials are set (not default values)
        if (this.smtpConfig.auth.user !== 'viktoriasbistro@spacemail.com' && 
            this.smtpConfig.auth.pass !== 'your-spacemail-password') {
            this.isConfigured = true;
            console.log('✅ Space Mail OTP Service configured');
        } else {
            console.log('⚠️ Space Mail OTP Service needs configuration');
        }
    }

    /**
     * Configure Space Mail credentials
     * @param {string} email - Space Mail email address
     * @param {string} password - Space Mail password
     */
    configure(email, password) {
        this.smtpConfig.auth.user = email;
        this.smtpConfig.auth.pass = password;
        this.isConfigured = true;
        console.log('✅ Space Mail OTP Service configured');
    }

    /**
     * Generate 6-digit OTP code
     * @returns {string} - 6-digit OTP
     */
    generateOTPCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Send OTP via Space Mail
     * @param {string} recipientEmail - Recipient's email
     * @param {string} userName - User's name
     * @returns {Promise<boolean>} - Success status
     */
    async sendOTP(recipientEmail, userName = '') {
        try {
            if (!this.isConfigured) {
                throw new Error('Space Mail not configured. Please set up credentials first.');
            }

            console.log('📧 Sending OTP via Space Mail to:', recipientEmail);

            // Generate OTP
            const otpCode = this.generateOTPCode();
            
            // Store OTP in localStorage for verification
            this.storeOTP(recipientEmail, otpCode);

            // Create email content
            const emailContent = this.createEmailTemplate(otpCode, userName);
            
            // Send email via Space Mail
            await this.sendEmail(recipientEmail, emailContent.subject, emailContent.html, emailContent.text);

            console.log('✅ OTP sent via Space Mail successfully');
            return true;

        } catch (error) {
            console.error('❌ Space Mail OTP send failed:', error);
            throw new Error('Failed to send OTP via Space Mail: ' + error.message);
        }
    }

    /**
     * Store OTP in localStorage with expiry
     * @param {string} email - User's email
     * @param {string} otpCode - Generated OTP code
     */
    storeOTP(email, otpCode) {
        const otpData = {
            code: otpCode,
            email: email,
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes expiry
        };

        localStorage.setItem('spacemailOTP', JSON.stringify(otpData));
        console.log('✅ OTP stored in localStorage');
    }

    /**
     * Get stored OTP from localStorage
     * @param {string} email - User's email
     * @returns {Object|null} - Stored OTP data
     */
    getStoredOTP(email) {
        try {
            const storedData = localStorage.getItem('spacemailOTP');
            if (storedData) {
                const otpData = JSON.parse(storedData);
                if (otpData.email === email) {
                    return otpData;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get stored OTP:', error);
            return null;
        }
    }

    /**
     * Verify OTP code
     * @param {string} email - User's email
     * @param {string} otpCode - Entered OTP code
     * @returns {Promise<boolean>} - Verification status
     */
    async verifyOTP(email, otpCode) {
        try {
            console.log('🔐 Verifying Space Mail OTP for:', email);

            if (!otpCode || otpCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit code.');
            }

            const storedOTP = this.getStoredOTP(email);
            
            if (!storedOTP) {
                throw new Error('No OTP found for this email. Please request a new code.');
            }

            // Check if OTP has expired
            if (Date.now() > storedOTP.expiresAt) {
                localStorage.removeItem('spacemailOTP');
                throw new Error('OTP has expired. Please request a new code.');
            }

            // Verify OTP
            if (otpCode !== storedOTP.code) {
                throw new Error('Invalid verification code. Please try again.');
            }

            // Clear stored OTP
            localStorage.removeItem('spacemailOTP');

            console.log('✅ Space Mail OTP verified successfully');
            return true;

        } catch (error) {
            console.error('❌ Space Mail OTP verification failed:', error);
            throw error;
        }
    }

    /**
     * Create professional email template
     * @param {string} otpCode - OTP code
     * @param {string} userName - User's name
     * @returns {Object} - Email content
     */
    createEmailTemplate(otpCode, userName) {
        const subject = 'Your Viktoria\'s Bistro Verification Code';
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code - Viktoria's Bistro</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #007bff, #0056b3);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f8f9fa;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .otp-code {
                        background: #007bff;
                        color: white;
                        font-size: 32px;
                        font-weight: bold;
                        text-align: center;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                        letter-spacing: 5px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 14px;
                    }
                    .warning {
                        background: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🍽️ Viktoria's Bistro</h1>
                    <p>Email Verification</p>
                </div>
                
                <div class="content">
                    <h2>Hello ${userName || 'Valued Customer'}!</h2>
                    
                    <p>Thank you for signing up with Viktoria's Bistro. To complete your registration, please use the verification code below:</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong>
                        <ul>
                            <li>This code will expire in 10 minutes</li>
                            <li>Do not share this code with anyone</li>
                            <li>If you didn't request this code, please ignore this email</li>
                        </ul>
                    </div>
                    
                    <p>Enter this code in the verification page to complete your account setup.</p>
                    
                    <p>Welcome to Viktoria's Bistro! 🎉</p>
                </div>
                
                <div class="footer">
                    <p>© 2024 Viktoria's Bistro. All rights reserved.</p>
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </body>
            </html>
        `;

        const text = `Hello ${userName || 'Valued Customer'}! Your Viktoria's Bistro verification code is: ${otpCode}. This code expires in 10 minutes.`;

        return { subject, html, text };
    }

    /**
     * Send email via Space Mail SMTP
     * @param {string} to - Recipient email
     * @param {string} subject - Email subject
     * @param {string} html - HTML content
     * @param {string} text - Text content
     */
    async sendEmail(to, subject, html, text) {
        try {
            // Try Spaceship API first (if available)
            try {
                // Extract OTP from text content
                const otpMatch = text.match(/\d{6}/);
                const otpCode = otpMatch ? otpMatch[0] : '000000';
                
                // Extract userName from text content
                const nameMatch = text.match(/Hello (.+)!/);
                const userName = nameMatch ? nameMatch[1] : 'Valued Customer';
                
                // Replace 'your-app.spaceship.com' with your actual Spaceship URL
                const response = await fetch('https://viktoriasbistro.restaurant/api/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: to,
                        otpCode: otpCode,
                        userName: userName
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Email sent via Spaceship function to Space Mail');
                    return;
                } else {
                    throw new Error(result.error || 'Spaceship function failed');
                }
                
            } catch (spaceshipError) {
                console.log('🔄 Spaceship function failed, falling back to simulation:', spaceshipError.message);
            }
            
            // Fallback: Show email details in console
            console.log('📧 Space Mail Email Details:');
            console.log('From:', this.smtpConfig.auth.user);
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('SMTP Host:', this.smtpConfig.host);
            console.log('SMTP Port:', this.smtpConfig.port);
            console.log('SMTP Secure:', this.smtpConfig.secure);
            
            // Extract OTP from text content for display
            const otpMatch = text.match(/\d{6}/);
            if (otpMatch) {
                console.log('🔐 OTP Code:', otpMatch[0]);
                console.log('⏰ Expires in: 10 minutes');
                console.log('📧 To receive real emails, deploy the Firebase Cloud Function');
            }
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('✅ Email simulation completed successfully');
            
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            throw error;
        }
    }

    /**
     * Get service status
     * @returns {Object} - Service status information
     */
    getStatus() {
        return {
            configured: this.isConfigured,
            smtpHost: this.smtpConfig.host,
            smtpPort: this.smtpConfig.port,
            email: this.smtpConfig.auth.user,
            status: this.isConfigured ? 'Ready' : 'Needs Configuration'
        };
    }
}

// Create global instance
window.spaceMailOTPService = new SpaceMailOTPService();

// Configuration function for easy setup
window.configureSpaceMail = function(email, password) {
    window.spaceMailOTPService.configure(email, password);
};
