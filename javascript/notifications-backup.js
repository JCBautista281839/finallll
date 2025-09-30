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

    // Load both regular notifications and admin order notifications
    Promise.all([
        db.collection('notifications').orderBy('timestamp', 'desc').limit(25).get(),
        db.collection('admin_notifications').where('status', '==', 'pending_approval').orderBy('timestamp', 'desc').limit(25).get()
    ]).then(function([notificationsSnapshot, orderNotificationsSnapshot]) {
        var allNotifications = [];
        var unseenCount = 0;
        var batch = db.batch();
        
        // Process regular notifications
        notificationsSnapshot.forEach(function(doc) {
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
            
            allNotifications.push({
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date(0),
                html: `<tr><td><span style='font-weight:600;'>${typeText}</span></td><td>${data.message || ''}</td><td>${time}</td></tr>`
            });
        });
        
        // Process order notifications (payment verification needed)
        orderNotificationsSnapshot.forEach(function(doc) {
            var data = doc.data();
            var orderId = doc.id;
            var customerName = data.customerInfo ? `${data.customerInfo.firstName} ${data.customerInfo.lastName}` : 'Unknown Customer';
            var total = data.total || 0;
            var time = data.timestamp && data.timestamp.toDate ? timeAgo(data.timestamp.toDate()) : '';
            
            // Count as unseen for badge
            unseenCount++;
            
            allNotifications.push({
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date(0),
                html: `<tr class="order-notification" data-order-id="${orderId}">
                    <td><span style='font-weight:600; color: #007bff;'>New Order</span></td>
                    <td>
                        <strong>${customerName}</strong> - ₱${total}<br>
                        <small class="text-muted">Ref: ${data.referenceCode || 'N/A'} | Payment verification needed</small><br>
                        <button class="btn btn-sm btn-primary mt-1" onclick="viewOrderDetails('${orderId}')">Review Payment</button>
                    </td>
                    <td>${time}</td>
                </tr>`
            });
        });
        
        // Sort all notifications by timestamp (newest first)
        allNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        if (allNotifications.length === 0) {
            notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No notifications found.</td></tr>';
            updateNotificationBadge(0);
            return;
        }
        
        // Display notifications
        var rows = allNotifications.map(notif => notif.html).join('');
        notificationStatus.innerHTML = rows;
        updateNotificationBadge(unseenCount);
        
        // Mark regular notifications as seen
        if (batch._mutations && batch._mutations.length > 0) {
            batch.commit();
        }
    })
    .catch(function(error) {
        console.error('[Notifications] Error loading notifications:', error);
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

// Function to view order details for payment verification
function viewOrderDetails(orderId) {
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        alert('Database not available');
        return;
    }
    
    // Get order details from admin_notifications
    db.collection('admin_notifications').doc(orderId).get()
        .then(function(doc) {
            if (!doc.exists) {
                alert('Order not found');
                return;
            }
            
            var orderData = doc.data();
            showOrderApprovalModal(orderId, orderData);
        })
        .catch(function(error) {
            console.error('Error loading order details:', error);
            alert('Error loading order details');
        });
}

// Function to show order approval modal
function showOrderApprovalModal(orderId, orderData) {
    // Create modal HTML
    var modalHtml = `
        <div class="modal fade" id="orderApprovalModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Order Payment Verification - ${orderId}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Customer Information</h6>
                                <p><strong>Name:</strong> ${orderData.customerInfo?.firstName || ''} ${orderData.customerInfo?.lastName || ''}</p>
                                <p><strong>Email:</strong> ${orderData.customerInfo?.email || ''}</p>
                                <p><strong>Phone:</strong> ${orderData.customerInfo?.phone || ''}</p>
                                
                                <h6 class="mt-3">Payment Details</h6>
                                <p><strong>Method:</strong> ${orderData.paymentMethod || 'N/A'}</p>
                                <p><strong>Reference Code:</strong> <span class="badge bg-primary">${orderData.referenceCode || 'N/A'}</span></p>
                                <p><strong>Total Amount:</strong> ₱${orderData.total || 0}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Payment Receipt</h6>
                                ${orderData.receiptImage ? 
                                    `<img src="${orderData.receiptImage}" class="img-fluid border rounded" style="max-height: 300px;" alt="Payment Receipt">` :
                                    '<p class="text-muted">No receipt uploaded</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="mt-3">
                            <h6>Order Items</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Quantity</th>
                                            <th>Price</th>
                                            <th>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orderData.items?.map(item => `
                                            <tr>
                                                <td>${item.name || ''}</td>
                                                <td>${item.quantity || 0}</td>
                                                <td>₱${item.price || 0}</td>
                                                <td>₱${item.totalPrice || 0}</td>
                                            </tr>
                                        `).join('') || '<tr><td colspan="4">No items</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-danger" onclick="rejectOrder('${orderId}')">Reject Payment</button>
                        <button type="button" class="btn btn-success" onclick="approveOrder('${orderId}')">Approve & Process Order</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    var existingModal = document.getElementById('orderApprovalModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    var modal = new bootstrap.Modal(document.getElementById('orderApprovalModal'));
    modal.show();
}

// Function to approve order
function approveOrder(orderId) {
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        alert('Database not available');
        return;
    }
    
    if (!confirm('Are you sure you want to approve this order? This will process the payment and send the order to the kitchen.')) {
        return;
    }
    
    // Get the order data from admin_notifications
    db.collection('admin_notifications').doc(orderId).get()
        .then(function(doc) {
            if (!doc.exists) {
                alert('Order not found');
                return;
            }
            
            var orderData = doc.data();
            var timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            // Prepare approved order document
            var approvedOrder = {
                ...orderData,
                status: 'confirmed',
                isApproved: true,
                approvedBy: 'admin', // You can get actual admin user if available
                approvedAt: timestamp,
                updatedAt: timestamp
            };
            
            // Create batch to move order and delete notification
            var batch = db.batch();
            
            // Add to orders collection
            batch.set(db.collection('orders').doc(orderId), approvedOrder);
            
            // Delete from admin_notifications
            batch.delete(db.collection('admin_notifications').doc(orderId));
            
            // Commit the batch
            return batch.commit();
        })
        .then(function() {
            alert('Order approved successfully! It has been sent to the kitchen.');
            
            // Close modal
            var modal = bootstrap.Modal.getInstance(document.getElementById('orderApprovalModal'));
            if (modal) modal.hide();
            
            // Reload notifications
            loadNotifications();
        })
        .catch(function(error) {
            console.error('Error approving order:', error);
            alert('Error approving order. Please try again.');
        });
}

// Function to reject order
function rejectOrder(orderId) {
    var reason = prompt('Please enter the reason for rejection:');
    if (!reason || reason.trim() === '') {
        return;
    }
    
    var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        alert('Database not available');
        return;
    }
    
    // Update notification with rejection
    db.collection('admin_notifications').doc(orderId).update({
        status: 'rejected',
        rejectedReason: reason.trim(),
        rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function() {
        alert('Order rejected successfully.');
        
        // Close modal
        var modal = bootstrap.Modal.getInstance(document.getElementById('orderApprovalModal'));
        if (modal) modal.hide();
        
        // Reload notifications
        loadNotifications();
    })
    .catch(function(error) {
        console.error('Error rejecting order:', error);
        alert('Error rejecting order. Please try again.');
    });
}
