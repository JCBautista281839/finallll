// Kitchen role access control for kitchen.html page
async function setupKitchenPageAccess() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for kitchen page access:', error);
    }
    
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) return;
        
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'user';
                
                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen role detected - Ensuring Home link is visible');
                    
                    // Ensure Home link is visible and points to kitchen.html
                    const homeNavLink = document.querySelector('a[title="Home"]');
                    if (homeNavLink) {
                        homeNavLink.href = '/html/kitchen.html';
                        homeNavLink.title = 'Home';
                        homeNavLink.style.display = '';
                        console.log('🍳 Kitchen: Home link ensured visible');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking user role for kitchen page:', error);
        }
    });
}

// Kitchen role access control for notifications page
async function setupKitchenNotificationsAccess() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for kitchen notifications access:', error);
    }
    
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) return;
        
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'user';
                
                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen role detected - Setting up limited navigation');
                    
                    // Hide navigation items except Home (kitchen.html), Notifications (notifi.html), and Inventory
                    const allNavLinks = document.querySelectorAll('.nav-link');
                    allNavLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        const title = link.getAttribute('title');
                        
                        // Keep only Home (kitchen.html), Notifications (notifi.html), and Inventory
                        if (href && !href.includes('kitchen.html') && 
                            !href.includes('notifi.html') && 
                            !href.includes('Inventory.html') && 
                            title !== 'Logout' && 
                            title !== 'Home') {
                            link.style.display = 'none';
                        }
                    });
                    
                    // Redirect home link to kitchen dashboard
                    const homeNavLink = document.querySelector('#homeNavLink') || document.querySelector('a[href*="Dashboard.html"]');
                    if (homeNavLink) {
                        homeNavLink.href = '/html/kitchen.html';
                        homeNavLink.title = 'Kitchen Dashboard';
                        console.log('🍳 Kitchen: Home link redirected to kitchen.html');
                    } else {
                        // If no home link exists, create one for kitchen users
                        const navContainer = document.querySelector('.nav');
                        if (navContainer) {
                            const homeLink = document.createElement('a');
                            homeLink.href = '/html/kitchen.html';
                            homeLink.className = 'nav-link text-white';
                            homeLink.title = 'Home';
                            homeLink.innerHTML = `
                                <img src="../src/Icons/home.png" alt="Home" class="nav-icon">
                                <div class="nav-text">Home</div>
                            `;
                            
                            // Insert at the beginning of the nav
                            navContainer.insertBefore(homeLink, navContainer.firstChild);
                            console.log('🍳 Kitchen: Created new home link to kitchen.html');
                        }
                    }
                    
                    // Update page title and subtitle for kitchen users
                    const pageTitle = document.querySelector('.inventory-title');
                    const pageSubtitle = document.querySelector('.inventory-subtitle');
                    if (pageTitle) {
                        pageTitle.textContent = 'Kitchen Notifications';
                    }
                    if (pageSubtitle) {
                        pageSubtitle.textContent = 'Inventory alerts and restocking reminders';
                    }
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    });
}

// Add Clear Notifications button logic
function clearAllNotifications() {
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) return;
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    db.collection('notifications').get().then(function (querySnapshot) {
        var batch = db.batch();
        querySnapshot.forEach(function (doc) {
            batch.delete(doc.ref);
        });
        return batch.commit();
    }).then(function () {
        loadNotifications();
        updateNotificationBadge(0);
        alert('All notifications cleared.');
    }).catch(function (err) {
        alert('Error clearing notifications.');
        console.error(err);
    });
}
// notifications.js - Send notifications to notifi.html for inventory status

// Call this function when an inventory item is empty or needs restocking
async function sendInventoryNotification(type, message, itemName) {
    // Only notify once per item per status in the last 24 hours
    if (!itemName) {
        console.warn('[Notification] No itemName provided, aborting notification.');
        return;
    }
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        console.error('[Notification] Firestore DB not initialized.');
        return;
    }
    // Ensure message always includes item name
    const fullMessage = message.includes(itemName) ? message : `${itemName}: ${message}`;
    console.log('[Notification] Preparing to send:', { type, fullMessage, itemName });
    // Always send notification when triggered by inventory logic
    db.collection('notifications').add({
        type: type,
        message: fullMessage,
        item: itemName,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        seen: false
    }).then(() => {
        console.log('[Notification] Notification sent:', fullMessage);
    }).catch((err) => {
        console.error('[Notification] Error sending notification:', err);
    });
}

