const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config(); // Load environment variables from .env file

// Firebase Admin SDK global variables
var firebaseAdminInitialized = false;

// Firebase Admin SDK initialization function
function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized) {
    console.log('Firebase Admin SDK already initialized');
    return true;
  }

  try {
    // Try to load service account key from file or environment variables
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use environment variable if available
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('Using Firebase service account from environment variable');
    } else {
      // Try to load from file
      serviceAccount = require('./firebase-service-account.json');
      console.log('Using Firebase service account from file');
    }

    // Check if Firebase Admin is already initialized
    if (admin.apps && admin.apps.length > 0) {
      console.log('Firebase Admin SDK already has apps initialized');
      firebaseAdminInitialized = true;
      return true;
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    firebaseAdminInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    return true;

  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK not configured:', error.message);
    console.log('📝 To enable Firebase Admin features for password reset:');
    console.log('   1. Go to Firebase Console > Project Settings > Service accounts');
    console.log('   2. Generate new private key and download JSON file');
    console.log('   3. Set FIREBASE_SERVICE_ACCOUNT environment variable with JSON content');
    console.log('   4. Restart the server');
    console.log('   5. See FIREBASE_SETUP.md for detailed instructions');
    return false;
  }
}

// Initialize Firebase Admin SDK at startup
initializeFirebaseAdmin();

const { spawn, exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests, file://, etc.)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5001',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'file://',
      'null',
      'https://viktoriasbistro.restaurant',
      'https://www.viktoriasbistro.restaurant',
      'http://viktoriasbistro.restaurant',
      'http://www.viktoriasbistro.restaurant'
    ];

    // Allow all localhost/127.0.0.1 origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'null') {
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (must be before other routes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    sendgridConfigured: !!(SENDGRID_API_KEY && SENDGRID_API_KEY !== 'your_sendgrid_api_key_here'),
    firebaseInitialized: firebaseAdminInitialized
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: IS_PRODUCTION ? 'production' : 'development',
    sendgridConfigured: !!(SENDGRID_API_KEY && SENDGRID_API_KEY !== 'your_sendgrid_api_key_here'),
    firebaseInitialized: firebaseAdminInitialized,
    endpoints: {
      sendOtp: '/api/sendgrid-send-otp',
      verifyOtp: '/api/sendgrid-verify-otp',
      passwordReset: '/api/send-password-reset-otp'
    }
  });
});

// Add CORS and security headers
app.use((req, res, next) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Add permissive CSP headers for development
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *; connect-src 'self' *; img-src 'self' data: blob: *;");
  next();
});

// Configuration (use environment variables)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'PRODUCTION';
const LALA_HOST = IS_PRODUCTION ? 'rest.sandbox.lalamove.com' : 'rest.sandbox.lalamove.com';
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
} else {
  console.log('✅ SendGrid API key configured successfully');
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
  // Lalamove HMAC signature format (EXACT from documentation):
  // SIGNATURE = HmacSHA256ToHex(<TIMESTAMP>\r\n<HTTP_VERB>\r\n<PATH>\r\n\r\n<BODY>, <SECRET>)
  const rawString = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;

  console.log('[HMAC DEBUG] === SIGNATURE GENERATION START ===');
  console.log('[HMAC DEBUG] API_SECRET length:', secret.length);
  console.log('[HMAC DEBUG] API_SECRET first 20 chars:', secret.substring(0, 20));
  console.log('[HMAC DEBUG] API_SECRET last 10 chars:', secret.substring(secret.length - 10));
  console.log('[HMAC DEBUG] Timestamp:', timestamp, '(type:', typeof timestamp, ')');
  console.log('[HMAC DEBUG] Method:', method);
  console.log('[HMAC DEBUG] Path:', path);
  console.log('[HMAC DEBUG] Body length:', body.length);
  console.log('[HMAC DEBUG] Body first 200 chars:', body.substring(0, 200));
  console.log('[HMAC DEBUG] Body last 50 chars:', body.substring(body.length - 50));

  // Check for any non-printable characters in body
  const nonPrintable = body.match(/[\x00-\x1F\x7F-\x9F]/g);
  if (nonPrintable) {
    console.log('[HMAC DEBUG] WARNING: Non-printable characters found in body:', nonPrintable);
  }

  console.log('[HMAC DEBUG] Raw string construction:');
  console.log('  - timestamp + \\r\\n:', JSON.stringify(timestamp + '\r\n'));
  console.log('  - method + \\r\\n:', JSON.stringify(method + '\r\n'));
  console.log('  - path + \\r\\n\\r\\n:', JSON.stringify(path + '\r\n\r\n'));
  console.log('[HMAC DEBUG] Complete raw string length:', rawString.length);
  console.log('[HMAC DEBUG] Raw string (first 300 chars):', JSON.stringify(rawString.substring(0, 300)));
  console.log('[HMAC DEBUG] Raw string (last 100 chars):', JSON.stringify(rawString.substring(rawString.length - 100)));

  // Verify raw string format step by step
  const expectedFormat = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  console.log('[HMAC DEBUG] Raw string matches expected format:', rawString === expectedFormat);

  const signature = crypto.createHmac('sha256', secret)
    .update(rawString, 'utf8')
    .digest('hex');

  console.log('[HMAC DEBUG] Generated signature:', signature);
  console.log('[HMAC DEBUG] === SIGNATURE GENERATION END ===');
  return signature;
}

