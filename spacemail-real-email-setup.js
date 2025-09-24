// Firebase Cloud Function for Real Space Mail Email Sending
// Deploy this to Firebase Functions to send actual emails

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// Space Mail Configuration (from your settings)
const spaceMailConfig = {
    host: 'mail.spacemail.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: 'support@viktoriasbistro.restaurant',
        pass: 'Vonnpogi@123' // Your Space Mail password
    }
};

// Create email transporter
const transporter = nodemailer.createTransporter(spaceMailConfig);

// Cloud Function to send OTP email via Space Mail
exports.sendSpaceMailOTP = functions.https.onCall(async (data, context) => {
    try {
        const { email, otpCode, userName } = data;
        
        // Validate input
        if (!email || !otpCode || !userName) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
        }
        
        // Email template
        const emailTemplate = `
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
                    <h2>Hello ${userName}!</h2>
                    
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
        
        // Email options
        const mailOptions = {
            from: '"Viktoria\'s Bistro" <support@viktoriasbistro.restaurant>',
            to: email,
            subject: 'Your Viktoria\'s Bistro Verification Code',
            html: emailTemplate,
            text: `Hello ${userName}! Your Viktoria's Bistro verification code is: ${otpCode}. This code expires in 10 minutes.`
        };
        
        // Send email via Space Mail
        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Space Mail OTP sent to ${email}`);
        
        return {
            success: true,
            message: 'OTP email sent successfully via Space Mail'
        };
        
    } catch (error) {
        console.error('❌ Space Mail OTP send failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send email via Space Mail');
    }
});

// Test function to verify Space Mail connection
exports.testSpaceMailConnection = functions.https.onCall(async (data, context) => {
    try {
        // Test email
        const testEmail = {
            from: 'support@viktoriasbistro.restaurant',
            to: 'test@example.com',
            subject: 'Space Mail Test',
            text: 'This is a test email from Space Mail!'
        };
        
        await transporter.sendMail(testEmail);
        
        return {
            success: true,
            message: 'Space Mail connection test successful!'
        };
        
    } catch (error) {
        console.error('❌ Space Mail connection test failed:', error);
        throw new functions.https.HttpsError('internal', 'Space Mail connection test failed');
    }
});
