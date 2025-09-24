// Quick status check for SendGrid OTP system
const axios = require('axios');

async function checkStatus() {
    console.log('🔍 Checking SendGrid OTP System Status...\n');
    
    try {
        // Test 1: Server is running
        console.log('📡 Test 1: Server Status');
        const serverResponse = await axios.get('http://localhost:5001/api/test');
        console.log('   ✅ Server is running');
        console.log('   📍 URL: http://localhost:5001');
        
        // Test 2: SendGrid OTP endpoint
        console.log('\n📧 Test 2: SendGrid OTP Endpoint');
        const otpResponse = await axios.post('http://localhost:5001/api/send-otp', {
            email: 'support@viktoriasbistro.restaurant',
            userName: 'Status Check'
        });
        
        if (otpResponse.data.success) {
            console.log('   ✅ SendGrid OTP working perfectly!');
            console.log('   📧 Email sent to: support@viktoriasbistro.restaurant');
            console.log('   ⏰ Expiry:', new Date(otpResponse.data.expiry).toLocaleString());
        } else {
            console.log('   ❌ SendGrid OTP failed');
        }
        
        // Test 3: Test pages accessible
        console.log('\n🌐 Test 3: Test Pages');
        const testPageResponse = await axios.get('http://localhost:5001/test-signup-flow.html');
        console.log('   ✅ Test signup page accessible');
        
        const signupPageResponse = await axios.get('http://localhost:5001/html/signup.html');
        console.log('   ✅ Production signup page accessible');
        
        const otpPageResponse = await axios.get('http://localhost:5001/html/otp.html');
        console.log('   ✅ OTP verification page accessible');
        
        // Summary
        console.log('\n🎉 SYSTEM STATUS: FULLY OPERATIONAL');
        console.log('\n📋 Available Pages:');
        console.log('   🧪 Test Page: http://localhost:5001/test-signup-flow.html');
        console.log('   📝 Signup: http://localhost:5001/html/signup.html');
        console.log('   🔐 OTP: http://localhost:5001/html/otp.html');
        console.log('   🏠 Home: http://localhost:5001/');
        
        console.log('\n🚀 Ready for Testing!');
        console.log('   1. Go to test page');
        console.log('   2. Fill out form with email: support@viktoriasbistro.restaurant');
        console.log('   3. Check your email for OTP');
        console.log('   4. Verify on OTP page');
        
    } catch (error) {
        console.log('❌ Status check failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Solution: Start the server with "npm start"');
        }
    }
}

checkStatus();
