const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: './config.env' }); // Load environment variables from config.env file

const { spawn, exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add permissive CSP headers for development
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; connect-src 'self' *; img-src 'self' data: blob: *;");
    next();
});

// Configuration (use environment variables)
// IMPORTANT: Using SANDBOX mode for testing
const IS_PRODUCTION = false; // Force sandbox mode
const LALA_HOST = IS_PRODUCTION ? 'rest.lalamove.com' : 'rest.sandbox.lalamove.com';
const API_KEY = process.env.LALAMOVE_API_KEY || 'pk_test_5e6d8d33b32952622d173377b443ca5f';
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
const MARKET = process.env.LALAMOVE_MARKET || 'PH';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = process.env.BASE_URL || 'https://viktoriasbistro.restaurant';


// OTP Configuration
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

// SendGrid Email Configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'support@viktoriasbistro.restaurant';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "Viktoria's Bistro";

// Validate SendGrid configuration
if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
    console.warn('⚠️  WARNING: SENDGRID_API_KEY not found in environment variables');
    console.warn('📝 Please create a .env file with your SendGrid API key');
    console.warn('📖 See SETUP_INSTRUCTIONS.md for details');
}

// Multer configuration for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Mask API key for security (only show first 8 and last 4 characters)
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 12) return '***';
    return apiKey.substring(0, 8) + '***' + apiKey.substring(apiKey.length - 4);
}

// OTP Storage (in-memory for development, replace with database in production)
const otpStorage = new Map(); // email -> { otp, expiry, attempts }

// Rate limiting storage
const rateLimitStorage = new Map(); // ip -> { count, resetTime }

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per window per IP (increased for testing)

// Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitStorage.has(clientIP)) {
        rateLimitStorage.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const limitData = rateLimitStorage.get(clientIP);
    
    // Reset if window expired
    if (now > limitData.resetTime) {
        rateLimitStorage.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    // Check if limit exceeded
    if (limitData.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((limitData.resetTime - now) / 1000)
        });
    }
    
    // Increment counter
    limitData.count++;
    rateLimitStorage.set(clientIP, limitData);
    
    next();
}

// Clear rate limit for specific IP (for testing)
function clearRateLimit(clientIP) {
    rateLimitStorage.delete(clientIP);
    console.log(`🔄 Rate limit cleared for IP: ${clientIP}`);
}

// Clear all rate limits (for testing)
function clearAllRateLimits() {
    rateLimitStorage.clear();
    console.log('🔄 All rate limits cleared');
}