// Update notification badge count on sidebar
function updateNotificationBadge(count) {
    var sidebarNotifLink = document.querySelector('.nav-link[title="Notifications"]');
    if (!sidebarNotifLink) return;
    var badge = sidebarNotifLink.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.cssText = 'position:absolute;top:8px;right:18px;background:#e53935;color:#fff;border-radius:50%;padding:2px 7px;font-size:0.85rem;font-weight:700;z-index:2;';
        sidebarNotifLink.style.position = 'relative';
        sidebarNotifLink.appendChild(badge);
    }
    // Always show badge except on notifications page
    if (window.location.pathname.endsWith('notifi.html')) {
        badge.style.display = 'none';
        return;
    }
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
    if (count > 0) animateNotificationIcon();
}

// Query Firestore for unseen notifications and update badge
async function refreshUnseenNotificationBadge() {
    try {
        // Ensure Firebase is initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for notification badge:', error);
        return;
    }
    
    var sidebarNotifLink = document.querySelector('.nav-link[title="Notifications"]');
    if (!sidebarNotifLink) return;
    var badge = sidebarNotifLink.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.style.cssText = 'position:absolute;top:8px;right:18px;background:#e53935;color:#fff;border-radius:50%;padding:2px 7px;font-size:0.85rem;font-weight:700;z-index:2;';
        sidebarNotifLink.style.position = 'relative';
        sidebarNotifLink.appendChild(badge);
    }
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        badge.style.display = 'none';
        return;
    }
    // Only run if not on notifications page
    if (window.location.pathname.endsWith('notifi.html')) {
        badge.style.display = 'none';
        return;
    }

    // Check user role to determine which notifications to count
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
        console.error('Error checking user role for badge:', error);
    }

    let queryPromise;
    
    if (userRole === 'kitchen') {
        // Kitchen users only count inventory-related notifications - OPTIMIZED BADGE QUERY
        console.log('🍳 Kitchen: FAST BADGE - Counting inventory notifications...');
        queryPromise = db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .where('seen', '==', false)
            .get()
            .then(function(querySnapshot) {
                console.log('🍳 Kitchen: Badge count:', querySnapshot.size, 'unseen inventory notifications');
                return querySnapshot;
            });
    } else {
        // Admin users count all notifications
        queryPromise = db.collection('notifications')
            .where('seen', '==', false)
            .get();
    }

    queryPromise
        .then(function (querySnapshot) {
            var unseenCount = querySnapshot.size;
            badge.textContent = unseenCount > 99 ? '99+' : unseenCount;
            badge.style.display = unseenCount > 0 ? 'inline-block' : 'none';
        })
        .catch(function (err) {
            badge.style.display = 'none';
        });
}

