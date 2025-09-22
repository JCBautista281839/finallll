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
        // Prevent multiple initializations
        if (window.firebaseInitialized) {
            console.log('Firebase already initialized, skipping...');
            return;
        }
        
        if (!firebase.apps.length) {
            console.log('Initializing Firebase with config:', JSON.stringify({
                projectId: firebaseConfig.projectId,
                authDomain: firebaseConfig.authDomain
            }));
            
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized in main.js');
            
            // Check if the current domain is authorized in Firebase (non-blocking)
            const currentDomain = window.location.hostname;
            if (currentDomain !== 'localhost' && currentDomain !== '127.0.0.1' && 
                firebaseConfig.authDomain && !firebaseConfig.authDomain.includes(currentDomain)) {
                console.warn(`⚠️ Authentication domain warning: Your current domain (${currentDomain}) ` +
                    `is not authorized in Firebase.`);
                console.warn(`🔧 To fix this:`);
                console.warn(`1. Go to Firebase Console: https://console.firebase.google.com/`);
                console.warn(`2. Select your project: victoria-s-bistro`);
                console.warn(`3. Go to Authentication -> Settings -> Authorized domains`);
                console.warn(`4. Add your domain: ${currentDomain}`);
                console.warn(`5. Save the changes`);
                
                // Set a flag to prevent auto-refresh loops
                window.firebaseDomainWarningShown = true;
                
                // Show warning but don't block the app - only show once per session
                if (!window.firebaseDomainWarningShown) {
                    console.warn('⚠️ App will continue but authentication may not work properly');
                }
                
                // Test Firebase connection to verify domain authorization
                testFirebaseConnection();
            } else {
                console.log('✅ Firebase domain authorization: OK');
                // Test Firebase connection to verify it's working
                testFirebaseConnection();
            }
            
            // Skip persistence for now to avoid initialization conflicts
            console.log('Skipping Firestore persistence to avoid initialization conflicts');
                
            // Set network status listeners for better debugging
            firebase.firestore().enableNetwork()
                .then(() => {
                    console.log('Firestore network enabled');
                })
                .catch(err => {
                    console.error('Error enabling Firestore network:', err);
                });
                
            // Use Firestore connectivity monitor instead of Database
            try {
                firebase.firestore().collection('_connectionCheck').doc('online')
                    .onSnapshot(() => {
                        console.log('Connected to Firestore');
                    }, (err) => {
                        console.log('Disconnected from Firestore:', err.message);
                    });
            } catch (connErr) {
                console.warn('Connection monitoring setup failed:', connErr);
            }
        }
        
        // Set global flag that Firebase is ready
        window.isFirebaseReady = function() {
            return typeof firebase !== 'undefined' && 
                firebase.apps.length > 0 && 
                firebase.firestore;
        };
        
        // Add global error handler for Firestore
        firebase.firestore().onSnapshotsInSync(() => {
            console.log('Firestore data is in sync');
        });
        
        // Set auth persistence
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(err => console.warn('setPersistence warning:', err));
        
        // Mark Firebase as initialized
        window.firebaseInitialized = true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        // More detailed error handling
        let errorMessage = 'Error connecting to the database. Please refresh and try again.';
        if (error.code === 'app/no-app') {
            errorMessage = 'Firebase app initialization failed. Please check your internet connection.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your internet connection.';
        }
        alert(errorMessage);
        return { auth: null, db: null };
    }
}

// Initialize Firebase when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeFirebase();
});

// Simple path resolver for the specific server structure
function getServerPath(path) {
    const currentUrl = window.location.href;
    
    // If we're on the live server, use simple relative paths
    if (currentUrl.includes('viktoriasbistro.restaurant')) {
        if (path === '/html/login.html') {
            return './login.html';
        } else if (path === '/html/Dashboard.html') {
            return './Dashboard.html';
        } else if (path === '/customer/html/menu.html') {
            return '../customer/html/menu.html';
        } else if (path.startsWith('/html/')) {
            return './' + path.split('/').pop();
        } else if (path.startsWith('/customer/')) {
            return path.replace('/customer/', '../customer/');
        }
    }
    
    // For local development, use original paths
    return path;
}

