// kitchen-access.js
// Restrict access to kitchen.html based on user role and load kitchen orders

// Track existing order IDs to detect new orders
let existingOrderIds = new Set();
let isInitialLoad = true;

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

        // Request notification permission for background notifications
        requestNotificationPermission();

        // Load kitchen orders
        loadKitchenOrders();

        // Add automatic refresh mechanisms
        // 1. Page visibility refresh
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                console.log('🍳 Page became visible, auto-refreshing...');
                setTimeout(() => {
                    loadKitchenOrders();
                }, 100);
            }
        });

        // 2. Window focus refresh
        window.addEventListener('focus', function () {
            console.log('🍳 Window focused, auto-refreshing...');
            setTimeout(() => {
                loadKitchenOrders();
            }, 100);
        });

        // 3. Periodic refresh as fallback (every 5 seconds)
        setInterval(() => {
            const noOrdersCard = document.querySelector('.order-card .order-number');
            if (noOrdersCard && noOrdersCard.textContent.includes('No Orders')) {
                console.log('🍳 "No Orders" detected, auto-refreshing...');
                loadKitchenOrders();
            }
        }, 5000);
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

// Function to request notification permission and show browser notification
async function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            return true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
    }
    return false;
}

// Function to show browser notification for new orders
function showBrowserNotification(orderCount) {
    if (Notification.permission === 'granted') {
        const notification = new Notification('New Kitchen Order!', {
            body: `${orderCount} new order${orderCount > 1 ? 's' : ''} arrived in the kitchen`,
            icon: '/src/Icons/logo.png', // You can add a kitchen icon here
            badge: '/src/Icons/logo.png',
            tag: 'kitchen-order',
            requireInteraction: true
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        // Focus the window when notification is clicked
        notification.onclick = function () {
            window.focus();
            notification.close();
        };
    }
}

// Function to ensure only the first order card has priority highlighting
function ensureOnlyFirstOrderHasPriority() {
    const ordersContainer = document.getElementById('ordersContainer');
    if (!ordersContainer) return;

    const allCards = ordersContainer.querySelectorAll('.order-card');

    // Remove priority from all cards first
    allCards.forEach(card => {
        card.classList.remove('priority-order');
    });

    // Find the first REAL order card (not placeholder)
    const realOrderCards = Array.from(allCards).filter(card => {
        const orderNumber = card.querySelector('.order-number');
        return orderNumber && !orderNumber.textContent.includes('No Orders');
    });

    // Add priority only to the first real order card
    if (realOrderCards.length > 0) {
        realOrderCards[0].classList.add('priority-order');
        console.log('🎯 Priority highlighting applied to first real order only');
    } else {
        console.log('🎯 No real orders found for priority highlighting');
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

    // Listen for orders that are in kitchen workflow (both Pending Payment and In the Kitchen)
    db.collection('orders')
        .where('status', 'in', ['Pending Payment', 'In the Kitchen'])
        .onSnapshot((snapshot) => {
            console.log('🍳 Received kitchen orders update (snapshot size):', snapshot.size);

            if (snapshot.empty) {
                console.log('🍳 No orders found, showing "No Orders" placeholder');
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

            console.log('🍳 Orders found, clearing container and processing orders...');

            // Immediately clear the container to remove "No Orders" placeholder
            ordersContainer.innerHTML = '';

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
                const isPriority = index === 0; // Only first order is priority
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

            // Check for new orders by comparing order IDs
            const currentOrderIds = new Set();
            const newOrderIds = [];

            // Collect current order IDs
            snapshot.forEach((doc) => {
                const orderId = doc.id;
                currentOrderIds.add(orderId);

                // Check if this is a new order
                if (!existingOrderIds.has(orderId) && !isInitialLoad) {
                    newOrderIds.push(orderId);
                }
            });

            // Update existing order IDs
            existingOrderIds = currentOrderIds;

            // Play sound and show notification for new orders (not on initial load)
            if (newOrderIds.length > 0 && !isInitialLoad) {
                console.log('🔊 New order detected! Playing notification sound for', newOrderIds.length, 'new order(s)');
                console.log('🔊 New order IDs:', newOrderIds);

                // Play notification sound
                playNotificationSound();

                // Add visual notification
                showNewOrderNotification(newOrderIds.length);

                // Show browser notification (works even when tab is not active)
                showBrowserNotification(newOrderIds.length);
            } else {
                console.log('🔊 No new orders detected. Current orders:', currentOrderIds.size, 'Previous orders:', existingOrderIds.size);
            }

            // Ensure only the first order card has priority highlighting
            ensureOnlyFirstOrderHasPriority();

            // Mark that initial load is complete
            isInitialLoad = false;
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
                                <span class="item-name">Error: Connection failed</span>
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

        // Priority highlighting will be managed by ensureOnlyFirstOrderHasPriority()
        // Don't override it here to maintain consistency

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

// Function to mark order as ready
function markOrderReady(orderId) {
    console.log('🍳 Marking order as ready:', orderId);

    // Remove the order card immediately from UI
    const orderCard = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderCard) {
        orderCard.style.transition = 'all 0.3s ease';
        orderCard.style.transform = 'translateX(-100%)';
        orderCard.style.opacity = '0';
        setTimeout(() => {
            orderCard.remove();
        }, 300);
    }

    const db = firebase.firestore();

    // First, get the current order status to determine the correct action
    db.collection('orders').doc(orderId).get().then((doc) => {
        if (doc.exists) {
            const currentStatus = doc.data().status;
            console.log('🍳 Current order status:', currentStatus);
            console.log('🍳 Order data:', doc.data());

            if (currentStatus === 'Pending Payment') {
                // For Pending Payment orders, keep as Pending Payment (no status change)
                return db.collection('orders').doc(orderId).update({
                    orderReadyAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orderReadyBy: 'kitchen'
                });
            } else if (currentStatus === 'In the Kitchen') {
                // For In the Kitchen orders, mark as Completed
                return db.collection('orders').doc(orderId).update({
                    status: 'Completed',
                    completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    completedBy: 'kitchen'
                });
            } else {
                // For other statuses, just mark as Ready
                return db.collection('orders').doc(orderId).update({
                    status: 'Ready',
                    readyAt: firebase.firestore.FieldValue.serverTimestamp(),
                    readyBy: 'kitchen'
                });
            }
        } else {
            throw new Error('Order not found');
        }
    }).then(async () => {
        console.log('✅ Order processed:', orderId);

        // Deduct inventory for the order items
        try {
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (orderDoc.exists) {
                const orderData = orderDoc.data();
                console.log('🔄 Order data for inventory deduction:', orderData);
                if (orderData.items && Array.isArray(orderData.items)) {
                    console.log('🔄 Deducting inventory for order items...', orderData.items);
                    await deductInventoryForOrder(orderData.items);
                    console.log('✅ Inventory deducted successfully');
                } else {
                    console.warn('⚠️ No items found in order data for inventory deduction');
                }
            } else {
                console.warn('⚠️ Order document not found for inventory deduction');
            }
        } catch (inventoryError) {
            console.warn('⚠️ Inventory deduction failed:', inventoryError);
            // Don't fail the order processing if inventory deduction fails
        }

        // Show success message without alert
        showSuccessMessage('Order processed successfully!');
    }).catch((error) => {
        console.error('❌ Error processing order:', error);
        alert('Error processing order. Please try again.');
    });
}

// Function to deduct inventory for order items
async function deductInventoryForOrder(orderItems) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.warn('Firebase not available for inventory deduction');
            return;
        }

        const db = firebase.firestore();
        console.log('🔄 Starting inventory deduction for', orderItems.length, 'items');

        // Track deductions for this order
        let deductionCount = 0;
        const totalItems = orderItems.length;

        for (const item of orderItems) {
            console.log(`🔄 Processing item: ${item.name} (qty: ${item.quantity})`);

            // Get menu data for this item to find ingredients (using same approach as POS)
            const menuData = await getMenuItemData(db, item.name);

            if (menuData && menuData.ingredients && Array.isArray(menuData.ingredients)) {
                console.log(`🔄 Deducting inventory for ${item.name} (qty: ${item.quantity})`);
                console.log(`🔄 Ingredients found:`, menuData.ingredients);

                for (const ingredient of menuData.ingredients) {
                    const ingredientName = ingredient.name;
                    const qtyToDeduct = (ingredient.quantity || 0) * item.quantity;

                    console.log(`🔄 Processing ingredient: ${ingredientName} (ingredient qty: ${ingredient.quantity}, item qty: ${item.quantity}, total to deduct: ${qtyToDeduct})`);

                    if (qtyToDeduct > 0) {
                        await deductInventoryItem(db, ingredientName, qtyToDeduct);
                        deductionCount++;
                    }
                }
            } else {
                console.warn(`No ingredients found for menu item: ${item.name}`);
                console.warn(`Menu data structure:`, menuData);
            }
        }

        console.log('✅ Inventory deduction completed for all items');

        // Show smooth summary notification
        showInventoryDeductionNotification(`Inventory deducted: ${deductionCount} ingredients from ${totalItems} items`, 'summary');

    } catch (error) {
        console.error('Error deducting inventory:', error);
        // Don't throw - let the order proceed even if inventory fails
    }
}

// Function to deduct a single inventory item
async function deductInventoryItem(db, ingredientName, quantity) {
    try {
        console.log(`🔄 Looking for inventory item: ${ingredientName} to deduct ${quantity} units`);

        // Find inventory item by name
        const inventoryQuery = await db.collection('inventory')
            .where('name', '==', ingredientName)
            .limit(1)
            .get();

        if (inventoryQuery.empty) {
            console.warn('Inventory item not found:', ingredientName);
            return;
        }

        const inventoryDoc = inventoryQuery.docs[0];
        const inventoryData = inventoryDoc.data();
        const currentQty = inventoryData.quantity || 0;
        const newQty = Math.max(currentQty - quantity, 0);

        console.log(`🔄 Updating inventory for ${ingredientName}: ${currentQty} -> ${newQty}`);

        await db.collection('inventory').doc(inventoryDoc.id).update({
            quantity: newQty,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Successfully deducted ${quantity} units of ${ingredientName} (${currentQty} -> ${newQty})`);

        // Show smooth notification for each deduction
        showInventoryDeductionNotification(`${ingredientName}: ${quantity} units`, 'ingredient');

    } catch (error) {
        console.error('Error deducting inventory item:', error);
    }
}

// Function to get menu item data from Firebase (copied from POS system)
async function getMenuItemData(db, itemName) {
    try {
        // Search in menu collection for the item
        const menuQuery = await db.collection('menu')
            .where('name', '==', itemName)
            .limit(1)
            .get();

        if (!menuQuery.empty) {
            return menuQuery.docs[0].data();
        }

        // If not found in menu, try searching in a different collection or with different field
        console.warn(`Menu item not found: ${itemName}`);
        return null;
    } catch (error) {
        console.error('Error getting menu item data:', error);
        return null;
    }
}

// Test function for inventory deduction
async function testInventoryDeduction() {
    console.log('🧪 Testing inventory deduction...');

    // Test with sample order items
    const testItems = [
        { name: 'Burger', quantity: 2 },
        { name: 'Fries', quantity: 1 }
    ];

    try {
        await deductInventoryForOrder(testItems);
        console.log('✅ Test completed - check console logs for details');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Function to show inventory deduction notification
function showInventoryDeductionNotification(message, type = 'summary') {
    // Remove any existing notifications to prevent overlap
    const existingNotifications = document.querySelectorAll('.inventory-notification');
    existingNotifications.forEach(notif => {
        if (notif.parentNode) {
            notif.parentNode.removeChild(notif);
        }
    });

    const notification = document.createElement('div');
    notification.className = 'inventory-notification';

    // Different styles for different types
    let bgColor, icon, duration;
    if (type === 'ingredient') {
        bgColor = '#28a745'; // Green for individual ingredients
        icon = '📦';
        duration = 2000; // Shorter duration for individual items
    } else {
        bgColor = '#17a2b8'; // Blue for summary
        icon = '✅';
        duration = 4000; // Longer duration for summary
    }

    notification.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 18px;
        border-radius: 8px;
        z-index: 1001;
        font-weight: 500;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        border-left: 4px solid rgba(255,255,255,0.3);
        transform: translateX(100%);
        opacity: 0;
    `;

    notification.textContent = `${icon} ${message}`;
    document.body.appendChild(notification);

    // Smooth slide-in animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);

    // Remove after specified duration
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%) scale(0.95)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, duration);
}

// Function to show success message
function showSuccessMessage(message) {
    // Remove any existing success messages to prevent overlap
    const existingSuccess = document.querySelectorAll('.success-message');
    existingSuccess.forEach(msg => {
        if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
        }
    });

    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    // Smooth slide-in animation
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
        successDiv.style.opacity = '1';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 300);
    }, 3000);
}

// Make functions globally available
window.loadKitchenOrders = loadKitchenOrders;
window.markOrderReady = markOrderReady;
window.testSound = playNotificationSound; // For testing sound
window.testInventoryDeduction = testInventoryDeduction; // For testing inventory deduction

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