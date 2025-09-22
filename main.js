const firebaseConfig = {
  apiKey: "AIzaSyAXFKAt6OGLlUfQBnNmEhek6uqNQm4634Y",
  authDomain: "viktoriasbistro.restaurant",
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
        if (!firebase.apps.length) {
            console.log('Initializing Firebase with config:', JSON.stringify({
                projectId: firebaseConfig.projectId,
                authDomain: firebaseConfig.authDomain
            }));
            
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized in main.js');
            
            // Check if the current domain is authorized in Firebase
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
                
                // Show user-friendly error message
                if (typeof showError === 'function') {
                    showError(`Domain not authorized. Please add "${currentDomain}" to Firebase authorized domains.`);
                } else {
                    alert(`Domain Authorization Required:\n\nYour domain "${currentDomain}" is not authorized in Firebase.\n\nTo fix this:\n1. Go to Firebase Console\n2. Select project: victoria-s-bistro\n3. Go to Authentication -> Settings -> Authorized domains\n4. Add your domain: ${currentDomain}\n5. Save changes\n\nThen refresh this page.`);
                }
            }
            
            // Set up offline persistence with better error handling
            firebase.firestore().enablePersistence({ synchronizeTabs: true })
                .then(() => {
                    console.log('Firestore persistence enabled successfully');
                })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time');
                    } else if (err.code === 'unimplemented') {
                        console.warn('The current browser does not support offline persistence');
                    } else {
                        console.error('Error enabling persistence:', err);
                    }
                    // Continue despite persistence issues
                });
                
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
        
        // Return Firebase services
        return {
            auth: firebase.auth(),
            db: firebase.firestore()
        };
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

// Initialize Firebase and get auth and db instances
const { auth, db } = initializeFirebase();


auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(err => console.warn('setPersistence warning:', err));
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
               
                window.location.replace('/html/Dashboard.html');
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
                window.location.replace('/html/Dashboard.html');
            }
        } else {
           
            console.log('No user signed in.');
            if (!onLoginPage) {
                console.log('Redirecting to login page...');
                window.location.replace('/html/login.html');
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
                    window.location.href = '/customer/html/menu.html';
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
                    window.location.href = '/html/kitchen.html';
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
                    window.location.href = '/html/Dashboard.html';
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
        if (
            window.location.pathname !== '/html/login.html' &&
            window.location.pathname !== '/login.html' &&
            window.location.pathname !== '/' &&
            !window.location.pathname.includes('signup') &&
            !window.location.pathname.includes('customer')
        ) {
            window.location.href = '/html/login.html';
        }
    }
});

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