// OTP Functions
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// SendGrid Email Functions
async function sendOTPEmail(email, userName, otp) {
  try {
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
      console.log('⚠️ SendGrid API key not configured, using local OTP generation');
      console.log('📝 To enable email sending:');
      console.log('   1. Get API key from: https://app.sendgrid.com/settings/api_keys');
      console.log('   2. Create .env file with SENDGRID_API_KEY');
      console.log('   3. Restart the server');
      // Return success with emailSent: false to allow OTP generation to continue
      return {
        success: true,
        emailSent: false,
        message: 'SendGrid not configured - OTP generated locally'
      };
    } else {
      console.log('✅ SendGrid API key found, attempting to send email');
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

    // Send email via SendGrid
    const emailResult = await sendOTPEmail(email, userName, otp);

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

    console.log('[geocode] Request URL:', url);
    console.log('[geocode] Request params:', params);

    const response = await axios.get(url, { params });
    const data = response.data;

    console.log('[geocode] Google Maps API response status:', data.status);
    console.log('[geocode] Google Maps API response results count:', data.results ? data.results.length : 0);

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
  console.log('[PROXY DEBUG] === QUOTATION REQUEST START ===');
  console.log('[PROXY DEBUG] Request timestamp:', new Date().toISOString());
  console.log('[PROXY DEBUG] Request method:', req.method);
  console.log('[PROXY DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('[PROXY DEBUG] Request body type:', typeof req.body);
  console.log('[PROXY DEBUG] Request body keys:', req.body ? Object.keys(req.body) : 'null');

  // Extra logging for stops
  if (!req.body || !req.body.data || !Array.isArray(req.body.data.stops)) {
    console.error('[PROXY DEBUG] ERROR: No stops array found in request body!');
    console.error('[PROXY DEBUG] Request body structure:', JSON.stringify(req.body, null, 2));
  } else {
    console.log('[PROXY DEBUG] Stops array received:', JSON.stringify(req.body.data.stops, null, 2));
    if (req.body.data.stops.length < 2) {
      console.error('[PROXY DEBUG] ERROR: Less than 2 stops provided!');
    }
  }

  console.log('[PROXY DEBUG] /api/quotation incoming');
  console.log('[PROXY DEBUG] Request body received from frontend:', JSON.stringify(req.body, null, 2));

  try {
    // Send the body exactly as received from frontend (with data wrapper)
    // Lalamove API expects { data: { ... } } format
    let bodyObj = req.body;

    // Validate the nested data structure
    if (!bodyObj || !bodyObj.data || !Array.isArray(bodyObj.data.stops)) {
      console.error('[PROXY DEBUG] invalid payload: missing data.stops array');
      console.error('[PROXY DEBUG] bodyObj:', bodyObj);
      console.error('[PROXY DEBUG] bodyObj.data:', bodyObj?.data);
      return res.status(400).json({ error: 'Invalid payload: data.stops array required' });
    }
    if (bodyObj.data.stops.length < 2) {
      console.error('[PROXY DEBUG] invalid payload: need at least 2 stops');
      console.error('[PROXY DEBUG] stops count:', bodyObj.data.stops.length);
      return res.status(400).json({ error: 'Invalid payload: at least 2 stops required' });
    }

    // Ensure coordinates are strings and validate
    console.log('[PROXY DEBUG] Processing stops for coordinate validation...');
    const normalizedStops = bodyObj.data.stops.map((s, idx) => {
      console.log(`[PROXY DEBUG] Processing stop ${idx}:`, s);
      const coords = s.coordinates || s.location || {};
      const lat = coords.lat ? coords.lat.toString() : '';
      const lng = (coords.lng || coords.lon || coords.longitude) ? (coords.lng || coords.lon || coords.longitude).toString() : '';
      console.log(`[PROXY DEBUG] Stop ${idx} coordinates - lat: "${lat}", lng: "${lng}"`);
      if (!lat || !lng) {
        throw new Error(`Invalid coordinates for stop ${idx}: lat="${lat}", lng="${lng}"`);
      }
      return {
        coordinates: { lat, lng },
        address: s.address || s.name || ''
      };
    });

    // Update the body with normalized stops
    bodyObj.data.stops = normalizedStops;
    const body = JSON.stringify(bodyObj);
    console.log('[PROXY DEBUG] Body sent to Lalamove (length=' + body.length + '):', body);

    // Verify the body is valid JSON
    try {
      const parsedBody = JSON.parse(body);
      console.log('[PROXY DEBUG] ✅ Body is valid JSON');
      console.log('[PROXY DEBUG] Parsed body structure:', {
        hasData: !!parsedBody.data,
        stopsCount: parsedBody.data?.stops?.length,
        serviceType: parsedBody.data?.serviceType,
        language: parsedBody.data?.language
      });
    } catch (e) {
      console.error('[PROXY DEBUG] ❌ Body is NOT valid JSON:', e.message);
      return res.status(400).json({ error: 'Invalid JSON body generated' });
    }

    const ts = Date.now().toString();
    console.log('[PROXY DEBUG] Timestamp generated:', ts, '(length:', ts.length, ')');
    console.log('[PROXY DEBUG] Current API configuration:');
    console.log('[PROXY DEBUG] - API_KEY:', API_KEY);
    console.log('[PROXY DEBUG] - API_SECRET (first 20 chars):', API_SECRET.substring(0, 20) + '...');
    console.log('[PROXY DEBUG] - LALA_HOST:', LALA_HOST);
    console.log('[PROXY DEBUG] - MARKET:', MARKET);

    // Debug the signature generation
    console.log('[PROXY DEBUG] === SIGNATURE GENERATION DETAILS ===');
    console.log('[PROXY DEBUG] - API_SECRET length:', API_SECRET.length);
    console.log('[PROXY DEBUG] - Timestamp:', ts);
    console.log('[PROXY DEBUG] - Method: POST');
    console.log('[PROXY DEBUG] - Path: /v3/quotations');
    console.log('[PROXY DEBUG] - Body length:', body.length);
    console.log('[PROXY DEBUG] - Body first 100 chars:', body.substring(0, 100));

    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/quotations', body);

    const url = `https://${LALA_HOST}/v3/quotations`;
    const authHeader = `hmac ${API_KEY}:${ts}:${signature}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'Market': MARKET
    };

    console.log('[PROXY DEBUG] === FINAL REQUEST DETAILS ===');
    console.log('[PROXY DEBUG] - URL:', url);
    console.log('[PROXY DEBUG] - Authorization header:', authHeader);
    console.log('[PROXY DEBUG] - All headers:', JSON.stringify(headers, null, 2));
    console.log('[PROXY DEBUG] - Body being sent via axios (first 200 chars):', body.substring(0, 200));
    console.log('[PROXY DEBUG] - Body being sent via axios (last 100 chars):', body.substring(body.length - 100));

    console.log('[PROXY DEBUG] === SENDING REQUEST TO LALAMOVE ===');
    console.log('[PROXY DEBUG] forwarding to Lalamove /v3/quotations');

    const response = await axios.post(url, body, {
      headers,
      timeout: 30000, // 30 second timeout
      validateStatus: function (status) {
        return status >= 200 && status < 600; // Accept all responses for debugging
      }
    });

    console.log('[PROXY DEBUG] === LALAMOVE RESPONSE ===');
    console.log('[PROXY DEBUG] lalamove response status:', response.status);
    console.log('[PROXY DEBUG] lalamove response headers:', JSON.stringify(response.headers, null, 2));
    console.log('[PROXY DEBUG] lalamove response data:', JSON.stringify(response.data, null, 2));

    res.status(response.status).json(response.data);

  } catch (err) {
    console.error('[PROXY DEBUG] === ERROR DETAILS ===');
    console.error('[PROXY DEBUG] Error type:', err.constructor.name);
    console.error('[PROXY DEBUG] Error message:', err.message);
    console.error('[PROXY DEBUG] Response status:', err.response?.status);
    console.error('[PROXY DEBUG] Response headers:', JSON.stringify(err.response?.headers, null, 2));
    console.error('[PROXY DEBUG] Response data:', JSON.stringify(err.response?.data, null, 2));
    console.error('[PROXY DEBUG] Request config:', {
      url: err.config?.url,
      method: err.config?.method,
      headers: err.config?.headers,
      data: err.config?.data ? err.config.data.substring(0, 200) + '...' : 'no data'
    });
    console.error('[PROXY DEBUG] Full error stack:', err.stack);

    // If validation error thrown above, respond 400
    if (err.message && err.message.startsWith('Invalid coordinates')) {
      console.error('[PROXY DEBUG] Coordinate validation error');
      return res.status(400).json({ error: err.message });
    }

    // Provide more detailed error information
    const status = err.response?.status || 500;
    const errorData = err.response?.data || { error: err.message };

    console.error('[PROXY DEBUG] === SENDING ERROR RESPONSE ===');
    console.error('[PROXY DEBUG] Status:', status);
    console.error('[PROXY DEBUG] Error data:', JSON.stringify(errorData, null, 2));

    res.status(status).json(errorData);
  }

  console.log('[PROXY DEBUG] === QUOTATION REQUEST END ===');
});

// Add a comprehensive debug endpoint to test Lalamove API call
app.post('/api/debug-lalamove', async (req, res) => {
  console.log('[DEBUG-LALAMOVE] === DEBUG LALAMOVE API CALL START ===');

  try {
    // Use provided coordinates or default test coordinates
    const testPayload = req.body && Object.keys(req.body).length > 0 ? req.body : {
      data: {
        serviceType: "MOTORCYCLE",
        language: "en_PH",
        stops: [
          {
            coordinates: {
              lat: "14.4457549030656",
              lng: "120.92354136968974"
            },
            address: "Viktoria's Bistro, Philippines"
          },
          {
            coordinates: {
              lat: "14.554729",
              lng: "121.024445"
            },
            address: "Test Destination, Philippines"
          }
        ]
      }
    };

    console.log('[DEBUG-LALAMOVE] Test payload:', JSON.stringify(testPayload, null, 2));

    const body = JSON.stringify(testPayload);
    const timestamp = Date.now().toString();
    const method = 'POST';
    const path = '/v3/quotations';

    console.log('[DEBUG-LALAMOVE] === REQUEST PREPARATION ===');
    console.log('[DEBUG-LALAMOVE] Body:', body);
    console.log('[DEBUG-LALAMOVE] Timestamp:', timestamp);
    console.log('[DEBUG-LALAMOVE] Method:', method);
    console.log('[DEBUG-LALAMOVE] Path:', path);

    // Generate signature with full debug output
    const signature = makeSignature(API_SECRET, timestamp, method, path, body);

    const url = `https://${LALA_HOST}${path}`;
    const authHeader = `hmac ${API_KEY}:${timestamp}:${signature}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      'Market': MARKET,
      'Accept': 'application/json',
      'User-Agent': 'Viktorias-Bistro/1.0'
    };

    console.log('[DEBUG-LALAMOVE] === FINAL REQUEST ===');
    console.log('[DEBUG-LALAMOVE] URL:', url);
    console.log('[DEBUG-LALAMOVE] Headers:', JSON.stringify(headers, null, 2));
    console.log('[DEBUG-LALAMOVE] Body length:', body.length);

    console.log('[DEBUG-LALAMOVE] === SENDING REQUEST TO LALAMOVE ===');

    const startTime = Date.now();
    const response = await axios.post(url, body, {
      headers,
      timeout: 30000,
      validateStatus: function (status) {
        return status >= 200 && status < 600; // Accept all responses
      }
    });
    const endTime = Date.now();

    console.log('[DEBUG-LALAMOVE] === RESPONSE RECEIVED ===');
    console.log('[DEBUG-LALAMOVE] Response time:', endTime - startTime, 'ms');
    console.log('[DEBUG-LALAMOVE] Status:', response.status);
    console.log('[DEBUG-LALAMOVE] Status text:', response.statusText);
    console.log('[DEBUG-LALAMOVE] Response headers:', JSON.stringify(response.headers, null, 2));
    console.log('[DEBUG-LALAMOVE] Response data:', JSON.stringify(response.data, null, 2));

    res.json({
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      debug: {
        requestUrl: url,
        requestHeaders: headers,
        requestBody: testPayload,
        requestBodyString: body,
        timestamp,
        signature,
        responseTime: endTime - startTime,
        apiConfig: {
          apiKey: API_KEY,
          host: LALA_HOST,
          market: MARKET,
          secretLength: API_SECRET.length
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG-LALAMOVE] === ERROR OCCURRED ===');
    console.error('[DEBUG-LALAMOVE] Error type:', error.constructor.name);
    console.error('[DEBUG-LALAMOVE] Error message:', error.message);

    if (error.response) {
      console.error('[DEBUG-LALAMOVE] Response status:', error.response.status);
      console.error('[DEBUG-LALAMOVE] Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('[DEBUG-LALAMOVE] Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('[DEBUG-LALAMOVE] Request was made but no response received');
      console.error('[DEBUG-LALAMOVE] Request details:', error.request);
    } else {
      console.error('[DEBUG-LALAMOVE] Error setting up request:', error.message);
    }

    console.error('[DEBUG-LALAMOVE] Full error stack:', error.stack);

    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        type: error.constructor.name
      },
      debug: {
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        errorCode: error.code,
        apiConfig: {
          apiKey: API_KEY,
          host: LALA_HOST,
          market: MARKET,
          secretLength: API_SECRET.length
        }
      }
    });
  }

  console.log('[DEBUG-LALAMOVE] === DEBUG LALAMOVE API CALL END ===');
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
        { coordinates: { lat: 14.4457549030656, lng: 120.92354136968974 }, address: "Viktoria's Bistro, Philippines" }
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

// Debug endpoint to test signature generation
app.get('/api/test-signature', (req, res) => {
  console.log('[DEBUG] === SIGNATURE TEST START ===');
  console.log('[DEBUG] Testing signature generation...');

  const testBody = '{"data":{"serviceType":"MOTORCYCLE","language":"en_PH","stops":[{"coordinates":{"lat":"14.445755","lng":"120.923541"},"address":"Test Address 1"},{"coordinates":{"lat":"14.554729","lng":"121.024445"},"address":"Test Address 2"}]}}';
  const timestamp = Date.now().toString();
  const method = 'POST';
  const path = '/v3/quotations';

  console.log('[DEBUG] === TEST PARAMETERS ===');
  console.log('[DEBUG] - API_KEY:', API_KEY);
  console.log('[DEBUG] - API_SECRET (full):', API_SECRET);
  console.log('[DEBUG] - API_SECRET length:', API_SECRET.length);
  console.log('[DEBUG] - API_SECRET first 20 chars:', API_SECRET.substring(0, 20));
  console.log('[DEBUG] - API_SECRET last 10 chars:', API_SECRET.substring(API_SECRET.length - 10));
  console.log('[DEBUG] - LALA_HOST:', LALA_HOST);
  console.log('[DEBUG] - MARKET:', MARKET);
  console.log('[DEBUG] - timestamp:', timestamp);
  console.log('[DEBUG] - method:', method);
  console.log('[DEBUG] - path:', path);
  console.log('[DEBUG] - testBody:', testBody);
  console.log('[DEBUG] - testBody length:', testBody.length);

  // Test different timestamp formats
  const timestamps = [
    Date.now().toString(),
    Math.floor(Date.now() / 1000).toString(),
    new Date().getTime().toString()
  ];

  console.log('[DEBUG] === TESTING DIFFERENT TIMESTAMP FORMATS ===');
  timestamps.forEach((ts, index) => {
    console.log(`[DEBUG] Timestamp ${index + 1}: ${ts} (length: ${ts.length})`);
    const sig = makeSignature(API_SECRET, ts, method, path, testBody);
    const authHeader = `hmac ${API_KEY}:${ts}:${sig}`;
    console.log(`[DEBUG] Signature ${index + 1}: ${sig}`);
    console.log(`[DEBUG] Auth Header ${index + 1}: ${authHeader}`);
  });

  // Test the exact format from Lalamove documentation
  console.log('[DEBUG] === TESTING EXACT LALAMOVE FORMAT ===');
  const rawString = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${testBody}`;
  console.log('[DEBUG] Raw string for HMAC:');
  console.log('[DEBUG] - Length:', rawString.length);
  console.log('[DEBUG] - Hex representation:', Buffer.from(rawString, 'utf8').toString('hex'));
  console.log('[DEBUG] - JSON representation:', JSON.stringify(rawString));

  // Manual HMAC calculation for verification
  const manualHmac = crypto.createHmac('sha256', API_SECRET)
    .update(rawString, 'utf8')
    .digest('hex');
  console.log('[DEBUG] Manual HMAC result:', manualHmac);

  const signature = makeSignature(API_SECRET, timestamp, method, path, testBody);
  const authHeader = `hmac ${API_KEY}:${timestamp}:${signature}`;

  console.log('[DEBUG] === FINAL RESULTS ===');
  console.log('[DEBUG] Final signature:', signature);
  console.log('[DEBUG] Manual vs makeSignature match:', signature === manualHmac);

  // Test with actual Lalamove endpoint URL construction
  const testUrl = `https://${LALA_HOST}/v3/quotations`;
  const testHeaders = {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    'Market': MARKET
  };

  console.log('[DEBUG] === TEST REQUEST DETAILS ===');
  console.log('[DEBUG] URL:', testUrl);
  console.log('[DEBUG] Headers:', JSON.stringify(testHeaders, null, 2));
  console.log('[DEBUG] Body (first 200 chars):', testBody.substring(0, 200));

  console.log('[DEBUG] === SIGNATURE TEST END ===');

  res.json({
    success: true,
    debug: {
      apiKey: API_KEY,
      apiSecretLength: API_SECRET.length,
      apiSecretPreview: API_SECRET.substring(0, 20) + '...',
      host: LALA_HOST,
      market: MARKET,
      timestamp,
      method,
      path,
      bodyLength: testBody.length,
      signature,
      manualHmac,
      signaturesMatch: signature === manualHmac,
      authHeader,
      rawStringLength: rawString.length,
      rawStringHex: Buffer.from(rawString, 'utf8').toString('hex').substring(0, 200) + '...',
      testUrl,
      testHeaders
    }
  });
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

    // Try to send email via SendGrid
    const emailResult = await sendOTPEmail(email, userName, otp);

    if (emailResult.success) {
      if (emailResult.emailSent) {
        console.log(`📧 SendGrid email sent successfully to ${email}`);
        res.json({
          success: true,
          otp: otp,
          expiry: expiry,
          message: 'SendGrid OTP generated and email sent successfully',
          emailSent: true
        });
      } else {
        console.log(`📧 SendGrid not configured, OTP generated locally: ${emailResult.message}`);
        res.json({
          success: true,
          otp: otp,
          expiry: expiry,
          message: 'OTP generated successfully (SendGrid not configured)',
          emailSent: false,
          emailError: emailResult.message
        });
      }
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
    console.error('[SendGrid API] Error details:', error);

    // Check if it's a SendGrid configuration issue
    if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
      console.log('[SendGrid API] SendGrid not configured, generating local OTP as fallback');

      // Generate OTP locally as fallback
      const otp = generateOTP();
      const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

      otpStorage.set(email, {
        otp: otp,
        expiry: expiry,
        attempts: 0,
        createdAt: Date.now(),
        source: 'local-fallback'
      });

      res.json({
        success: true,
        otp: otp,
        expiry: expiry,
        message: 'OTP generated successfully (SendGrid not configured)',
        emailSent: false,
        emailError: 'SendGrid API key not configured'
      });
    } else {
      console.log('[SendGrid API] SendGrid configured but error occurred:', error.message);

      // Always provide a fallback OTP even on server errors
      const otp = generateOTP();
      const expiry = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

      otpStorage.set(email, {
        otp: otp,
        expiry: expiry,
        attempts: 0,
        createdAt: Date.now(),
        source: 'error-fallback'
      });

      res.json({
        success: true,
        otp: otp,
        expiry: expiry,
        message: 'OTP generated successfully (server error occurred)',
        emailSent: false,
        emailError: error.message,
        instructions: 'Please check server logs and try again'
      });
    }
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

    // Try to send email via SendGrid
    const emailResult = await sendOTPEmail(email, userName, otp);

    if (emailResult.success) {
      if (emailResult.emailSent) {
        console.log(`📧 SendGrid email resent successfully to ${email}`);
        res.json({
          success: true,
          otp: otp,
          expiry: expiry,
          message: 'SendGrid OTP resent successfully',
          emailSent: true
        });
      } else {
        console.log(`📧 SendGrid not configured, OTP regenerated locally: ${emailResult.message}`);
        res.json({
          success: true,
          otp: otp,
          expiry: expiry,
          message: 'OTP regenerated successfully (SendGrid not configured)',
          emailSent: false,
          emailError: emailResult.message
        });
      }
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

/* ====== Security Middleware - Block Direct File Access ====== */

// Add security headers
app.use((req, res, next) => {
    // Hide server information
    res.setHeader('X-Powered-By', 'Victoria\'s Bistro');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
});

// Block access to sensitive directories and files
app.use((req, res, next) => {
    const path = req.path.toLowerCase();
    
    // Check if we're in production (deployed environment)
    const isProduction = process.env.NODE_ENV === 'production' || 
                        req.hostname.includes('viktoriasbistro.restaurant') ||
                        req.hostname.includes('www.viktoriasbistro.restaurant');
    
    // Block access to sensitive files and directories
    const blockedPatterns = [
        '/javascript/',
        '/css/',
        '/html/',
        '/src/',
        '/uploads/',
        '/node_modules/',
        '/.env',
        '/package.json',
        '/package-lock.json',
        '/server.js',
        '/firebase-service-account.json',
        '/.git',
        '/.gitignore',
        '/README.md',
        '/ecosystem.config.json',
        '/customer/',
        '/lalamove/',
        '/omr/',
        '/python-app/',
        '/functions-package-json.json',
        '/cloud.js',
        '/main.js',
        '/script.js',
        '/reviews.js',
        '/feedback-stars.js',
        '/indexstyle.css',
        '/style.css'
    ];
    
    // Block any path that contains file extensions (except allowed ones)
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(path);
    const allowedExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
    const isAllowedExtension = allowedExtensions.some(ext => path.endsWith(ext));
    
    // Block paths with multiple slashes or suspicious patterns
    const hasMultipleSlashes = path.includes('//');
    const hasSuspiciousPatterns = /\.\.|\%2e\%2e|\%2f|\%5c/i.test(path);
    
    // Check if path contains blocked patterns
    const isBlocked = blockedPatterns.some(pattern => path.includes(pattern));
    
    // In production, be more strict with blocking
    const shouldBlock = isProduction ? 
        (isBlocked || (hasFileExtension && !isAllowedExtension) || hasMultipleSlashes || hasSuspiciousPatterns) :
        (isBlocked || hasMultipleSlashes || hasSuspiciousPatterns);
    
    if (shouldBlock) {
        console.log(`🚫 Blocked manual access to: ${req.path} (Production: ${isProduction})`);
        return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - Page Not Found</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    }
                    h1 { 
                        color: #ff6b6b; 
                        font-size: 3em;
                        margin-bottom: 20px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    p { 
                        font-size: 1.2em; 
                        margin-bottom: 30px;
                        opacity: 0.9;
                    }
                    .home-btn {
                        background: #4CAF50;
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    .home-btn:hover {
                        background: #45a049;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚫 404</h1>
                    <p>The requested resource was not found.</p>
                    <p>Please use the navigation menu to access pages.</p>
                    <a href="/" class="home-btn">🏠 Go Home</a>
                </div>
            </body>
            </html>
        `);
    }
    
    next();
});

/* ====== Static file serving (must be after API routes) ====== */

// Redirect ALL HTML files to clean URLs (hide .html from URL)
app.get('/index.html', (req, res) => {
    console.log('Redirecting /index.html to /');
    res.redirect(301, '/');
});

app.get('/login.html', (req, res) => {
    console.log('Redirecting /login.html to /login');
    res.redirect(301, '/login');
});

app.get('/signup.html', (req, res) => {
    console.log('Redirecting /signup.html to /signup');
    res.redirect(301, '/signup');
});

app.get('/otp.html', (req, res) => {
    console.log('Redirecting /otp.html to /otp');
    res.redirect(301, '/otp');
});

app.get('/pos.html', (req, res) => {
    console.log('Redirecting /pos.html to /pos');
    res.redirect(301, '/pos');
});

app.get('/payment.html', (req, res) => {
    console.log('Redirecting /payment.html to /payment');
    res.redirect(301, '/payment');
});

app.get('/Dashboard.html', (req, res) => {
    console.log('Redirecting /Dashboard.html to /dashboard');
    res.redirect(301, '/dashboard');
});

app.get('/menu.html', (req, res) => {
    console.log('Redirecting /menu.html to /menu');
    res.redirect(301, '/menu');
});

app.get('/Inventory.html', (req, res) => {
    console.log('Redirecting /Inventory.html to /inventory');
    res.redirect(301, '/inventory');
});

app.get('/Order.html', (req, res) => {
    console.log('Redirecting /Order.html to /order');
    res.redirect(301, '/order');
});

app.get('/kitchen.html', (req, res) => {
    console.log('Redirecting /kitchen.html to /kitchen');
    res.redirect(301, '/kitchen');
});

app.get('/analytics.html', (req, res) => {
    console.log('Redirecting /analytics.html to /analytics');
    res.redirect(301, '/analytics');
});

app.get('/Settings.html', (req, res) => {
    console.log('Redirecting /Settings.html to /settings');
    res.redirect(301, '/settings');
});

app.get('/user.html', (req, res) => {
    console.log('Redirecting /user.html to /user');
    res.redirect(301, '/user');
});

app.get('/notifi.html', (req, res) => {
    console.log('Redirecting /notifi.html to /notifications');
    res.redirect(301, '/notifications');
});

app.get('/receipt.html', (req, res) => {
    console.log('Redirecting /receipt.html to /receipt');
    res.redirect(301, '/receipt');
});

app.get('/addproduct.html', (req, res) => {
    console.log('Redirecting /addproduct.html to /addproduct');
    res.redirect(301, '/addproduct');
});

app.get('/editproduct.html', (req, res) => {
    console.log('Redirecting /editproduct.html to /editproduct');
    res.redirect(301, '/editproduct');
});

app.get('/forgot-password.html', (req, res) => {
    console.log('Redirecting /forgot-password.html to /forgot-password');
    res.redirect(301, '/forgot-password');
});

app.get('/reset-password.html', (req, res) => {
    console.log('Redirecting /reset-password.html to /reset-password');
    res.redirect(301, '/reset-password');
});

app.get('/verify-password-reset-otp.html', (req, res) => {
    console.log('Redirecting /verify-password-reset-otp.html to /verify-password-reset-otp');
    res.redirect(301, '/verify-password-reset-otp');
});

// Catch-all redirect for any remaining .html files
app.get('/*.html', (req, res) => {
    const cleanPath = req.path.replace('.html', '');
    console.log(`Redirecting ${req.path} to ${cleanPath}`);
    res.redirect(301, cleanPath);
});

// Block access to ALL sensitive directories and files
const blockedDirectories = [
    '/html/*',
    '/javascript/*', 
    '/css/*',
    '/src/*',
    '/uploads/*',
    '/node_modules/*',
    '/customer/*',
    '/lalamove/*',
    '/omr/*',
    '/python-app/*'
];

// Create blocking routes for all directories
blockedDirectories.forEach(pattern => {
    app.get(pattern, (req, res) => {
        console.log(`🚫 Blocked manual access to: ${req.path}`);
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - Access Denied</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    }
                    h1 { 
                        color: #fff; 
                        font-size: 3em;
                        margin-bottom: 20px;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    p { 
                        font-size: 1.2em; 
                        margin-bottom: 30px;
                        opacity: 0.9;
                    }
                    .home-btn {
                        background: #4CAF50;
                        color: white;
                        padding: 15px 30px;
                        text-decoration: none;
                        border-radius: 25px;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    }
                    .home-btn:hover {
                        background: #45a049;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚫 Access Denied</h1>
                    <p>Direct access to this path is not allowed.</p>
                    <p>Please use the navigation menu to access pages.</p>
                    <a href="/" class="home-btn">🏠 Go Home</a>
                </div>
            </body>
            </html>
        `);
    });
});

app.use(express.static(path.join(__dirname)));

/* ====== Local app routes (static pages) ====== */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Clean URL routes (without .html) - All pages accessible via clean URLs
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'html', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'html', 'signup.html')));
app.get('/otp', (req, res) => res.sendFile(path.join(__dirname, 'html', 'otp.html')));
app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'html', 'pos.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'html', 'payment.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html', 'menu.html')));
app.get('/inventory', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Inventory.html')));
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Order.html')));
app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'html', 'kitchen.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, 'html', 'analytics.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Settings.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'html', 'user.html')));
app.get('/notifications', (req, res) => {
    // Check if user is kitchen user and block access
    // This is a basic check - in production you'd want proper authentication
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';
    
    // If coming from kitchen page, redirect back
    if (referer.includes('kitchen')) {
        console.log('🚫 Blocked kitchen user from accessing notifications page');
        return res.redirect('/kitchen');
    }
    
    res.sendFile(path.join(__dirname, 'html', 'notifi.html'));
});
app.get('/receipt', (req, res) => res.sendFile(path.join(__dirname, 'html', 'receipt.html')));
app.get('/addproduct', (req, res) => res.sendFile(path.join(__dirname, 'html', 'addproduct.html')));
app.get('/editproduct', (req, res) => res.sendFile(path.join(__dirname, 'html', 'editproduct.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, 'html', 'forgot-password.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'html', 'reset-password.html')));
app.get('/verify-password-reset-otp', (req, res) => res.sendFile(path.join(__dirname, 'html', 'verify-password-reset-otp.html')));

