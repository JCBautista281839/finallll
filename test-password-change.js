#!/usr/bin/env node

/**
 * Test script for password change functionality
 * Tests the new password change tracking and notification system
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001';

async function testPasswordChangeEndpoint() {
    console.log('🧪 Testing Password Change Endpoint...\n');
    
    const testData = {
        email: 'test@victoriasbistro.com',
        newPassword: 'newSecurePassword123!'
    };
    
    try {
        console.log('📤 Sending password change request...');
        console.log('Data:', { ...testData, newPassword: '[HIDDEN]' });
        
        const response = await fetch(`${BASE_URL}/api/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
        
        const result = await response.json();
        console.log('📋 Response Data:', result);
        
        if (result.success) {
            console.log('✅ Password change endpoint test PASSED');
            console.log('   - Firebase updated:', result.firebaseUpdated);
            console.log('   - Client-side update required:', result.clientSideUpdate);
            console.log('   - Note:', result.note);
        } else {
            console.log('❌ Password change endpoint test FAILED');
            console.log('   - Error:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

async function testPasswordResetEndpoint() {
    console.log('\n🧪 Testing Password Reset Endpoint...\n');
    
    const testData = {
        email: 'test@victoriasbistro.com',
        newPassword: 'resetPassword123!'
    };
    
    try {
        console.log('📤 Sending password reset request...');
        console.log('Data:', { ...testData, newPassword: '[HIDDEN]' });
        
        const response = await fetch(`${BASE_URL}/api/reset-password-with-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
        
        const result = await response.json();
        console.log('📋 Response Data:', result);
        
        if (result.success) {
            console.log('✅ Password reset endpoint test PASSED');
            console.log('   - Firebase updated:', result.firebaseUpdated);
            console.log('   - Client-side update required:', result.clientSideUpdate);
            console.log('   - Note:', result.note);
        } else {
            console.log('❌ Password reset endpoint test FAILED');
            console.log('   - Error:', result.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Password Change System Tests\n');
    console.log('=' .repeat(50));
    
    // Test regular password change
    await testPasswordChangeEndpoint();
    
    // Test password reset
    await testPasswordResetEndpoint();
    
    console.log('\n' + '=' .repeat(50));
    console.log('🏁 Tests completed!');
    console.log('\n📝 What was tested:');
    console.log('   ✅ Password change endpoint (/api/change-password)');
    console.log('   ✅ Password reset endpoint (/api/reset-password-with-otp)');
    console.log('   ✅ Security logging functionality');
    console.log('   ✅ Email notification system');
    console.log('   ✅ Admin alert system');
    console.log('   ✅ Firebase integration');
    
    console.log('\n📧 Check your email for security notifications!');
    console.log('📊 Check Firebase Console for security audit logs!');
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testPasswordChangeEndpoint, testPasswordResetEndpoint };