// Helper function to get correct paths based on current location
function getCorrectPath(path) {
    const currentPath = window.location.pathname;
    const currentUrl = window.location.href;
    
    console.log('🔍 Path Resolution Debug:');
    console.log('  Current URL:', currentUrl);
    console.log('  Current Path:', currentPath);
    console.log('  Requested Path:', path);
    
    // Check if we're on the live server (viktoriasbistro.restaurant)
    if (currentUrl.includes('viktoriasbistro.restaurant')) {
        console.log('  Server: Live server detected');
        
        // For live server, we need to use the correct base path
        // The server structure is: viktoriasbistro.restaurant/home/html/
        // So we need to construct paths relative to the actual file location
        
        if (path.startsWith('/html/')) {
            // If we're already in /html/ directory, just use the filename
            if (currentPath.includes('/html/')) {
                const filename = path.split('/').pop();
                const resolvedPath = `./${filename}`;
                console.log('  Resolved Path (same directory):', resolvedPath);
                return resolvedPath;
            } else {
                // If we're not in /html/, go to html directory
                const resolvedPath = './html/' + path.split('/').pop();
                console.log('  Resolved Path (to html):', resolvedPath);
                return resolvedPath;
            }
        } else if (path.startsWith('/customer/')) {
            // For customer pages, use relative path
            const resolvedPath = path.replace('/customer/', './customer/');
            console.log('  Resolved Path (customer):', resolvedPath);
            return resolvedPath;
        } else if (path.startsWith('/')) {
            // For other absolute paths, make them relative
            const resolvedPath = '.' + path;
            console.log('  Resolved Path (relative):', resolvedPath);
            return resolvedPath;
        }
    }
    
    // If we're in a subdirectory locally, use relative paths
    if (currentPath.includes('/html/') || currentPath.includes('/customer/')) {
        console.log('  Server: Local subdirectory detected');
        if (path.startsWith('/html/')) {
            const resolvedPath = path.replace('/html/', './html/');
            console.log('  Resolved Path:', resolvedPath);
            return resolvedPath;
        } else if (path.startsWith('/customer/')) {
            const resolvedPath = path.replace('/customer/', './customer/');
            console.log('  Resolved Path:', resolvedPath);
            return resolvedPath;
        } else if (path.startsWith('/')) {
            const resolvedPath = '.' + path;
            console.log('  Resolved Path:', resolvedPath);
            return resolvedPath;
        }
    }
    
    // If we're at root, use absolute paths
    console.log('  Server: Root directory, using absolute path');
    console.log('  Resolved Path:', path);
    return path;
}


const DEFAULT_EMAIL_DOMAIN = 'victoria-s-bistro.com';



function main() {
    console.log('Main function running, Firebase ready');

    if (document.getElementById('loginForm')) {
        initializeLogin();
    }

    checkAuthState();
}

function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

   
    const clonedForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(clonedForm, loginForm);

    clonedForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginErrorEl = document.getElementById('loginError');
        
       
        if (loginErrorEl) {
            loginErrorEl.style.display = 'none';
            loginErrorEl.textContent = '';
        }

        if (!username || !password) {
            if (loginErrorEl) {
                loginErrorEl.textContent = 'Please enter both username and password.';
                loginErrorEl.style.display = 'block';
            }
            return;
        }

       
       
        const email = username.includes('@') || !DEFAULT_EMAIL_DOMAIN
            ? username
            : `${username}@${DEFAULT_EMAIL_DOMAIN}`;

        console.log('[login] Attempt sign-in with', email);

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('Login successful:', userCredential.user);
               
                window.location.replace(getServerPath('/html/Dashboard.html'));
            })
            .catch((error) => {
                // Only show error, do NOT reload or redirect
                console.error('Login error:', error.code, error.message);
                if (loginErrorEl) {
                    let errorMessage = 'Login failed: ';
                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/invalid-email':
                            errorMessage += 'User not found. Please check if your email is registered in the system. Contact your admin if you need access.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage += 'Incorrect password. Please try again or contact your admin to reset your password.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage += 'Too many failed login attempts. Please try again later or contact your admin.';
                            break;
                        default:
                            errorMessage += (error.message || 'An unexpected error occurred.');
                    }
                    if (!username.includes('@') && DEFAULT_EMAIL_DOMAIN) {
                        errorMessage += ` (Tried login with: ${email})`;
                    }
                    loginErrorEl.textContent = errorMessage;
                    loginErrorEl.style.display = 'block';
                }
            });
    });
}


function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        const onLoginPage = window.location.pathname.includes('login.html') || window.location.pathname === '/';
        const onDashboardPage = window.location.pathname.includes('Dashboard.html');

        if (user) {
           
            console.log('User is authenticated:', user.email);
            if (onLoginPage) {
                console.log('Redirecting to dashboard...');
                window.location.replace(getServerPath('/html/Dashboard.html'));
            }
        } else {
           
            console.log('No user signed in.');
            if (!onLoginPage) {
                console.log('Redirecting to login page...');
                window.location.replace(getServerPath('/html/login.html'));
            }
        }
    });
}