// Refresh badge on page load and every 30 seconds
document.addEventListener('DOMContentLoaded', function () {
    // Skip auto-refresh if this is an OMR page
    if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
        return;
    }

    refreshUnseenNotificationBadge();
    setInterval(refreshUnseenNotificationBadge, 30000);

    // Add logic to reset badge when notification dropdown is opened
    var notifLink = document.querySelector('.nav-link[title="Notifications"]');
    var notifDropdown = document.getElementById('notificationDropdown');
    if (notifLink && notifDropdown && !window.location.pathname.endsWith('notifi.html')) {
        notifLink.addEventListener('click', function () {
            notifDropdown.style.display = 'block';
            // Mark all notifications as seen and reset badge
            markAllNotificationsSeen();
        });
        var closeBtn = document.getElementById('closeDropdown');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                notifDropdown.style.display = 'none';
            });
        }
        document.addEventListener('click', function (e) {
            if (!notifDropdown.contains(e.target) && !notifLink.contains(e.target)) {
                notifDropdown.style.display = 'none';
            }
        });
    }
    // Mark all notifications as seen and reset badge
    async function markAllNotificationsSeen() {
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;

        // Check user role to determine which notifications to mark as seen
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
            console.error('Error checking user role for mark seen:', error);
        }

        let queryPromise;
        
        if (userRole === 'kitchen') {
            // Kitchen users only mark inventory notifications as seen - OPTIMIZED MARK SEEN QUERY
            console.log('🍳 Kitchen: FAST MARK SEEN - Marking inventory notifications as seen...');
            queryPromise = db.collection('notifications')
                .where('type', 'in', ['empty', 'restock', 'inventory'])
                .where('seen', '==', false)
                .get()
                .then(function(querySnapshot) {
                    console.log('🍳 Kitchen: Marking', querySnapshot.size, 'inventory notifications as seen');
                    return querySnapshot;
                });
        } else {
            // Admin users mark all notifications as seen
            queryPromise = db.collection('notifications')
                .where('seen', '==', false)
                .get();
        }

        queryPromise
            .then(function (querySnapshot) {
                var batch = db.batch();
                querySnapshot.forEach(function (doc) {
                    batch.update(doc.ref, { seen: true });
                });
                return batch.commit();
            })
            .then(function () {
                updateNotificationBadge(0);
            })
            .catch(function (err) {
                console.error('[Notification] Error marking notifications as seen:', err);
            });
    }
});

function animateNotificationIcon() {
    var sidebarNotif = document.querySelector('.nav-link[title="Notifications"] .nav-icon');
    if (!sidebarNotif) return;
    sidebarNotif.style.transition = 'transform 0.3s';
    sidebarNotif.style.transform = 'scale(1.2)';
    setTimeout(function () {
        sidebarNotif.style.transform = '';
    }, 400);
}

