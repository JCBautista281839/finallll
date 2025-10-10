// kitchen-access.js
// Restrict access to kitchen.html based on user role and load kitchen orders
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = '/html/login.html';
            return;
        }
        // Get user role from Firestore
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (!userData || (userData.role !== 'kitchen' && userData.role !== 'admin')) {
            alert('Access denied. You do not have permission to view the kitchen page.');
            window.location.href = '/html/Dashboard.html';
            return;
        }
        
        // Load kitchen orders
        loadKitchenOrders();
    });
});

// Function to load orders for kitchen display
function loadKitchenOrders() {
    console.log('🍳 Loading kitchen orders...');
    
    const db = firebase.firestore();
    const ordersContainer = document.getElementById('ordersContainer');
    
    if (!ordersContainer) {
        console.error('Orders container not found');
        return;
    }
    
    // Listen for orders with status "In the Kitchen" or "Processing"
    db.collection('orders')
        .where('status', 'in', ['In the Kitchen', 'Processing', 'Payment Approved'])
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            console.log('🍳 Received kitchen orders update:', snapshot.size, 'orders');
            
            if (snapshot.empty) {
                ordersContainer.innerHTML = `
                    <div class="order-card">
                        <div class="order-header">
                            <div class="order-title">
                                <h5 class="order-number">No Orders</h5>
                                <div class="order-datetime">
                                    <span class="order-date">Waiting for orders</span>
                                    <span class="order-time">Kitchen Ready</span>
                                </div>
                            </div>
                        </div>
                        <div class="order-items">
                            <div class="items-header">
                                <span>Items</span><span>Qty</span>
                            </div>
                            <div class="items-list">
                                <div class="item-row">
                                    <span class="item-name">No orders in queue</span>
                                    <span class="item-quantity">-</span>
                                </div>
                            </div>
                        </div>
                        <div class="order-actions">
                            <button class="btn btn-secondary order-ready-btn" disabled>No Orders</button>
                        </div>
                    </div>
                `;
                return;
            }
            
            let ordersHTML = '';
            snapshot.forEach((doc) => {
                try {
                    const orderData = doc.data();
                    console.log('🍳 Creating card for order:', doc.id, orderData);
                    ordersHTML += createKitchenOrderCard(doc.id, orderData);
                } catch (error) {
                    console.error('🍳 Error creating order card for:', doc.id, error);
                    // Create a fallback card for this order
                    ordersHTML += `
                        <div class="order-card" data-order-id="${doc.id}">
                            <div class="order-header">
                                <div class="order-title">
                                    <h5 class="order-number">Order #${doc.id}</h5>
                                    <div class="order-datetime">
                                        <span class="order-date">Error loading order</span>
                                        <span class="order-time">Please refresh</span>
                                    </div>
                                </div>
                            </div>
                            <div class="order-items">
                                <div class="items-header">
                                    <span>Items</span><span>Qty</span>
                                </div>
                                <div class="items-list">
                                    <div class="item-row">
                                        <span class="item-name">Unable to load order details</span>
                                        <span class="item-quantity">-</span>
                                    </div>
                                </div>
                            </div>
                            <div class="order-actions">
                                <button class="btn btn-danger order-ready-btn" onclick="location.reload()">Refresh Page</button>
                            </div>
                        </div>
                    `;
                }
            });
            
            ordersContainer.innerHTML = ordersHTML;
        }, (error) => {
            console.error('Error loading kitchen orders:', error);
            ordersContainer.innerHTML = `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-title">
                            <h5 class="order-number">Connection Error</h5>
                            <div class="order-datetime">
                                <span class="order-date">Unable to load orders</span>
                                <span class="order-time">Check connection</span>
                            </div>
                        </div>
                    </div>
                    <div class="order-items">
                        <div class="items-header">
                            <span>Items</span><span>Qty</span>
                        </div>
                        <div class="items-list">
                            <div class="item-row">
                                <span class="item-name">Please refresh the page</span>
                                <span class="item-quantity">-</span>
                            </div>
                        </div>
                    </div>
                    <div class="order-actions">
                        <button class="btn btn-danger order-ready-btn" onclick="location.reload()">Retry</button>
                    </div>
                </div>
            `;
        });
}

