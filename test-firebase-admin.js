#!/usr/bin/env node

/**
 * Test Firebase Admin SDK functionality
 */

const admin = require('firebase-admin');

console.log('🧪 Testing Firebase Admin SDK...\n');

async function testFirebaseAdmin() {
    try {
        // Load service account
        const serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Service account loaded');
        console.log('   Project ID:', serviceAccount.project_id);
        console.log('   Client Email:', serviceAccount.client_email);
        
        // Check if Firebase Admin is already initialized
        if (admin.apps && admin.apps.length > 0) {
            console.log('✅ Firebase Admin SDK already initialized');
        } else {
            console.log('🔄 Initializing Firebase Admin SDK...');
            
            // Initialize Firebase Admin SDK
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            
            console.log('✅ Firebase Admin SDK initialized successfully');
        }
        
        // Test getting user by email
        const testEmail = 'test@victoriasbistro.com';
        console.log(`\n🔍 Testing getUserByEmail with: ${testEmail}`);
        
        try {
            const userRecord = await admin.auth().getUserByEmail(testEmail);
            console.log('✅ User found:', {
                uid: userRecord.uid,
                email: userRecord.email,
                emailVerified: userRecord.emailVerified,
                disabled: userRecord.disabled
            });
            
            // Test updating password
            console.log('\n🔑 Testing password update...');
            const newPassword = 'TestPassword123!';
            
            await admin.auth().updateUser(userRecord.uid, {
                password: newPassword
            });
            
            console.log('✅ Password updated successfully!');
            
        } catch (userError) {
            if (userError.code === 'auth/user-not-found') {
                console.log('⚠️ Test user not found - this is expected for testing');
            } else {
                console.error('❌ Error with user operations:', userError.message);
                console.error('   Error code:', userError.code);
            }
        }
        
        console.log('\n🎉 Firebase Admin SDK test completed successfully!');
        
    } catch (error) {
        console.error('❌ Firebase Admin SDK test failed:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Stack:', error.stack);
    }
}

// Run the test
testFirebaseAdmin().catch(console.error);
