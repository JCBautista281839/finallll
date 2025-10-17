// Authentication Guard - Role-based Access Control
// This file handles client-side authentication and role-based access control

class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.waitForFirebase();
            this.setupAuthListener();
        } catch (error) {
            console.error('AuthGuard initialization failed:', error);
        }
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                resolve();
            } else {
                setTimeout(() => this.waitForFirebase().then(resolve), 100);
            }
        });
    }

    setupAuthListener() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserRole();
                this.enforceRoleBasedAccess();
            } else {
                this.currentUser = null;
                this.userRole = null;
                this.redirectToLogin();
            }
        });
    }

    async loadUserRole() {
        try {
            const userDoc = await firebase.firestore()
                .collection('users')
                .doc(this.currentUser.uid)
                .get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.userRole = userData.role || 'user';
                console.log(`🔐 User role loaded: ${this.userRole}`);
            } else {
                this.userRole = 'user';
                console.log('⚠️ User document not found, defaulting to user role');
            }
        } catch (error) {
            console.error('Error loading user role:', error);
            this.userRole = 'user';
        }
    }

    enforceRoleBasedAccess() {
        const currentPath = window.location.pathname;
        const currentPage = this.getPageFromPath(currentPath);

        console.log(`🔍 Checking access for role: ${this.userRole} on page: ${currentPage}`);

        // Define role-based access rules
        const accessRules = {
            'kitchen': {
                allowedPages: ['kitchen', 'inventory', 'notifications'],
                redirectTo: 'kitchen',
                message: 'Kitchen staff can only access kitchen dashboard, inventory and notifications'
            },
            'admin': {
                allowedPages: 'all', // Admin can access everything
                redirectTo: null,
                message: 'Admin has full access'
            },
            'manager': {
                allowedPages: ['dashboard', 'menu', 'inventory', 'order', 'pos', 'analytics', 'settings', 'user', 'notifications', 'receipt', 'addproduct', 'editproduct', 'payment', 'reports'],
                redirectTo: 'dashboard',
                message: 'Manager has access to most features'
            },
            'server': {
                allowedPages: ['dashboard', 'order', 'pos', 'menu', 'notifications'],
                redirectTo: 'dashboard',
                message: 'Server has limited access to order management'
            },
            'user': {
                allowedPages: ['dashboard', 'menu', 'notifications'],
                redirectTo: 'dashboard',
                message: 'Regular user has basic access'
            }
        };

        const userRules = accessRules[this.userRole] || accessRules['user'];

        // Check if user has access to current page
        if (userRules.allowedPages !== 'all' && !userRules.allowedPages.includes(currentPage)) {
            console.log(`🚫 Access denied for ${this.userRole} to ${currentPage}`);
            this.showAccessDeniedMessage(userRules.message);
            this.redirectToAllowedPage(userRules.redirectTo);
            return;
        }

        // If access is allowed, set up page-specific restrictions
        this.setupPageSpecificRestrictions(currentPage);
    }

    getPageFromPath(path) {
        // Extract page name from path
        const pathParts = path.split('/');
        const page = pathParts[pathParts.length - 1];
        
        // Remove .html extension if present and convert to lowercase for comparison
        return page.replace('.html', '').toLowerCase();
    }

    setupPageSpecificRestrictions(page) {
        console.log(`🔧 Setting up restrictions for ${this.userRole} on ${page}`);

        // Kitchen-specific restrictions
        if (this.userRole === 'kitchen') {
            this.setupKitchenRestrictions(page);
        }

        // Server-specific restrictions
        if (this.userRole === 'server') {
            this.setupServerRestrictions(page);
        }

        // Regular user restrictions
        if (this.userRole === 'user') {
            this.setupUserRestrictions(page);
        }

        // Update navigation based on role
        this.updateNavigationForRole();
    }

    setupKitchenRestrictions(page) {
        // Kitchen users have FULL access to inventory management
        // No restrictions on inventory page - they can add/edit/delete
        
        // Hide admin-only elements (non-inventory related)
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(el => el.style.display = 'none');

        // Hide manager-only elements (non-inventory related)
        const managerElements = document.querySelectorAll('[data-manager-only]');
        managerElements.forEach(el => el.style.display = 'none');

        // Note: Kitchen users have full inventory management permissions
        // They can add, edit, and delete inventory items without restrictions
    }

    setupServerRestrictions(page) {
        // Hide admin-only elements
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(el => el.style.display = 'none');

        // Hide manager-only elements
        const managerElements = document.querySelectorAll('[data-manager-only]');
        managerElements.forEach(el => el.style.display = 'none');

        // Hide inventory management buttons
        const inventoryButtons = document.querySelectorAll('#inventoryAddAction, .edit-btn, .delete-btn');
        inventoryButtons.forEach(btn => btn.style.display = 'none');
    }

    setupUserRestrictions(page) {
        // Hide admin and manager elements
        const adminElements = document.querySelectorAll('[data-admin-only]');
        adminElements.forEach(el => el.style.display = 'none');

        const managerElements = document.querySelectorAll('[data-manager-only]');
        managerElements.forEach(el => el.style.display = 'none');

        // Hide server elements
        const serverElements = document.querySelectorAll('[data-server-only]');
        serverElements.forEach(el => el.style.display = 'none');
    }

    updateNavigationForRole() {
        const navItems = {
            'kitchen': [
                { href: 'kitchen', title: 'Kitchen Dashboard', icon: '🍳' },
                { href: 'Inventory', title: 'Inventory', icon: '📦' },
                { href: 'notifications', title: 'Notifications', icon: '🔔' }
            ],
            'server': [
                { href: 'Dashboard', title: 'Dashboard', icon: '📊' },
                { href: 'Order', title: 'Orders', icon: '📋' },
                { href: 'pos', title: 'POS', icon: '💳' },
                { href: 'menu', title: 'Menu', icon: '🍽️' },
                { href: 'notifications', title: 'Notifications', icon: '🔔' }
            ],
            'manager': [
                { href: 'Dashboard', title: 'Dashboard', icon: '📊' },
                { href: 'Order', title: 'Orders', icon: '📋' },
                { href: 'pos', title: 'POS', icon: '💳' },
                { href: 'menu', title: 'Menu', icon: '🍽️' },
                { href: 'Inventory', title: 'Inventory', icon: '📦' },
                { href: 'user', title: 'Users', icon: '👥' },
                { href: 'analytics', title: 'Analytics', icon: '📈' },
                { href: 'Settings', title: 'Settings', icon: '⚙️' },
                { href: 'notifications', title: 'Notifications', icon: '🔔' }
            ],
            'admin': 'all' // Admin sees everything
        };

        const allowedNavItems = navItems[this.userRole] || navItems['user'];

        // Hide all navigation items first
        const allNavLinks = document.querySelectorAll('.nav-link, .sidebar a, nav a');
        allNavLinks.forEach(link => {
            link.style.display = 'none';
        });

        // Show only allowed navigation items
        if (allowedNavItems !== 'all') {
            allowedNavItems.forEach(item => {
                // Match links by href containing the page name (case-insensitive)
                // Also match by title attribute for links like Notifications that use href="#"
                const links = document.querySelectorAll(`a[href*="${item.href}"], a[href*="${item.href.toLowerCase()}"], a[title="${item.title}"], a[title*="${item.title}"]`);
                links.forEach(link => {
                    link.style.display = 'block';
                    link.style.visibility = 'visible';
                    link.style.opacity = '1';
                });
            });
        } else {
            // Admin sees all navigation
            allNavLinks.forEach(link => {
                link.style.display = 'block';
                link.style.visibility = 'visible';
                link.style.opacity = '1';
            });
        }

        // Always show logout button
        const logoutLinks = document.querySelectorAll('a[href*="logout"], .logout-btn, #logoutBtn, a[title="Logout"]');
        logoutLinks.forEach(link => {
            link.style.display = 'block';
            link.style.visibility = 'visible';
            link.style.opacity = '1';
        });
    }

    showAccessDeniedMessage(message) {
        // Create or update access denied message
        let messageEl = document.getElementById('access-denied-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'access-denied-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ff4444;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
            `;
            document.body.appendChild(messageEl);
        }

        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }

    redirectToAllowedPage(allowedPage) {
        if (allowedPage && window.location.pathname !== `/html/${allowedPage}.html`) {
            console.log(`🔄 Redirecting to allowed page: ${allowedPage}`);
            window.location.href = `/html/${allowedPage}.html`;
        }
    }

    redirectToLogin() {
        if (!window.location.pathname.includes('login') && !window.location.pathname.includes('signup')) {
            console.log('🔄 Redirecting to login');
            window.location.href = '/html/login.html';
        }
    }

    // Public methods for other scripts to use
    getCurrentUser() {
        return this.currentUser;
    }

    getUserRole() {
        return this.userRole;
    }

    hasPermission(requiredRole) {
        const roleHierarchy = {
            'user': 1,
            'server': 2,
            'kitchen': 2,
            'manager': 3,
            'admin': 4
        };

        const userLevel = roleHierarchy[this.userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    }

    isAdmin() {
        return this.userRole === 'admin';
    }

    isManager() {
        return this.userRole === 'manager' || this.userRole === 'admin';
    }

    isKitchen() {
        return this.userRole === 'kitchen';
    }

    isServer() {
        return this.userRole === 'server';
    }
}

// Initialize AuthGuard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authGuard = new AuthGuard();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthGuard;
}
