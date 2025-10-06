
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

        // First, try to find user by email in Firestore collections before attempting Firebase Auth
        let userRole = 'customer'; // Default role
        let userFound = false;
        let userData = null;
        
        console.log('🔍 Searching for user by email:', email);
        
        // Search in users collection by email
        try {
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
            }
        } catch (error) {
            console.log('⚠️ Error searching users collection:', error.message);
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
                    userRole = 'customer';
                    userFound = true;
                    console.log('✅ User found in customers collection:', userData.email);
                }
            } catch (error) {
                console.log('⚠️ Error searching customers collection:', error.message);
            }
        }
        
        // If user not found in Firestore, create admin account if admin login is selected
        if (!userFound) {
            if (selectedUserType === 'admin') {
                console.log('🔧 Admin user not found, will create account after Firebase Auth...');
                // We'll create the account after successful Firebase Auth
            } else {
                throw new Error('User account not found. Please sign up first.');
            }
        }

        // Now attempt Firebase Auth login
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Firebase Auth successful for:', user.email);
        
        // If user wasn't found in Firestore but admin login was selected, create the account
        if (!userFound && selectedUserType === 'admin') {
            console.log('🔧 Creating admin account in Firestore...');
            try {
                await firebase.firestore().collection('users').doc(user.uid).set({
                    email: user.email,
                    name: user.displayName || 'Admin User',
                    displayName: user.displayName || 'Admin User',
                    firstName: user.displayName ? user.displayName.split(' ')[0] : 'Admin',
                    lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : 'User',
                    role: 'admin',
                    userType: 'admin',
                    isActive: true,
                    isEmailVerified: user.emailVerified,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Also create in customers collection for compatibility
                await firebase.firestore().collection('customers').doc(user.uid).set({
                    customerId: user.uid,
                    name: user.displayName || 'Admin User',
                    email: user.email,
                    displayName: user.displayName || 'Admin User',
                    firstName: user.displayName ? user.displayName.split(' ')[0] : 'Admin',
                    lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : 'User',
                    role: 'admin',
                    userType: 'admin',
                    isActive: true,
                    isEmailVerified: user.emailVerified,
                    accountStatus: 'verified',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                userRole = 'admin';
                userFound = true;
                console.log('✅ Admin account created successfully in Firestore');
            } catch (createError) {
                console.error('❌ Error creating admin account:', createError);
                await firebase.auth().signOut();
                throw new Error('Error creating admin account. Please try again.');
            }
        }
        
        // Check if the selected type matches the user's actual role
        if (selectedUserType === 'admin') {
            // Admin login - only allow admin, manager, server, kitchen roles
            if (!['admin', 'manager', 'server', 'kitchen'].includes(userRole)) {
                // If user doesn't have admin role, try to update it
                console.log('User role is:', userRole, 'Updating to admin role...');
                try {
                    // Update the user document found by email search
                    const usersQuery = await firebase.firestore()
                        .collection('users')
                        .where('email', '==', email)
                        .limit(1)
                        .get();
                    
                    if (!usersQuery.empty) {
                        const userDoc = usersQuery.docs[0];
                        await userDoc.ref.update({
                            role: 'admin',
                            userType: 'admin',
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('User role updated to admin successfully');
                        userRole = 'admin'; // Update local variable
                    }
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
                usernameInput.type = 'email';
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
                usernameInput.placeholder = 'Email Address';
                usernameInput.type = 'email';
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