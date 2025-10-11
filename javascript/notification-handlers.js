// Notification handlers for payment verification and order management

const db = firebase.firestore();

// Handle approval of payment verification notifications
async function handleApprove(notificationId) {
    console.log('🔄 Processing approval for notification:', notificationId);
    
    try {
        // Get the notification data
        const notificationDoc = await db.collection('notifications').doc(notificationId).get();
        
        if (!notificationDoc.exists) {
            console.error('❌ Notification not found:', notificationId);
            showToast('Error: Notification not found', 'error');
            return;
        }

        const notification = notificationDoc.data();
        console.log('📦 Notification data:', notification);

        // Validate order details exist
        if (!notification.orderDetails || !notification.orderDetails.items || notification.orderDetails.items.length === 0) {
            console.error('❌ No order details found in notification:', notificationId);
            showToast('Error: Cannot approve payment - No order details found', 'error');
            return;
        }

        // Validate total amount
        if (!notification.orderDetails.totalAmount || notification.orderDetails.totalAmount <= 0) {
            console.error('❌ Invalid order amount:', notification.orderDetails.totalAmount);
            showToast('Error: Cannot approve payment - Invalid order amount', 'error');
            return;
        }

        // Show confirmation with order details
        const orderSummary = `
Order Summary:
- ${notification.orderDetails.items.length} item(s)
- Total: ₱${notification.orderDetails.totalAmount.toFixed(2)}
- Customer: ${notification.customerInfo.name}
- Payment: ${notification.paymentInfo.type.toUpperCase()}
- Reference: ${notification.paymentInfo.reference}
`;

        if (!confirm('Are you sure you want to approve this payment?\n\n' + orderSummary)) {
            return;
        }

        // Start a batch write
        const batch = db.batch();

        // Update notification status
        const notificationRef = db.collection('notifications').doc(notificationId);
        batch.update(notificationRef, {
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            seen: true
        });

        // Create order in orders collection
        const orderData = {
            ...notification.orderDetails,
            customerInfo: notification.customerInfo,
            paymentInfo: {
                ...notification.paymentInfo,
                status: 'approved',
                approvedAt: new Date().toISOString()
            },
            status: 'preparing',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            notificationId: notificationId // Reference back to the notification
        };

        // Generate a new order document reference
        const orderRef = db.collection('orders').doc();
        batch.set(orderRef, orderData);

        // If customer has a user ID, also save to their orders subcollection
        if (notification.customerInfo.userId) {
            const userOrderRef = db.collection('users')
                                 .doc(notification.customerInfo.userId)
                                 .collection('orders')
                                 .doc(orderRef.id);
            batch.set(userOrderRef, orderData);
        }

        // Commit all changes
        await batch.commit();
        
        console.log('✅ Order created successfully:', orderRef.id);
        
        // Refresh notifications and show success message
        loadNotifications();
        showToast('Payment approved successfully!', 'success');

    } catch (error) {
        console.error('❌ Error approving payment:', error);
        showToast('Error approving payment: ' + error.message, 'error');
    }
}

// Handle rejection of payment verification notifications
async function handleReject(notificationId, reason = '') {
    console.log('🔄 Processing rejection for notification:', notificationId);
    
    try {
        // Get the notification data
        const notificationDoc = await db.collection('notifications').doc(notificationId).get();
        
        if (!notificationDoc.exists) {
            console.error('❌ Notification not found:', notificationId);
            showToast('Error: Notification not found', 'error');
            return;
        }

        // Get rejection reason if not provided
        if (!reason) {
            reason = prompt('Please enter a reason for rejection:');
            if (!reason) {
                showToast('Rejection cancelled - no reason provided', 'warning');
                return;
            }
        }

        // Update notification status
        await db.collection('notifications').doc(notificationId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectionReason: reason,
            seen: true
        });

        // Refresh notifications and show success message
        loadNotifications();
        showToast('Payment rejected successfully', 'success');

    } catch (error) {
        console.error('❌ Error rejecting payment:', error);
        showToast('Error rejecting payment: ' + error.message, 'error');
    }
}

// Helper function to show toast messages
function showToast(message, type = 'success') {
    // You can enhance this with a proper toast notification library
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    alert(`${icon} ${message}`);
}

// Make functions available globally
window.handleApprove = handleApprove;
window.handleReject = handleReject;