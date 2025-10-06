/**
 * Simple script to create Firebase Auth account
 * Run this in the browser console on your login page
 */

async function createFirebaseAuthAccount() {
    try {
        console.log('🔧 Creating Firebase Auth account for gradelljbautista@gmail.com...\n');
        
        const email = 'gradelljbautista@gmail.com';
        const password = 'AdminPassword123!';
        
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
            displayName: 'Christian Bautista'
        });
        
        console.log('✅ Firebase Auth user created:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        });
        
        console.log('\n🎉 Firebase Auth account created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 Name: Christian Bautista');
        console.log('\n💡 Now you can log in with these credentials.');
        console.log('   The system will automatically create the Firestore documents when you log in.');
        
        // Sign out the created user so they can log in normally
        await firebase.auth().signOut();
        console.log('✅ Signed out. You can now log in normally.');
        
    } catch (error) {
        console.error('❌ Error creating Firebase Auth account:', error.message);
        
        if (error.code === 'auth/email-already-in-use') {
            console.log('\n💡 The email already exists in Firebase Auth.');
            console.log('   You can now try logging in with your existing password.');
        } else if (error.code === 'auth/weak-password') {
            console.log('\n💡 Password is too weak. Please use a stronger password.');
        } else if (error.code === 'auth/invalid-email') {
            console.log('\n💡 Invalid email format.');
        }
    }
}

// Make function available globally
window.createFirebaseAuthAccount = createFirebaseAuthAccount;

console.log('📋 Firebase Auth account creation script loaded!');
console.log('💡 Run this command to create the Firebase Auth account:');
console.log('   createFirebaseAuthAccount()');
