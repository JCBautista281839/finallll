const axios = require('axios');

async function testPublicWebhook() {
    const publicUrl = 'https://stupid-zoos-fall.loca.lt/api/webhook/lalamove';
    
    try {
        console.log('🌐 Testing public webhook endpoint...');
        console.log('URL:', publicUrl);
        
        const response = await axios.post(publicUrl, {
            eventTime: new Date().toISOString(),
            eventType: 'ORDER_STATUS_CHANGED',
            data: {
                orderId: 'public-test-' + Date.now(),
                orderState: 'ON_GOING',
                driverId: 'test-driver-public'
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ PUBLIC webhook endpoint is WORKING!');
        console.log('Response:', response.data);
        console.log('\n🎯 Ready for Lalamove Portal:');
        console.log('📋 Copy this URL: https://stupid-zoos-fall.loca.lt/api/webhook/lalamove');
        
    } catch (error) {
        console.error('❌ Public webhook test FAILED:');
        console.error('Error:', error.message);
        
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
        
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure LocalTunnel is still running');
        console.log('2. Check if your local server is responding');
        console.log('3. Try accessing the URL in a browser first');
    }
}

testPublicWebhook();