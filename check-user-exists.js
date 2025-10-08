#!/usr/bin/env node

/**
 * Check if user exists in Firebase and create if needed
 */

const admin = require('firebase-admin');

console.log('🔍 Checking if user exists in Firebase...\n');

async function checkAndCreateUser() {
    try {
        // Initialize Firebase Admin SDK
        if (!admin.apps || admin.apps.length === 0) {
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: serviceAccount.project_id
                });
                console.log('✅ Firebase Admin SDK initialized');
            } else {
                console.log('❌ FIREBASE_SERVICE_ACCOUNT not found');
                return;
            }
        }
        
        const email = 'christianbautista265853@gmail.com';
        const password = 'TestPassword123!';
        
        console.log(`🔍 Checking user: ${email}`);
        
        try {
            // Try to get the user
            const userRecord = await admin.auth().getUserByEmail(email);
            console.log('✅ User exists!');
            console.log('   UID:', userRecord.uid);
            console.log('   Email Verified:', userRecord.emailVerified);
            console.log('   Created:', new Date(userRecord.metadata.creationTime));
            
            // Update password
            console.log('\n🔧 Updating password...');
            await admin.auth().updateUser(userRecord.uid, {
                password: password
            });
            console.log('✅ Password updated successfully!');
            console.log('   New password:', password);
            
        } catch (userError) {
            if (userError.code === 'auth/user-not-found') {
                console.log('❌ User does not exist. Creating user...');
                
                // Create the user
                const newUser = await admin.auth().createUser({
                    email: email,
                    password: password,
                    emailVerified: true
                });
                
                console.log('✅ User created successfully!');
                console.log('   UID:', newUser.uid);
                console.log('   Email:', newUser.email);
                console.log('   Password:', password);
                
            } else {
                console.error('❌ Error:', userError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase error:', error.message);
    }
}

// Run the check
checkAndCreateUser().then(() => {
    console.log('\n🏁 Check completed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
});
