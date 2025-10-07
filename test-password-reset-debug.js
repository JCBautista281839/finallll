/**
 * Password Reset Debug Script
 * This script helps debug Firebase Admin SDK password reset issues
 */

const admin = require('firebase-admin');
const fs = require('fs');

async function debugPasswordReset() {
    console.log('🔍 Password Reset Debug Script');
    console.log('================================');
    
    try {
        // Load service account
        const serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Service account loaded');
        console.log('   Project ID:', serviceAccount.project_id);
        console.log('   Client Email:', serviceAccount.client_email);
        
        // Initialize Firebase Admin SDK
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            console.log('✅ Firebase Admin SDK initialized');
        } else {
            console.log('✅ Firebase Admin SDK already initialized');
        }
        
        // Test with a sample email (replace with actual test email)
        const testEmail = 'test@example.com'; // Replace with actual test email
        
        console.log(`\n🔍 Testing password reset for: ${testEmail}`);
        
        try {
            // Try to get user by email
            const userRecord = await admin.auth().getUserByEmail(testEmail);
            console.log('✅ User found in Firebase Auth:');
            console.log('   UID:', userRecord.uid);
            console.log('   Email:', userRecord.email);
            console.log('   Email Verified:', userRecord.emailVerified);
            console.log('   Disabled:', userRecord.disabled);
            console.log('   Created:', userRecord.metadata.creationTime);
            console.log('   Last Sign In:', userRecord.metadata.lastSignInTime);
            
            // Test password update
            const testPassword = 'TestPassword123!';
            console.log(`\n🔑 Testing password update...`);
            
            await admin.auth().updateUser(userRecord.uid, {
                password: testPassword
            });
            
            console.log('✅ Password updated successfully!');
            console.log('   New password:', testPassword);
            
        } catch (userError) {
            if (userError.code === 'auth/user-not-found') {
                console.log('❌ User not found in Firebase Auth');
                console.log('   This means the email is not registered in Firebase Authentication');
                console.log('   Solution: User needs to sign up first or use correct email');
            } else if (userError.code === 'app/invalid-credential') {
                console.log('❌ Invalid Firebase Admin SDK credentials');
                console.log('   This means the service account key is invalid or expired');
                console.log('   Solution: Generate new service account key from Firebase Console');
            } else {
                console.log('❌ Error:', userError.message);
                console.log('   Code:', userError.code);
            }
        }
        
        // Test Firebase Auth service availability
        console.log('\n🔍 Testing Firebase Auth service...');
        try {
            const listUsersResult = await admin.auth().listUsers(1);
            console.log('✅ Firebase Auth service is working');
            console.log('   Total users in project:', listUsersResult.users.length);
        } catch (authError) {
            console.log('❌ Firebase Auth service error:', authError.message);
            console.log('   Code:', authError.code);
        }
        
    } catch (error) {
        console.error('❌ Debug script error:', error.message);
        console.error('   Stack:', error.stack);
    }
}

// Run the debug script
debugPasswordReset().catch(console.error);
