// Add Clear Notifications button logic
function clearAllNotifications() {
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) return;
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    db.collection('notifications').get().then(function(querySnapshot) {
        var batch = db.batch();
        querySnapshot.forEach(function(doc) {
            batch.delete(doc.ref);
        });
        return batch.commit();
    }).then(function() {
        loadNotifications();
        updateNotificationBadge(0);
        alert('All notifications cleared.');
    }).catch(function(err) {
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
function refreshUnseenNotificationBadge() {
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
    db.collection('notifications').where('seen', '==', false).get()
        .then(function(querySnapshot) {
            var unseenCount = querySnapshot.size;
            badge.textContent = unseenCount > 99 ? '99+' : unseenCount;
            badge.style.display = unseenCount > 0 ? 'inline-block' : 'none';
        })
        .catch(function(err) {
            badge.style.display = 'none';
        });
}

// Refresh badge on page load and every 30 seconds
document.addEventListener('DOMContentLoaded', function() {
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
        notifLink.addEventListener('click', function() {
            notifDropdown.style.display = 'block';
            // Mark all notifications as seen and reset badge
            markAllNotificationsSeen();
        });
        var closeBtn = document.getElementById('closeDropdown');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                notifDropdown.style.display = 'none';
            });
        }
        document.addEventListener('click', function(e) {
            if (!notifDropdown.contains(e.target) && !notifLink.contains(e.target)) {
                notifDropdown.style.display = 'none';
            }
        });
    }
    // Mark all notifications as seen and reset badge
    function markAllNotificationsSeen() {
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;
        db.collection('notifications').where('seen', '==', false).get()
            .then(function(querySnapshot) {
                var batch = db.batch();
                querySnapshot.forEach(function(doc) {
                    batch.update(doc.ref, { seen: true });
                });
                return batch.commit();
            })
            .then(function() {
                updateNotificationBadge(0);
            })
            .catch(function(err) {
                console.error('[Notification] Error marking notifications as seen:', err);
            });
    }
});

function animateNotificationIcon() {
    var sidebarNotif = document.querySelector('.nav-link[title="Notifications"] .nav-icon');
    if (!sidebarNotif) return;
    sidebarNotif.style.transition = 'transform 0.3s';
    sidebarNotif.style.transform = 'scale(1.2)';
    setTimeout(function() {
        sidebarNotif.style.transform = '';
    }, 400);
}

// Fetch notifications from Firestore and display in table
function loadNotifications() {
    // Use global db instance from main.js if available
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        var notificationStatus = document.getElementById('notificationStatus');
        if (notificationStatus) {
            notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error: Firestore not initialized.</td></tr>';
        }
        updateNotificationBadge(0);
        return;
    }
    var notificationStatus = document.getElementById('notificationStatus');
    if (!notificationStatus) return;
    notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Loading notifications...</td></tr>';

    db.collection('notifications').orderBy('timestamp', 'desc').limit(50).get()
        .then(function (querySnapshot) {
            if (querySnapshot.empty) {
                notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No notifications found.</td></tr>';
                updateNotificationBadge(0);
                return;
            }
            var rows = '';
            var notifCount = 0;
            var unseenCount = 0;
            var batch = db.batch();
            querySnapshot.forEach(function (doc) {
                notifCount++;
                var data = doc.data();
                var typeText = '';
                if (data.type === 'empty') {
                    typeText = 'Empty';
                } else if (data.type === 'restock') {
                    typeText = 'Restock';
                } else {
                    typeText = data.type || 'Other';
                }
                var time = data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : '';
                if (!data.seen) {
                    unseenCount++;
                    batch.update(doc.ref, { seen: true });
                }
                rows += `<tr><td><span style='font-weight:600;'>${typeText}</span></td><td>${data.message || ''}</td><td>${time}</td></tr>`;
            });
            notificationStatus.innerHTML = rows;
            updateNotificationBadge(unseenCount);
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

// Auto-load notifications on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNotifications);
} else {
    loadNotifications();
}

if (window.location.pathname.endsWith('notifi.html')) {
    document.addEventListener('DOMContentLoaded', function () {
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
