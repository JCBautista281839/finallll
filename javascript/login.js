
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

// Global variable to track selected user type
let selectedUserType = 'customer'; // Default to customer

async function handleLogin(email, password) {
    try {
        // Show loading state
        const loginButton = document.querySelector('button[type="submit"]');
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Logging in...';
        }

        console.log('🔍 Searching for user by email:', email);
        
        // First, try to find user by email in Firestore collections
        let userFound = false;
        let userRole = 'customer';
        let userData = null;
        
        // Search in users collection by email
        const usersQuery = await firebase.firestore()
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
            
        if (!usersQuery.empty) {
            const userDoc = usersQuery.docs[0];
            userData = userDoc.data();
            userRole = userData.role || 'customer';
            userFound = true;
            console.log('✅ User found in users collection:', userData.email, 'Role:', userRole);
        } else {
            // Search in customers collection by email
            const customersQuery = await firebase.firestore()
                .collection('customers')
                .where('email', '==', email)
                .limit(1)
                .get();
                
            if (!customersQuery.empty) {
                const customerDoc = customersQuery.docs[0];
                userData = customerDoc.data();
                userRole = 'customer';
                userFound = true;
                console.log('✅ User found in customers collection:', userData.email);
            }
        }
        
        if (!userFound) {
            throw new Error('Email account not found. Please sign up first.');
        }
        
        // Now try to sign in with Firebase Auth
        let user;
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            user = userCredential.user;
            console.log('✅ Firebase Auth sign-in successful');
        } catch (authError) {
            console.log('⚠️ Firebase Auth sign-in failed:', authError.message);
            
            // If Firebase Auth fails but user exists in Firestore, create Firebase Auth account
            if (authError.code === 'auth/user-not-found') {
                console.log('🔄 Creating Firebase Auth account for existing Firestore user...');
                try {
                    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                    user = userCredential.user;
                    console.log('✅ Firebase Auth account created successfully');
                } catch (createError) {
                    console.error('❌ Failed to create Firebase Auth account:', createError);
                    throw new Error('Unable to create account. Please try signing up again.');
                }
            } else {
                throw authError;
            }
        }
        
        // Check if the selected type matches the user's actual role
        if (selectedUserType === 'admin') {
            // Admin login - only allow admin, manager, server, kitchen roles
            if (!['admin', 'manager', 'server', 'kitchen'].includes(userRole)) {
                // If user doesn't have admin role, try to update it
                console.log('User role is:', userRole, 'Updating to admin role...');
                try {
                    // Update the user document in Firestore
                    if (userData) {
                        await firebase.firestore().collection('users').doc(user.uid).set({
                            ...userData,
                            role: 'admin',
                            userType: 'admin',
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    } else {
                        await firebase.firestore().collection('users').doc(user.uid).set({
                            email: email,
                            role: 'admin',
                            userType: 'admin',
                            isActive: true,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    console.log('User role updated to admin successfully');
                    userRole = 'admin'; // Update local variable
                } catch (updateError) {
                    console.error('Error updating user role:', updateError);
                    await firebase.auth().signOut(); // Sign out the user
                    throw new Error('Access denied. This account is not authorized for admin access. Please contact administrator.');
                }
            }
        } else {
            // Customer login - only allow customer role
            if (userRole !== 'customer' && userRole !== 'user') {
                await firebase.auth().signOut(); // Sign out the user
                throw new Error('Access denied. Please use admin login for staff accounts.');
            }
        }
        
        // Set role in localStorage to prevent redirect glitch
        localStorage.setItem('userRole', userRole);
            
            // Clear any existing timeouts
            if (window.redirectTimeout) {
                clearTimeout(window.redirectTimeout);
            }
            
            // Redirect based on role and selected type
            if (selectedUserType === 'admin') {
                // Admin login redirects
                switch(userRole) {
                    case 'kitchen':
                        window.location.replace('../html/kitchen.html');
                        break;
                    case 'server':
                    case 'manager':
                    case 'admin':
                        window.location.replace('../html/Dashboard.html');
                        break;
                    default:
                        window.location.replace('../html/Dashboard.html');
                }
            } else {
                // Customer login redirect to index.html
                window.location.replace('../index.html');
            }
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
        
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

document.addEventListener('DOMContentLoaded', function() {
    const adminBtn = document.getElementById('adminBtn');
    const customerBtn = document.getElementById('customerBtn');
    const noAccountDiv = document.querySelector('.no-account');
    
    // Handle Admin button click
    if (adminBtn) {
        adminBtn.addEventListener('click', function() {
            selectedUserType = 'admin';
            
            // Update button styles
            adminBtn.classList.remove('btn-outline-primary');
            adminBtn.classList.add('btn-primary');
            customerBtn.classList.remove('btn-secondary');
            customerBtn.classList.add('btn-outline-secondary');
            
            // Hide signup option for admin
            if (noAccountDiv) {
                noAccountDiv.style.display = 'none';
            }
            
            // Update placeholder text
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.placeholder = 'Admin Email Address';
            }
        });
    }
    
    // Handle Customer button click
    if (customerBtn) {
        customerBtn.addEventListener('click', function() {
            selectedUserType = 'customer';
            
            // Update button styles
            customerBtn.classList.remove('btn-outline-secondary');
            customerBtn.classList.add('btn-secondary');
            adminBtn.classList.remove('btn-primary');
            adminBtn.classList.add('btn-outline-primary');
            
            // Show signup option for customers
            if (noAccountDiv) {
                noAccountDiv.style.display = 'block';
            }
            
            // Update placeholder text
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.placeholder = 'Email Address or Username';
            }
        });
    }

    // Set default selection to Customer
    if (customerBtn) {
        customerBtn.click();
    }
    
    // Handle form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password);
        });
    }
});