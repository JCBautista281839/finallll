// Firebase configuration for customer side
// Check if firebaseConfig is already declared to prevent redeclaration errors
if (typeof firebaseConfig === 'undefined') {
    window.firebaseConfig = {
        apiKey: "AIzaSyAXFKAt6OGLlUfQBnNmEhek6uqNQm4634Y",
        authDomain: "victoria-s-bistro.firebaseapp.com",
        databaseURL: "https://victoria-s-bistro-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "victoria-s-bistro",
        storageBucket: "victoria-s-bistro.firebasestorage.app",
        messagingSenderId: "672219366880",
        appId: "1:672219366880:web:220df1e01d0b9ab72d9785",
        measurementId: "G-H9G17QXSMV"
    };
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase already initialized');
            return firebase.app();
        }

        // Initialize Firebase
        console.log('Initializing Firebase...');

        // Check if firebaseConfig is available
        if (typeof window.firebaseConfig === 'undefined') {
            console.error('Firebase configuration not found');
            return null;
        }

        const app = firebase.initializeApp(window.firebaseConfig);
        console.log('Firebase initialized successfully');

        // Configure authentication persistence to SESSION for automatic logout on tab close
        try {
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
            console.log('Firebase auth persistence set to SESSION - user will be logged out when tab closes');
        } catch (persistenceError) {
            console.warn('Could not set auth persistence (this is normal for newer Firebase versions):', persistenceError.message);
            // For newer Firebase versions, persistence is handled differently
            // The session persistence is still maintained by default
        }

        return app;

    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return null;
    }
}

// Global Firebase ready check function
window.isFirebaseReady = function () {
    return typeof firebase !== 'undefined' &&
        firebase.apps &&
        firebase.apps.length > 0 &&
        firebase.firestore;
};

// Auto-initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Customer page loaded, initializing Firebase...');
    await initializeFirebase();
});
