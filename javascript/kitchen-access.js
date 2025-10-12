// kitchen-access.js
// Restrict access to kitchen.html based on user role and load kitchen orders

document.addEventListener('DOMContentLoaded', function () {
    firebase.auth().onAuthStateChanged(async function (user) {
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

// Function to play notification sound
function playNotificationSound() {
    try {
        // Create audio context for notification sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create a simple beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure the beep sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz frequency
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1); // Rise to 1000Hz

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        // Play the sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        console.log('🔊 Notification sound played');
    } catch (error) {
        console.warn('🔊 Could not play notification sound:', error);
    }
}

// Function to show visual notification for new orders
function showNewOrderNotification(count) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'new-order-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">🔔</span>
            <span class="notification-text">${count} new order${count > 1 ? 's' : ''} arrived!</span>
        </div>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        z-index: 1000;
        font-weight: bold;
        font-size: 14px;
        animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
        cursor: pointer;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);

    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.remove();
    });

    console.log('🔔 Visual notification shown for', count, 'new order(s)');
}

// Function to add priority order styling
function addPriorityOrderStyles() {
    // Check if styles already added
    if (document.getElementById('priority-order-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'priority-order-styles';
    style.textContent = `
        .order-card.priority-order {
            border: 3px solid #28a745 !important;
            background-color: #d4edda !important;
            box-shadow: 0 0 15px rgba(40, 167, 69, 0.3) !important;
            transform: scale(1.02);
            transition: all 0.3s ease;
        }
        
        .order-card.priority-order .order-number {
            color: #155724 !important;
            font-weight: bold !important;
        }
        
        .order-card.priority-order .order-ready-btn {
            background-color: #28a745 !important;
            border-color: #28a745 !important;
            font-weight: bold !important;
            box-shadow: 0 2px 8px rgba(40, 167, 69, 0.4) !important;
        }
        
        .order-card.priority-order::before {
            content: "🔥 PRIORITY";
            position: absolute;
            top: -10px;
            right: -10px;
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            z-index: 10;
        }
        
        .item-row.new-item {
            background-color: #f8d7da !important;
            border: 2px solid #dc3545 !important;
            border-radius: 8px !important;
            margin: 2px 0 !important;
            padding: 8px !important;
            animation: newItemPulse 2s ease-in-out;
            height: 30px !important;
        }
        
        .item-row.new-item .item-name {
            color: #721c24 !important;
            font-weight: bold !important;
        }
        
        .item-row.new-item .item-quantity {
            color: #721c24 !important;
            font-weight: bold !important;
            color: black !important;
            border-radius: 12px !important;
            padding: 2px 6px !important;
        }
        
        @keyframes newItemPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// Function to load orders for kitchen display
function loadKitchenOrders() {
    console.log('🍳 Loading kitchen orders...');

    // Add priority order styling
    addPriorityOrderStyles();

    const db = firebase.firestore();
    const ordersContainer = document.getElementById('ordersContainer');

    if (!ordersContainer) {
        console.error('Orders container not found');
        return;
    }

    // Clear any initial loading state
    ordersContainer.innerHTML = '';

    // Listen for orders that have been sent to kitchen via "Later" or "Proceed" buttons from Payment page
    db.collection('orders')
        .where('status', 'in', ['Pending Payment', 'In the Kitchen'])
        .onSnapshot((snapshot) => {
            console.log('🍳 Received kitchen orders update (snapshot size):', snapshot.size);

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

            // Process orders - update existing cards or create new ones
            const existingCards = new Map();
            const currentCards = ordersContainer.querySelectorAll('.order-card');
            const previousOrderCount = currentCards.length;

            // Map existing cards by docId, orderId, and orderNumber
            currentCards.forEach(card => {
                const orderId = card.getAttribute('data-order-id');
                if (orderId) {
                    existingCards.set(orderId, card);
                    console.log('📋 Mapped existing card by orderId:', orderId);
                }

                // Also map by the order number from the display text
                const orderNumberEl = card.querySelector('.order-number');
                if (orderNumberEl) {
                    const orderNumberText = orderNumberEl.textContent;
                    const orderNumberMatch = orderNumberText.match(/Order No\. (\d+)/);
                    if (orderNumberMatch) {
                        const orderNumber = orderNumberMatch[1];
                        existingCards.set(orderNumber, card);
                        existingCards.set(String(orderNumber), card); // Also map as string
                        console.log('📋 Mapped existing card by orderNumber:', orderNumber);
                    }
                }
            });

            const processedDocIds = new Set();
            const processedOrderNumbers = new Set();
            const ordersToProcess = [];
            const orderNumberToDocMap = new Map(); // Track which doc has the most recent data for each order

            // Collect all orders first
            snapshot.forEach((doc) => {
                const docId = doc.id;
                const data = doc.data();
                const orderId = data.orderNumberFormatted || data.orderNumber || docId;
                const orderNumber = data.orderNumber || data.orderNumberFormatted;

                console.log('📋 Processing order from Firestore:', {
                    docId: docId,
                    orderNumber: data.orderNumber,
                    orderNumberFormatted: data.orderNumberFormatted,
                    orderId: orderId,
                    itemsCount: data.items ? data.items.length : 0
                });

                // Skip if we've already processed this document ID
                if (processedDocIds.has(docId)) {
                    console.warn('🚫 Duplicate document ID skipped:', docId);
                    return;
                }

                // For duplicate order numbers, keep the one with more items or more recent timestamp
                if (orderNumber && processedOrderNumbers.has(String(orderNumber))) {
                    const existingDoc = orderNumberToDocMap.get(String(orderNumber));
                    const existingData = existingDoc.data;
                    const existingItemCount = existingData.items ? existingData.items.length : 0;
                    const currentItemCount = data.items ? data.items.length : 0;

                    // Keep the document with more items, or if equal, keep the more recent one
                    if (currentItemCount > existingItemCount ||
                        (currentItemCount === existingItemCount && getTimestamp(data) > getTimestamp(existingData))) {
                        console.log('🔄 Replacing order data with more complete version:', orderNumber, 'docId:', docId);
                        // Remove the old one from processing
                        const oldIndex = ordersToProcess.findIndex(o => o.data.orderNumber === orderNumber);
                        if (oldIndex !== -1) {
                            ordersToProcess.splice(oldIndex, 1);
                        }
                        orderNumberToDocMap.set(String(orderNumber), { docId, data, orderId });
                    } else {
                        console.log('🔄 Skipping duplicate order (keeping existing):', orderNumber, 'docId:', docId);
                        return;
                    }
                } else {
                    if (orderNumber) {
                        orderNumberToDocMap.set(String(orderNumber), { docId, data, orderId });
                    }
                }

                processedDocIds.add(docId);
                if (orderNumber) {
                    processedOrderNumbers.add(String(orderNumber));
                }

                ordersToProcess.push({ docId, data, orderId });
            });

            // Sort orders by timestamp (FIFO - oldest first)
            ordersToProcess.sort((a, b) => {
                const timestampA = getTimestamp(a.data);
                const timestampB = getTimestamp(b.data);
                return timestampA - timestampB; // Ascending order (oldest first)
            });

            console.log('🍳 Processing orders in FIFO order:', ordersToProcess.map(o => ({
                orderId: o.orderId,
                timestamp: getTimestamp(o.data)
            })));

            console.log('🍳 Available existing cards:', Array.from(existingCards.keys()));

            // Process orders in FIFO order
            ordersToProcess.forEach(({ docId, data, orderId }, index) => {
                const isPriority = index === 0; // First order is priority
                const orderNumber = data.orderNumber || data.orderNumberFormatted;

                // First, try to find existing card by order number (most reliable)
                let existingCard = null;
                if (orderNumber) {
                    // Look for cards with the same order number in the DOM
                    const allCards = ordersContainer.querySelectorAll('.order-card');
                    for (let card of allCards) {
                        const orderNumberEl = card.querySelector('.order-number');
                        if (orderNumberEl) {
                            const cardOrderNumber = orderNumberEl.textContent.match(/Order No\. (\d+)/);
                            if (cardOrderNumber && cardOrderNumber[1] === String(orderNumber)) {
                                existingCard = card;
                                console.log('🔍 Found existing card by DOM search for order:', orderNumber);
                                break;
                            }
                        }
                    }
                }

                // If not found by order number, try other methods
                if (!existingCard) {
                    existingCard = existingCards.get(docId) ||
                        existingCards.get(orderId) ||
                        existingCards.get(orderNumber) ||
                        existingCards.get(data.orderNumberFormatted);

                    // If still not found, try to match by order number from data
                    if (!existingCard && orderNumber) {
                        const orderNumberStr = String(orderNumber);
                        existingCard = existingCards.get(orderNumberStr);
                    }
                }

                if (existingCard) {
                    // Update existing card with new data
                    console.log('🔄 Updating existing order card:', orderId, 'docId:', docId, 'isPriority:', isPriority);
                    console.log('🔄 Found existing card for order:', orderNumber);
                    updateOrderCard(existingCard, data, isPriority);
                } else {
                    // Create new order card only if no existing card found
                    console.log('🆕 Creating new order card:', orderId, 'docId:', docId, 'isPriority:', isPriority);
                    console.log('🆕 No existing card found for order:', orderNumber);
                    const orderCard = createOrderCard(docId, data, isPriority);
                    ordersContainer.appendChild(orderCard);
                }
            });

            // Remove cards for orders that no longer exist in Firestore
            // Only remove if the order is not in the current snapshot
            const currentOrderNumbers = new Set();
            ordersToProcess.forEach(({ data }) => {
                const orderNumber = data.orderNumber || data.orderNumberFormatted;
                if (orderNumber) {
                    currentOrderNumbers.add(String(orderNumber));
                }
            });

            currentCards.forEach(card => {
                const orderNumberEl = card.querySelector('.order-number');
                if (orderNumberEl) {
                    const cardOrderNumber = orderNumberEl.textContent.match(/Order No\. (\d+)/);
                    if (cardOrderNumber) {
                        const orderNumber = cardOrderNumber[1];
                        if (!currentOrderNumbers.has(orderNumber)) {
                            console.log('🗑️ Removing order card (not in current snapshot):', orderNumber);
                            card.remove();
                        } else {
                            console.log('✅ Keeping order card (still exists):', orderNumber);
                        }
                    }
                }
            });

            // Check if new orders arrived and play notification sound
            const currentOrderCount = ordersContainer.querySelectorAll('.order-card').length;
            if (currentOrderCount > previousOrderCount) {
                console.log('🔊 New order detected! Playing notification sound');
                playNotificationSound();

                // Add visual notification
                showNewOrderNotification(currentOrderCount - previousOrderCount);
            }
        }, (error) => {
            console.error('🍳 Error loading kitchen orders:', error);
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
                                <span class="item-name">Error: ${error.message}</span>
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

// Helper function to create order card
function createOrderCard(id, data, isPriority = false) {
    const wrapper = document.createElement('div');
    wrapper.className = `order-card ${isPriority ? 'priority-order' : ''}`;
    wrapper.setAttribute('data-order-id', id);

    // Build timestamp
    let timestamp = new Date();
    try {
        const t = data.timestamp;
        if (t) {
            if (typeof t.toDate === 'function') timestamp = t.toDate();
            else if (t instanceof Date) timestamp = t;
            else if (typeof t === 'string') timestamp = new Date(t);
            else if (typeof t === 'number') timestamp = new Date(t);
        }
    } catch (e) {
        timestamp = new Date();
    }

    const dateStr = timestamp.toLocaleDateString();
    const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Get order details
    const orderType = data.orderType || 'Dine In';
    const tableNumber = data.tableNumber || data.table || 'N/A';
    const paxNumber = data.pax || data.paxNumber || data.paxCount || 'N/A';

    // Format table display
    const tableDisplay = (tableNumber && tableNumber !== 'N/A' && tableNumber !== '') ? tableNumber : 'N/A';

    // Build items HTML
    const items = Array.isArray(data.items) ? data.items : [];
    let itemsHTML = '';
    if (items.length > 0) {
        items.forEach(item => {
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

    wrapper.innerHTML = `
        <div class="order-header">
            <div class="order-title">
                <h5 class="order-number">Order No. ${data.orderNumber || id} | ${orderType} | ${tableDisplay}</h5>
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
            <button class="btn btn-success order-ready-btn" onclick="markOrderReady('${id}')">
                Order Ready
            </button>
        </div>
    `;

    // Initialize previous items data for new item detection
    if (data.items && Array.isArray(data.items)) {
        wrapper.setAttribute('data-previous-items', JSON.stringify(data.items));
    }

    return wrapper;
}

// Helper function to extract timestamp from order data
function getTimestamp(data) {
    try {
        let timestamp;

        // Try different timestamp fields
        if (data.timestamp) {
            if (typeof data.timestamp.toDate === 'function') {
                timestamp = data.timestamp.toDate();
            } else if (data.timestamp instanceof Date) {
                timestamp = data.timestamp;
            } else if (typeof data.timestamp === 'string') {
                timestamp = new Date(data.timestamp);
            } else if (typeof data.timestamp === 'number') {
                timestamp = new Date(data.timestamp);
            }
        } else if (data.createdAt) {
            timestamp = new Date(data.createdAt);
        } else if (data.dateCreated) {
            timestamp = new Date(data.dateCreated);
        } else if (data.lastUpdated) {
            if (typeof data.lastUpdated.toDate === 'function') {
                timestamp = data.lastUpdated.toDate();
            } else {
                timestamp = new Date(data.lastUpdated);
            }
        }

        // Return timestamp or current time as fallback
        return timestamp && !isNaN(timestamp.getTime()) ? timestamp.getTime() : Date.now();
    } catch (error) {
        console.warn('Error extracting timestamp:', error);
        return Date.now();
    }
}

// Helper function to find new items by comparing previous and current items
function findNewItems(previousItems, currentItems) {
    const newItems = [];

    // Create a map of previous items for quick lookup
    const previousItemsMap = new Map();
    previousItems.forEach(item => {
        const key = `${item.name}-${item.unitPrice || item.price}`;
        const quantity = parseInt(item.quantity) || 1;
        previousItemsMap.set(key, (previousItemsMap.get(key) || 0) + quantity);
    });

    // Check current items against previous items
    currentItems.forEach(item => {
        const key = `${item.name}-${item.unitPrice || item.price}`;
        const quantity = parseInt(item.quantity) || 1;
        const previousQuantity = previousItemsMap.get(key) || 0;

        if (quantity > previousQuantity) {
            // This item has increased quantity or is completely new
            const newQuantity = quantity - previousQuantity;
            newItems.push({
                ...item,
                quantity: newQuantity,
                isNew: true
            });
        }
    });

    return newItems;
}

// Helper function to check if an item is new
function isItemNew(item, newItems) {
    return newItems.some(newItem =>
        newItem.name === item.name &&
        (newItem.unitPrice || newItem.price) === (item.unitPrice || item.price)
    );
}

// Function to update existing order card with new data
function updateOrderCard(card, data, isPriority = false) {
    try {
        console.log('🔄 Updating order card with new data:', data, 'isPriority:', isPriority);

        // Update priority highlighting
        if (isPriority) {
            card.classList.add('priority-order');
        } else {
            card.classList.remove('priority-order');
        }

        // Update order header
        const orderNumber = data.orderNumber || data.orderNumberFormatted || 'N/A';
        const orderType = data.orderType || 'Dine In';
        const tableNumber = data.tableNumber || data.table || 'N/A';
        const paxNumber = data.pax || data.paxNumber || data.paxCount || 'N/A';

        // Format table display
        const tableDisplay = (tableNumber && tableNumber !== 'N/A' && tableNumber !== '') ? tableNumber : 'N/A';

        // Update order number display
        const orderNumberEl = card.querySelector('.order-number');
        if (orderNumberEl) {
            orderNumberEl.textContent = `Order No. ${orderNumber} | ${orderType} | ${tableDisplay}`;
        }


        // Update items list with new item highlighting
        const itemsListEl = card.querySelector('.items-list');
        if (itemsListEl && data.items && Array.isArray(data.items)) {
            console.log('🔄 Updating items list with', data.items.length, 'items:', data.items);

            // Get previous items from data attribute
            const previousItems = JSON.parse(card.getAttribute('data-previous-items') || '[]');
            const newItems = findNewItems(previousItems, data.items);

            let itemsHTML = '';
            data.items.forEach(item => {
                const isNewItem = isItemNew(item, newItems);
                const itemClass = isNewItem ? 'item-row new-item' : 'item-row';
                itemsHTML += `
                    <div class="${itemClass}">
                        <span class="item-name">${item.name || 'Unknown Item'}</span>
                        <span class="item-quantity">${item.quantity || 1}</span>
                    </div>
                `;
            });
            itemsListEl.innerHTML = itemsHTML;

            // Store current items for next comparison
            card.setAttribute('data-previous-items', JSON.stringify(data.items));

            console.log('✅ Items list updated with new item highlighting');
        } else {
            console.log('🔄 No items to update or items list not found');
        }

        // Update timestamp
        let timestamp = new Date();
        try {
            const t = data.timestamp;
            if (t) {
                if (typeof t.toDate === 'function') timestamp = t.toDate();
                else if (t instanceof Date) timestamp = t;
                else if (typeof t === 'string') timestamp = new Date(t);
                else if (typeof t === 'number') timestamp = new Date(t);
            }
        } catch (e) {
            timestamp = new Date();
        }

        const dateStr = timestamp.toLocaleDateString();
        const timeStr = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        const dateEl = card.querySelector('.order-date');
        const timeEl = card.querySelector('.order-time');
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;

        console.log('✅ Order card updated successfully');

    } catch (error) {
        console.error('❌ Error updating order card:', error);
    }
}

// Function to mark order as completed
function markOrderReady(orderId) {
    console.log('🍳 Marking order as completed:', orderId);

    const db = firebase.firestore();

    db.collection('orders').doc(orderId).update({
        status: 'Completed',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        completedBy: 'kitchen',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString()
    }).then(() => {
        console.log('✅ Order marked as completed:', orderId);
        alert('Order marked as completed!');
    }).catch((error) => {
        console.error('❌ Error marking order as completed:', error);
        alert('Error marking order as completed. Please try again.');
    });
}

// Make functions globally available
window.loadKitchenOrders = loadKitchenOrders;
window.markOrderReady = markOrderReady;

// Overlay button in kitchen.html calls this
window.markOrderReadyFromOverlay = function () {
    const activeCard = document.querySelector('.order-card');
    if (!activeCard) {
        alert('No active order selected');
        return;
    }
    const oid = activeCard.getAttribute('data-order-id');
    if (!oid) {
        alert('Order ID not found');
        return;
    }
    // Confirm and call existing function
    if (confirm('Mark order #' + (activeCard.querySelector('.order-number')?.textContent || oid) + ' as Ready?')) {
        markOrderReady(oid);
    }
};