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
    function markAllNotificationsSeen() {
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;
        db.collection('notifications').where('seen', '==', false).get()
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

    // First, get payment verification notifications specifically
    console.log('📊 Admin: Querying for payment verification notifications...');

    db.collection('notifications')
        .where('type', '==', 'payment_verification')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(function (paymentQuery) {
            console.log('� Admin: Found', paymentQuery.size, 'payment verification notifications');

            // Then get other notifications
            return db.collection('notifications')
                .where('type', '!=', 'payment_verification')
                .orderBy('type')
                .orderBy('timestamp', 'desc')
                .limit(40)
                .get()
                .then(function (otherQuery) {
                    console.log('📊 Admin: Found', otherQuery.size, 'other notifications');

                    // Combine both queries - payment verifications first
                    var allDocs = [];
                    paymentQuery.forEach(function (doc) { allDocs.push(doc); });
                    otherQuery.forEach(function (doc) { allDocs.push(doc); });

                    console.log('📊 Admin: Total notifications to display:', allDocs.length);
                    return { docs: allDocs, size: allDocs.length };
                });
        })
        .catch(function (error) {
            console.log('⚠️ Admin: Error with specific query, falling back to simple query:', error);
            // Fallback to simple query
            return db.collection('notifications').orderBy('timestamp', 'desc').limit(50).get();
        })
        .then(function (querySnapshot) {
            var docs = querySnapshot.docs || [querySnapshot];
            console.log('📊 Admin: Processing', docs.length, 'notifications');

            if (docs.length === 0) {
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

            docs.forEach(function (doc) {
                notifCount++;
                var data = doc.data();

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
                } else {
                    typeText = data.type || 'Other';
                }
                var time = data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : '';
                if (!data.seen) {
                    unseenCount++;
                    batch.update(doc.ref, { seen: true });
                }

                // Handle payment verification notifications with action buttons
                if (data.type === 'payment_verification' && data.status === 'pending') {
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
                } else {
                    // Regular notification display
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

        // Update the notification status
        await docRef.update({
            status: action,
            adminAction: {
                action: action,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                admin: 'Admin' // You can get actual admin info if available
            },
            message: `Payment verification ${action} for ${customerName} (${paymentType}) - Reference: ${reference}`
        });

        // Create a new notification for the customer (for future customer notification system)
        const customerNotificationData = {
            type: 'payment_status',
            message: `Your payment verification has been ${action}. ${action === 'approved' ? 'Your order can now proceed.' : 'Please contact support for assistance.'}`,
            customerInfo: data.customerInfo,
            paymentInfo: data.paymentInfo,
            status: action,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            seen: false,
            isCustomerNotification: true
        };

        await db.collection('customer_notifications').add(customerNotificationData);

        // Show success message
        alert(`Payment verification ${action} successfully!`);

        // Reload notifications to update the display
        loadNotifications();

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
