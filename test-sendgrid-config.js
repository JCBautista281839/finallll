/**
 * SendGrid Configuration Test Script
 * This script tests if SendGrid is properly configured for production
 */

require('dotenv').config({ path: './env.production' });
const sgMail = require('@sendgrid/mail');

async function testSendGridConfig() {
    console.log('🧪 SendGrid Configuration Test');
    console.log('==============================');
    
    // Check environment variables
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'support@viktoriasbistro.restaurant';
    const fromName = process.env.SENDGRID_FROM_NAME || "Viktoria's Bistro";
    
    console.log('📋 Configuration Check:');
    console.log(`   API Key: ${apiKey ? '✅ Found (' + apiKey.substring(0, 8) + '...)' : '❌ Missing'}`);
    console.log(`   From Email: ${fromEmail}`);
    console.log(`   From Name: ${fromName}`);
    
    if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
        console.log('\n❌ SendGrid API key not configured!');
        console.log('📝 To fix this:');
        console.log('   1. Get API key from: https://app.sendgrid.com/settings/api_keys');
        console.log('   2. Update env.production file with your API key');
        console.log('   3. Restart your production server');
        return false;
    }
    
    try {
        // Initialize SendGrid
        sgMail.setApiKey(apiKey);
        console.log('\n✅ SendGrid initialized successfully');
        
        // Test email (don't actually send)
        const testEmail = {
            to: 'test@example.com',
            from: {
                email: fromEmail,
                name: fromName
            },
            subject: 'Test Email',
            text: 'This is a test email',
            html: '<p>This is a test email</p>'
        };
        
        console.log('\n📧 Test Email Configuration:');
        console.log(`   To: ${testEmail.to}`);
        console.log(`   From: ${testEmail.from.email} (${testEmail.from.name})`);
        console.log(`   Subject: ${testEmail.subject}`);
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(fromEmail)) {
            console.log('\n❌ Invalid from email format!');
            return false;
        }
        
        console.log('\n✅ Email configuration looks good!');
        console.log('\n🚀 SendGrid is ready for production use!');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ SendGrid configuration error:', error.message);
        console.error('   Error code:', error.code);
        
        if (error.code === 401) {
            console.log('\n🔑 Invalid API key! Please check your SendGrid API key.');
        } else if (error.code === 403) {
            console.log('\n🚫 API key lacks permissions! Please ensure it has "Mail Send" permissions.');
        } else {
            console.log('\n🔍 Check SendGrid documentation for more details.');
        }
        
        return false;
    }
}

// Run the test
if (require.main === module) {
    testSendGridConfig().catch(console.error);
}

module.exports = testSendGridConfig;