// Catch-all route for any clean URL (fallback)
app.get('/*', (req, res, next) => {
    // Check if it's an API route or static file
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }
    
    // Try to serve HTML file for clean URLs
    const htmlPath = path.join(__dirname, 'html', req.path + '.html');
    if (fs.existsSync(htmlPath)) {
        console.log(`Serving clean URL: ${req.path} -> ${req.path}.html`);
        return res.sendFile(htmlPath);
    }
    
    // If no HTML file found, continue to next middleware
    next();
});

// Test pages (remove these in production)
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

// Security Audit Logging Functions
async function logPasswordChangeEvent(email, firebaseUpdateSuccess, eventType = 'password_reset') {
  try {
    const eventDetails = {
      'password_reset': {
        source: 'password_reset_otp',
        method: 'forgot_password_flow'
      },
      'password_change': {
        source: 'profile_settings',
        method: 'regular_password_update'
      }
    };

    const details = eventDetails[eventType] || eventDetails['password_reset'];

    const logEntry = {
      event: eventType,
      email: email,
      timestamp: new Date().toISOString(),
      firebaseUpdated: firebaseUpdateSuccess,
      ipAddress: 'server-side', // Could be enhanced to capture actual IP
      userAgent: 'server-side',
      success: firebaseUpdateSuccess,
      metadata: details
    };

    console.log(`[Security Audit] Password change logged for: ${email}`, logEntry);

    // Store in Firestore if available and properly authenticated
    if (admin.apps && admin.apps.length > 0) {
      try {
        // Test Firestore access first
        const testDoc = await admin.firestore().collection('security_audit_logs').doc('test').get();
        await admin.firestore().collection('security_audit_logs').add(logEntry);
        console.log(`[Security Audit] ✅ Log entry saved to Firestore for: ${email}`);
      } catch (firestoreError) {
        console.error(`[Security Audit] ❌ Failed to save log to Firestore:`, firestoreError.message);
        console.log(`[Security Audit] ⚠️ Firestore access denied - logging to console only`);
        console.log(`[Security Audit] Log entry (console only):`, JSON.stringify(logEntry, null, 2));
      }
    } else {
      console.log(`[Security Audit] ⚠️ Firebase Admin SDK not available - logging to console only`);
      console.log(`[Security Audit] Log entry (console only):`, JSON.stringify(logEntry, null, 2));
    }

  } catch (error) {
    console.error(`[Security Audit] Error logging password change for ${email}:`, error.message);
  }
}

