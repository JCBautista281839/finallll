// Role-based sidebar navigation

async function initializeRoleBasedNavigation() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'user';
            
            // Hide/show navigation items based on role
            const navItems = {
                'kitchen': [
                    '/html/kitchen.html' // Only show kitchen page
                ],
                'server': [
                    '/html/Dashboard.html',
                    '/html/Order.html',
                    '/html/pos.html',
                    '/html/menu.html'
                ],
                'manager': [
                    '/html/Dashboard.html',
                    '/html/Order.html',
                    '/html/pos.html',
                    '/html/menu.html',
                    '/html/Inventory.html',
                    '/html/user.html'
                ],
                'admin': 'all' // Admin can access everything
            };
            
            if (userRole === 'kitchen') {
                // Hide all nav items except kitchen for kitchen staff
                document.querySelectorAll('.nav-link').forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && !href.includes('kitchen.html') && !link.id === 'logoutBtn') {
                        link.style.display = 'none';
                    }
                });
                
                // Add kitchen navigation if it doesn't exist
                const sidebar = document.querySelector('#sidebar nav');
                if (sidebar && !document.querySelector('a[href="/html/kitchen.html"]')) {
                    const kitchenNav = document.createElement('a');
                    kitchenNav.href = '/html/kitchen.html';
                    kitchenNav.className = 'nav-link text-white';
                    kitchenNav.title = 'Kitchen';
                    kitchenNav.innerHTML = `
                        <img src="../src/Icons/chef-hat.png" alt="Kitchen" class="nav-icon" onerror="this.innerHTML='🍳'">
                        <div class="nav-text">Kitchen</div>
                    `;
                    
                    sidebar.insertBefore(kitchenNav, sidebar.querySelector('br'));
                }
            }
        }
    } catch (error) {
        console.error('Error setting up role-based navigation:', error);
    }
}

// Call this after Firebase auth is ready
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        setTimeout(() => {
            initializeRoleBasedNavigation();
        }, 1000);
    }
});