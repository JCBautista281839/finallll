/**
 * Script to create an admin account for gradelljbautista@gmail.com
 * This will create the user in Firebase Auth and Firestore
 */

const admin = require('firebase-admin');

// Load service account
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

async function createAdminAccount() {
    try {
        console.log('🔧 Creating admin account for gradelljbautista@gmail.com...\n');
        
        const email = 'gradelljbautista@gmail.com';
        const password = 'AdminPassword123!'; // You can change this
        const displayName = 'Christian Bautista';
        
        // Create user in Firebase Auth
        console.log('1️⃣ Creating Firebase Auth user...');
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: displayName,
            emailVerified: true
        });
        
        console.log('✅ Firebase Auth user created:', {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName
        });
        
        // Create user document in Firestore
        console.log('\n2️⃣ Creating Firestore user document...');
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email: email,
            name: displayName,
            displayName: displayName,
            firstName: 'Christian',
            lastName: 'Bautista',
            role: 'admin',
            userType: 'admin',
            isActive: true,
            isEmailVerified: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firestore user document created');
        
        // Also create in customers collection for compatibility
        console.log('\n3️⃣ Creating customer document for compatibility...');
        await admin.firestore().collection('customers').doc(userRecord.uid).set({
            customerId: userRecord.uid,
            name: displayName,
            email: email,
            displayName: displayName,
            firstName: 'Christian',
            lastName: 'Bautista',
            role: 'admin',
            userType: 'admin',
            isActive: true,
            isEmailVerified: true,
            accountStatus: 'verified',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Customer document created');
        
        console.log('\n🎉 Admin account created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 Name:', displayName);
        console.log('🔐 Role: admin');
        console.log('\n💡 You can now log in with these credentials.');
        
    } catch (error) {
        console.error('❌ Error creating admin account:', error.message);
        
        if (error.code === 'auth/email-already-exists') {
            console.log('\n💡 The email already exists in Firebase Auth.');
            console.log('   You can either:');
            console.log('   1. Use the existing account');
            console.log('   2. Reset the password');
            console.log('   3. Delete and recreate the account');
        }
    }
}

// Run the function
createAdminAccount().catch(console.error);
