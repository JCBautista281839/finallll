/**
 * Test script for password reset functionality
 * This script tests the password reset endpoint to ensure Firebase integration works
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001';

async function testPasswordReset() {
    console.log('🧪 Testing Password Reset Functionality...\n');
    
    try {
        // Test data
        const testEmail = 'test@example.com';
        const testPassword = 'newPassword123';
        
        console.log('📧 Test Email:', testEmail);
        console.log('🔑 Test Password:', testPassword);
        console.log('');
        
        // Test the password reset endpoint
        console.log('🔄 Testing password reset endpoint...');
        
        const response = await axios.post(`${API_BASE_URL}/api/reset-password-with-otp`, {
            email: testEmail,
            newPassword: testPassword
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });
        
        console.log('✅ Response Status:', response.status);
        console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n🎉 Password reset test PASSED!');
            console.log('Firebase Updated:', response.data.firebaseUpdated);
            console.log('Note:', response.data.note);
        } else {
            console.log('\n❌ Password reset test FAILED!');
            console.log('Error:', response.data.message);
        }
        
    } catch (error) {
        console.log('\n❌ Password reset test FAILED with error!');
        
        if (error.response) {
            // Server responded with error status
            console.log('Status:', error.response.status);
            console.log('Error Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            // Request was made but no response received
            console.log('No response received. Is the server running?');
            console.log('Make sure to start the server with: node server.js');
        } else {
            // Something else happened
            console.log('Error:', error.message);
        }
    }
}

// Run the test
testPasswordReset().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});

