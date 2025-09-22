const axios = require('axios');

async function testWebhook() {
    try {
        console.log('Testing webhook endpoint...');
        
        const response = await axios.post('http://localhost:5001/api/webhook/lalamove', {
            eventTime: new Date().toISOString(),
            eventType: 'ORDER_STATUS_CHANGED',
            data: {
                orderId: 'test-order-123',
                orderState: 'ON_GOING',
                driverId: 'driver-456'
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook test successful:', response.data);
    } catch (error) {
        console.error('❌ Webhook test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testWebhook();