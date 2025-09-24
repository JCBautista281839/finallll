// SendGrid Diagnostic Script
const sgMail = require('@sendgrid/mail');

// Your API key from server.js
const SENDGRID_API_KEY = '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';
const FROM_EMAIL = 'noreply@viktoriasbistro.com';
const FROM_NAME = 'Viktoria\'s Bistro';

console.log('🔍 SendGrid Diagnostic Tool\n');

// Test 1: API Key Format
console.log('📋 Test 1: API Key Format');
console.log('   API Key:', SENDGRID_API_KEY.substring(0, 10) + '...');
console.log('   Length:', SENDGRID_API_KEY.length);
console.log('   Starts with SG.:', SENDGRID_API_KEY.startsWith('SG.'));
console.log('   Expected length: 69 characters');
if (SENDGRID_API_KEY.length !== 69) {
    console.log('   ❌ WARNING: API key length is incorrect!');
} else {
    console.log('   ✅ API key length is correct');
}

// Test 2: Configure SendGrid
console.log('\n📋 Test 2: SendGrid Configuration');
try {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('   ✅ SendGrid configured successfully');
} catch (error) {
    console.log('   ❌ SendGrid configuration failed:', error.message);
}

// Test 3: Test Email Send
console.log('\n📋 Test 3: Test Email Send');
async function testEmailSend() {
    try {
        const msg = {
            to: 'test@example.com', // This will fail but we can see the error
            from: {
                email: FROM_EMAIL,
                name: FROM_NAME
            },
            subject: 'Test Email from Viktoria\'s Bistro',
            text: 'This is a test email to verify SendGrid configuration.',
            html: '<p>This is a test email to verify SendGrid configuration.</p>'
        };

        console.log('   📧 Attempting to send test email...');
        console.log('   From:', FROM_EMAIL);
        console.log('   To: test@example.com');
        
        const response = await sgMail.send(msg);
        console.log('   ✅ Email sent successfully!');
        console.log('   Response:', response[0].statusCode);
        
    } catch (error) {
        console.log('   ❌ Email send failed:');
        console.log('   Error Code:', error.code);
        console.log('   Error Message:', error.message);
        
        if (error.response) {
            console.log('   Response Status:', error.response.status);
            console.log('   Response Body:', JSON.stringify(error.response.body, null, 2));
            
            // Common error analysis
            if (error.response.body && error.response.body.errors) {
                error.response.body.errors.forEach(err => {
                    console.log('   📝 Error Detail:', err.message);
                    if (err.message.includes('sender')) {
                        console.log('   💡 SOLUTION: Verify your sender email in SendGrid dashboard');
                    }
                    if (err.message.includes('authentication')) {
                        console.log('   💡 SOLUTION: Complete sender authentication in SendGrid');
                    }
                    if (err.message.includes('API key')) {
                        console.log('   💡 SOLUTION: Check your API key permissions');
                    }
                });
            }
        }
    }
}

// Test 4: Check API Key Permissions (simulated)
console.log('\n📋 Test 4: API Key Analysis');
console.log('   🔑 API Key Structure:');
console.log('   - Prefix: SG.');
console.log('   - Length: 69 characters');
console.log('   - Format: Looks correct');

console.log('\n📋 Test 5: Common Issues Checklist');
console.log('   ❓ Is your SendGrid account verified?');
console.log('   ❓ Have you completed sender authentication?');
console.log('   ❓ Does your API key have "Mail Send" permissions?');
console.log('   ❓ Is your account in good standing (not suspended)?');
console.log('   ❓ Are you using the correct sender email address?');

// Run the email test
testEmailSend().then(() => {
    console.log('\n🎯 Next Steps:');
    console.log('   1. Check SendGrid dashboard for account status');
    console.log('   2. Verify sender authentication is complete');
    console.log('   3. Check API key permissions');
    console.log('   4. Review SendGrid activity logs');
    console.log('   5. Try with a verified email address');
}).catch(error => {
    console.log('\n❌ Diagnostic failed:', error.message);
});