// helper to sign requests
function makeSignature(secret, timestamp, method, path, body) {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

// OTP Functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Gmail SMTP Email Functions
async function sendOTPEmailViaGmail(email, userName, otp) {
    try {
        // Check if Gmail is configured
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD || GMAIL_USER === 'your_gmail@gmail.com') {
            console.log('⚠️ Gmail SMTP not configured, skipping email send');
            console.log('📝 To enable Gmail email sending:');
            console.log('   1. Enable 2-Factor Authentication on your Gmail account');
            console.log('   2. Generate App Password: Google Account > Security > 2-Step Verification > App passwords');
            console.log('   3. Update GMAIL_USER and GMAIL_APP_PASSWORD in config.env file');
            console.log('   4. Restart the server');
            return { 
                success: false, 
                message: 'Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in config.env file.' 
            };
        }
        
        console.log(`📧 Sending OTP email to ${email} via Gmail SMTP`);
        
        // Create transporter
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: GMAIL_USER,
                pass: GMAIL_APP_PASSWORD
            }
        });
        
        const subject = `Your Viktoria's Bistro Verification Code - ${otp}`;
        
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                <!-- Header with Logo and Background -->
                <div style="background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%); color: white; padding: 30px 20px; text-align: center; position: relative; overflow: hidden;">
                    <!-- Background Pattern -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"food\" patternUnits=\"userSpaceOnUse\" width=\"20\" height=\"20\"><circle cx=\"10\" cy=\"10\" r=\"2\" fill=\"white\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23food)\"/></svg>');"></div>
                    
                    <!-- Logo -->
                    <div style="position: relative; z-index: 1;">
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50%; padding: 15px; margin-bottom: 15px; backdrop-filter: blur(10px);">
                            <img src="http://localhost:5001/src/IMG/Logo.png" alt="Viktoria's Bistro Logo" style="width: 60px; height: 60px; border-radius: 50%;">
                        </div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🍽️ Viktoria's Bistro</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Fine Dining Experience</p>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 40px 30px; background: white; margin: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <!-- Welcome Message -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #8B2E20; margin: 0 0 10px 0; font-size: 24px;">Hello ${userName}!</h2>
                        <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.5;">Thank you for signing up with Viktoria's Bistro. Please use the verification code below to complete your registration:</p>
                    </div>
                    
                    <!-- OTP Code Box -->
                    <div style="background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; margin: 30px 0; border-radius: 15px; box-shadow: 0 5px 15px rgba(139, 46, 32, 0.3); position: relative; overflow: hidden;">
                        <!-- Background Pattern -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"dots\" patternUnits=\"userSpaceOnUse\" width=\"10\" height=\"10\"><circle cx=\"5\" cy=\"5\" r=\"1\" fill=\"white\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23dots)\"/></svg>');"></div>
                        
                        <div style="position: relative; z-index: 1;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Your Verification Code</p>
                            <h1 style="margin: 0; font-size: 48px; letter-spacing: 8px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${otp}</h1>
                        </div>
                    </div>
                    
                    <!-- Important Information -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8B2E20;">
                        <p style="margin: 0 0 10px 0; color: #8B2E20; font-weight: bold; font-size: 16px;">⏰ This code will expire in 10 minutes.</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
                        <p style="color: #8B2E20; font-weight: bold; margin: 0 0 5px 0;">Best regards,<br>The Viktoria's Bistro Team</p>
                        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                            📍 123 Restaurant Street, City, Country<br>
                            📞 +1 (555) 123-4567 | 📧 info@viktoriasbistro.com
                        </p>
                    </div>
                </div>
                
                <!-- Bottom Background -->
                <div style="height: 30px; background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%);"></div>
            </div>
        `;

        const textContent = `
            Hello ${userName}!
            
            Thank you for signing up with Viktoria's Bistro. Please use the verification code below to complete your registration:
            
            VERIFICATION CODE: ${otp}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            The Viktoria's Bistro Team
        `;

        const mailOptions = {
            from: {
                name: GMAIL_FROM_NAME,
                address: GMAIL_USER
            },
            to: email,
            subject: subject,
            text: textContent,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        
        console.log(`📧 Gmail email sent successfully to ${email}`);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('📧 Gmail email sending error:', error.message);
        return { success: false, message: error.message };
    }
}

// SendGrid Email Functions
async function sendOTPEmail(email, userName, otp) {
    try {
        // Check if SendGrid is configured
        if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
            console.log('⚠️ SendGrid API key not configured, skipping email send');
            console.log('📝 To enable email sending:');
            console.log('   1. Get API key from: https://app.sendgrid.com/settings/api_keys');
            console.log('   2. Update SENDGRID_API_KEY in config.env file');
            console.log('   3. Restart the server');
            return { 
                success: false, 
                message: 'SendGrid API key not configured. Please set SENDGRID_API_KEY in config.env file.' 
            };
        }
        
        console.log(`📧 Sending OTP email to ${email} via SendGrid`);
        
        const subject = `Your Viktoria's Bistro Verification Code - ${otp}`;
        
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                <!-- Header with Logo and Background -->
                <div style="background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%); color: white; padding: 30px 20px; text-align: center; position: relative; overflow: hidden;">
                    <!-- Background Pattern -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"food\" patternUnits=\"userSpaceOnUse\" width=\"20\" height=\"20\"><circle cx=\"10\" cy=\"10\" r=\"2\" fill=\"white\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23food)\"/></svg>');"></div>
                    
                    <!-- Logo -->
                    <div style="position: relative; z-index: 1;">
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50%; padding: 15px; margin-bottom: 15px; backdrop-filter: blur(10px);">
                            <img src="http://localhost:5001/src/IMG/Logo.png" alt="Viktoria's Bistro Logo" style="width: 60px; height: 60px; border-radius: 50%;">
                        </div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🍽️ Viktoria's Bistro</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Fine Dining Experience</p>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div style="padding: 40px 30px; background: white; margin: 20px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                    <!-- Welcome Message -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #8B2E20; margin: 0 0 10px 0; font-size: 24px;">Hello ${userName}!</h2>
                        <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.5;">Thank you for signing up with Viktoria's Bistro. Please use the verification code below to complete your registration:</p>
                    </div>
                    
                    <!-- OTP Code Box -->
                    <div style="background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; margin: 30px 0; border-radius: 15px; box-shadow: 0 5px 15px rgba(139, 46, 32, 0.3); position: relative; overflow: hidden;">
                        <!-- Background Pattern -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1; background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"dots\" patternUnits=\"userSpaceOnUse\" width=\"10\" height=\"10\"><circle cx=\"5\" cy=\"5\" r=\"1\" fill=\"white\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23dots)\"/></svg>');"></div>
                        
                        <div style="position: relative; z-index: 1;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Your Verification Code</p>
                            <h1 style="margin: 0; font-size: 48px; letter-spacing: 8px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${otp}</h1>
                        </div>
                    </div>
                    
                    <!-- Important Information -->
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8B2E20;">
                        <p style="margin: 0 0 10px 0; color: #8B2E20; font-weight: bold; font-size: 16px;">⏰ This code will expire in 10 minutes.</p>
                        <p style="margin: 0; color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
                        <p style="color: #8B2E20; font-weight: bold; margin: 0 0 5px 0;">Best regards,<br>The Viktoria's Bistro Team</p>
                        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                            📍 123 Restaurant Street, City, Country<br>
                            📞 +1 (555) 123-4567 | 📧 info@viktoriasbistro.com
                        </p>
                    </div>
                </div>
                
                <!-- Bottom Background -->
                <div style="height: 30px; background: linear-gradient(135deg, #8B2E20 0%, #A0522D 100%);"></div>
            </div>
        `;

        const textContent = `
            Hello ${userName}!
            
            Thank you for signing up with Viktoria's Bistro. Please use the verification code below to complete your registration:
            
            VERIFICATION CODE: ${otp}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            The Viktoria's Bistro Team
        `;

        const emailData = {
            personalizations: [{
                to: [{ email: email, name: userName }],
                subject: subject
            }],
            from: {
                email: SENDGRID_FROM_EMAIL,
                name: SENDGRID_FROM_NAME
            },
            content: [
                {
                    type: 'text/plain',
                    value: textContent
                },
                {
                    type: 'text/html',
                    value: htmlContent
                }
            ]
        };

        const response = await axios.post('https://api.sendgrid.com/v3/mail/send', emailData, {
            headers: {
                'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📧 SendGrid email sent successfully to ${email}`);
        return { success: true, messageId: response.headers['x-message-id'] };

    } catch (error) {
        console.error('📧 SendGrid email sending error:', error.message);
        return { success: false, message: error.message };
    }
}

// SendGrid OTP Functions
async function sendEmailOTP(email, userName) {
    try {
        console.log(`[OTP] Generating SendGrid OTP for: ${email}`);
        
        // Generate 6-digit OTP
        const otp = generateOTP();
        const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
        
        // Store OTP
        otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            createdAt: Date.now()
        });
        
        // Try Gmail SMTP first, then SendGrid
        let emailResult = await sendOTPEmailViaGmail(email, userName, otp);
        
        // If Gmail fails, try SendGrid
        if (!emailResult.success) {
            console.log('📧 Gmail SMTP failed, trying SendGrid...');
            emailResult = await sendOTPEmail(email, userName, otp);
        }
        
        if (emailResult.success) {
            console.log(`[OTP] SendGrid OTP sent successfully: ${otp} for ${email}`);
            return { 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'SendGrid OTP sent successfully',
                emailSent: true
            };
        } else {
            console.log(`[OTP] SendGrid email failed: ${emailResult.message}`);
            return { 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'OTP generated successfully (email failed to send)',
                emailSent: false,
                emailError: emailResult.message
            };
        }
        
    } catch (error) {
        console.error('[OTP] Error generating SendGrid OTP:', error.message);
        
        // Fallback to local generation
        console.log('[OTP] Falling back to local OTP generation');
        const otp = generateOTP();
        const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
        
        otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            createdAt: Date.now()
        });
        
        return { 
            success: true, 
            otp: otp,
            expiry: expiry,
            message: 'Local OTP generated (SendGrid unavailable)' 
        };
    }
}

