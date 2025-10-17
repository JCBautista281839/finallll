// Role-based sidebar navigation - Enhanced version
// This file works in conjunction with auth-guard.js

async function initializeRoleBasedNavigation() {
    // Wait for auth-guard to be available
    if (typeof window.authGuard === 'undefined') {
        setTimeout(initializeRoleBasedNavigation, 100);
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'user';
            
            console.log(`🔧 Setting up navigation for role: ${userRole}`);
            
            // Define role-based navigation items
            const roleNavigation = {
                'kitchen': [
                    { href: '/kitchen', title: 'Kitchen Dashboard', icon: '🍳', allowed: true },
                    { href: '/notifications', title: 'Notifications', icon: '🔔', allowed: true },
                    { href: '/inventory', title: 'Inventory (View Only)', icon: '📦', allowed: true }
                ],
                'server': [
                    { href: '/dashboard', title: 'Dashboard', icon: '📊', allowed: true },
                    { href: '/order', title: 'Orders', icon: '📋', allowed: true },
                    { href: '/pos', title: 'POS', icon: '💳', allowed: true },
                    { href: '/menu', title: 'Menu', icon: '🍽️', allowed: true },
                    { href: '/notifications', title: 'Notifications', icon: '🔔', allowed: true }
                ],
                'manager': [
                    { href: '/dashboard', title: 'Dashboard', icon: '📊', allowed: true },
                    { href: '/order', title: 'Orders', icon: '📋', allowed: true },
                    { href: '/pos', title: 'POS', icon: '💳', allowed: true },
                    { href: '/menu', title: 'Menu', icon: '🍽️', allowed: true },
                    { href: '/inventory', title: 'Inventory', icon: '📦', allowed: true },
                    { href: '/user', title: 'Users', icon: '👥', allowed: true },
                    { href: '/analytics', title: 'Analytics', icon: '📈', allowed: true },
                    { href: '/settings', title: 'Settings', icon: '⚙️', allowed: true },
                    { href: '/notifications', title: 'Notifications', icon: '🔔', allowed: true }
                ],
                'admin': 'all' // Admin can access everything
            };
            
            // Apply role-based navigation
            applyRoleBasedNavigation(userRole, roleNavigation[userRole]);
            
        }
    } catch (error) {
        console.error('Error setting up role-based navigation:', error);
    }
}

function applyRoleBasedNavigation(userRole, allowedNavItems) {
    const sidebar = document.querySelector('#sidebar nav');
    if (!sidebar) return;

    // Hide all navigation items first
    const allNavLinks = sidebar.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => {
        link.style.display = 'none';
    });

    if (allowedNavItems === 'all') {
        // Admin sees everything
        allNavLinks.forEach(link => {
            link.style.display = 'block';
            link.style.visibility = 'visible';
            link.style.opacity = '1';
        });
    } else {
        // Show only allowed navigation items
        allowedNavItems.forEach(item => {
            const link = sidebar.querySelector(`a[href*="${item.href}"]`);
            if (link) {
                link.style.display = 'block';
                link.style.visibility = 'visible';
                link.style.opacity = '1';
                
                // Add role-specific styling
                if (userRole === 'kitchen' && item.href === '/inventory') {
                    link.classList.add('view-only');
                    link.title = 'Inventory (View Only)';
                }
            }
        });
    }

    // Always show logout
    const logoutBtn = document.querySelector('#logoutBtn, a[href*="logout"]');
    if (logoutBtn) {
        logoutBtn.style.display = 'block';
        logoutBtn.style.visibility = 'visible';
        logoutBtn.style.opacity = '1';
    }

    // Add role indicator
    addRoleIndicator(userRole);
}

function addRoleIndicator(userRole) {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    // Remove existing role indicator
    const existingIndicator = sidebar.querySelector('.role-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Create role indicator
    const roleIndicator = document.createElement('div');
    roleIndicator.className = 'role-indicator';
    roleIndicator.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.1);
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        color: white;
        text-transform: uppercase;
        font-weight: bold;
    `;

    const roleLabels = {
        'admin': '👑 Admin',
        'manager': '👨‍💼 Manager',
        'server': '🍽️ Server',
        'kitchen': '🍳 Kitchen',
        'user': '👤 User'
    };

    roleIndicator.textContent = roleLabels[userRole] || '👤 User';
    sidebar.appendChild(roleIndicator);
}

// Enhanced navigation with auth-guard integration
function setupEnhancedNavigation() {
    // Wait for auth-guard to be ready
    if (typeof window.authGuard !== 'undefined') {
        const authGuard = window.authGuard;
        
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                setTimeout(() => {
                    initializeRoleBasedNavigation();
                }, 500);
            }
        });
    } else {
        // Fallback to original method
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                setTimeout(() => {
                    initializeRoleBasedNavigation();
                }, 1000);
            }
        });
    }
}

// Initialize enhanced navigation
document.addEventListener('DOMContentLoaded', setupEnhancedNavigation);