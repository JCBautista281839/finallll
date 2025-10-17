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
            .then(function (querySnapshot) {
                // Sort by timestamp in JavaScript to avoid composite index requirement
                const docs = [];
                querySnapshot.forEach(function (doc) {
                    docs.push(doc);
                });
                docs.sort(function (a, b) {
                    const getTimestamp = (doc) => {
                        const timestamp = doc.data().timestamp;
                        if (!timestamp) return new Date(0);
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                return timestamp.toDate();
                            } else if (timestamp instanceof Date) {
                                return timestamp;
                            } else if (typeof timestamp === 'string') {
                                return new Date(timestamp);
                            } else {
                                return new Date(0);
                            }
                        } catch (e) {
                            return new Date(0);
                        }
                    };
                    const timestampA = getTimestamp(a);
                    const timestampB = getTimestamp(b);
                    return timestampB - timestampA; // Descending order
                });
                return { docs: docs.slice(0, 5) }; // Limit to 5 items
            });
    } else {
        // Admin users see all notifications - using JavaScript sorting for consistency
        queryPromise = db.collection('notifications')
            .limit(20) // Get more to ensure we have the latest
            .get()
            .then(function (querySnapshot) {
                console.log('👑 Dropdown: Loaded', querySnapshot.size, 'notifications, sorting in JavaScript...');
                // Sort by timestamp in JavaScript for consistent behavior
                const docs = [];
                querySnapshot.forEach(function (doc) {
                    docs.push(doc);
                });
                docs.sort(function (a, b) {
                    const getTimestamp = (doc) => {
                        const timestamp = doc.data().timestamp;
                        if (!timestamp) return new Date(0);
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                return timestamp.toDate();
                            } else if (timestamp instanceof Date) {
                                return timestamp;
                            } else if (typeof timestamp === 'string') {
                                return new Date(timestamp);
                            } else {
                                return new Date(0);
                            }
                        } catch (e) {
                            return new Date(0);
                        }
                    };
                    const timestampA = getTimestamp(a);
                    const timestampB = getTimestamp(b);
                    return timestampB - timestampA; // Descending order (newest first)
                });
                return { docs: docs.slice(0, 5) }; // Return only the first 5 after sorting
            });
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

            // Debug: Log first few notifications to check sorting
            console.log('🔍 Dropdown: Processing', docs.length, 'notifications');
            if (docs.length > 0) {
                console.log('🔍 Dropdown: First 3 notifications (should be newest first):');
                for (let i = 0; i < Math.min(3, docs.length); i++) {
                    const data = docs[i].data();
                    const timestamp = data.timestamp;
                    let timestampStr = 'No timestamp';
                    if (timestamp) {
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                timestampStr = timestamp.toDate().toISOString();
                            } else if (timestamp instanceof Date) {
                                timestampStr = timestamp.toISOString();
                            } else if (typeof timestamp === 'string') {
                                timestampStr = new Date(timestamp).toISOString();
                            }
                        } catch (e) {
                            timestampStr = 'Error parsing timestamp';
                        }
                    }
                    console.log(`  ${i + 1}. ${data.type} - ${data.message} - ${timestampStr}`);
                }
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
                        <div style="font-size:12px;color:#888;min-width:70px;text-align:right;">${(() => {
                            if (!data.timestamp) return '';
                            try {
                                if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                                    return timeAgo(data.timestamp.toDate());
                                } else if (data.timestamp instanceof Date) {
                                    return timeAgo(data.timestamp);
                                } else if (typeof data.timestamp === 'string') {
                                    return timeAgo(new Date(data.timestamp));
                                } else {
                                    return '';
                                }
                            } catch (e) {
                                return '';
                            }
                        })()}</div>
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
                        <div style="font-size:12px;color:#888;min-width:70px;text-align:right;">${(() => {
                            if (!data.timestamp) return '';
                            try {
                                if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                                    return timeAgo(data.timestamp.toDate());
                                } else if (data.timestamp instanceof Date) {
                                    return timeAgo(data.timestamp);
                                } else if (typeof data.timestamp === 'string') {
                                    return timeAgo(new Date(data.timestamp));
                                } else {
                                    return '';
                                }
                            } catch (e) {
                                return '';
                            }
                        })()}</div>
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
                    window.addEventListener('beforeunload', function (e) {
                        if (window.location.href.includes('notifi.html')) {
                            e.preventDefault();
                            e.returnValue = '';
                            return '';
                        }
                    });

                    // Override any links that might redirect to notifi.html
                    document.addEventListener('click', function (e) {
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

// Force refresh dropdown notifications - useful for testing
window.forceRefreshDropdownNotifications = function () {
    console.log('[Dropdown] Force refreshing dropdown notifications...');
    if (typeof loadDropdownNotifications === 'function') {
        loadDropdownNotifications();
    } else {
        console.error('[Dropdown] loadDropdownNotifications function not available');
    }
};

// Test dropdown sorting specifically
window.testDropdownSorting = function () {
    console.log('[Dropdown] Testing dropdown sorting...');
    console.log('[Dropdown] Click the notifications bell icon to see the dropdown');
    console.log('[Dropdown] The dropdown should show newest notifications first');

    // Force refresh the dropdown
    forceRefreshDropdownNotifications();
};

// Debug function to check what notifications are in the dropdown
window.debugDropdownNotifications = async function () {
    console.log('[Dropdown] Debugging dropdown notifications...');
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        console.error('[Dropdown] Firestore not available');
        return;
    }

    try {
        const snapshot = await db.collection('notifications').limit(20).get();
        console.log('[Dropdown] Found', snapshot.size, 'notifications in database');

        const notifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let timestamp = null;

            if (data.timestamp) {
                try {
                    if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                        timestamp = data.timestamp.toDate();
                    } else if (data.timestamp instanceof Date) {
                        timestamp = data.timestamp;
                    } else if (typeof data.timestamp === 'string') {
                        timestamp = new Date(data.timestamp);
                    }
                } catch (e) {
                    console.warn('Error processing timestamp for', doc.id, e);
                }
            }

            notifications.push({
                id: doc.id,
                type: data.type,
                message: data.message,
                timestamp: timestamp,
                timestampString: timestamp ? timestamp.toISOString() : 'No timestamp'
            });
        });

        // Sort by timestamp (newest first)
        notifications.sort((a, b) => {
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return b.timestamp - a.timestamp;
        });

        console.log('[Dropdown] All notifications (newest first):');
        notifications.forEach((notif, index) => {
            console.log(`${index + 1}. ${notif.type} - ${notif.message} - ${notif.timestampString}`);
        });

        // Check specifically for inventory notifications
        const inventoryNotifications = notifications.filter(n => ['empty', 'restock', 'inventory'].includes(n.type));
        console.log('[Dropdown] Inventory notifications found:', inventoryNotifications.length);
        inventoryNotifications.forEach((notif, index) => {
            console.log(`  ${index + 1}. ${notif.type} - ${notif.message} - ${notif.timestampString}`);
        });

    } catch (error) {
        console.error('[Dropdown] Error debugging notifications:', error);
    }
};