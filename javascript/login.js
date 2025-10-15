
// Ensure Firebase is initialized before any auth calls
if (typeof initializeFirebase === 'function') {
    initializeFirebase();
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        </div>
    `;

    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        max-width: 300px;
        font-family: 'Poppins', sans-serif;
    `;

    // Add to body
    document.body.appendChild(toast);

    // Remove toast after 5 seconds or on close click
    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    };

    closeBtn.addEventListener('click', removeToast);
    setTimeout(removeToast, 5000);
}

// Password toggle functionality
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = passwordInput.nextElementSibling;
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Global variable to track detected user type
let detectedUserType = null; // Will be determined automatically from Firebase

async function handleLogin(email, password) {
    try {
        // Show loading state
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Logging in...';
        }

        console.log('🔍 Attempting Firebase Auth login for:', email);

        // First, attempt Firebase Auth login
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('✅ Firebase Auth successful for:', user.email);

        // Check if there's a pending password reset
        const pendingReset = sessionStorage.getItem('pendingPasswordReset');
        if (pendingReset) {
            try {
                const resetData = JSON.parse(pendingReset);
                if (resetData.email === email && resetData.newPassword) {
                    console.log('🔄 Pending password reset found, updating password...');
                    await user.updatePassword(resetData.newPassword);
                    console.log('✅ Password updated successfully in Firebase!');
                    sessionStorage.removeItem('pendingPasswordReset');
                    showToast('Password updated successfully!', 'success');
                }
            } catch (resetError) {
                console.error('⚠️ Failed to update password:', resetError);
                // Continue with login even if password update fails
            }
        }

        // Now search for user in Firestore collections to get role and data
        let userRole = null;
        let userFound = false;
        let userData = null;

        console.log('🔍 Searching for user in Firestore collections...');

        // Search in users collection by email (primary collection)
        try {
            const usersQuery = await firebase.firestore()
                .collection('users')
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!usersQuery.empty) {
                const userDoc = usersQuery.docs[0];
                userData = userDoc.data();
                userRole = userData.role || userData.userType || 'customer';
                userFound = true;
                console.log('✅ User found in users collection:', userData.email, 'Role:', userRole);
            }
        } catch (error) {
            console.log('⚠️ Error searching users collection:', error.message);
            // If it's a permissions error, we'll try alternative methods below
            if (error.message.includes('permissions') || error.message.includes('Missing or insufficient')) {
                console.log('🔍 Permissions issue detected, will try alternative search methods');
            }
        }

        // If not found in users collection, search in customers collection
        if (!userFound) {
            try {
                const customersQuery = await firebase.firestore()
                    .collection('customers')
                    .where('email', '==', email)
                    .limit(1)
                    .get();

                if (!customersQuery.empty) {
                    const customerDoc = customersQuery.docs[0];
                    userData = customerDoc.data();
                    userRole = 'customer'; // Customers collection is specifically for customer role
                    userFound = true;
                    console.log('✅ User found in customers collection:', userData.email);
                }
            } catch (error) {
                console.log('⚠️ Error searching customers collection:', error.message);
                // If it's a permissions error, we'll try alternative methods below
                if (error.message.includes('permissions') || error.message.includes('Missing or insufficient')) {
                    console.log('🔍 Permissions issue detected in customers collection, will try alternative search methods');
                }
            }
        }

        // If user not found in Firestore but Firebase Auth succeeded, handle gracefully
        if (!userFound) {
            console.log('⚠️ User authenticated but not found in Firestore collections');

            // Check if this is a permissions issue or truly missing data
            try {
                // Try to get user data directly by UID as fallback
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                    userRole = userData.role || userData.userType || 'customer';
                    userFound = true;
                    console.log('✅ User found by UID in users collection:', userData.email, 'Role:', userRole);
                } else {
                    // Try customers collection by UID
                    const customerDoc = await firebase.firestore().collection('customers').doc(user.uid).get();
                    if (customerDoc.exists) {
                        userData = customerDoc.data();
                        userRole = 'customer';
                        userFound = true;
                        console.log('✅ User found by UID in customers collection:', userData.email);
                    }
                }
            } catch (uidError) {
                console.log('⚠️ Error searching by UID:', uidError.message);
            }

            // If still not found, this might be a permissions issue or missing Firestore data
            if (!userFound) {
                console.log('❌ User not found in any collection - this might be a permissions issue or missing Firestore data');

                // As a temporary workaround, allow login with default customer role
                // This handles cases where users exist in Firebase Auth but not in Firestore
                console.log('🔧 Applying temporary workaround: allowing login with default customer role');
                userRole = 'customer';
                userData = {
                    email: user.email,
                    name: user.displayName || 'Customer User',
                    role: userRole,
                    userType: userRole,
                    isActive: true,
                    isEmailVerified: user.emailVerified,
                    createdAt: new Date(),
                    lastLogin: new Date(),
                    lastUpdated: new Date()
                };
                userFound = true;
                console.log('✅ Temporary workaround applied - user can proceed with role:', userRole);
            }
        }

        // Validate user role exists
        if (!userRole) {
            await firebase.auth().signOut();
            throw new Error('User role not found. Please contact administrator.');
        }

        // Set the detected user type for redirect logic
        detectedUserType = userRole;

        // Update last login timestamp
        try {
            if (userData) {
                // Update the document we found
                const usersQuery = await firebase.firestore()
                    .collection('users')
                    .where('email', '==', email)
                    .limit(1)
                    .get();

                if (!usersQuery.empty) {
                    const userDoc = usersQuery.docs[0];
                    await userDoc.ref.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (updateError) {
            console.log('⚠️ Could not update last login timestamp:', updateError.message);
        }

        // Set role in localStorage to prevent redirect glitch
        localStorage.setItem('userRole', userRole);

        // Clear any existing timeouts
        if (window.redirectTimeout) {
            clearTimeout(window.redirectTimeout);
        }

        // Redirect based on detected role
        switch (userRole) {
            case 'kitchen':
                window.location.replace('../html/kitchen.html');
                break;
            case 'server':
            case 'manager':
            case 'admin':
                window.location.replace('../html/Dashboard.html');
                break;
            case 'customer':
            case 'user':
                window.location.replace('../index.html');
                break;
            default:
                // Default to customer redirect for unknown roles
                window.location.replace('../index.html');
        }
    } catch (error) {
        console.error('Login error:', error);

        // Map common Firebase Auth errors and any JSON-like server responses to friendly messages
        let friendlyMessage = error && error.message ? String(error.message) : 'Login failed. Please try again.';

        try {
            // 1) Prefer Firebase error.code if available
            const code = (error && error.code) ? String(error.code) : '';
            if (code) {
                switch (code) {
                    case 'auth/wrong-password':
                        friendlyMessage = 'Invalid Password';
                        break;
                    case 'auth/user-not-found':
                    case 'auth/invalid-email':
                        friendlyMessage = 'Invalid Email Address';
                        break;
                    case 'auth/too-many-requests':
                        friendlyMessage = 'Too many attempts. Try again later.';
                        break;
                    default:
                        // fallthrough to textual parsing below
                        break;
                }
            }

            // 2) If message looks like JSON or contains server tokens, try to extract a concise token
            if (!friendlyMessage || friendlyMessage.length > 200 || /\{\s*\"error\"|INVALID_/i.test(friendlyMessage)) {
                let parsed = null;
                try {
                    // some backends return JSON strings inside error.message
                    parsed = JSON.parse(friendlyMessage);
                } catch (e) {
                    // not JSON - continue
                }

                // If parsed JSON has nested messages, try to find a token-like string
                if (parsed) {
                    // common shapes: { error: { message: 'FOO' } } or { message: 'FOO' }
                    let candidate = null;
                    if (parsed.error && parsed.error.message) candidate = parsed.error.message;
                    else if (parsed.message) candidate = parsed.message;
                    else candidate = JSON.stringify(parsed);
                    if (candidate) friendlyMessage = String(candidate);
                }

                // 3) Normalize token-like strings to friendly text
                const token = (friendlyMessage || '').toUpperCase();
                if (/INVALID_PASSWORD/.test(token)) {
                    friendlyMessage = 'Invalid Password';
                } else if (/INVALID_EMAIL|USER_NOT_FOUND|USER-NOT-FOUND|USER.NOT.FOUND/.test(token)) {
                    friendlyMessage = 'Invalid Email Address';
                } else if (/INVALID_LOGIN_CREDENTIALS?|INVALID_LOGIN_CREDENTIAL/.test(token)) {
                    friendlyMessage = 'Invalid Email Address or Password';
                } else if (/TOO_MANY_REQUESTS|RATE_LIMIT|RATE LIMIT/.test(token)) {
                    friendlyMessage = 'Too many attempts. Try again later.';
                } else {
                    // keep the original but shorten it for display
                    if (friendlyMessage.length > 180) {
                        // log full message to console for debugging, but show a concise message to users
                        console.log('Full login error:', error);
                        friendlyMessage = 'Login failed. Please check your credentials and try again.';
                    }
                }
            }
        } catch (mapErr) {
            console.warn('Error mapping auth message to friendly message', mapErr);
        }

        showToast(friendlyMessage, 'error');

        // Reset login button
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = 'Log In';
        }
    }
}

// Add this to prevent auto-redirect on auth state change
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Check localStorage for role before redirecting
        const role = localStorage.getItem('userRole');
        if (!role) return; // Don't redirect if no role is set

        // Clear role from localStorage
        localStorage.removeItem('userRole');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Single login form - no role selection needed

    // Handle form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        });
    }
});