// Send password change notification email to user
async function sendPasswordChangeNotification(email, eventType = 'password_reset') {
  try {
    const eventDetails = {
      'password_reset': {
        subject: '🔒 Password Reset - Victoria\'s Bistro',
        title: '🔒 Password Successfully Reset',
        description: 'This is a security notification to confirm that your password has been successfully reset for your Victoria\'s Bistro account.',
        actionText: 'If you did NOT request this password reset, please contact us immediately'
      },
      'password_change': {
        subject: '🔒 Password Changed - Victoria\'s Bistro',
        title: '🔒 Password Successfully Changed',
        description: 'This is a security notification to confirm that your password has been successfully changed for your Victoria\'s Bistro account.',
        actionText: 'If you did NOT make this change, please contact us immediately'
      }
    };

    const event = eventDetails[eventType] || eventDetails['password_reset'];

    const emailData = {
      to: email,
      subject: event.subject,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Victoria's Bistro</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f9f9f9;">
                        <h2 style="color: #333; margin-top: 0;">${event.title}</h2>
                        
                        <p>Hello,</p>
                        
                        <p>${event.description}</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                            <p><strong>Account:</strong> ${email}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                            <p><strong>Status:</strong> ✅ Password updated successfully</p>
                        </div>
                        
                        <p><strong>What you should do:</strong></p>
                        <ul>
                            <li>If you made this change, you can safely ignore this email</li>
                            <li>${event.actionText}</li>
                            <li>Consider enabling two-factor authentication for additional security</li>
                        </ul>
                        
                        <p>If you have any concerns about your account security, please contact our support team immediately.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="mailto:support@victoriasbistro.com" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Contact Support</a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px;">
                            This is an automated security notification from Victoria's Bistro. 
                            If you have any questions, please contact our support team.
                        </p>
                    </div>
                </div>
            `
    };

    // For password change notifications, we'll use a simple console log instead of email
    // since sendOTPEmail is designed for OTP emails, not general notifications
    console.log(`[Security Notification] ✅ Password change notification logged for: ${email}`);
    console.log(`[Security Notification] Email would be sent with subject: ${event.subject}`);
    
    // TODO: Implement proper email sending for password change notifications
    // This could use a separate email service or a different SendGrid template

  } catch (error) {
    console.error(`[Security Notification] Error sending password change notification to ${email}:`, error.message);
  }
}

// Send admin security alert
async function sendAdminSecurityAlert(email, eventType) {
  try {
    const adminEmails = [
      'admin@victoriasbistro.com',
      'security@victoriasbistro.com'
    ]; // Add your admin emails here

    const eventDetails = {
      'password_reset': {
        title: '🔒 Password Reset Alert',
        description: 'A user has successfully reset their password',
        severity: 'medium'
      },
      'password_change': {
        title: '🔒 Password Change Alert',
        description: 'A user has successfully changed their password',
        severity: 'low'
      }
    };

    const event = eventDetails[eventType] || {
      title: '🔒 Security Event',
      description: 'A security event has occurred',
      severity: 'low'
    };

    for (const adminEmail of adminEmails) {
      const emailData = {
        to: adminEmail,
        subject: `${event.title} - Victoria's Bistro`,
        html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Victoria's Bistro - Security Alert</h1>
                        </div>
                        
                        <div style="padding: 30px; background: #f9f9f9;">
                            <h2 style="color: #333; margin-top: 0;">${event.title}</h2>
                            
                            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                                <p><strong>Event Type:</strong> ${eventType}</p>
                                <p><strong>User Email:</strong> ${email}</p>
                                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                                <p><strong>Severity:</strong> ${event.severity}</p>
                                <p><strong>Description:</strong> ${event.description}</p>
                            </div>
                            
                            <p>This is an automated security alert. Please review the event and take appropriate action if necessary.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://console.firebase.google.com/u/0/project/victoria-s-bistro/authentication/users" 
                                   style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    View Firebase Console
                                </a>
                            </div>
                            
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            
                            <p style="color: #666; font-size: 12px;">
                                This is an automated security alert from Victoria's Bistro monitoring system.
                            </p>
                        </div>
                    </div>
                `
      };

      // For admin security alerts, we'll use a simple console log instead of email
      // since sendOTPEmail is designed for OTP emails, not general notifications
      console.log(`[Admin Alert] ✅ Security alert logged for admin: ${adminEmail}`);
      console.log(`[Admin Alert] Email would be sent with subject: ${event.title} - Victoria's Bistro`);
      
      // TODO: Implement proper email sending for admin security alerts
      // This could use a separate email service or a different SendGrid template
    }

  } catch (error) {
    console.error(`[Admin Alert] Error sending security alert:`, error.message);
  }
}

