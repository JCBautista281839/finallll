/**
 * Browser-based script to create admin account
 * Run this in the browser console on your login page
 */

async function createAdminAccountInBrowser() {
    try {
        console.log('🔧 Creating admin account for gradelljbautista@gmail.com...\n');
        
        const email = 'gradelljbautista@gmail.com';
        const password = 'AdminPassword123!';
        const displayName = 'Christian Bautista';
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Please run this on a page with Firebase initialized.');
        }
        
        // Wait for Firebase to be ready
        await new Promise((resolve) => {
            const checkFirebase = () => {
                if (firebase.apps.length > 0) {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
        
        console.log('1️⃣ Creating Firebase Auth user...');
        
        // Create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile
        await user.updateProfile({
            displayName: displayName
        });
        
        console.log('✅ Firebase Auth user created:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        });
        
        // Create user document in Firestore
        console.log('\n2️⃣ Creating Firestore user document...');
        await firebase.firestore().collection('users').doc(user.uid).set({
            email: email,
            name: displayName,
            displayName: displayName,
            firstName: 'Christian',
            lastName: 'Bautista',
            role: 'admin',
            userType: 'admin',
            isActive: true,
            isEmailVerified: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Firestore user document created');
        
        // Also create in customers collection for compatibility
        console.log('\n3️⃣ Creating customer document for compatibility...');
        await firebase.firestore().collection('customers').doc(user.uid).set({
            customerId: user.uid,
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Customer document created');
        
        console.log('\n🎉 Admin account created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 Name:', displayName);
        console.log('🔐 Role: admin');
        console.log('\n💡 You can now log in with these credentials.');
        
        // Sign out the created user so they can log in normally
        await firebase.auth().signOut();
        console.log('✅ Signed out. You can now log in normally.');
        
    } catch (error) {
        console.error('❌ Error creating admin account:', error.message);
        
        if (error.code === 'auth/email-already-in-use') {
            console.log('\n💡 The email already exists in Firebase Auth.');
            console.log('   You can either:');
            console.log('   1. Use the existing account');
            console.log('   2. Reset the password');
            console.log('   3. Try logging in with the existing account');
        }
    }
}

// Make function available globally
window.createAdminAccountInBrowser = createAdminAccountInBrowser;

console.log('📋 Admin account creation script loaded!');
console.log('💡 Run this command to create the admin account:');
console.log('   createAdminAccountInBrowser()');