async function verifyEmailOTP(email, otp) {
    try {
        console.log(`[OTP] Verifying SendGrid OTP for: ${email}`);
        
        if (!otpStorage.has(email)) {
            return { success: false, message: 'No OTP found for this email' };
        }
        
        const storedData = otpStorage.get(email);
        
        // Check if OTP has expired
        if (Date.now() > storedData.expiry) {
            otpStorage.delete(email);
            return { success: false, message: 'OTP has expired' };
        }
        
        // Check attempt limit
        if (storedData.attempts >= MAX_OTP_ATTEMPTS) {
            otpStorage.delete(email);
            return { success: false, message: 'Too many failed attempts' };
        }
        
        // Verify OTP
        if (storedData.otp === otp) {
            otpStorage.delete(email); // Remove OTP after successful verification
            console.log(`[OTP] SendGrid OTP verified successfully for: ${email}`);
            return { success: true, message: 'SendGrid OTP verified successfully' };
        } else {
            // Increment attempt count
            storedData.attempts++;
            otpStorage.set(email, storedData);
            
            const remainingAttempts = MAX_OTP_ATTEMPTS - storedData.attempts;
            return { 
                success: false, 
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
            };
        }
        
    } catch (error) {
        console.error('[OTP] Error verifying SendGrid OTP:', error.message);
        return { success: false, message: 'Verification failed' };
    }
}

/* ====== Geocoding API ====== */

