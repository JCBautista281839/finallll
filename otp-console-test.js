// OTP Endpoint Console Test
// Run this in your browser console to test the OTP endpoint

const BASE_URL = 'https://viktoriasbistro.restaurant/api';

// Test functions
async function testHealthCheck() {
    console.log('🏥 Testing Health Check...');
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Health Check: SUCCESS');
            console.log('📊 Response:', data);
            return true;
        } else {
            console.log('❌ Health Check: FAILED');
            console.log('📊 Response:', data);
            return false;
        }
    } catch (error) {
        console.log('❌ Health Check: ERROR');
        console.log('🚫 Error:', error.message);
        return false;
    }
}

async function testSMTPConnection() {
    console.log('📧 Testing SMTP Connection...');
    try {
        const response = await fetch(`${BASE_URL}/test-smtp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ SMTP Connection: SUCCESS');
            console.log('📧 Host:', data.smtp_host);
            console.log('👤 Username:', data.smtp_username);
            return true;
        } else {
            console.log('❌ SMTP Connection: FAILED');
            console.log('📊 Response:', data);
            return false;
        }
    } catch (error) {
        console.log('❌ SMTP Test: ERROR');
        console.log('🚫 Error:', error.message);
        return false;
    }
}

async function testSendOTP(email = 'christianbautista265853@gmail.com', userName = 'Christian Bautista') {
    console.log('📨 Testing Send OTP...');
    
    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        const response = await fetch(`${BASE_URL}/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                otpCode: otpCode,
                userName: userName
            })
        });
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Send OTP: SUCCESS');
            console.log('📧 Email:', data.email);
            console.log('🔢 OTP Code:', data.otpCode);
            console.log('📨 Message ID:', data.messageId);
            return true;
        } else {
            console.log('❌ Send OTP: FAILED');
            console.log('📊 Response:', data);
            return false;
        }
    } catch (error) {
        console.log('❌ Send OTP: ERROR');
        console.log('🚫 Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting OTP Endpoint Tests...');
    console.log('🌐 Base URL:', BASE_URL);
    console.log('='.repeat(50));
    
    const healthCheck = await testHealthCheck();
    console.log('='.repeat(50));
    
    const smtpTest = await testSMTPConnection();
    console.log('='.repeat(50));
    
    const otpTest = await testSendOTP();
    console.log('='.repeat(50));
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('🏥 Health Check:', healthCheck ? '✅ PASS' : '❌ FAIL');
    console.log('📧 SMTP Test:', smtpTest ? '✅ PASS' : '❌ FAIL');
    console.log('📨 Send OTP:', otpTest ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = healthCheck && smtpTest && otpTest;
    console.log('🎯 Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
}

// Quick test with custom email
async function quickTest(email) {
    console.log(`🚀 Quick Test for: ${email}`);
    console.log('='.repeat(50));
    
    const healthCheck = await testHealthCheck();
    if (!healthCheck) {
        console.log('❌ Service is not running. Please check your deployment.');
        return false;
    }
    
    const otpTest = await testSendOTP(email, 'Test User');
    console.log('='.repeat(50));
    
    console.log('📊 Quick Test Result:', otpTest ? '✅ SUCCESS' : '❌ FAILED');
    return otpTest;
}

// Export functions for easy use
window.otpTests = {
    healthCheck: testHealthCheck,
    smtpTest: testSMTPConnection,
    sendOTP: testSendOTP,
    runAll: runAllTests,
    quickTest: quickTest
};

console.log('🔧 OTP Test Functions Loaded!');
console.log('📋 Available functions:');
console.log('  - otpTests.runAll() - Run all tests');
console.log('  - otpTests.quickTest("your@email.com") - Quick test with your email');
console.log('  - otpTests.healthCheck() - Test health check');
console.log('  - otpTests.smtpTest() - Test SMTP connection');
console.log('  - otpTests.sendOTP("email", "name") - Send test OTP');
console.log('');
console.log('🚀 Run: otpTests.runAll() to start testing!');
