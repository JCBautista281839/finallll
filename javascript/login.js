
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

        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user data to determine role - check both users and customers collections
        let userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        let customerDoc = await firebase.firestore().collection('customers').doc(user.uid).get();
        let userRole = 'customer'; // Default role
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            userRole = userData.role || 'customer';
            
            // Check if the selected type matches the user's actual role
            if (selectedUserType === 'admin') {
                // Admin login - only allow admin, manager, server, kitchen roles
                if (!['admin', 'manager', 'server', 'kitchen'].includes(userRole)) {
                    // If user doesn't have admin role, try to update it
                    console.log('User role is:', userRole, 'Updating to admin role...');
                    try {
                        await firebase.firestore().collection('users').doc(user.uid).update({
                            role: 'admin',
                            userType: 'admin',
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
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
        } else if (customerDoc.exists) {
            // Customer document exists in customers collection
            const customerData = customerDoc.data();
            userRole = 'customer';
            console.log('Customer account found:', customerData.email);
        } else {
            // Neither user nor customer document exists
            if (selectedUserType === 'admin') {
                console.log('User document not found, creating with admin role...');
                try {
                    await firebase.firestore().collection('users').doc(user.uid).set({
                        email: user.email,
                        role: 'admin',
                        userType: 'admin',
                        isActive: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('User document created with admin role successfully');
                    userRole = 'admin';
                } catch (createError) {
                    console.error('Error creating user document:', createError);
                    await firebase.auth().signOut();
                    throw new Error('Error creating user account. Please try again.');
                }
            } else {
                await firebase.auth().signOut();
                throw new Error('Email account not found. Please sign up first.');
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