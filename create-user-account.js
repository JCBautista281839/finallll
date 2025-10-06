#!/usr/bin/env node

/**
 * Create User Account Script
 * Creates a user account in Firebase Authentication and Firestore
 */

const admin = require('firebase-admin');

// Configuration
const USER_EMAIL = 'gradelljbautista@gmail.com';
const USER_PASSWORD = 'Password123!'; // Change this to a secure password
const USER_ROLE = 'admin'; // or 'customer' depending on what you need

async function createUserAccount() {
    try {
        // Initialize Firebase Admin SDK
        const serviceAccount = require('./firebase-service-account.json');
        
        if (!admin.apps || admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        }
        
        console.log('✅ Firebase Admin SDK initialized');
        
        // Check if user already exists
        try {
            const existingUser = await admin.auth().getUserByEmail(USER_EMAIL);
            console.log(`⚠️  User already exists: ${existingUser.email} (UID: ${existingUser.uid})`);
            
            // Update the user's password
            await admin.auth().updateUser(existingUser.uid, {
                password: USER_PASSWORD
            });
            console.log('✅ Password updated for existing user');
            
            // Check if user document exists in Firestore
            const userDoc = await admin.firestore().collection('users').doc(existingUser.uid).get();
            
            if (!userDoc.exists) {
                // Create user document in Firestore
                await admin.firestore().collection('users').doc(existingUser.uid).set({
                    email: USER_EMAIL,
                    role: USER_ROLE,
                    userType: USER_ROLE,
                    isActive: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ User document created in Firestore');
            } else {
                // Update existing user document
                await admin.firestore().collection('users').doc(existingUser.uid).update({
                    role: USER_ROLE,
                    userType: USER_ROLE,
                    isActive: true,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ User document updated in Firestore');
            }
            
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('📧 Creating new user account...');
                
                // Create new user in Firebase Auth
                const newUser = await admin.auth().createUser({
                    email: USER_EMAIL,
                    password: USER_PASSWORD,
                    emailVerified: true
                });
                
                console.log(`✅ User created in Firebase Auth: ${newUser.email} (UID: ${newUser.uid})`);
                
                // Create user document in Firestore
                await admin.firestore().collection('users').doc(newUser.uid).set({
                    email: USER_EMAIL,
                    role: USER_ROLE,
                    userType: USER_ROLE,
                    isActive: true,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ User document created in Firestore');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 User account setup completed successfully!');
        console.log(`📧 Email: ${USER_EMAIL}`);
        console.log(`🔑 Password: ${USER_PASSWORD}`);
        console.log(`👤 Role: ${USER_ROLE}`);
        console.log('\nYou can now log in with these credentials.');
        
    } catch (error) {
        console.error('❌ Error creating user account:', error.message);
        console.error('Error code:', error.code);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createUserAccount().catch(console.error);
}

module.exports = { createUserAccount };