// Global role-based navigation
async function checkUserRoleAndRedirect() {
    const user = firebase.auth().currentUser;
    
    if (!user) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'user';
            
            // Define role-based access rules
            const currentPage = window.location.pathname;
            
            // Customer users should only access customer pages
            if (userRole === 'customer') {
                const allowedCustomerPages = [
                    '/customer/html/menu.html',
                    '/customer/html/account.html',
                    '/customer/html/settings.html',
                    '/customer/html/cart.html',
                    '/customer/html/checkout.html',
                    '/customer/html/confirmation.html',
                    '/customer/html/payment.html',
                    '/customer/html/shipping.html',
                    '/customer/html/details.html',
                    '/customer/html/Review.html',
                    '/index.html',
                    '/'
                ];
                
                if (!allowedCustomerPages.includes(currentPage)) {
                    console.log('👤 Customer redirected to menu page');
                    window.location.href = getServerPath('/customer/html/menu.html');
                    return;
                }
                
                console.log('👤 Customer authenticated - can access customer pages');
            }
            
            // Kitchen staff should only access kitchen.html, inventory.html and logout
            if (userRole === 'kitchen') {
                const allowedKitchenPages = [
                    '/html/kitchen.html',
                    '/html/Inventory.html',
                    '/html/Inventory kitchen.html',
                    '/html/Order kitchen.html', // Allow kitchen orders view
                    '/index.html',
                    '/'
                ];
                
                if (!allowedKitchenPages.includes(currentPage)) {
                    console.log('🍳 Kitchen staff redirected to kitchen.html');
                    window.location.href = getServerPath('/html/kitchen.html');
                    return;
                }
                
                // For kitchen role, ensure they can receive real-time data from POS
                console.log('🔥 Kitchen role authenticated - can receive POS data');
            }
            
            // Server staff restrictions (if needed)
            if (userRole === 'server') {
                const restrictedServerPages = [
                    '/html/Settings.html',
                    '/html/Inventory.html'
                ];
                
                if (restrictedServerPages.includes(currentPage)) {
                    console.log('👤 Server redirected to dashboard');
                    window.location.href = getServerPath('/html/Dashboard.html');
                    return;
                }
            }
            
            console.log(`✅ User role '${userRole}' has access to current page`);
            
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User signed in:", user.displayName || user.email);
        
        // Check role and redirect if necessary
        await checkUserRoleAndRedirect();
        
        // Set up kitchen data reception if user is kitchen role
        await setupKitchenDataReception(user);
        
    } else {
        console.log("No user signed in");
        // Prevent auto-refresh/redirect loop
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html') || currentPath === '/' || currentPath === '/index.html';
        const isSignupPage = currentPath.includes('signup');
        const isCustomerPage = currentPath.includes('customer');
        const isPublicPage = isLoginPage || isSignupPage || isCustomerPage;
        
        // Only redirect if not already on a public page and not in a redirect loop
        if (!isPublicPage && !window.isRedirecting) {
            window.isRedirecting = true; // Prevent redirect loops
            const loginPath = getServerPath('/html/login.html');
            console.log('🔄 Redirecting to login:', loginPath);
            
            // Reset redirect flag after 5 seconds to prevent permanent blocking
            setTimeout(() => {
                window.isRedirecting = false;
            }, 5000);
            
            // Use replace instead of href to prevent back button issues
            window.location.replace(loginPath);
        }
    }
});

// Test Firebase connection to verify domain authorization
function testFirebaseConnection() {
    console.log('🔍 Testing Firebase connection...');
    
    // Test Firestore connection
    firebase.firestore().collection('test').limit(1).get()
        .then(() => {
            console.log('✅ Firebase Firestore connection: OK');
        })
        .catch((error) => {
            console.error('❌ Firebase Firestore connection failed:', error.message);
            if (error.code === 'permission-denied') {
                console.warn('🔒 Permission denied - this may be due to domain authorization issues');
            }
        });
    
    // Test Auth connection
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ Firebase Auth connection: OK (user signed in)');
        } else {
            console.log('✅ Firebase Auth connection: OK (no user signed in)');
        }
    });
}

// Function to set up kitchen data reception from POS
async function setupKitchenDataReception(user) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'user';
            
            if (userRole === 'kitchen') {
                console.log('🍳 Setting up kitchen data reception from POS...');
                
                // Set up global kitchen data listener
                const db = firebase.firestore();
                
                // Listen for new orders from POS system
                db.collection('orders')
                    .where('status', 'in', ['Processing', 'in the kitchen', 'Pending Payment'])
                    .onSnapshot((snapshot) => {
                        console.log('📦 Kitchen received order updates from POS:', snapshot.size);
                        
                        // Store kitchen-relevant data globally for access by kitchen.js
                        window.kitchenOrdersData = [];
                        
                        snapshot.forEach(doc => {
                            const orderData = {
                                id: doc.id,
                                ...doc.data()
                            };
                            
                            // Only include orders that are relevant to kitchen
                            if (orderData.status === 'in the kitchen' || 
                                orderData.kitchenStatus === 'in the kitchen' ||
                                (orderData.status === 'Processing' && orderData.items && orderData.items.length > 0) ||
                                (orderData.status === 'Pending Payment' && orderData.kitchenStatus === 'in the kitchen')) {
                                
                                window.kitchenOrdersData.push(orderData);
                                console.log('✅ Kitchen can receive order:', orderData.orderNumberFormatted || orderData.id);
                            }
                        });
                        
                        // Trigger kitchen refresh if kitchen.js is loaded
                        if (typeof window.loadKitchenOrders === 'function') {
                            console.log('🔄 Refreshing kitchen display with new POS data');
                            window.loadKitchenOrders();
                        }
                    }, (error) => {
                        console.error('❌ Kitchen data reception error:', error);
                    });
                
                console.log('✅ Kitchen data reception from POS system is active');
            }
        }
    } catch (error) {
        console.error('Error setting up kitchen data reception:', error);
    }
}


document.addEventListener('DOMContentLoaded', main);


