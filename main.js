// Hamburger Menu functionality is handled in index.html

// Firebase configuration - check if already declared to prevent redeclaration errors
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
        
        // Configure authentication persistence to SESSION
        try {
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
            console.log('Firebase auth persistence set to SESSION');
        } catch (persistenceError) {
            console.warn('Could not set auth persistence:', persistenceError);
        }
        
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
           firebase.auth &&
           firebase.firestore;
};

// Auto-initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing Firebase...');
    await initializeFirebase();
    
    // Test connection after a short delay
    setTimeout(() => {
        testFirebaseConnection();
    }, 1000);
});

// Handle user profile icon click (fallback for pages without custom implementation)
function handleUserProfileClick(event) {
    event.preventDefault();
    
    try {
        // Check if Firebase is initialized
        if (typeof firebase === 'undefined') {
            console.log('Firebase not loaded, redirecting to login');
            window.location.href = 'html/login.html';
            return;
        }
        
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        
        if (user) {
            // User is logged in - redirect to account page
            console.log('User is logged in:', user.email);
            console.log('Redirecting to account page...');
            window.location.href = 'customer/html/account.html';
        } else {
            // User is not logged in - redirect to login
            console.log('User is not logged in, redirecting to login');
            window.location.href = 'html/login.html';
        }
        
    } catch (error) {
        console.error('Error checking user authentication:', error);
        // Fallback to login page
        window.location.href = 'html/login.html';
    }
}

// Scroll animations for hero elements
function initializeScrollAnimations() {
    // Animate elements on scroll (in and out)
    (function() {
        if (window.innerWidth <= 768) return; // Don't run on mobile

        const targets = document.querySelectorAll('.scroll-left, .scroll-right');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                } else {
                    // Don't remove 'in-view' for scroll-left/right on exit, let scroll handler do it
                    if (!entry.target.classList.contains('scroll-left') && !entry.target.classList.contains('scroll-right')) {
                        entry.target.classList.remove('in-view');
                    }
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

        targets.forEach((el) => observer.observe(el));
    })();

    // Exit animation on scroll
    window.addEventListener('scroll', function() {
        if (window.innerWidth <= 768) return; // Don't run on mobile

        const scrollLeft = document.querySelector('.scroll-left');
        const scrollRight = document.querySelector('.scroll-right');
        if (!scrollLeft || !scrollRight) return;

        let scrollPosition = window.scrollY;
        
        // Start exit animation after scrolling a bit
        if (scrollPosition > 100) {
            scrollLeft.classList.add('exit-left');
            scrollRight.classList.add('exit-right');
        } else {
            scrollLeft.classList.remove('exit-left');
            scrollRight.classList.remove('exit-right');
        }
    });    
}

// Initialize scroll animations when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollAnimations();
});