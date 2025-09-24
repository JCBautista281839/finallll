// Firebase configuration for main website
const firebaseConfig = {
  apiKey: "AIzaSyAXFKAt6OGLlUfQBnNmEhek6uqNQm4634Y",
  authDomain: "victoria-s-bistro.firebaseapp.com",
  databaseURL: "https://victoria-s-bistro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "victoria-s-bistro",
  storageBucket: "victoria-s-bistro.firebasestorage.app",
  messagingSenderId: "672219366880",
  appId: "1:672219366880:web:220df1e01d0b9ab72d9785",
  measurementId: "G-H9G17QXSMV"
};

// Initialize Firebase
function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase already initialized');
            return firebase.app();
        }
        
        // Initialize Firebase
        console.log('Initializing Firebase...');
        const app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('Main website loaded, initializing Firebase...');
    initializeFirebase();
});
