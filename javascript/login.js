
// Ensure Firebase is initialized before any auth calls
if (typeof initializeFirebase === 'function') {
    initializeFirebase();
}

async function handleLogin(email, password) {
    try {
        // Show loading state
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Logging in...';
        }

        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user data to determine role
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData.role || 'user';
            
            // Set role in localStorage to prevent redirect glitch
            localStorage.setItem('userRole', role);
            
            // Clear any existing timeouts
            if (window.redirectTimeout) {
                clearTimeout(window.redirectTimeout);
            }
            
            // Redirect based on role with a small delay
            switch(role) {
                case 'kitchen':
                    window.location.replace('/html//kitchen/kitchen.html');
                    break;
                case 'server':
                case 'manager':
                case 'admin':
                    window.location.replace('/html/Dashboard.html');
                    break;
                default:
                    window.location.replace('/html/Dashboard.html');
            }
        } else {
            throw new Error('User data not found');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
        
        // Reset login button
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.innerHTML = 'Login';
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


let forceAdminRole = false;
document.addEventListener('DOMContentLoaded', function() {
    const adminBtn = document.getElementById('adminBtn');
    const customerBtn = document.getElementById('customerBtn');
    const noAccountDiv = document.querySelector('.no-account');
    if (adminBtn && noAccountDiv) {
        adminBtn.addEventListener('click', function() {
            noAccountDiv.style.display = 'none';
            forceAdminRole = true;
        });
    }
    if (customerBtn && noAccountDiv) {
        customerBtn.addEventListener('click', function() {
            noAccountDiv.style.display = '';
            forceAdminRole = false;
        });
    }

    // Intercept login form submit to force admin role if needed
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            if (forceAdminRole) {
                // After successful login, always treat as admin
                localStorage.setItem('userRole', 'admin');
            }
        }, true);
    }
});