// Fetch notifications from Firestore and display in table
async function loadNotifications() {
    try {
        // Ensure Firebase is initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Use global db instance from main.js if available
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            console.error('Firestore not available');
            var notificationStatus = document.getElementById('notificationStatus');
            if (notificationStatus) {
                notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error: Firestore not initialized.</td></tr>';
            }
            updateNotificationBadge(0);
            return;
        }
    } catch (error) {
        console.error('Error initializing Firebase for notifications:', error);
        var notificationStatus = document.getElementById('notificationStatus');
        if (notificationStatus) {
            notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error: Firebase initialization failed.</td></tr>';
        }
        updateNotificationBadge(0);
        return;
    }
    var notificationStatus = document.getElementById('notificationStatus');
    if (!notificationStatus) return;
    notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Loading notifications...</td></tr>';

    // Check user role to determine which notifications to show
    let userRole = 'admin'; // Default to admin
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            console.log('🔍 Checking user role for UID:', user.uid);
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userRole = userData.role || 'admin';
                console.log('👤 User role detected:', userRole);
            } else {
                console.log('⚠️ User document not found, defaulting to admin');
            }
        } else {
            console.log('⚠️ No authenticated user, defaulting to admin');
        }
    } catch (error) {
        console.error('❌ Error checking user role:', error);
    }

    console.log('📊 User role:', userRole, '- Loading notifications...');

    let queryPromise;
    
    if (userRole === 'kitchen') {
        // Kitchen users only see inventory-related notifications - OPTIMIZED QUERY
        console.log('🍳 Kitchen: FAST QUERY - Loading only inventory notifications...');
        queryPromise = db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get()
            .then(function(querySnapshot) {
                console.log('🍳 Kitchen: Loaded', querySnapshot.size, 'inventory notifications');
                return querySnapshot;
            })
            .catch(function(error) {
                console.log('🍳 Kitchen: Index error, falling back to client-side sorting:', error);
                // Fallback without orderBy if index doesn't exist
                return db.collection('notifications')
                    .where('type', 'in', ['empty', 'restock', 'inventory'])
                    .get()
                    .then(function(querySnapshot) {
                        const docs = [];
                        querySnapshot.forEach(function(doc) {
                            docs.push(doc);
                        });
                        docs.sort(function(a, b) {
                            const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
                            const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
                            return timestampB - timestampA;
                        });
                        return { docs: docs.slice(0, 50) };
                    });
            });
    } else {
        // Admin users see all notifications
        console.log('👑 Admin: Querying for all notifications...');
        
        // First, get payment verification notifications specifically
        queryPromise = db.collection('notifications')
            .where('type', '==', 'payment_verification')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get()
            .then(function (paymentQuery) {
                console.log('👑 Admin: Found', paymentQuery.size, 'payment verification notifications');

                // Then get other notifications
                return db.collection('notifications')
                    .where('type', '!=', 'payment_verification')
                    .orderBy('type')
                    .orderBy('timestamp', 'desc')
                    .limit(40)
                    .get()
                    .then(function (otherQuery) {
                        console.log('👑 Admin: Found', otherQuery.size, 'other notifications');

                        // Combine both queries - payment verifications first
                        var allDocs = [];
                        paymentQuery.forEach(function (doc) { allDocs.push(doc); });
                        otherQuery.forEach(function (doc) { allDocs.push(doc); });

                        console.log('👑 Admin: Total notifications to display:', allDocs.length);
                        return { docs: allDocs, size: allDocs.length };
                    });
            })
            .catch(function (error) {
                console.log('⚠️ Admin: Error with specific query, falling back to simple query:', error);
                // Fallback to simple query - but still respect kitchen role
                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen: Using optimized fallback query');
                    return db.collection('notifications')
                        .where('type', 'in', ['empty', 'restock', 'inventory'])
                        .limit(50)
                        .get()
                        .then(function(querySnapshot) {
                            console.log('🍳 Kitchen: Fallback loaded', querySnapshot.size, 'inventory notifications');
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
                            return { docs: docs }; // Return all docs since we already limited
                        });
                } else {
                    console.log('👑 Admin: Using fallback query for all notifications');
                    return db.collection('notifications').orderBy('timestamp', 'desc').limit(50).get();
                }
            });
    }

    queryPromise
        .then(function (result) {
            // Handle both QuerySnapshot and custom result format
            var docs = result.docs || result;
            if (Array.isArray(docs)) {
                console.log('📊 Admin: Processing', docs.length, 'notifications');
            } else {
                console.log('📊 Admin: Processing', docs.size || 0, 'notifications');
            }

            // Check if docs is empty (handle both array and QuerySnapshot)
            const isEmpty = Array.isArray(docs) ? docs.length === 0 : (docs.empty || docs.size === 0);
            if (isEmpty) {
                console.log('❌ Admin: No notifications found in database');
                notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No notifications found.</td></tr>';
                updateNotificationBadge(0);
                return;
            }

            var rows = '';
            var notifCount = 0;
            var unseenCount = 0;
            var batch = db.batch();
            var paymentVerificationCount = 0;

            // Handle both QuerySnapshot.forEach and array iteration
            const forEachMethod = docs.forEach || Array.prototype.forEach;
            forEachMethod.call(docs, function (doc) {
                var data = doc.data();
                
                // Skip non-inventory notifications for kitchen users
                if (userRole === 'kitchen' && !['empty', 'restock', 'inventory'].includes(data.type)) {
                    console.log('🍳 Kitchen: Skipping non-inventory notification:', data.type);
                    return; // Skip this notification
                }
                
                notifCount++;

                // Count payment verification notifications
                if (data.type === 'payment_verification') {
                    paymentVerificationCount++;
                }

                console.log('🔔 Admin: Processing notification', notifCount, ':', {
                    id: doc.id,
                    type: data.type,
                    status: data.status,
                    timestamp: data.timestamp ? data.timestamp.toDate() : 'No timestamp',
                    message: data.message ? data.message.substring(0, 50) + '...' : 'No message'
                });

                var typeText = '';
                if (data.type === 'empty') {
                    typeText = 'Empty';
                } else if (data.type === 'restock') {
                    typeText = 'Restock';
                } else if (data.type === 'payment_verification') {
                    typeText = 'Payment Verification';
                } else if (data.type === 'order_approval') {
                    typeText = 'Order Approval';
                } else {
                    typeText = data.type || 'Other';
                }
                var time = '';
                if (data.timestamp) {
                    if (data.timestamp.toDate) {
                        // Firestore timestamp
                        time = timeAgo(data.timestamp.toDate());
                    } else if (typeof data.timestamp === 'string') {
                        // ISO string timestamp
                        time = timeAgo(new Date(data.timestamp));
                    } else {
                        // Fallback
                        time = 'Unknown time';
                    }
                } else {
                    time = 'No timestamp';
                }
                if (!data.seen) {
                    unseenCount++;
                    batch.update(doc.ref, { seen: true });
                }

                // Handle payment verification notifications with action buttons (only for admin users)
                if (data.type === 'payment_verification' && data.status === 'pending' && userRole !== 'kitchen') {
                    rows += `<tr class="payment-verification-row" data-doc-id="${doc.id}">
                        <td><span style='font-weight:600; color: #ff9800;'>${typeText}</span></td>
                        <td>
                            <div class="payment-notification-content">
                                <p><strong>${data.message || ''}</strong></p>
                                <div class="customer-details">
                                    <small><strong>Customer:</strong> ${data.customerInfo?.name || 'Unknown'} | 
                                    <strong>Phone:</strong> ${data.customerInfo?.phone || 'Unknown'} | 
                                    <strong>Payment:</strong> ${data.paymentInfo?.type?.toUpperCase() || 'Unknown'} | 
                                    <strong>Reference:</strong> ${data.paymentInfo?.reference || 'Unknown'}</small>
                                </div>
                                ${data.paymentInfo?.receiptUrl ?
                            `<div class="receipt-preview">
                                        <small><strong>Receipt:</strong> 
                                        <a href="#" onclick="viewReceipt('${data.paymentInfo.receiptUrl}', '${data.paymentInfo.receiptName || 'receipt.jpg'}')" 
                                           style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                        </small>
                                    </div>` :
                            (data.paymentInfo?.receiptData ?
                                `<div class="receipt-preview">
                                            <small><strong>Receipt:</strong> 
                                            <a href="#" onclick="viewReceipt('${data.paymentInfo.receiptData}', '${data.paymentInfo.receiptName || 'receipt.jpg'}')" 
                                               style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                            </small>
                                        </div>` : ''
                            )
                        }
                                <div class="action-buttons" style="margin-top: 10px;">
                                    <button class="btn btn-success btn-sm me-2" onclick="handlePaymentVerification('${doc.id}', 'approved')" 
                                            style="background: #28a745; border: none; padding: 5px 15px; border-radius: 4px; color: white;">
                                        ✓ Accept
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="handlePaymentVerification('${doc.id}', 'declined')" 
                                            style="background: #dc3545; border: none; padding: 5px 15px; border-radius: 4px; color: white;">
                                        ✗ Decline
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td>${time}</td>
                    </tr>`;
                } else if (data.type === 'order_approval' && data.requiresAction) {
                    // Handle order approval notifications with action buttons
                    rows += `<tr class="order-approval-row" data-doc-id="${doc.id}">
                        <td><span style='font-weight:600; color: #007bff;'>${typeText}</span></td>
                        <td>
                            <div class="order-notification-content">
                                <p><strong>${data.message || ''}</strong></p>
                                <div class="order-details">
                                    <small><strong>Customer:</strong> ${data.customerInfo?.name || 'Unknown'} | 
                                    <strong>Email:</strong> ${data.customerInfo?.email || 'Unknown'} | 
                                    <strong>Total:</strong> ₱${data.orderDetails?.total || 'Unknown'} | 
                                    <strong>Payment:</strong> ${data.paymentDetails?.method?.toUpperCase() || 'Unknown'} | 
                                    <strong>Reference:</strong> ${data.paymentDetails?.reference || 'Unknown'}</small>
                                </div>
                                ${data.paymentDetails?.receiptUrl ?
                            `<div class="receipt-preview">
                                        <small><strong>Receipt:</strong> 
                                        <a href="#" onclick="viewReceipt('${data.paymentDetails.receiptUrl}', '${data.paymentDetails.receiptName || 'receipt.jpg'}')" 
                                           style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                        </small>
                                    </div>` :
                            (data.paymentDetails?.receiptData ?
                                `<div class="receipt-preview">
                                            <small><strong>Receipt:</strong> 
                                            <a href="#" onclick="viewReceipt('${data.paymentDetails.receiptData}', '${data.paymentDetails.receiptName || 'receipt.jpg'}')" 
                                               style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                            </small>
                                        </div>` : ''
                            )
                        }
                                <div class="action-buttons" style="margin-top: 10px;">
                                    <button class="btn btn-success btn-sm me-2" onclick="approveOrder('${data.orderId}', '${doc.id}')" 
                                            style="background: #28a745; border: none; padding: 5px 15px; border-radius: 4px; color: white; font-size: 0.8rem;">
                                        <i class="fas fa-check"></i> Accept Order
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="declineOrder('${data.orderId}', '${doc.id}')" 
                                            style="background: #dc3545; border: none; padding: 5px 15px; border-radius: 4px; color: white; font-size: 0.8rem;">
                                        <i class="fas fa-times"></i> Decline Order
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td>${time}</td>
                    </tr>`;
                } else {
                    // Regular notification display (skip payment verification for kitchen users)
                    if (userRole === 'kitchen' && data.type === 'payment_verification') {
                        console.log('🍳 Kitchen: Skipping payment verification notification');
                        return; // Skip this notification for kitchen users
                    }
                    
                    var statusColor = '';
                    if (data.type === 'payment_verification') {
                        if (data.status === 'approved') statusColor = 'color: #28a745;';
                        else if (data.status === 'declined') statusColor = 'color: #dc3545;';
                    }
                    rows += `<tr><td><span style='font-weight:600; ${statusColor}'>${typeText}</span></td><td>${data.message || ''}</td><td>${time}</td></tr>`;
                }
            });

            console.log('✅ Admin: Processed', notifCount, 'notifications');
            console.log('💳 Admin: Found', paymentVerificationCount, 'payment verification notifications');
            console.log('📝 Admin: Final HTML rows length:', rows.length, 'characters');

            if (paymentVerificationCount === 0) {
                console.log('⚠️ Admin: No payment verification notifications found - they might be newer than the 50 limit or have timestamp issues');
            }

    notificationStatus.innerHTML = rows;
    updateNotificationBadge(unseenCount);
    
    // Hide "See all incoming activity" link for kitchen users
    if (typeof hideSeeAllLinkForKitchen === 'function') {
        hideSeeAllLinkForKitchen(userRole);
    }
            // Mark all loaded notifications as seen
            if (unseenCount > 0) {
                batch.commit();
            }
        })
        .catch(function (err) {
            notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading notifications.</td></tr>';
            updateNotificationBadge(0);
        });
}

