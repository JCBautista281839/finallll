#!/usr/bin/env node

/**
 * Test Firebase Admin SDK connection on server
 */

const admin = require('firebase-admin');

console.log('🧪 Testing Firebase Admin SDK connection...\n');

async function testFirebaseConnection() {
    try {
        // Check if Firebase Admin is already initialized
        if (admin.apps && admin.apps.length > 0) {
            console.log('✅ Firebase Admin SDK already initialized');
        } else {
            console.log('⚠️ Firebase Admin SDK not initialized');
            
            // Try to initialize with environment variable
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                console.log('🔧 Initializing with FIREBASE_SERVICE_ACCOUNT environment variable...');
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: serviceAccount.project_id
                });
                
                console.log('✅ Firebase Admin SDK initialized with environment variable');
            } else {
                console.log('❌ FIREBASE_SERVICE_ACCOUNT environment variable not found');
                return;
            }
        }
        
        // Test getting a user
        console.log('\n🔍 Testing user lookup...');
        const testEmail = 'christianbautista265853@gmail.com';
        
        try {
            const userRecord = await admin.auth().getUserByEmail(testEmail);
            console.log('✅ User found:', userRecord.email);
            console.log('   UID:', userRecord.uid);
            console.log('   Email Verified:', userRecord.emailVerified);
            console.log('   Created:', new Date(userRecord.metadata.creationTime));
            console.log('   Last Sign In:', userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime) : 'Never');
            
            // Test password update
            console.log('\n🔧 Testing password update...');
            const newPassword = 'TestPassword123!';
            
            await admin.auth().updateUser(userRecord.uid, {
                password: newPassword
            });
            
            console.log('✅ Password updated successfully!');
            console.log('   New password:', newPassword);
            
        } catch (userError) {
            console.error('❌ User lookup/update error:', userError.message);
            
            if (userError.code === 'auth/user-not-found') {
                console.log('💡 User does not exist. You may need to create the user first.');
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error.message);
        console.error('   Error code:', error.code);
    }
}

// Run the test
testFirebaseConnection().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