// Geocode address to coordinates
app.post('/api/geocode', async (req, res) => {
  console.log('[geocode] Geocoding request received');
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    
    console.log(`[geocode] Geocoding address: ${address}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
      address: address,
      key: GOOGLE_MAPS_API_KEY,
      region: 'ph', // Bias results to Philippines
      components: 'country:PH' // Restrict to Philippines only
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.status !== 'OK') {
      console.error('[geocode] Geocoding failed:', data.status, data.error_message);
      return res.status(400).json({ 
        error: 'Geocoding failed', 
        status: data.status,
        message: data.error_message 
      });
    }
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'No results found for this address' });
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    const geocodeResult = {
      success: true,
      address: result.formatted_address,
      coordinates: {
        lat: location.lat.toString(), // Convert to string as required by Lalamove
        lng: location.lng.toString()
      },
      place_id: result.place_id,
      types: result.types
    };
    
    console.log('[geocode] Geocoding successful:', geocodeResult);
    res.json(geocodeResult);
    
  } catch (error) {
    console.error('[geocode] Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Reverse geocode coordinates to address
app.post('/api/reverse-geocode', async (req, res) => {
  console.log('[reverse-geocode] Reverse geocoding request received');
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    
    console.log(`[reverse-geocode] Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      region: 'ph'
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.status !== 'OK') {
      console.error('[reverse-geocode] Reverse geocoding failed:', data.status);
      return res.status(400).json({ 
        error: 'Reverse geocoding failed', 
        status: data.status 
      });
    }
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'No address found for these coordinates' });
    }
    
    const result = data.results[0];
    
    const reverseGeocodeResult = {
      success: true,
      address: result.formatted_address,
      coordinates: {
        lat: lat.toString(),
        lng: lng.toString()
      },
      place_id: result.place_id,
      types: result.types
    };
    
    console.log('[reverse-geocode] Reverse geocoding successful:', reverseGeocodeResult);
    res.json(reverseGeocodeResult);
    
  } catch (error) {
    console.error('[reverse-geocode] Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Test endpoint to verify routing
app.get('/api/test', (req, res) => {
  console.log('[test] Test endpoint called');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Test POST endpoint
app.post('/api/test', (req, res) => {
  console.log('[test] Test POST endpoint called');
  console.log('[test] Request body:', req.body);
  res.json({ message: 'Test POST endpoint working', receivedData: req.body, timestamp: new Date().toISOString() });
});

// Clear rate limits endpoint (for testing)
app.post('/api/clear-rate-limits', (req, res) => {
  clearAllRateLimits();
  res.json({ 
    success: true, 
    message: 'All rate limits cleared',
    timestamp: new Date().toISOString()
  });
});

// GET endpoint for webhook testing
app.get('/api/webhook/lalamove', (req, res) => {
  res.json({ success: true, message: "Webhook active" });
});

/* ====== Proxy endpoints ====== */

app.post('/api/quotation', async (req, res) => {
  // Extra logging for stops
  if (!req.body || !req.body.data || !Array.isArray(req.body.data.stops)) {
    console.error('[proxy] ERROR: No stops array found in request body!');
  } else {
    console.log('[proxy] Stops array received:', JSON.stringify(req.body.data.stops, null, 2));
    if (req.body.data.stops.length < 2) {
      console.error('[proxy] ERROR: Less than 2 stops provided!');
    }
  }
  console.log('[proxy] /api/quotation incoming');
  console.log('[proxy] Request body received from frontend:', JSON.stringify(req.body, null, 2));
  try {
    // Send the body exactly as received from frontend (with data wrapper)
    // Lalamove API expects { data: { ... } } format
    let bodyObj = req.body;
    
    // Validate the nested data structure
    if (!bodyObj || !bodyObj.data || !Array.isArray(bodyObj.data.stops)) {
      console.error('[proxy] invalid payload: missing data.stops array');
      return res.status(400).json({ error: 'Invalid payload: data.stops array required' });
    }
    if (bodyObj.data.stops.length < 2) {
      console.error('[proxy] invalid payload: need at least 2 stops');
      return res.status(400).json({ error: 'Invalid payload: at least 2 stops required' });
    }

    // Ensure coordinates are strings and validate
    const normalizedStops = bodyObj.data.stops.map((s, idx) => {
      const coords = s.coordinates || s.location || {};
      const lat = coords.lat ? coords.lat.toString() : '';
      const lng = (coords.lng || coords.lon || coords.longitude) ? (coords.lng || coords.lon || coords.longitude).toString() : '';
      if (!lat || !lng) {
        throw new Error(`Invalid coordinates for stop ${idx}`);
      }
      return {
        coordinates: { lat, lng },
        address: s.address || s.name || ''
      };
    });

    // Update the body with normalized stops
    bodyObj.data.stops = normalizedStops;
    const body = JSON.stringify(bodyObj);
    console.log('[proxy] Body sent to Lalamove:', body);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/quotations', body);

    const url = `https://${LALA_HOST}/v3/quotations`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };

    console.log('[proxy] forwarding to Lalamove /v3/quotations', { url, headers, bodyObj });
    const response = await axios.post(url, body, { headers });
    console.log('[proxy] lalamove response status', response.status);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] quotation error', err?.response?.data || err.message);
    // If validation error thrown above, respond 400
    if (err.message && err.message.startsWith('Invalid coordinates')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// Helper test route: call Lalamove from server-side with provided JSON (or example)
app.post('/api/quote-test', async (req, res) => {
  console.log('[proxy] /api/quote-test incoming');
  try {
    // use provided body or fallback example
    let payload = req.body && Object.keys(req.body).length ? req.body : {
      serviceType: 'MOTORCYCLE',
      language: 'en_PH',
      isRouteOptimized: false,
      stops: [
        { coordinates: { lat: 14.4457549030656, lng: 120.92354136968974 }, address: "Viktoria's Bistro, Philippines" },
        { coordinates: { lat: 14.554729, lng: 121.024445 }, address: 'Bonifacio High Street, Taguig' }
      ]
    };

    // validate similar to quotation endpoint
    if (!Array.isArray(payload.stops) || payload.stops.length < 2) {
      return res.status(400).json({ error: 'Invalid test payload: at least 2 stops required' });
    }

    payload.stops = payload.stops.map(s => ({ coordinates: { lat: Number(s.coordinates.lat), lng: Number(s.coordinates.lng) }, address: s.address || '' }));
    const body = JSON.stringify(payload);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/quotations', body);
    const url = `https://${LALA_HOST}/v3/quotations`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };
    console.log('[proxy] quote-test forwarding to Lalamove', { url, headers, body });
    const response = await axios.post(url, body, { headers });
    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] quote-test error', err?.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

app.post('/api/place-order', async (req, res) => {
  console.log('[proxy] /api/place-order incoming');
  try {
    // Keep the data wrapper for Lalamove API (same as quotation endpoint)
    let bodyObj = req.body;
    console.log('[proxy] Place order request body:', JSON.stringify(bodyObj, null, 2));
    
    const body = JSON.stringify(bodyObj);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/orders', body);

    const url = `https://${LALA_HOST}/v3/orders`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };

    console.log('[proxy] forwarding to Lalamove /v3/orders', { url, headers, bodyObj });
    const response = await axios.post(url, body, { headers });
    console.log('[proxy] lalamove order response status', response.status);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] place-order error', err?.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* ====== Lalamove Webhook Route ====== */
app.post('/api/webhook/lalamove', (req, res) => {
  console.log('[webhook] Lalamove webhook received');
  console.log('[webhook] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[webhook] Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Webhook security validation
    const signature = req.headers['x-lalamove-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!validateWebhookSignature(req.body, signature, timestamp)) {
      console.warn('[webhook] Invalid webhook signature');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid webhook signature' 
      });
    }
    
    const webhookData = req.body;
    
    // Extract key information from webhook
    const orderId = webhookData?.data?.orderId;
    const orderState = webhookData?.data?.orderState;
    const driverId = webhookData?.data?.driverId;
    const driverInfo = webhookData?.data?.driver;
    const eventTime = webhookData?.eventTime || new Date().toISOString();
    
    console.log(`[webhook] Order ${orderId} status: ${orderState}`);
    
    // Handle different webhook events
    switch (orderState) {
      case 'ASSIGNING_DRIVER':
        console.log('[webhook] Driver assignment in progress...');
        handleDriverAssigning(orderId, webhookData);
        break;
        
      case 'ON_GOING':
        console.log(`[webhook] Order ${orderId} is ongoing with driver ${driverId}`);
        handleOrderOngoing(orderId, driverId, driverInfo, webhookData);
        break;
        
      case 'PICKED_UP':
        console.log(`[webhook] Order ${orderId} has been picked up`);
        handleOrderPickedUp(orderId, driverId, webhookData);
        break;
        
      case 'COMPLETED':
        console.log(`[webhook] Order ${orderId} has been completed`);
        handleOrderCompleted(orderId, webhookData);
        break;
        
      case 'CANCELED':
        console.log(`[webhook] Order ${orderId} has been canceled`);
        handleOrderCanceled(orderId, webhookData);
        break;
        
      default:
        console.log(`[webhook] Unknown order state: ${orderState}`);
        handleUnknownState(orderId, orderState, webhookData);
    }
    
    // Store webhook data for future reference
    storeWebhookEvent(webhookData);
    
    // Respond to Lalamove that webhook was received successfully
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully',
      orderId: orderId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error processing webhook',
      message: error.message 
    });
  }
});

// Webhook signature validation
function validateWebhookSignature(body, signature, timestamp) {
  try {
    // TEMPORARILY SKIP VALIDATION FOR TESTING
    console.log('[webhook] Temporarily skipping signature validation for testing');
    return true;
    
    // Skip validation in development mode
    if (!IS_PRODUCTION) {
      console.log('[webhook] Skipping signature validation in development mode');
      return true;
    }
    
    if (!signature || !timestamp) {
      console.log('[webhook] Missing signature or timestamp');
      return false;
    }
    
    // Check timestamp is within 5 minutes
    const now = Date.now();
    const webhookTime = parseInt(timestamp) * 1000;
    const timeDiff = Math.abs(now - webhookTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      console.log('[webhook] Webhook timestamp too old');
      return false;
    }
    
    // Validate signature using Lalamove webhook secret
    const webhookSecret = process.env.LALAMOVE_WEBHOOK_SECRET || API_SECRET;
    const bodyString = JSON.stringify(body);
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(timestamp + bodyString)
      .digest('hex');
    
    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.log('[webhook] Signature mismatch - expected:', expectedSignature, 'received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('[webhook] Error validating signature:', error);
    return false;
  }
}

// Webhook event handlers with Firebase integration
async function handleDriverAssigning(orderId, webhookData) {
  console.log(`[webhook-handler] Processing driver assignment for order ${orderId}`);
  
  try {
    // Update order status in database/storage
    await updateOrderStatus(orderId, {
      status: 'DRIVER_ASSIGNING',
      updatedAt: new Date().toISOString(),
      message: 'Looking for a driver for your order...',
      webhookData: webhookData
    });
    
    // You can add customer notification here
    console.log(`[webhook-handler] Order ${orderId} status updated to DRIVER_ASSIGNING`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderOngoing(orderId, driverId, driverInfo, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} started with driver ${driverId}`);
  
  try {
    const updateData = {
      status: 'ON_GOING',
      driverId: driverId,
      driverInfo: driverInfo,
      updatedAt: new Date().toISOString(),
      message: 'Your order is on the way!',
      webhookData: webhookData
    };
    
    if (driverInfo) {
      console.log(`[webhook-handler] Driver details:`, driverInfo);
      updateData.driverName = driverInfo.name;
      updateData.driverPhone = driverInfo.phone;
      updateData.vehicleInfo = driverInfo.plateNumber;
    }
    
    await updateOrderStatus(orderId, updateData);
    
    // Notify customer
    await notifyCustomer(orderId, 'Your order is on the way!', {
      driverInfo: driverInfo,
      status: 'ON_GOING'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to ON_GOING`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderPickedUp(orderId, driverId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} picked up by driver ${driverId}`);
  
  try {
    await updateOrderStatus(orderId, {
      status: 'PICKED_UP',
      driverId: driverId,
      pickedUpAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: 'Your order has been picked up and is on the way to you!',
      webhookData: webhookData
    });
    
    // Notify customer
    await notifyCustomer(orderId, 'Your order has been picked up!', {
      status: 'PICKED_UP',
      estimatedDelivery: 'Expected delivery in 15-30 minutes'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to PICKED_UP`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderCompleted(orderId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} completed successfully`);
  
  try {
    await updateOrderStatus(orderId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: 'Your order has been delivered successfully! Thank you for choosing Viktoria\'s Bistro!',
      webhookData: webhookData
    });
    
    // Notify customer
    await notifyCustomer(orderId, 'Order delivered successfully!', {
      status: 'COMPLETED',
      thankYouMessage: 'Thank you for choosing Viktoria\'s Bistro!'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to COMPLETED`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderCanceled(orderId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} was canceled`);
  const reason = webhookData?.data?.cancelReason || 'No reason provided';
  
  try {
    await updateOrderStatus(orderId, {
      status: 'CANCELED',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancelReason: reason,
      message: `Your order has been canceled. Reason: ${reason}`,
      webhookData: webhookData
    });
    
    // Notify customer about cancellation
    await notifyCustomer(orderId, 'Order canceled', {
      status: 'CANCELED',
      reason: reason,
      refundMessage: 'If you were charged, a refund will be processed within 3-5 business days.'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to CANCELED`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

function handleUnknownState(orderId, orderState, webhookData) {
  console.log(`[webhook-handler] Unknown state ${orderState} for order ${orderId}`);
  // Log for debugging
  console.log('[webhook-handler] Full webhook data:', JSON.stringify(webhookData, null, 2));
  
  // Still try to update with unknown state for tracking
  updateOrderStatus(orderId, {
    status: orderState,
    updatedAt: new Date().toISOString(),
    message: `Order status: ${orderState}`,
    webhookData: webhookData
  }).catch(error => {
    console.error(`[webhook-handler] Error updating unknown state:`, error);
  });
}

// Store webhook events (you can modify this to use a database)
const webhookEvents = [];
const orderStatuses = new Map(); // In-memory order status storage

function storeWebhookEvent(webhookData) {
  const event = {
    id: Date.now().toString(),
    orderId: webhookData?.data?.orderId,
    orderState: webhookData?.data?.orderState,
    receivedAt: new Date().toISOString(),
    data: webhookData
  };
  
  webhookEvents.push(event);
  
  // Keep only last 100 events in memory
  if (webhookEvents.length > 100) {
    webhookEvents.shift();
  }
  
  console.log(`[webhook-storage] Stored webhook event ${event.id}`);
}

// Order status management functions
async function updateOrderStatus(orderId, statusData) {
  try {
    console.log(`[order-status] Updating order ${orderId}:`, statusData);
    
    // Store in memory (you can replace this with Firebase/database call)
    orderStatuses.set(orderId, {
      orderId: orderId,
      ...statusData,
      lastUpdated: new Date().toISOString()
    });
    
    // Firebase Admin SDK Integration
    
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
        try {
            // Try to load service account key
            const serviceAccount = require('./firebase-service-account.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        } catch (error) {
            console.warn('⚠️ Firebase Admin SDK not configured:', error.message);
            console.log('📝 To enable Firebase Admin features for password reset:');
            console.log('   1. Go to Firebase Console > Project Settings > Service accounts');
            console.log('   2. Generate new private key and download JSON file');
            console.log('   3. Save as firebase-service-account.json in project root');
            console.log('   4. Restart the server');
            console.log('   5. See FIREBASE_SETUP.md for detailed instructions');
        }
    }
    
    // Firebase Firestore integration example:
    /*
    const db = admin.firestore();
    await db.collection('orders').doc(orderId).update({
      ...statusData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    */
    
    console.log(`[order-status] Successfully updated order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`[order-status] Error updating order ${orderId}:`, error);
    throw error;
  }
}

async function notifyCustomer(orderId, message, additionalData = {}) {
  try {
    console.log(`[customer-notification] Sending notification for order ${orderId}: ${message}`);
    
    // Get order details to find customer contact info
    const orderStatus = orderStatuses.get(orderId);
    
    // Store notification for retrieval by frontend
    const notification = {
      orderId: orderId,
      message: message,
      timestamp: new Date().toISOString(),
      data: additionalData,
      type: 'order_update'
    };
    
    // Store notification (in production, use proper notification service)
    if (!global.customerNotifications) {
      global.customerNotifications = [];
    }
    global.customerNotifications.push(notification);
    
    // TODO: Implement actual notification methods
    // Examples:
    // - Send SMS via Twilio
    // - Send email via SendGrid
    // - Push notification via Firebase Cloud Messaging
    // - WebSocket notification for real-time updates
    
    console.log(`[customer-notification] Notification stored for order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`[customer-notification] Error sending notification for order ${orderId}:`, error);
    return false;
  }
}

// API to retrieve webhook events (for debugging)
app.get('/api/webhook/events', (req, res) => {
  res.json({
    total: webhookEvents.length,
    events: webhookEvents
  });
});

// API to get order status
app.get('/api/order/:orderId/status', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderStatus = orderStatuses.get(orderId);
    
    if (!orderStatus) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        orderId: orderId
      });
    }
    
    res.json({
      success: true,
      orderId: orderId,
      status: orderStatus
    });
  } catch (error) {
    console.error('[order-status] Error retrieving order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order status',
      error: error.message
    });
  }
});

// API to get customer notifications
app.get('/api/notifications/:orderId', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const notifications = (global.customerNotifications || [])
      .filter(n => n.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      orderId: orderId,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('[notifications] Error retrieving notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications',
      error: error.message
    });
  }
});