// Function to create kitchen order card
function createKitchenOrderCard(orderId, orderData) {
    const orderNumber = orderData.orderNumber || orderData.id || 'Unknown';
    
    // Handle different timestamp formats safely
    let timestamp;
    console.log('🍳 Processing order timestamp:', orderData.timestamp, 'Type:', typeof orderData.timestamp);
    
    if (orderData.timestamp) {
        if (typeof orderData.timestamp.toDate === 'function') {
            // Firebase Timestamp object
            console.log('🍳 Firebase Timestamp detected');
            timestamp = orderData.timestamp.toDate();
        } else if (orderData.timestamp instanceof Date) {
            // Already a Date object
            console.log('🍳 Date object detected');
            timestamp = orderData.timestamp;
        } else if (typeof orderData.timestamp === 'string') {
            // String timestamp
            console.log('🍳 String timestamp detected:', orderData.timestamp);
            timestamp = new Date(orderData.timestamp);
        } else if (typeof orderData.timestamp === 'number') {
            // Unix timestamp
            console.log('🍳 Number timestamp detected:', orderData.timestamp);
            timestamp = new Date(orderData.timestamp);
        } else {
            // Fallback to current date
            console.log('🍳 Unknown timestamp format, using current date');
            timestamp = new Date();
        }
    } else {
        // No timestamp, use current date
        console.log('🍳 No timestamp found, using current date');
        timestamp = new Date();
    }
    
    // Validate the timestamp
    if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
    }
    
    const dateStr = timestamp.toLocaleDateString();
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    let itemsHTML = '';
    if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach(item => {
            itemsHTML += `
                <div class="item-row">
                    <span class="item-name">${item.name || 'Unknown Item'}</span>
                    <span class="item-quantity">${item.quantity || 1}</span>
                </div>
            `;
        });
    } else {
        itemsHTML = `
            <div class="item-row">
                <span class="item-name">No items listed</span>
                <span class="item-quantity">-</span>
            </div>
        `;
    }
    
    const customerName = orderData.customerInfo?.fullName || orderData.customerName || 'Unknown Customer';
    const orderType = orderData.orderType || 'Dine In';
    
    return `
        <div class="order-card" data-order-id="${orderId}">
            <div class="order-header">
                <div class="order-title">
                    <h5 class="order-number">Order #${orderNumber} / ${orderType}</h5>
                    <div class="order-datetime">
                        <span class="order-date">${dateStr}</span>
                        <span class="order-time">${timeStr}</span>
                    </div>
                </div>
            </div>
            <div class="order-items">
                <div class="items-header">
                    <span>Items</span><span>Qty</span>
                </div>
                <div class="items-list">
                    ${itemsHTML}
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-success order-ready-btn" onclick="markOrderReady('${orderId}')">
                    Order Ready
                </button>
            </div>
        </div>
    `;
}

// Function to mark order as ready
function markOrderReady(orderId) {
    console.log('🍳 Marking order as ready:', orderId);
    
    const db = firebase.firestore();
    
    db.collection('orders').doc(orderId).update({
        status: 'Ready',
        readyAt: firebase.firestore.FieldValue.serverTimestamp(),
        readyBy: 'kitchen'
    }).then(() => {
        console.log('✅ Order marked as ready:', orderId);
        alert('Order marked as ready!');
    }).catch((error) => {
        console.error('❌ Error marking order as ready:', error);
        alert('Error marking order as ready. Please try again.');
    });
}

// Make functions globally available
window.loadKitchenOrders = loadKitchenOrders;
window.markOrderReady = markOrderReady;