// Helper to format time ago
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

// Auto-load notifications after Firebase initialization
async function initializeNotifications() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }
        
        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Now load notifications
        loadNotifications();
    } catch (error) {
        console.error('Error initializing notifications:', error);
        // Fallback: try to load notifications anyway
        setTimeout(loadNotifications, 1000);
    }
}

// Auto-load notifications on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
    initializeNotifications();
}

// Function to handle payment verification (approve/decline)
window.handlePaymentVerification = async function (docId, action) {
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        alert('Database connection error. Please try again.');
        return;
    }

    try {
        // Get the notification document
        const docRef = db.collection('notifications').doc(docId);
        const doc = await docRef.get();

        if (!doc.exists) {
            alert('Notification not found.');
            return;
        }

        const data = doc.data();
        const customerName = data.customerInfo?.name || 'Unknown Customer';
        const paymentType = data.paymentInfo?.type?.toUpperCase() || 'UNKNOWN';
        const reference = data.paymentInfo?.reference || 'Unknown';

        if (!confirm(`Are you sure you want to ${action} the payment verification for ${customerName} (${paymentType} - ${reference})?`)) {
            return;
        }

        // Find the related order using customer info and payment reference
        const ordersQuery = await db.collection('orders')
            .where('status', '==', 'Pending Payment')
            .get();

        let orderDoc = null;
        let bestMatch = null;
        let bestMatchScore = 0;

        ordersQuery.forEach(doc => {
            const orderData = doc.data();
            let matchScore = 0;

            // Check payment reference match (highest priority)
            if (orderData.paymentInfo?.reference === reference && reference !== 'Unknown' && reference !== 'no-reference') {
                matchScore += 10;
            }

            // Check customer name match
            if (orderData.customerInfo?.name === customerName && customerName !== 'Unknown Customer') {
                matchScore += 5;
            }

            // Check customer phone match if available
            if (data.customerInfo?.phone && orderData.customerInfo?.phone === data.customerInfo.phone) {
                matchScore += 3;
            }

            // Check payment type match
            if (orderData.paymentInfo?.type?.toLowerCase() === paymentType.toLowerCase()) {
                matchScore += 2;
            }

            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = doc;
            }
        });

        orderDoc = bestMatch;

        console.log('🔍 Looking for order with:', { customerName, paymentType, reference });
        console.log('🔍 Found', ordersQuery.size, 'orders with Pending Payment status');

        if (!orderDoc && action === 'approved') {
            console.warn('❌ No matching order found for approval. Details:', {
                customerName,
                paymentType,
                reference,
                searchedOrders: ordersQuery.size
            });
            alert('Related order not found. Please ensure the order exists and has "Pending Payment" status.');
            return;
        }

        console.log('✅ Found matching order:', orderDoc ? orderDoc.id : 'none', 'with score:', bestMatchScore);

        // If approving, redirect to POS with pre-loaded order data
        if (action === 'approved' && orderDoc) {
            // Mark order as payment approved but not yet processed
            await db.collection('orders').doc(orderDoc.id).update({
                status: 'Payment Approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedBy: 'admin',
                paymentVerified: true
            });

            // Update the notification status
            await docRef.update({
                status: action,
                adminAction: {
                    action: action,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    admin: 'Admin'
                },
                message: `Payment verification ${action} for ${customerName} (${paymentType}) - Reference: ${reference}. Redirecting to POS for order processing.`
            });

            // Redirect to POS with order data
            alert('✅ Payment approved! Redirecting to POS for order processing...');
            
            // Store order data for POS to pick up
            sessionStorage.setItem('approvedOrderId', orderDoc.id);
            sessionStorage.setItem('approvedOrderData', JSON.stringify(orderDoc.data()));
            
            // Redirect to POS page
            window.location.href = '/html/pos.html?mode=approved-order&orderId=' + orderDoc.id;
            return;
        }

        // Handle decline action
        if (action === 'declined') {
            // Update the notification status
            await docRef.update({
                status: action,
                adminAction: {
                    action: action,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    admin: 'Admin'
                },
                message: `Payment verification ${action} for ${customerName} (${paymentType}) - Reference: ${reference}`
            });

            // If order was found, mark it as declined
            if (orderDoc) {
                await db.collection('orders').doc(orderDoc.id).update({
                    status: 'Payment Declined',
                    declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    declinedBy: 'admin'
                });
            }

            // Show success message
            alert('Payment verification declined.');
            
            // Reload notifications to update the display
            loadNotifications();
        }

    } catch (error) {
        console.error('Error handling payment verification:', error);
        alert('Error processing payment verification. Please try again.');
    }
}

