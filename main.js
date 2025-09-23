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

// Test Firebase connection
function testFirebaseConnection() {
    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            console.log('Firebase not initialized yet');
            return;
        }
        
        console.log('Testing Firebase connection...');
        const db = firebase.firestore();
        
        // Simple test query
        db.collection('test').doc('connection').get()
            .then(() => {
                console.log('✅ Firebase connection successful');
            })
            .catch((error) => {
                console.error('❌ Firebase connection failed:', error.message);
            });
            
    } catch (error) {
        console.error('Firebase connection test error:', error);
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
    console.log('Page loaded, initializing Firebase...');
    initializeFirebase();
    
    // Test connection after a short delay
    setTimeout(() => {
        testFirebaseConnection();
    }, 1000);
});
