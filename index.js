const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const hostname = '127.0.0.1';
const port = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
 
  const filePath = req.url === '/' ? './index.html' : `.${req.url}`;
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(path.join(__dirname, filePath), (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('404 Not Found');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(data);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Make sure your login form handles team member authentication

function handleLogin(email, password) {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            console.log('✅ User logged in:', user.email);
            
            try {
                // Get user data to determine role and redirect
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const userRole = userData.role || 'user';
                    
                    console.log('👤 User role:', userRole);
                    
                    // Simplified role-based redirect
                    if (userRole === 'kitchen') {
                        window.location.href = '/html/kitchen.html';
                    } else {
                        window.location.href = '/html/Dashboard.html';
                    }
                } else {
                    console.warn('⚠️ No user document found, redirecting to dashboard');
                    window.location.href = '/html/Dashboard.html';
                }
                
            } catch (error) {
                console.error('❌ Error getting user data:', error);
                window.location.href = '/html/Dashboard.html';
            }
        })
        .catch((error) => {
            console.error('❌ Login error:', error);
            
            let errorMessage = 'Login failed';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Try again later';
            }
            
            // Show error to user (adjust based on your UI)
            showLoginError(errorMessage);
        });
}

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Space Mail SMTP Configuration
const smtpConfig = {
  host: 'mail.spacemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@viktoriasbistro.restaurant',
    pass: 'Vonnpogi@123',
  },
  tls: {
    rejectUnauthorized: false,
  },
};

// Create transporter
const transporter = nodemailer.createTransporter(smtpConfig);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Viktoria\'s Bistro OTP Service is running',
    timestamp: new Date().toISOString()
  });
});

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
  try {
    const { email, otpCode, userName } = req.body;

    // Validate input
    if (!email || !otpCode || !userName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, otpCode, userName'
      });
    }

    // Email content
    const mailOptions = {
      from: 'support@viktoriasbistro.restaurant',
      to: email,
      subject: 'Your OTP Verification Code - Viktoria\'s Bistro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2em;">Viktoria's Bistro</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">OTP Verification Code</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up with Viktoria's Bistro! 
              To complete your account verification, please use the following OTP code:
            </p>
            
            <div style="background: white; border: 2px dashed #007bff; 
                border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
              <div style="color: #666; font-size: 14px; margin-bottom: 10px;">
                Your OTP Code:
              </div>
              <div style="font-size: 3em; font-weight: bold; color: #007bff; 
                  letter-spacing: 10px; font-family: 'Courier New', monospace;">
                ${otpCode}
              </div>
              <div style="color: #666; font-size: 12px; margin-top: 10px;">
                Expires in 10 minutes
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>Important:</strong> This code will expire in 10 minutes 
              for security reasons. If you didn't request this code, 
              please ignore this email.
            </p>
            
            <div style="margin-top: 30px; padding: 20px; background: #e9ecef; 
                border-radius: 5px;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This email was sent from Viktoria's Bistro. 
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Viktoria's Bistro - OTP Verification Code
        
        Hello ${userName}!
        
        Thank you for signing up with Viktoria's Bistro! 
        To complete your account verification, please use the following OTP code:
        
        OTP Code: ${otpCode}
        Expires in: 10 minutes
        
        Important: This code will expire in 10 minutes for security reasons. 
        If you didn't request this code, please ignore this email.
        
        This email was sent from Viktoria's Bistro. 
        Please do not reply to this email.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📧 To:', email);
    console.log('🔐 OTP:', otpCode);

    res.json({
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully',
    });

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to send OTP email',
    });
  }
});

// Test SMTP connection endpoint
app.post('/test-smtp', async (req, res) => {
  try {
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Space Mail SMTP connection is working'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Space Mail SMTP connection failed'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Viktoria's Bistro OTP Service running on port ${PORT}`);
  console.log(`📧 Space Mail configured: support@viktoriasbistro.restaurant`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
});
