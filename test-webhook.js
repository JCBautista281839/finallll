const crypto = require('crypto');
const axios = require('axios');

// Test webhook security validation
async function testWebhookSecurity() {
    const webhookUrl = 'http://localhost:5001/api/webhook/lalamove';
    const webhookSecret = 'sk_test_xk5jhBqk3d6TqxdZRIzHNvyHRQqFqC8bqHFdgI3iG2OMl4OEtJ';
    
    const testPayload = {
        eventTime: new Date().toISOString(),
        eventType: 'ORDER_STATUS_CHANGED',
        data: {
            orderId: 'test-order-123',
            orderState: 'ON_GOING',
            driverId: 'driver-456',
            driver: {
                name: 'Test Driver',
                phone: '+639123456789'
            }
        }
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyString = JSON.stringify(testPayload);
    
    // Create valid signature
    const signature = crypto.createHmac('sha256', webhookSecret)
        .update(timestamp + bodyString)
        .digest('hex');

    console.log('Testing webhook with valid signature...');
    
    try {
        const response = await axios.post(webhookUrl, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-lalamove-signature': signature,
                'x-timestamp': timestamp
            }
        });
        
        console.log('✅ Valid signature test passed:', response.data);
    } catch (error) {
        console.error('❌ Valid signature test failed:', error.response?.data || error.message);
    }

    // Test invalid signature
    console.log('\nTesting webhook with invalid signature...');
    
    try {
        const response = await axios.post(webhookUrl, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-lalamove-signature': 'invalid-signature',
                'x-timestamp': timestamp
            }
        });
        
        console.log('❌ Invalid signature test should have failed but passed:', response.data);
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('✅ Invalid signature correctly rejected:', error.response.data);
        } else {
            console.error('❌ Unexpected error:', error.response?.data || error.message);
        }
    }

    // Test missing headers
    console.log('\nTesting webhook with missing headers...');
    
    try {
        const response = await axios.post(webhookUrl, testPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Missing headers test passed (development mode):', response.data);
    } catch (error) {
        console.error('❌ Missing headers test failed:', error.response?.data || error.message);
    }
}

// Run the test
testWebhookSecurity().catch(console.error);