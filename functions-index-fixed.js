const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin SDK
admin.initializeApp();

// Space Mail SMTP Configuration
const smtpConfig = {
  host: 'mail.spacemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@viktoriasbistro.restaurant',
    pass: 'Vonnpogi@123'
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter
const transporter = nodemailer.createTransporter(smtpConfig);

// Cloud Function to send OTP via Space Mail
exports.sendSpaceMailOTP = functions.https.onCall(async (data, context) => {
  try {
    const {email, otpCode, userName} = data;

    // Validate input
    if (!email || !otpCode || !userName) {
      throw new Error('Missing required fields: email, otpCode, userName');
    }

    // Email content
    const mailOptions = {
      from: 'support@viktoriasbistro.restaurant',
      to: email,
      subject: 'Your OTP Verification Code - Viktoria\'s Bistro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2em;">Viktoria's Bistro</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">OTP Verification Code</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up with Viktoria's Bistro! To complete your account verification, 
              please use the following OTP code:
            </p>
            
            <div style="background: white; border: 2px dashed #007bff; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
              <div style="color: #666; font-size: 14px; margin-bottom: 10px;">Your OTP Code:</div>
              <div style="font-size: 3em; font-weight: bold; color: #007bff; letter-spacing: 10px; font-family: 'Courier New', monospace;">
                ${otpCode}
              </div>
              <div style="color: #666; font-size: 12px; margin-top: 10px;">Expires in 10 minutes</div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>Important:</strong> This code will expire in 10 minutes for security reasons. 
              If you didn't request this code, please ignore this email.
            </p>
            
            <div style="margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 5px;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This email was sent from Viktoria's Bistro. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Viktoria's Bistro - OTP Verification Code
        
        Hello ${userName}!
        
        Thank you for signing up with Viktoria's Bistro! To complete your account verification, 
        please use the following OTP code:
        
        OTP Code: ${otpCode}
        Expires in: 10 minutes
        
        Important: This code will expire in 10 minutes for security reasons. 
        If you didn't request this code, please ignore this email.
        
        This email was sent from Viktoria's Bistro. Please do not reply to this email.
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📧 To:', email);
    console.log('🔐 OTP:', otpCode);
    
    return {
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Failed to send OTP email'
    };
  }
});

// Test function to verify Space Mail connection
exports.testSpaceMailConnection = functions.https.onCall(async (data, context) => {
  try {
    // Test SMTP connection
    await transporter.verify();
    
    console.log('✅ Space Mail SMTP connection verified');
    
    return {
      success: true,
      message: 'Space Mail SMTP connection is working'
    };

  } catch (error) {
    console.error('❌ Space Mail SMTP connection failed:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Space Mail SMTP connection failed'
    };
  }
});
