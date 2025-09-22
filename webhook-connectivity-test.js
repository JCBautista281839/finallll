const axios = require('axios');

async function checkWebhookEndpoint() {
    try {
        console.log('🔍 Testing webhook endpoint...');
        
        const response = await axios.post('http://localhost:5001/api/webhook/lalamove', {
            eventTime: new Date().toISOString(),
            eventType: 'ORDER_STATUS_CHANGED',
            data: {
                orderId: 'connectivity-test-' + Date.now(),
                orderState: 'ON_GOING',
                driverId: 'test-driver'
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        
        console.log('✅ Webhook endpoint is WORKING!');
        console.log('Response:', response.data);
        console.log('\n🚀 Your server is ready to receive Lalamove webhooks!');
        
    } catch (error) {
        console.error('❌ Webhook endpoint test FAILED:');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Server is not running. Start it with: node server.js');
        } else if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

checkWebhookEndpoint();