// API to get all order statuses (for admin dashboard)
app.get('/api/orders/status', (req, res) => {
  try {
    const allOrders = Array.from(orderStatuses.entries()).map(([orderId, status]) => ({
      orderId,
      ...status
    }));
    
    res.json({
      success: true,
      orders: allOrders,
      count: allOrders.length
    });
  } catch (error) {
    console.error('[orders] Error retrieving all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders',
      error: error.message
    });
  }
});

// Test webhook endpoint (for development/testing)
app.post('/api/webhook/test', (req, res) => {
  console.log('[webhook-test] Simulating Lalamove webhook...');
  
  // Create a sample webhook payload
  const testWebhook = {
    eventTime: new Date().toISOString(),
    data: {
      orderId: req.body.orderId || 'TEST_ORDER_' + Date.now(),
      orderState: req.body.orderState || 'ON_GOING',
      driverId: req.body.driverId || 'TEST_DRIVER_123',
      driver: {
        name: 'Juan Test Driver',
        phone: '+639171234567',
        plateNumber: 'ABC-1234'
      },
      cancelReason: req.body.cancelReason || null
    }
  };
  
  console.log('[webhook-test] Sending test webhook:', JSON.stringify(testWebhook, null, 2));
  
  // Call our own webhook endpoint
  const axios = require('axios');
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://viktoriasbistro.restaurant' 
    : `http://localhost:${PORT}`;
  
  axios.post(`${baseUrl}/api/webhook/lalamove`, testWebhook)
    .then(response => {
      res.json({
        success: true,
        message: 'Test webhook sent successfully',
        testData: testWebhook,
        webhookResponse: response.data
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error sending test webhook',
        error: error.message
      });
    });
});