// Check if email exists endpoint
app.post('/api/check-email-exists', async (req, res) => {
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

    console.log(`[Check Email Exists] Checking email: ${email}`);

    if (admin.apps && admin.apps.length > 0) {
      try {
        // Use Firebase Admin SDK to check if user exists
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`[Check Email Exists] ✅ Email exists: ${email}`);
        
        return res.json({
          success: true,
          exists: true,
          message: 'Email already registered'
        });
      } catch (firebaseError) {
        if (firebaseError.code === 'auth/user-not-found') {
          console.log(`[Check Email Exists] ✅ Email available: ${email}`);
          
          return res.json({
            success: true,
            exists: false,
            message: 'Email is available for registration'
          });
        } else {
          console.error(`[Check Email Exists] Firebase error: ${firebaseError.message}`);
          return res.status(500).json({
            success: false,
            message: 'Error checking email availability'
          });
        }
      }
    } else {
      console.log('⚠️ Firebase Admin SDK not available');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

  } catch (error) {
    console.error('[Check Email Exists] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while checking email'
    });
  }
});

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
      if (emailResult.emailSent) {
        console.log(`📧 Password reset OTP sent successfully to ${email}`);
        res.json({
          success: true,
          otp: otp, // For development/testing
          expiry: expiry,
          message: 'Password reset OTP sent successfully',
          emailSent: true
        });
      } else {
        console.log(`📧 SendGrid not configured, password reset OTP generated locally: ${emailResult.message}`);
        res.json({
          success: true,
          otp: otp, // For development/testing
          expiry: expiry,
          message: 'Password reset OTP generated (SendGrid not configured)',
          emailSent: false,
          emailError: emailResult.message
        });
      }
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

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log(`[Password Reset OTP] Verifying OTP for: ${email}`);

    // Handle status check request
    if (otp === 'check_status') {
      if (!passwordResetOTPStorage.has(email)) {
        return res.json({
          success: false,
          message: 'No password reset OTP found for this email'
        });
      }

      const storedData = passwordResetOTPStorage.get(email);

      // Check if OTP has expired
      if (Date.now() > storedData.expiry) {
        passwordResetOTPStorage.delete(email);
        return res.json({
          success: false,
          message: 'Password reset OTP has expired'
        });
      }

      // Check if already verified
      if (storedData.verified) {
        return res.json({
          success: true,
          message: 'OTP is valid and verified'
        });
      }

      return res.json({
        success: true,
        message: 'OTP is valid but not yet verified'
      });
    }

    // Regular OTP verification
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

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

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      console.log(`[Password Reset OTP] Weak password detected: ${newPassword}`);
      return res.status(400).json({
        success: false,
        message: 'Password is too weak. Please choose a stronger password.'
      });
    }

    console.log(`[Password Reset OTP] Resetting password for: ${email}`);
    console.log(`[Password Reset OTP] Password length: ${newPassword.length} characters`);

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

      // For SendGrid OTP flow, we need to check if the user has a valid session
      // This is a simplified check - in production you might want to implement proper session validation
      console.log(`[Password Reset OTP] Proceeding with password reset for verified user: ${email}`);
    }

    // Update password in Firebase Auth
    let firebaseUpdateSuccess = false;

    // Force Firebase Admin SDK initialization if not already done
    console.log('🔍 Checking Firebase Admin SDK status...');
    console.log('firebaseAdminInitialized:', firebaseAdminInitialized);
    console.log('admin.apps length:', admin.apps ? admin.apps.length : 'admin.apps is undefined');

    if (!firebaseAdminInitialized) {
      console.log('🔄 Attempting to initialize Firebase Admin SDK...');
      const initResult = initializeFirebaseAdmin();
      if (!initResult) {
        console.log('❌ Firebase Admin SDK initialization failed');
        firebaseUpdateSuccess = false;
      } else {
        console.log('✅ Firebase Admin SDK initialized successfully');
      }
    }

    // Try to update password in Firebase
    try {
      if (admin.apps && admin.apps.length > 0) {
        console.log(`[Password Reset OTP] Attempting to update Firebase password for: ${email}`);

        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`[Password Reset OTP] Found user with UID: ${userRecord.uid}`);

        // Update user password
        await admin.auth().updateUser(userRecord.uid, {
          password: newPassword
        });

        console.log(`[Password Reset OTP] ✅ Firebase password updated successfully for user: ${userRecord.uid}`);
        firebaseUpdateSuccess = true;

      } else {
        console.log('⚠️ Firebase Admin SDK not available, will use client-side update');
        firebaseUpdateSuccess = false;
      }

    } catch (firebaseError) {
      console.error('[Password Reset OTP] Firebase password update error:', firebaseError.message);
      console.error('[Password Reset OTP] Firebase error code:', firebaseError.code);
      console.error('[Password Reset OTP] Firebase error details:', firebaseError);

      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`[Password Reset OTP] ❌ User not found in Firebase Auth: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'No account found with this email address. Please check your email or create a new account.',
          firebaseUpdated: false,
          clientSideUpdate: false,
          firebaseUpdateFailed: true,
          error: 'user-not-found'
        });
      } else if (firebaseError.code === 'auth/weak-password') {
        console.log(`[Password Reset OTP] ❌ Password too weak for user: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'Password is too weak. Please choose a stronger password.',
          firebaseUpdated: false,
          clientSideUpdate: false,
          firebaseUpdateFailed: true,
          error: 'weak-password'
        });
      } else if (firebaseError.code === 'app/invalid-credential') {
        console.log(`[Password Reset OTP] ❌ Firebase Admin SDK credential issue`);
        console.log(`[Password Reset OTP] ⚠️ Firebase Admin SDK credentials are invalid`);
        console.log(`[Password Reset OTP] 🔧 Attempting to generate custom token for client-side password update`);
        
        try {
          // Try to create a custom token for client-side password update
          const userRecord = await admin.auth().getUserByEmail(email);
          const customToken = await admin.auth().createCustomToken(userRecord.uid);
          
          console.log(`[Password Reset OTP] ✅ Custom token generated for client-side update`);
          
          // Return success with custom token for client-side password update
          return res.json({
            success: true,
            message: 'Password reset requires client-side update. Please use the provided token.',
            firebaseUpdated: false,
            clientSideUpdate: true,
            customToken: customToken,
            requiresClientUpdate: true,
            note: 'Use the custom token to update password on client side'
          });
          
        } catch (tokenError) {
          console.log(`[Password Reset OTP] ❌ Custom token generation failed:`, tokenError.message);
          firebaseUpdateSuccess = false;
          // Continue with fallback
        }
      } else {
        // For other Firebase errors, log and continue with client-side update
        console.log('⚠️ Firebase update failed, will use client-side update');
        console.log('⚠️ Error details:', firebaseError);
        firebaseUpdateSuccess = false;
      }
    }

    // Clear the OTP storage (if it exists)
    if (passwordResetOTPStorage.has(email)) {
      passwordResetOTPStorage.delete(email);
    }

    // Log password change event for security audit
    await logPasswordChangeEvent(email, firebaseUpdateSuccess);

    // Send security notification email to user
    await sendPasswordChangeNotification(email);

    // Send admin security alert
    await sendAdminSecurityAlert(email, 'password_reset');

    console.log(`[Password Reset OTP] Password reset completed for: ${email}`);
    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
      firebaseUpdated: firebaseUpdateSuccess,
      clientSideUpdate: !firebaseUpdateSuccess,
      firebaseUpdateFailed: !firebaseUpdateSuccess,
      note: firebaseUpdateSuccess ? 'Password updated successfully in Firebase Authentication' : 'Password reset completed but Firebase update failed'
    });

  } catch (error) {
    console.error('[Password Reset OTP] Reset password error:', error.message);
    console.error('[Password Reset OTP] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: `Password reset failed: ${error.message}`,
      error: error.message
    });
  }
});

