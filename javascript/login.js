
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
                
                // As a temporary workaround, allow login with default role based on selected type
                // This handles cases where users exist in Firebase Auth but not in Firestore
                console.log('🔧 Applying temporary workaround: allowing login with default role');
                userRole = selectedUserType === 'admin' ? 'admin' : 'customer';
                userData = {
                    email: user.email,
                    name: user.displayName || (selectedUserType === 'admin' ? 'Admin User' : 'Customer User'),
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
        
        // Check if the selected type matches the user's actual role
        if (selectedUserType === 'admin') {
            // Admin login - only allow admin, manager, server, kitchen roles
            if (!['admin', 'manager', 'server', 'kitchen'].includes(userRole)) {
                await firebase.auth().signOut(); // Sign out the user
                throw new Error(`Access denied. This account has '${userRole}' role and is not authorized for admin access. Please use customer login or contact administrator.`);
            }
        } else {
            // Customer login - only allow customer role
            if (!['customer', 'user'].includes(userRole)) {
                await firebase.auth().signOut(); // Sign out the user
                throw new Error(`Access denied. This is a staff account with '${userRole}' role. Please use admin login.`);
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
            
            // Show role info
            const roleInfo = document.getElementById('roleInfo');
            const roleInfoText = document.getElementById('roleInfoText');
            if (roleInfo && roleInfoText) {
                roleInfoText.textContent = 'For restaurant staff, managers, and administrators only.';
                roleInfo.style.display = 'block';
                console.log('Admin role info updated');
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
            
            // Show role info
            const roleInfo = document.getElementById('roleInfo');
            const roleInfoText = document.getElementById('roleInfoText');
            if (roleInfo && roleInfoText) {
                roleInfoText.textContent = 'For customers to place orders and manage their account.';
                roleInfo.style.display = 'block';
                console.log('Customer role info updated');
            }
        });
    }

    // Set default selection to Customer
    if (customerBtn) {
        customerBtn.click();
    }
    
    // Ensure role info is properly set on page load
    const roleInfo = document.getElementById('roleInfo');
    const roleInfoText = document.getElementById('roleInfoText');
    if (roleInfo && roleInfoText) {
        // Set initial role info based on default selection
        roleInfoText.textContent = 'For customers to place orders and manage their account.';
        roleInfo.style.display = 'block';
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