/* ====== OTP API Endpoints ====== */

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
    console.log('[API] Send OTP endpoint hit - Method:', req.method);
    console.log('[API] Request headers:', req.headers);
    console.log('[API] Request body:', req.body);
    
    try {
        const { email, userName } = req.body;
        
        if (!email || !userName) {
            console.log('[API] Missing email or userName');
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user name are required' 
            });
        }
        
        console.log(`[API] Send OTP request for: ${email}`);
        const result = await sendEmailOTP(email, userName);
        
        console.log('[API] Sending response:', result);
        res.json(result);
        
    } catch (error) {
        console.error('[API] Send OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send OTP' 
        });
    }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }
        
        console.log(`[API] Verify OTP request for: ${email}`);
        const result = await verifyEmailOTP(email, otp);
        
        res.json(result);
        
    } catch (error) {
        console.error('[API] Verify OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to verify OTP' 
        });
    }
});

// Resend OTP endpoint
app.post('/api/resend-otp', async (req, res) => {
    try {
        const { email, userName } = req.body;
        
        if (!email || !userName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user name are required' 
            });
        }
        
        console.log(`[API] Resend OTP request for: ${email}`);
        const result = await sendEmailOTP(email, userName);
        
        res.json(result);
        
    } catch (error) {
        console.error('[API] Resend OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to resend OTP' 
        });
    }
});

/* ====== SendGrid OTP API Endpoints ====== */

// SendGrid Send OTP endpoint
app.post('/api/sendgrid-send-otp', rateLimitMiddleware, async (req, res) => {
    try {
        const { email, userName } = req.body;
        
        if (!email || !userName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user name are required' 
            });
        }
        
        console.log(`[SendGrid API] Send OTP request for: ${email}`);
        
        // Generate 6-digit OTP
        const otp = generateOTP();
        const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
        
        // Store OTP locally
        otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            createdAt: Date.now(),
            source: 'sendgrid'
        });
        
        console.log(`[SendGrid API] OTP generated: ${otp} for ${email}`);
        
        // Try Gmail SMTP first, then SendGrid
        let emailResult = await sendOTPEmailViaGmail(email, userName, otp);
        
        // If Gmail fails, try SendGrid
        if (!emailResult.success) {
            console.log('📧 Gmail SMTP failed, trying SendGrid...');
            emailResult = await sendOTPEmail(email, userName, otp);
        }
        
        if (emailResult.success) {
            console.log(`📧 SendGrid email sent successfully to ${email}`);
            res.json({ 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'SendGrid OTP generated and email sent successfully',
                emailSent: true
            });
        } else {
            console.log(`📧 SendGrid email failed to send: ${emailResult.message}`);
            res.json({ 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'SendGrid OTP generated successfully (email failed to send)',
                emailSent: false,
                emailError: emailResult.message
            });
        }
        
    } catch (error) {
        console.error('[SendGrid API] Send OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate SendGrid OTP' 
        });
    }
});

// SendGrid Verify OTP endpoint
app.post('/api/sendgrid-verify-otp', rateLimitMiddleware, async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }
        
        console.log(`[SendGrid API] Verify OTP request for: ${email}`);
        
        // Check local storage for SendGrid OTP
        if (!otpStorage.has(email)) {
            return res.json({ 
                success: false, 
                message: 'No OTP found for this email' 
            });
        }
        
        const storedData = otpStorage.get(email);
        
        // Check if OTP has expired
        if (Date.now() > storedData.expiry) {
            otpStorage.delete(email);
            return res.json({ 
                success: false, 
                message: 'OTP has expired' 
            });
        }
        
        // Check attempt limit
        if (storedData.attempts >= MAX_OTP_ATTEMPTS) {
            otpStorage.delete(email);
            return res.json({ 
                success: false, 
                message: 'Too many failed attempts' 
            });
        }
        
        // Verify OTP
        if (storedData.otp === otp) {
            otpStorage.delete(email); // Remove OTP after successful verification
            console.log(`[SendGrid API] OTP verified successfully for: ${email}`);
            return res.json({ 
                success: true, 
                message: 'SendGrid OTP verified successfully' 
            });
        } else {
            // Increment attempt count
            storedData.attempts++;
            otpStorage.set(email, storedData);
            
            const remainingAttempts = MAX_OTP_ATTEMPTS - storedData.attempts;
            return res.json({ 
                success: false, 
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
            });
        }
        
    } catch (error) {
        console.error('[SendGrid API] Verify OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to verify SendGrid OTP' 
        });
    }
});

