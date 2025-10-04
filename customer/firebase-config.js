// Firebase configuration for customer side
// Check if firebaseConfig is already declared to prevent redeclaration errors
if (typeof firebaseConfig === 'undefined') {
  window.firebaseConfig = {
    apiKey: "AIzaSyB5g-IC9B6jGV41WPSIVGYUUAjFpPaHjR0",
    authDomain: "viktorias-bistro.firebaseapp.com",
    projectId: "viktorias-bistro",
    storageBucket: "viktorias-bistro.firebasestorage.app",
    messagingSenderId: "156525165579",
    appId: "1:156525165579:web:38d5ab70aed07bb4ef9b0e",
    measurementId: "G-JPNG2MT646"
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
            console.warn('Could not set auth persistence:', persistenceError);
            // Try alternative method
            try {
                await firebase.auth().setPersistence('session');
                console.log('Firebase auth persistence set to SESSION (alternative method)');
            } catch (altError) {
                console.error('Failed to set auth persistence with both methods:', altError);
            }
        }
        
        return app;
        
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return null;
    }
}

// Global Firebase ready check function
window.isFirebaseReady = function() {
    return typeof firebase !== 'undefined' && 
           firebase.apps && 
           firebase.apps.length > 0 && 
           firebase.firestore;
};

// Auto-initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Customer page loaded, initializing Firebase...');
    await initializeFirebase();
});