// Function to view receipt image
window.viewReceipt = function (receiptData, fileName) {
    if (!receiptData) {
        alert('Receipt data not available.');
        return;
    }

    // Create modal to display receipt
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);

    const title = document.createElement('h3');
    title.textContent = 'Payment Receipt: ' + fileName;
    title.style.marginBottom = '15px';

    const img = document.createElement('img');
    img.src = receiptData;
    img.style.cssText = `
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    `;

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(img);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

if (window.location.pathname.endsWith('notifi.html')) {
    document.addEventListener('DOMContentLoaded', function () {
        // Setup kitchen role access control
        setupKitchenNotificationsAccess();
        
        // Hide badge on notifications page
        var sidebarNotif = document.querySelector('.nav-link[title="Notifications"]');
        if (sidebarNotif) {
            var badge = sidebarNotif.querySelector('.notification-badge');
            if (badge) badge.style.display = 'none';
        }
        // Add Clear Notifications button to dropdown-header
        var notifHeader = document.querySelector('.dropdown-header');
        if (notifHeader) {
            var box = document.createElement('div');
            box.style.position = 'absolute';
            box.style.right = '32px';
            box.style.top = '50%';
            box.style.transform = 'translateY(-50%)';
            box.style.zIndex = '10';
            box.style.background = '#fff';
            box.style.border = '2px solid #e53935';
            box.style.borderRadius = '4px';
            box.style.height = '38px';
            box.style.display = 'flex';
            box.style.alignItems = 'center';
            box.style.justifyContent = 'center';
            var clearBtn = document.createElement('button');
            clearBtn.textContent = 'Clear Notifications';
            clearBtn.className = 'btn btn-danger btn-sm';
            clearBtn.style.background = '#e53935';
            clearBtn.style.border = 'none';
            clearBtn.style.color = '#fff';
            clearBtn.style.fontWeight = '600';
            clearBtn.style.fontSize = '1rem';
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.height = '38px';
            clearBtn.style.width = '180px';
            clearBtn.style.borderRadius = '4px';
            clearBtn.style.boxShadow = '0 0 0 2px #e53935';
            clearBtn.onclick = clearAllNotifications;
            box.appendChild(clearBtn);
            notifHeader.style.position = 'relative';
            notifHeader.appendChild(box);
        }
    });
}