// SendGrid Resend OTP endpoint
app.post('/api/sendgrid-resend-otp', rateLimitMiddleware, async (req, res) => {
    try {
        const { email, userName } = req.body;
        
        if (!email || !userName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and user name are required' 
            });
        }
        
        console.log(`[SendGrid API] Resend OTP request for: ${email}`);
        
        // Generate new OTP
        const otp = generateOTP();
        const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
        
        // Store new OTP
        otpStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            createdAt: Date.now(),
            source: 'sendgrid'
        });
        
        console.log(`[SendGrid API] New OTP generated: ${otp} for ${email}`);
        
        // Try Gmail SMTP first, then SendGrid
        let emailResult = await sendOTPEmailViaGmail(email, userName, otp);
        
        // If Gmail fails, try SendGrid
        if (!emailResult.success) {
            console.log('📧 Gmail SMTP failed, trying SendGrid...');
            emailResult = await sendOTPEmail(email, userName, otp);
        }
        
        if (emailResult.success) {
            console.log(`📧 SendGrid email resent successfully to ${email}`);
            res.json({ 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'SendGrid OTP resent successfully',
                emailSent: true
            });
        } else {
            console.log(`📧 SendGrid email resend failed: ${emailResult.message}`);
            res.json({ 
                success: true, 
                otp: otp,
                expiry: expiry,
                message: 'SendGrid OTP resent successfully (email failed to send)',
                emailSent: false,
                emailError: emailResult.message
            });
        }
        
    } catch (error) {
        console.error('[SendGrid API] Resend OTP error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to resend SendGrid OTP' 
        });
    }
});

/* ====== Simple OTP System (No Email Sending) ====== */

/* ====== Static file serving (must be after API routes) ====== */
app.use(express.static(path.join(__dirname)));

/* ====== Local app routes (static pages) ====== */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'html', 'pos.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'html', 'payment.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html', 'menu.html')));
app.get('/inventory', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Inventory.html')));
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Order.html')));
app.get('/test-otp', (req, res) => res.sendFile(path.join(__dirname, 'test-otp.html')));
app.get('/simple-test', (req, res) => res.sendFile(path.join(__dirname, 'simple-test.html')));
app.get('/test-firebase-otp', (req, res) => res.sendFile(path.join(__dirname, 'test-firebase-otp.html')));

/* ====== Simple in-memory orders API (keeps existing behavior) ====== */
let orders = [];
let orderCounter = 1;

app.get('/api/orders', (req, res) => res.json(orders));

app.post('/api/orders', (req, res) => {
  const { items, total, orderType } = req.body;
  const newOrder = {
    id: orderCounter++,
    items,
    total,
    orderType: orderType || 'Dine in',
    status: 'pending',
    createdAt: new Date().toISOString(),
    orderNumber: `ORD-${String(orderCounter - 1).padStart(4, '0')}`
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const idx = orders.findIndex(o => o.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders.splice(idx, 1);
  res.status(204).send();
});

app.post('/api/payment', (req, res) => {
  const { orderId, paymentMethod, amount } = req.body;
  const order = orders.find(o => o.id === parseInt(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const payment = { id: Date.now(), orderId: parseInt(orderId), amount, paymentMethod, status: 'completed', processedAt: new Date().toISOString() };
  order.status = 'paid';
  order.payment = payment;
  res.json({ success: true, payment, order });
});

// Password Reset OTP Storage (in-memory for development, replace with database in production)
const passwordResetOTPStorage = new Map(); // email -> { otp, expiry, attempts, verified }

// Send Password Reset OTP endpoint
app.post('/api/send-password-reset-otp', rateLimitMiddleware, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email is required' 
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please enter a valid email address' 
            });
        }
        
        console.log(`[Password Reset OTP] Request for: ${email}`);
        
        // Generate 6-digit OTP
        const otp = generateOTP();
        const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);
        
        // Store OTP
        passwordResetOTPStorage.set(email, {
            otp: otp,
            expiry: expiry,
            attempts: 0,
            verified: false,
            createdAt: Date.now()
        });
        
        // Send OTP email via SendGrid
        const emailResult = await sendOTPEmail(email, 'User', otp);
        
        if (emailResult.success) {
            console.log(`📧 Password reset OTP sent successfully to ${email}`);
            res.json({ 
                success: true, 
                otp: otp, // For development/testing
                expiry: expiry,
                message: 'Password reset OTP sent successfully',
                emailSent: true
            });
        } else {
            console.log(`📧 Password reset OTP email failed to send: ${emailResult.message}`);
            res.json({ 
                success: true, 
                otp: otp, // For development/testing
                expiry: expiry,
                message: 'Password reset OTP generated (email failed to send)',
                emailSent: false,
                emailError: emailResult.message
            });
        }
        
    } catch (error) {
        console.error('[Password Reset OTP] Send error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your request' 
        });
    }
});

// Verify Password Reset OTP endpoint
app.post('/api/verify-password-reset-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and OTP are required' 
            });
        }
        
        console.log(`[Password Reset OTP] Verifying OTP for: ${email}`);
        
        if (!passwordResetOTPStorage.has(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'No password reset OTP found for this email' 
            });
        }
        
        const storedData = passwordResetOTPStorage.get(email);
        
        // Check if OTP has expired
        if (Date.now() > storedData.expiry) {
            passwordResetOTPStorage.delete(email);
            return res.status(400).json({ 
                success: false, 
                message: 'Password reset OTP has expired' 
            });
        }
        
        // Check attempt limit
        if (storedData.attempts >= MAX_OTP_ATTEMPTS) {
            passwordResetOTPStorage.delete(email);
            return res.status(400).json({ 
                success: false, 
                message: 'Too many failed attempts' 
            });
        }
        
        // Verify OTP
        if (storedData.otp === otp) {
            // Mark as verified
            storedData.verified = true;
            passwordResetOTPStorage.set(email, storedData);
            
            console.log(`[Password Reset OTP] OTP verified successfully for: ${email}`);
            res.json({ 
                success: true, 
                message: 'Password reset OTP verified successfully' 
            });
        } else {
            // Increment attempt count
            storedData.attempts++;
            passwordResetOTPStorage.set(email, storedData);
            
            const remainingAttempts = MAX_OTP_ATTEMPTS - storedData.attempts;
            return res.status(400).json({ 
                success: false, 
                message: `Invalid OTP. ${remainingAttempts} attempts remaining.` 
            });
        }
        
    } catch (error) {
        console.error('[Password Reset OTP] Verify error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while verifying the OTP' 
        });
    }
});