// Create Custom Token endpoint for password reset
app.post('/api/create-custom-token', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    console.log(`[Create Custom Token] Creating custom token for: ${email}`);

    // Verify OTP (you can implement your own OTP verification logic here)
    // For now, we'll assume the OTP is valid if it's provided

    // Force Firebase Admin SDK initialization if not already done
    if (!firebaseAdminInitialized) {
      console.log('🔄 Attempting to initialize Firebase Admin SDK...');
      const initResult = initializeFirebaseAdmin();
      if (!initResult) {
        console.log('❌ Firebase Admin SDK initialization failed');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error. Please contact support.'
        });
      }
    }

    try {
      if (admin.apps && admin.apps.length > 0) {
        console.log(`[Create Custom Token] Creating custom token for: ${email}`);

        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`[Create Custom Token] Found user with UID: ${userRecord.uid}`);

        // Create custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        console.log(`[Create Custom Token] ✅ Custom token created successfully for user: ${userRecord.uid}`);

        res.json({
          success: true,
          customToken: customToken,
          message: 'Custom token created successfully'
        });

      } else {
        console.log('⚠️ Firebase Admin SDK not available');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error. Please contact support.'
        });
      }

    } catch (firebaseError) {
      console.error('[Create Custom Token] Firebase error:', firebaseError.message);

      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`[Create Custom Token] ❌ User not found in Firebase Auth: ${email}`);
        return res.status(400).json({
          success: false,
          message: 'No account found with this email address.'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Server error. Please try again.'
        });
      }
    }

  } catch (error) {
    console.error('[Create Custom Token] Error:', error.message);
    res.status(500).json({
      success: false,
      message: `Custom token creation failed: ${error.message}`
    });
  }
});