// Function to approve an order
async function approveOrder(orderId, notificationId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            alert('Database not available');
            return;
        }

        if (!confirm('Are you sure you want to APPROVE this order? The customer will be notified and the order will proceed to preparation.')) {
            return;
        }

        // Update order status to 'In the Kitchen' to make it appear in orders page and kitchen workflow
        await db.collection('orders').doc(orderId).update({
            status: 'In the Kitchen',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: 'admin'
        });

        // Mark notification as no longer requiring action
        await db.collection('notifications').doc(notificationId).update({
            requiresAction: false,
            actionTaken: 'approved',
            actionTakenAt: firebase.firestore.FieldValue.serverTimestamp(),
            message: `Order #${orderId} has been APPROVED by admin and sent to kitchen`
        });

        // Send notification to kitchen/orders
        await sendOrderToKitchen(orderId);

        // Reload notifications to update UI
        loadNotifications();

        alert('✅ Order approved successfully! It has been sent to the kitchen for preparation.');

    } catch (error) {
        console.error('Error approving order:', error);
        alert('Error approving order. Please try again.');
    }
}

// Function to decline an order
async function declineOrder(orderId, notificationId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            alert('Database not available');
            return;
        }

        const reason = prompt('Please provide a reason for declining this order (required):');
        if (reason === null) return; // User cancelled

        if (!reason.trim()) {
            alert('Please provide a reason for declining the order.');
            return;
        }

        if (!confirm('Are you sure you want to DECLINE this order? The customer will be notified that their order was rejected.')) {
            return;
        }

        // Update order status to 'declined'
        await db.collection('orders').doc(orderId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            declinedBy: 'admin',
            declineReason: reason
        });

        // Mark notification as no longer requiring action
        await db.collection('notifications').doc(notificationId).update({
            requiresAction: false,
            actionTaken: 'declined',
            actionTakenAt: firebase.firestore.FieldValue.serverTimestamp(),
            declineReason: reason,
            message: `Order #${orderId} has been DECLINED by admin - Reason: ${reason}`
        });

        // Reload notifications to update UI
        loadNotifications();

        alert('❌ Order declined successfully. Customer will be notified.');

    } catch (error) {
        console.error('Error declining order:', error);
        alert('Error declining order. Please try again.');
    }
}

// Function to send approved order to kitchen
async function sendOrderToKitchen(orderId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;

        // Get the order details
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new Error('Order not found');
        }

        const orderData = orderDoc.data();

        // Create a kitchen notification
        await db.collection('notifications').add({
            type: 'kitchen_order',
            orderId: orderId,
            message: `New approved order #${orderId} for ${orderData.customerInfo.fullName} - ${orderData.shippingInfo.method}`,
            customerName: orderData.customerInfo.fullName,
            shippingMethod: orderData.shippingInfo.method,
            items: orderData.items,
            total: orderData.total,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            seen: false,
            targetScreen: 'kitchen'
        });

        console.log('Order sent to kitchen:', orderId);

    } catch (error) {
        console.error('Error sending order to kitchen:', error);
    }
}