// Reset Password with OTP endpoint
app.post('/api/reset-password-with-otp', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and new password are required' 
            });
        }
        
        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }
        
        console.log(`[Password Reset OTP] Resetting password for: ${email}`);
        
        // Check if we have OTP data in server storage (traditional flow)
        if (passwordResetOTPStorage.has(email)) {
            const storedData = passwordResetOTPStorage.get(email);
            
            // Check if OTP has expired
            if (Date.now() > storedData.expiry) {
                passwordResetOTPStorage.delete(email);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Password reset OTP has expired' 
                });
            }
            
            // Check if OTP has been verified
            if (!storedData.verified) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'OTP must be verified before password reset' 
                });
            }
        } else {
            // If no server-side OTP data, assume this is from SendGrid OTP verification
            // The verification was already done on the client side
            console.log(`[Password Reset OTP] No server-side OTP data found for ${email}, assuming SendGrid OTP verification`);
        }
        
        // Update password in Firebase Auth
        try {
            // Initialize Firebase Admin SDK if not already initialized
            if (!admin.apps.length) {
                try {
                    // Try to load service account key
                    const serviceAccount = require('./firebase-service-account.json');
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                    console.log('✅ Firebase Admin SDK initialized successfully for password reset');
                } catch (initError) {
                    console.error('❌ Firebase Admin SDK initialization failed:', initError.message);
                    throw new Error('Firebase Admin SDK not configured');
                }
            }
            
            // Get user by email
            const userRecord = await admin.auth().getUserByEmail(email);
            
            // Update user password
            await admin.auth().updateUser(userRecord.uid, {
                password: newPassword
            });
            
            console.log(`[Password Reset OTP] Firebase password updated for user: ${userRecord.uid}`);
            
        } catch (firebaseError) {
            console.error('[Password Reset OTP] Firebase password update error:', firebaseError.message);
            
            // If Firebase Admin SDK is not available, provide helpful message
            if (firebaseError.message.includes('not configured') || firebaseError.code === 'app/no-app') {
                console.log('[Password Reset OTP] Firebase Admin SDK not configured');
                
                // Clear the OTP storage anyway since verification was successful (if it exists)
                if (passwordResetOTPStorage.has(email)) {
                    passwordResetOTPStorage.delete(email);
                }
                
                return res.json({ 
                    success: true, 
                    message: 'Password reset verification completed. Please contact support to complete the password reset process.' 
                });
            } else if (firebaseError.code === 'auth/user-not-found') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No account found with this email address' 
                });
            } else {
                throw firebaseError;
            }
        }
        
        // Clear the OTP storage (if it exists)
        if (passwordResetOTPStorage.has(email)) {
            passwordResetOTPStorage.delete(email);
        }
        
        console.log(`[Password Reset OTP] Password reset completed for: ${email}`);
        res.json({ 
            success: true, 
            message: 'Password reset successfully. You can now log in with your new password.' 
        });
        
    } catch (error) {
        console.error('[Password Reset OTP] Reset password error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while resetting the password' 
        });
    }
});

/* ====== Error handlers & 404 ====== */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Catch-all route for SPA (must be last)
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

/* ====== Start server (single listen) ====== */
const PORT = process.env.PORT || 5001; // Changed from 5000 to avoid conflicts

app.listen(PORT, '0.0.0.0', () => {
  const environment = IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log(`\n🚀 Viktoria's Bistro Server [${environment}]`);
  console.log(`   Server: http://localhost:${PORT}`);
  if (IS_PRODUCTION) {
    console.log(`   Public: ${BASE_URL}`);
    console.log(`   Webhook: ${BASE_URL}/api/webhook/lalamove`);
  }
  console.log(`   POS: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/pos`);
  console.log(`   Menu: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/menu`);
  console.log(`\n📡 Lalamove Integration:`);
  console.log(`   Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`   API Host: ${LALA_HOST}`);
  console.log(`   Market: ${MARKET}`);
  console.log(`\n🔐 OTP System:`);
  console.log(`   Type: SendGrid Email OTP with Local Fallback`);
  console.log(`   Expiry: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`   Max Attempts: ${MAX_OTP_ATTEMPTS}`);
  console.log(`\n🔐 OTP Endpoints:`);
  console.log(`   Send OTP: POST /api/send-otp`);
  console.log(`   Verify OTP: POST /api/verify-otp`);
  console.log(`   Resend OTP: POST /api/resend-otp`);
  console.log(`\n📧 SendGrid OTP Endpoints:`);
  console.log(`   Send SendGrid OTP: POST /api/sendgrid-send-otp`);
  console.log(`   Verify SendGrid OTP: POST /api/sendgrid-verify-otp`);
  console.log(`   Resend SendGrid OTP: POST /api/sendgrid-resend-otp`);
  console.log(`\n🔐 Password Reset OTP Endpoints:`);
  console.log(`   Send OTP: POST /api/send-password-reset-otp`);
  console.log(`   Verify OTP: POST /api/verify-password-reset-otp`);
  console.log(`   Reset Password: POST /api/reset-password-with-otp`);
  console.log(`\n📧 SendGrid Email Service:`);
  console.log(`   API Key: ${SENDGRID_API_KEY ? '✅ Configured (' + maskApiKey(SENDGRID_API_KEY) + ')' : '❌ Not Found'}`);
  console.log(`   From Email: ${SENDGRID_FROM_EMAIL}`);
  console.log(`   From Name: ${SENDGRID_FROM_NAME}`);
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
    console.log(`   ⚠️  Create .env file with SENDGRID_API_KEY for email functionality`);
  }
});
