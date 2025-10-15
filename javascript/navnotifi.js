const notifIcon = document.querySelector('.nav-link[title="Notifications"] .nav-icon');
const notifLink = document.querySelector('.nav-link[title="Notifications"]');
const dropdown = document.getElementById('notificationDropdown');
const closeDropdown = document.getElementById('closeDropdown');

// Handle notification click for kitchen users
if (notifIcon && notifLink) {
    notifLink.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            if (dropdown.style.display === 'block' && typeof loadDropdownNotifications === 'function') {
                loadDropdownNotifications();
            }
        }
    });
}
if (closeDropdown) {
    closeDropdown.addEventListener('click', function () {
        dropdown.style.display = 'none';
    });
}
window.addEventListener('click', function (e) {
    if (!dropdown) return;
    if (!dropdown.contains(e.target) && !notifIcon.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});
async function loadDropdownNotifications() {
    try {
        // Ensure Firebase is initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for dropdown notifications:', error);
    }
    
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    const list = document.getElementById('dropdownNotificationsList');
    if (!db || !list) return;

    // Check user role to determine which notifications to show
    let userRole = 'admin'; // Default to admin
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userRole = userData.role || 'admin';
            }
        }
    } catch (error) {
        console.error('Error checking user role for dropdown:', error);
    }

    console.log('🍳 Dropdown: User role:', userRole, '- Loading notifications...');

    let queryPromise;
    
    if (userRole === 'kitchen') {
        // Kitchen users only see inventory-related notifications
        queryPromise = db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .get()
            .then(function(querySnapshot) {
                // Sort by timestamp in JavaScript to avoid composite index requirement
                const docs = [];
                querySnapshot.forEach(function(doc) {
                    docs.push(doc);
                });
                docs.sort(function(a, b) {
                    const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
                    const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
                    return timestampB - timestampA; // Descending order
                });
                return { docs: docs.slice(0, 5) }; // Limit to 5 items
            });
    } else {
        // Admin users see all notifications
        queryPromise = db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
    }

    queryPromise
        .then(function (result) {
            // Handle both QuerySnapshot and custom result format
            const docs = result.docs || result;
            const isEmpty = result.empty || (Array.isArray(docs) && docs.length === 0);
            
            if (isEmpty) {
                list.innerHTML = '<div class="text-center text-muted py-3">No notifications</div>';
                return;
            }
            let html = '';
            // Detect dark mode
            const isDark = document.body.classList.contains('dark-mode');
            const nameColor = isDark ? '#ffc9b3' : '#760000';
            const messageColor = isDark ? '#f1f1f1' : '#222';
            
            // Handle both QuerySnapshot.forEach and array iteration
            if (docs.forEach) {
                docs.forEach(function (doc) {
                    const data = doc.data();
                    
                    // Skip non-inventory notifications for kitchen users
                    if (userRole === 'kitchen' && !['empty', 'restock', 'inventory'].includes(data.type)) {
                        console.log('🍳 Kitchen: Skipping non-inventory notification in dropdown:', data.type);
                        return; // Skip this notification
                    }
                    
                    html += `<div class="dropdown-item d-flex align-items-center py-2 px-2" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 350px !important;">
                        <div class="flex-grow-1" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 280px !important;">
                            <div style="color:${nameColor};margin-top:-5px; word-wrap: break-word !important; overflow-wrap: break-word !important;">${data.name || 'System'}</div>
                            <div style="font-size:12px;color:${messageColor}; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; word-break: break-word !important;">${data.message || ''}</div>
                        </div>
                        <div style="font-size:12px;color:#888;min-width:70px;text-align:right;">${data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : ''}</div>
                    </div>`;
                });
            } else {
                // Handle array of docs
                docs.forEach(function (doc) {
                    const data = doc.data();
                    
                    // Skip non-inventory notifications for kitchen users
                    if (userRole === 'kitchen' && !['empty', 'restock', 'inventory'].includes(data.type)) {
                        console.log('🍳 Kitchen: Skipping non-inventory notification in dropdown:', data.type);
                        return; // Skip this notification
                    }
                    html += `<div class="dropdown-item d-flex align-items-center py-2 px-2" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 350px !important;">
                        <div class="flex-grow-1" style="word-wrap: break-word !important; overflow-wrap: break-word !important; max-width: 280px !important;">
                            <div style="color:${nameColor};margin-top:-5px; word-wrap: break-word !important; overflow-wrap: break-word !important;">${data.name || 'System'}</div>
                            <div style="font-size:12px;color:${messageColor}; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; word-break: break-word !important;">${data.message || ''}</div>
                        </div>
                        <div style="font-size:12px;color:#888;min-width:70px;text-align:right;">${data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : ''}</div>
                    </div>`;
                });
            }
            list.innerHTML = html;
            
            // Hide "See all incoming activity" link for kitchen users
            hideSeeAllLinkForKitchen(userRole);
        })
        .catch(function (error) {
            console.error('Error loading dropdown notifications:', error);
            list.innerHTML = '<div class="text-center text-danger py-3">Error loading notifications</div>';
        });
}
// Function to hide "See all incoming activity" link for kitchen users
function hideSeeAllLinkForKitchen(userRole) {
    if (userRole === 'kitchen') {
        const seeAllLink = document.querySelector('.see-all-link');
        if (seeAllLink) {
            seeAllLink.style.display = 'none';
            console.log('🍳 Kitchen: Hidden "See all incoming activity" link');
        }
    }
}

// Make function globally available
window.hideSeeAllLinkForKitchen = hideSeeAllLinkForKitchen;

function timeAgo(date) {
    var now = new Date();
    var seconds = Math.floor((now - date) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
    return 'Just now';
}
document.addEventListener('DOMContentLoaded', function () {
    // Check if user is kitchen user and block access to notifi.html
    checkUserRoleAndBlockNotifications();
    
    var notifLink = document.querySelector('.nav-link[title="Notifications"]');
    if (notifLink) {
        notifLink.addEventListener('click', function () {
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        });
    }
});

// Function to check user role and block kitchen users from accessing notifi.html
async function checkUserRoleAndBlockNotifications() {
    try {
        // Check if we're on the kitchen page
        const isKitchenPage = window.location.pathname.includes('kitchen.html');
        if (!isKitchenPage) return;
        
        // Wait for Firebase to be ready
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'admin';
                
                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen user detected - blocking access to notifi.html');
                    
                    // Block any attempts to navigate to notifi.html
                    window.addEventListener('beforeunload', function(e) {
                        if (window.location.href.includes('notifi.html')) {
                            e.preventDefault();
                            e.returnValue = '';
                            return '';
                        }
                    });
                    
                    // Override any links that might redirect to notifi.html
                    document.addEventListener('click', function(e) {
                        const target = e.target.closest('a');
                        if (target && target.href && target.href.includes('notifi.html')) {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🍳 Blocked navigation to notifi.html for kitchen user');
                            return false;
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking user role for notification blocking:', error);
    }
}