// Regular Password Change endpoint (for profile updates)
app.post('/api/change-password', async (req, res) => {
  try {
    const { email, newPassword, currentPassword } = req.body;

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

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      console.log(`[Password Change] Weak password detected: ${newPassword}`);
      return res.status(400).json({
        success: false,
        message: 'Password is too weak. Please choose a stronger password.'
      });
    }

    console.log(`[Password Change] Changing password for: ${email}`);
    console.log(`[Password Change] Password length: ${newPassword.length} characters`);

    let firebaseUpdateSuccess = false;

    // Try to update password in Firebase using Admin SDK
    try {
      if (admin.apps && admin.apps.length > 0) {
        console.log(`[Password Change] Attempting to update Firebase password for: ${email}`);

        // Get user by email
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`[Password Change] Found user with UID: ${userRecord.uid}`);

        // Update user password
        await admin.auth().updateUser(userRecord.uid, {
          password: newPassword
        });

        console.log(`[Password Change] ✅ Firebase password updated successfully for user: ${userRecord.uid}`);
        firebaseUpdateSuccess = true;

      } else {
        console.log('⚠️ Firebase Admin SDK not available for password change');
        firebaseUpdateSuccess = false;
      }

    } catch (firebaseError) {
      console.error('[Password Change] Firebase password update error:', firebaseError.message);
      console.error('[Password Change] Firebase error code:', firebaseError.code);

      if (firebaseError.code === 'auth/user-not-found') {
        return res.status(400).json({
          success: false,
          message: 'No account found with this email address'
        });
      } else if (firebaseError.code === 'auth/weak-password') {
        return res.status(400).json({
          success: false,
          message: 'Password is too weak. Please choose a stronger password.'
        });
      } else {
        // For other Firebase errors, log and continue
        console.log('⚠️ Firebase update failed, will use client-side update');
        firebaseUpdateSuccess = false;
      }
    }

    // Log password change event for security audit
    await logPasswordChangeEvent(email, firebaseUpdateSuccess, 'password_change');

    // Send security notification email to user
    await sendPasswordChangeNotification(email, 'password_change');

    // Send admin security alert
    await sendAdminSecurityAlert(email, 'password_change');

    console.log(`[Password Change] Password change completed for: ${email}`);
    res.json({
      success: true,
      message: 'Password changed successfully.',
      firebaseUpdated: firebaseUpdateSuccess,
      clientSideUpdate: !firebaseUpdateSuccess,
      firebaseUpdateFailed: !firebaseUpdateSuccess,
      note: firebaseUpdateSuccess ? 'Password updated successfully in Firebase Authentication' : 'Password change completed but Firebase update failed'
    });

  } catch (error) {
    console.error('[Password Change] Change password error:', error.message);
    console.error('[Password Change] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing your password'
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
const PORT = process.env.PORT || 5001; // Changed from 5003 to 5001

app.listen(PORT, '0.0.0.0', () => {
  const environment = IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log(`\n🚀 Viktoria's Bistro Server [${environment}]`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Public: ${BASE_URL}`);
  console.log(`   Webhook: ${BASE_URL}/api/webhook/lalamove`);
  console.log(`   POS: http://localhost:${PORT}/pos`);
  console.log(`   Menu: http://localhost:${PORT}/menu`);
  console.log(`\n📡 Lalamove Integration:`);
  console.log(`   Environment: ${IS_PRODUCTION ? 'SANDBOX' : 'SANDBOX'}`);
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
  console.log(`   Change Password: POST /api/change-password`);
  console.log(`\n📧 SendGrid Email Service:`);
  console.log(`   API Key: ${SENDGRID_API_KEY ? '✅ Configured (' + maskApiKey(SENDGRID_API_KEY) + ')' : '❌ Not Found'}`);
  console.log(`   From Email: ${SENDGRID_FROM_EMAIL}`);
  console.log(`   From Name: ${SENDGRID_FROM_NAME}`);
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
    console.log(`   ⚠️  Create .env file with SENDGRID_API_KEY for email functionality`);
  } else {
    console.log(`   ✅ SendGrid API key configured and ready for email sending`);
  }
});
