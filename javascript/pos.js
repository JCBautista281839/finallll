// Clears the active order and resets the UI
function clearOrderAndSummary() {
    const orderItems = document.querySelector('.order-items');
    if (orderItems) orderItems.innerHTML = '';
    const subtotalEl = document.querySelector('.summary-subtotal');
    const taxEl = document.querySelector('.summary-tax');
    const discountEl = document.querySelector('.summary-discount');
    const totalEl = document.querySelector('.summary-total');
    if (subtotalEl) subtotalEl.textContent = '₱0.00';
    if (taxEl) taxEl.textContent = '₱0.00';
    if (discountEl) discountEl.textContent = '0%';
    if (totalEl) totalEl.textContent = '₱0.00';
    const discountIDEl = document.getElementById('discount-id-summary');
    if (discountIDEl) discountIDEl.textContent = '';
    const idInput = document.getElementById('discount-id-input');
    if (idInput) {
        idInput.value = '';
        idInput.style.display = 'none';
    }
    const discountInputContainer = document.querySelector('.discount-input');
    if (discountInputContainer) discountInputContainer.style.display = 'none';
    const discountDropdown = document.querySelector('.discount-dropdown');
    if (discountDropdown) discountDropdown.value = 'none';
    sessionStorage.removeItem('activeOrderDiscount');
    sessionStorage.removeItem('loadedOMRScans'); // Clear OMR tracking
    window.activeDiscountID = '';
}
// Global variables accessible throughout the file
// --- POS ACTIVE ORDER RESET/RESTORE LOGIC ---
// On page load, clear session if not proceeding to payment
window.addEventListener('load', function() {
    const hasProceeded = sessionStorage.getItem('hasProceeded') === 'true';
    if (!hasProceeded) clearOrderAndSummary();
});
let menuItemsData = {};

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 350px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const typeClass = type === 'success' ? 'alert-success' : 
                     type === 'error' ? 'alert-danger' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
    
    toast.className = `alert ${typeClass} alert-dismissible fade show mb-2`;
    toast.style.cssText = `
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        border-radius: 8px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    toast.innerHTML = `
        <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add toast to container
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}

// Wait for Firebase to be ready before initializing
function waitForFirebase() {
    try {
        if (window.isFirebaseReady && window.isFirebaseReady()) {
            initializePOS();
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            initializePOS();
        } else {
            setTimeout(waitForFirebase, 500); // Increased timeout for more stability
        }
    } catch (error) {
        setTimeout(waitForFirebase, 1000);
    }
}

function initializePOS() {
    try {
        // Check authentication
        const auth = firebase.auth();
        
        // Add error handler for auth state changes
        auth.onAuthStateChanged((user) => {
            try {
                if (user) {
                    
                    // Check if we have a valid token before proceeding
                    user.getIdToken(true)
                        .then(token => {
                            
                            // Verify user has proper permissions by checking if they can access menu collection
                            const db = firebase.firestore();
                            return db.collection('menu').limit(1).get();
                        })
                        .then(() => {
                            startPOSSystem();
                        })
                        .catch((error) => {
                            
                            if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
                                // Sign out since credentials aren't working
                                auth.signOut().then(() => window.location.href = '/index.html');
                            } else {
                            }
                        });
                } else {
                    window.location.href = '/index.html';
                }
            } catch (authError) {
                window.location.href = '/index.html';
            }
        }, (authError) => {
            window.location.href = '/index.html';
        });
    } catch (error) {
        window.location.href = '/index.html';
    }
}

async function startPOSSystem() {
    try {
        
        // Clear any leftover session storage that might interfere with new orders
        sessionStorage.removeItem('editingOrder');
        sessionStorage.removeItem('originalOrderId');
        sessionStorage.removeItem('isEditMode');
        // Always ensure a pendingOrderId is set for a new order session
        if (!sessionStorage.getItem('pendingOrderId')) {
            let nextOrderId = await getNextOrderId();
            sessionStorage.setItem('pendingOrderId', nextOrderId);
        }
        
        // Initialize order number
    // Assign a new unique order number for every new order, but only finalize on payment
        let currentOrderNumber = null;
        let currentOrderNumberFormatted = null;
        // Helper to get next orderId from Firestore counter, fallback to timestamp
        async function getNextOrderId() {
            try {
                const db = firebase.firestore();
                const counterDoc = db.collection('counters').doc('orders');
                const result = await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(counterDoc);
                    const newNumber = (doc.exists ? doc.data().current : 0) + 1;
                    transaction.set(counterDoc, {
                        current: newNumber,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    return newNumber;
                });
                return result;
            } catch (error) {
                console.error('OrderId counter failed, using timestamp fallback:', error);
                return 'T' + Date.now();
            }
        }

        // Function to get the last order number from Firestore
        async function getLastOrderNumber() {
            const db = firebase.firestore();
            const counterDoc = db.collection('counters').doc('orders');
            
            try {
                const doc = await counterDoc.get();
                if (doc.exists) {
                    return doc.data().current;
                }
                return 0;  // Return 0 if no document exists
            } catch (error) {
                console.error('Error getting last order number:', error);
                return 0;  // Return 0 in case of an error
            }
        }

        // Function to get the next order number from Firestore and increment it
        async function getNextOrderNumber() {
            const db = firebase.firestore();
            const counterDoc = db.collection('counters').doc('orders');
            
            try {
                const result = await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(counterDoc);
                    const newNumber = (doc.exists ? doc.data().current : 0) + 1;
                    // Increment order number in Firestore
                    transaction.set(counterDoc, { 
                        current: newNumber,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    return newNumber;
                });
                return result;
            } catch (error) {
                console.error('Error getting next order number:', error);
                return null;
            }
        }

        // Function to update the order number display
        async function updateOrderNumber() {
            // Only assign a new orderId if not already assigned for this session/order
            const orderNumberElement = document.querySelector('.order-number');
            let pendingOrderId = sessionStorage.getItem('pendingOrderId');
            if (!pendingOrderId) {
                pendingOrderId = await getNextOrderId();
                sessionStorage.setItem('pendingOrderId', pendingOrderId);
            }
            currentOrderNumber = pendingOrderId;
            currentOrderNumberFormatted = typeof pendingOrderId === 'number' || /^\d+$/.test(pendingOrderId)
                ? String(pendingOrderId).padStart(4, '0')
                : String(pendingOrderId);
            if (orderNumberElement) {
                orderNumberElement.textContent = `Order No. ${currentOrderNumberFormatted}`;
            }
        }

    // On POS page load, scan Firebase for highest order number and show next
    async function getNextOrderNumberFromOrdersCollection() {
        const db = firebase.firestore();
        const ordersSnapshot = await db.collection('orders').orderBy('orderNumber', 'desc').limit(1).get();
        let nextOrderNumber = 1;
        if (!ordersSnapshot.empty) {
            const lastOrder = ordersSnapshot.docs[0].data();
            nextOrderNumber = (lastOrder.orderNumber || 0) + 1;
        }
        return nextOrderNumber;
    }

    // Replace initial order number logic
    const orderNumberElement = document.querySelector('.order-number');
    let pendingOrderId = sessionStorage.getItem('pendingOrderId');
    if (!pendingOrderId) {
        pendingOrderId = await getNextOrderId();
        sessionStorage.setItem('pendingOrderId', pendingOrderId);
    }
    currentOrderNumber = pendingOrderId;
    currentOrderNumberFormatted = typeof pendingOrderId === 'number' || /^\d+$/.test(pendingOrderId)
        ? String(pendingOrderId).padStart(4, '0')
        : String(pendingOrderId);
    if (orderNumberElement) {
        orderNumberElement.textContent = `Order No. ${currentOrderNumberFormatted}`;
    }

    // Load menu items
    const menuGrid = document.querySelector('.menu-items-grid');

    // Loads menu items from Firestore and renders them
    async function loadMenuForPOS() {
        const db = firebase.firestore();
        try {
            console.log('Loading menu items from Firebase...');
            const menuSnapshot = await db.collection('menu').where('available', '==', true).get();
            const items = menuSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            items.forEach(item => {
                menuItemsData[item.name] = item;
            });
            renderMenuCards(items);
            // Enable search functionality
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    const searchTerm = this.value.trim().toLowerCase();
                    const filteredItems = searchTerm
                        ? items.filter(item => (item.name || '').toLowerCase().includes(searchTerm))
                        : items;
                    renderMenuCards(filteredItems);
                });
            }
            console.log(`Loaded ${items.length} menu items successfully`);
            
            // Check for OMR results after menu is loaded
            setTimeout(() => {
                console.log('🔄 Checking for OMR results after menu load...');
                checkForOMRResults();
            }, 1000);
        } catch (err) {
            console.error('POS load menu error:', err);
            
            // Show user-friendly error message
            if (menuGrid) {
                menuGrid.innerHTML = `
                    <div class="alert alert-warning text-center p-4">
                        <h5>Unable to load menu items</h5>
                        <p>There was an issue connecting to the database.</p>
                        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    // Render menu cards
    // Renders menu item cards in the menu grid
    function renderMenuCards(items) {
        if (!menuGrid) return;
        menuGrid.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'menu-item-card';
            card.setAttribute('data-id', item.id);
            card.setAttribute('data-category', (item.category || '').toLowerCase());
            card.innerHTML = `
                <div class="item-image">
                    <img src="${item.photoUrl || '../src/Icons/menu.png'}" alt="${item.name || 'Item'}">
                </div>
                <div class="item-details">
                    <h6 class="item-name">${item.name || ''}</h6>
                    <p class="item-price">₱${(item.price ?? 0).toFixed(2)}</p>
                </div>
            `;
            card.addEventListener('click', async function() {
                const itemName = this.querySelector('.item-name').textContent;
                const itemPrice = this.querySelector('.item-price').textContent;
                const itemImage = this.querySelector('.item-image img').src;
                // Ingredient deduction and inventory checks are now handled in Kitchen on 'Order Ready'.
                // Only add item to order here.
                addItemToOrder(itemName, itemPrice, itemImage);
            });
            menuGrid.appendChild(card);
        });
    }

    // Add item to order
    // Adds an item to the current order
    window.addItemToOrder = function addItemToOrder(name, price, image) {
        try {
            console.log(`🔧 Adding item: ${name} at ${price}`);
            
            const orderItems = document.querySelector('.order-items');
            if (!orderItems) {
                throw new Error('Order items container not found');
            }
            
            const existingItem = document.querySelector(`[data-item-name="${name}"]`);
            const unitPrice = parseFloat(price.replace('₱','').replace(',',''));
            
            if (isNaN(unitPrice)) {
                throw new Error(`Invalid price format: ${price}`);
            }

            if (existingItem) {
                // Increase quantity by 1 only
                const quantitySpan = existingItem.querySelector('.quantity-controls .quantity');
                if (!quantitySpan) {
                    throw new Error(`Quantity span not found for existing item: ${name}`);
                }
                
                let currentQty = parseInt(quantitySpan.textContent);
                if (isNaN(currentQty)) {
                    currentQty = 0;
                }
                currentQty += 1;
                quantitySpan.textContent = currentQty;
                
                // Update price next to quantity controls
                const priceElement = existingItem.querySelector('.quantity-controls .item-price');
                if (priceElement) {
                    priceElement.textContent = `₱${(unitPrice * currentQty).toFixed(2)}`;
                }
                
                console.log(`✅ Updated existing item: ${name} (qty: ${currentQty})`);
            } else {
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';
                orderItem.setAttribute('data-item-name', name);
                orderItem.setAttribute('data-unit-price', unitPrice);
                orderItem.innerHTML = `
                    <div class="item-info">
                        <div class="item-quantity">
                            <i class="bi bi-chevron-right"></i>
                            <span class="item-number">1</span>
                        </div>
                        <div class="item-details">
                            <h6 class="item-name">${name}</h6>
                        </div>
                        <button class="btn-remove-item">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    <div class="quantity-controls">
                        <p class="item-price">₱${unitPrice.toFixed(2)}</p>
                        <button class="btn-quantity btn-minus">
                            <i class="bi bi-dash"></i>
                        </button>
                        <span class="quantity">1</span>
                        <button class="btn-quantity btn-plus">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                `;
                // Attach event listeners for quantity buttons
                const minusBtn = orderItem.querySelector('.btn-minus');
                const plusBtn = orderItem.querySelector('.btn-plus');
                
                if (minusBtn && plusBtn) {
                    minusBtn.addEventListener('click', function() {
                        window.decreaseQuantity(this);
                        window.updateOrderSummary();
                    });
                    plusBtn.addEventListener('click', function() {
                        window.increaseQuantity(this);
                        window.updateOrderSummary();
                    });
                }
                
                // Attach remove button event
                const removeBtn = orderItem.querySelector('.btn-remove-item');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function() {
                        this.closest('.order-item').remove();
                        window.updateOrderSummary();
                    });
                }
                
                orderItems.appendChild(orderItem);
                console.log(`✅ Created new item: ${name} at ₱${unitPrice.toFixed(2)}`);
            }
            
            window.updateOrderSummary();
            
        } catch (error) {
            console.error(`❌ Error in addItemToOrder for ${name}:`, error);
            throw error; // Re-throw to be caught by calling function
        }
    }

    // Ensure discount dropdown is always clickable and updates summary instantly
    function ensureDiscountDropdownListener() {
        const discountDropdown = document.querySelector('.discount-dropdown');
        if (discountDropdown && !discountDropdown.hasListener) {
            discountDropdown.addEventListener('change', function() {
                window.updateOrderSummary();
            });
            discountDropdown.hasListener = true;
        }
    }
    // Attach listener on DOMContentLoaded
    window.addEventListener('DOMContentLoaded', function() {
        ensureDiscountDropdownListener();
    });
    // Call after adding/removing items
    ensureDiscountDropdownListener();

    // Update order summary (subtotal, tax, total)
    // Updates subtotal, tax, discount, and total in the order summary
    window.updateOrderSummary = function updateOrderSummary() {
            const orderItemsEls = document.querySelectorAll('.order-item');
            let subtotal = 0;
            orderItemsEls.forEach(item => {
                const unitPrice = parseFloat(item.getAttribute('data-unit-price'));
                let quantityElement = item.querySelector('.quantity-controls .quantity');
                if (!quantityElement) quantityElement = item.querySelector('.quantity');
                const quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;
                const lineTotal = unitPrice * quantity;
                subtotal += lineTotal;
                const priceElement = item.querySelector('.quantity-controls .item-price');
                if (priceElement) priceElement.textContent = `₱${lineTotal.toFixed(2)}`;
                const itemNumberEl = item.querySelector('.item-number');
                if (itemNumberEl) itemNumberEl.textContent = quantity;
            });

            // Fixed tax amount
            const tax = 5.00;
            let discountPercent = 0;
            let discount = 0;
            let discountType = 'none';
            let discountID = '';
            const discountDropdown = document.querySelector('.discount-dropdown');
            const customDiscountInputRow = document.getElementById('customDiscountInputRow');
            const customDiscountInput = document.getElementById('customDiscountInput');
            const idInputRow = document.getElementById('customerIdInputRow');
            const idInput = document.getElementById('customerIdInput');
            if (discountDropdown) {
                // Only count visible order items for the noItems check
                const visibleOrderItems = Array.from(document.querySelectorAll('.order-item')).filter(item => item.offsetParent !== null);
                const noItems = visibleOrderItems.length === 0;
                // Only show alert if not restoring order and no visible items
                const isRestoring = sessionStorage.getItem('shouldRestoreOrder') === 'true';
                if (discountDropdown.value !== 'none' && noItems && !isRestoring) {
                    // For all discount types, just reset fields and return silently if no items
                    discountDropdown.value = 'none';
                    if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
                    if (idInputRow) idInputRow.style.display = 'none';
                    discountType = 'none';
                    discountPercent = 0;
                    discount = 0;
                    return;
                }
                if (discountDropdown.value === 'none') {
                    discountType = 'none';
                    discountPercent = 0;
                    discount = 0;
                    if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
                    if (idInputRow) idInputRow.style.display = 'none';
                } else if (discountDropdown.value === 'pwd' || discountDropdown.value === 'senior') {
                    discountType = discountDropdown.value;
                    discountPercent = 20;
                    discount = subtotal * 0.20;
                    if (idInputRow) idInputRow.style.display = '';
                    if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
                    if (idInput) {
                        discountID = idInput.value;
                        idInput.oninput = function() { updateOrderSummary(); };
                    }
                } else if (discountDropdown.value === 'custom') {
                    discountType = 'custom';
                    if (customDiscountInputRow) {
                        customDiscountInputRow.style.display = '';
                        if (customDiscountInput) {
                            let customPercent = parseFloat(customDiscountInput.value) || 0;
                            if (customPercent > 100) customPercent = 100;
                            if (customPercent < 0) customPercent = 0;
                            discountPercent = customPercent;
                            discount = subtotal * (customPercent / 100);
                            customDiscountInput.oninput = function() { updateOrderSummary(); };
                        }
                    }
                    if (idInputRow) idInputRow.style.display = 'none';
                }
            }
            // Calculate total
            const total = subtotal + tax - discount;
            // Update summary displays
            const subtotalEl = document.querySelector('.summary-subtotal');
            const taxEl = document.querySelector('.summary-tax');
            const discountEl = document.querySelector('.summary-discount');
            const totalEl = document.querySelector('.summary-total');
            if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
            if (taxEl) taxEl.textContent = `₱${tax.toFixed(2)}`;
            if (discountEl) discountEl.textContent = `${discountPercent}%`;
            if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;
            // Show discount ID in summary if present
            let discountIDEl = document.getElementById('discount-id-summary');
            if ((discountType === 'pwd' || discountType === 'senior') && discountID) {
                if (!discountIDEl) {
                    discountIDEl = document.createElement('div');
                    discountIDEl.id = 'discount-id-summary';
                    discountIDEl.className = 'mt-1 text-muted';
                    totalEl?.parentNode?.appendChild(discountIDEl);
                }
                discountIDEl.textContent = (discountType === 'pwd' ? 'PWD ID: ' : 'Senior Citizen ID: ') + discountID;
            } else if (discountIDEl) {
                discountIDEl.textContent = '';
            }

            // --- PATCH: Save all discount fields to posOrder in sessionStorage ---
            // Get or create the active order object
            let posOrder = {};
            try {
                posOrder = JSON.parse(sessionStorage.getItem('posOrder')) || {};
            } catch (e) { posOrder = {}; }
            posOrder.discountType = discountType === 'custom' ? 'Special Discount' : (discountType === 'pwd' ? 'PWD' : (discountType === 'senior' ? 'Senior Citizen' : 'None'));
            posOrder.discountPercent = discountPercent;
            posOrder.discountAmount = discount;
            // Save name and ID if present (from input fields)
            const nameInput = document.getElementById('customerNameInput');
            const idInputField = document.getElementById('customerIdInput');
            if (nameInput) posOrder.discountName = nameInput.value;
            if (idInputField) posOrder.discountID = idInputField.value;
            // Also save computed totals for Payment page
            posOrder.subtotal = subtotal;
            posOrder.tax = tax;
            posOrder.total = total;
            sessionStorage.setItem('posOrder', JSON.stringify(posOrder));
            // --- END PATCH ---

            window.activeDiscountID = discountID;
            console.log('Order summary updated:', { subtotal, tax, discountPercent, discount, total, discountType, discountID });
    }

    // Save order data and proceed to payment
    // Handles Proceed button: saves order and navigates to payment

    const proceedBtn = document.querySelector('.proceed-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', async function() {
            // Always ensure pendingOrderId is set before proceeding
            let pendingOrderId = sessionStorage.getItem('pendingOrderId');
            if (!pendingOrderId) {
                pendingOrderId = await getNextOrderId();
                sessionStorage.setItem('pendingOrderId', pendingOrderId);
            }
            // Remove pendingOrderId from sessionStorage on finalize (will be handled in payment.js after order is finalized)
            // Set hasProceeded flag so order can be restored after payment/back
            sessionStorage.setItem('hasProceeded', 'true');
            // Only validate that there are visible order items
            const orderItemsContainer = document.querySelector('.order-items');
            const orderItems = orderItemsContainer ? Array.from(orderItemsContainer.children).filter(el => el.classList.contains('order-item') && el.offsetParent !== null) : [];
            if (!orderItems || orderItems.length === 0) {
                alert('Please add items from the menu first.');
                return;
            }
            // --- Build and save full order object for Payment page (no orderId yet) ---
            let posOrder = {};
            try {
                posOrder = JSON.parse(sessionStorage.getItem('posOrder')) || {};
            } catch (e) { posOrder = {}; }
            // Order type
            const orderTypeEl = document.querySelector('.order-type span');
            posOrder.orderType = orderTypeEl ? orderTypeEl.textContent : '';
            // Table and pax
            const tableNumberInput = document.querySelector('.table-number input');
            const paxNumberInput = document.querySelector('.pax-number input');
            const tableNumberValue = tableNumberInput ? tableNumberInput.value.trim() : '';
            const paxValue = paxNumberInput ? paxNumberInput.value.trim() : '';
            // Only require table number and pax for Dine in
            const orderType = orderTypeEl ? orderTypeEl.textContent.trim() : '';
            if (orderType === 'Dine in') {
                if (!tableNumberValue || !paxValue) {
                    alert('Please enter both Table Number and Pax before proceeding.');
                    return;
                }
<<<<<<< Updated upstream

                const db = firebase.firestore();
                const orderNumberFormatted = String(currentOrderNumber).padStart(4, '0');
                const isEditMode = sessionStorage.getItem('isEditMode') === 'true';
                const originalOrderId = sessionStorage.getItem('originalOrderId');
                
                console.log('Processing order:', {
                    orderNumber: orderNumberFormatted,
                    isEditMode,
                    originalOrderId,
                    sessionStorage: {
                        editingOrder: sessionStorage.getItem('editingOrder'),
                        isEditMode: sessionStorage.getItem('isEditMode'),
                        originalOrderId: sessionStorage.getItem('originalOrderId')
                    }
                });

                console.log('Firebase auth state:', firebase.auth().currentUser);
                console.log('Firestore instance:', db);
                console.log('Order data to save:', orderData);

                // Validate order data before saving
                if (!orderData.orderNumber || !orderData.orderNumberFormatted || !orderData.items || orderData.items.length === 0) {
                    console.error('Invalid order data:', orderData);
                    alert('Invalid order data. Missing required fields. Please try again.');
                    return;
                }

                // Validate items structure
                for (const item of orderData.items) {
                    if (!item.name || !item.unitPrice || !item.quantity) {
                        console.error('Invalid item data:', item);
                        alert('Invalid item data found. Please refresh and try again.');
                        return;
                    }
                }
                
                // If we're in edit mode AND have a valid original order ID, update existing order
                if (isEditMode && originalOrderId) {
                    console.log('Updating existing order:', originalOrderId);
                    
                    // Check if the original order exists before trying to update
                    const originalOrderRef = db.collection('orders').doc(originalOrderId);
                    const originalOrderDoc = await originalOrderRef.get();
                    
                    if (!originalOrderDoc.exists) {
                        console.warn('Original order not found, creating new order instead');
                        // Fall through to create new order
                    } else {
                        // Get the original order data to preserve status if not already pending payment
                        const originalOrderData = originalOrderDoc.data();
                        const originalStatus = originalOrderData.status || 'Pending Payment';
                        
                        // Prepare update data object
                        const updateData = {
                            items: orderData.items,
                            orderType: orderData.orderType,
                            tableNumber: orderData.tableNumber,
                            paxNumber: orderData.paxNumber,
                            subtotal: orderData.subtotal,
                            tax: orderData.tax,
                            discount: orderData.discount,
                            total: orderData.total,
                            status: originalStatus, // Keep the original status
                            lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                            modifiedBy: firebase.auth().currentUser?.email || 'unknown',
                            isEdited: true,
                            isEditable: true // Ensure it remains editable
                        };
                        
                        // Preserve kitchenStatus if it exists
                        if (originalOrderData.kitchenStatus) {
                            updateData.kitchenStatus = originalOrderData.kitchenStatus;
                        }
                        
                        // Apply the update
                        await originalOrderRef.update(updateData);
                        console.log('Order updated successfully:', originalOrderId);
                        
                        // Clean up session storage
                        sessionStorage.removeItem('editingOrder');
                        sessionStorage.removeItem('originalOrderId');
                        sessionStorage.removeItem('isEditMode');
                        sessionStorage.removeItem('shouldRestoreOrder');
                        sessionStorage.setItem('posOrder', JSON.stringify(orderData));
                        
                        // Navigate to payment page with absolute path
                        window.location.href = window.location.origin + '/payment.html';
                        return;
                    }
                }

                // This is a new order - reduce inventory and create new order
                console.log('Creating new order:', orderNumberFormatted);
                    
                    // Reduce inventory first
                    try {
                        await reduceInventoryForOrder(orderData.items);
                        console.log('Inventory reduced successfully');
                    } catch (inventoryError) {
                        console.warn('Inventory reduction failed:', inventoryError);
                        // Continue with order creation even if inventory reduction fails
                    }

                    // Create the new order
                    // Always recalculate total before saving
                                        // Always recalculate subtotal from items before saving
                                        let subtotal = 0;
                                        if (Array.isArray(orderData.items)) {
                                            subtotal = orderData.items.reduce((sum, item) => {
                                                const price = parseFloat(item.unitPrice || item.price) || 0;
                                                const qty = parseInt(item.quantity) || 1;
                                                return sum + price * qty;
                                            }, 0);
                                        }
                                        const tax = parseFloat(orderData.tax) || 0;
                                        const discount = parseFloat(orderData.discount) || 0;
                                        const total = subtotal + tax - discount;
                                        await db.collection('orders').doc(orderNumberFormatted).set({
                                                ...orderData,
                                                subtotal: subtotal,
                                                total: total,
                                                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                                createdAt: new Date().toISOString(),
                                                orderType: document.querySelector('.order-type span').textContent || 'Dine in',
                                                tableNumber: tableNumber || null,
                                                paxNumber: paxNumber || null,
                                                orderNumberFormatted: orderNumberFormatted
                                        });
                    
                    console.log('New order saved successfully:', orderNumberFormatted);
                    
                    // Remove OMR scans that were used in this order
                    await removeLoadedOMRScans();

                // Clean up session storage
                sessionStorage.removeItem('editingOrder');
                sessionStorage.removeItem('originalOrderId');
                sessionStorage.removeItem('isEditMode');
                sessionStorage.removeItem('reservedOrderNumber'); // Clear reserved order number
                
                // Store order data for payment page
                sessionStorage.setItem('posOrder', JSON.stringify(orderData));
                
                // Clear the UI
                document.querySelector('.order-items').innerHTML = '';
                updateOrderSummary();
                
                const tableInput = document.querySelector('.table-number input');
                if (tableInput) tableInput.value = '';
                
                // Update order number for next transaction
                await updateOrderNumber();
                
                // Navigate to payment page
                window.location.href = '/payment.html';
            } catch (error) {
                console.error('Error saving order:', error);
                console.error('Error details:', {
                    code: error.code,
                    message: error.message,
                    stack: error.stack
                });
                alert(`There was an error processing your order: ${error.message}. Please try again.`);
=======
                posOrder.tableNumber = tableNumberValue;
                posOrder.pax = paxValue;
            } else {
                posOrder.tableNumber = '';
                posOrder.pax = '';
>>>>>>> Stashed changes
            }
            // Items
            posOrder.items = orderItems.map(item => ({
                name: item.getAttribute('data-item-name'),
                quantity: parseInt(item.querySelector('.quantity').textContent),
                price: parseFloat(item.getAttribute('data-unit-price')),
                total: parseFloat(item.querySelector('.item-price').textContent.replace('₱','').replace(',',''))
            }));
            // Subtotal, tax, discount, total
            posOrder.subtotal = parseFloat(document.querySelector('.summary-subtotal').textContent.replace('₱', ''));
            posOrder.tax = parseFloat(document.querySelector('.summary-tax').textContent.replace('₱', ''));
            posOrder.discount = typeof posOrder.discountAmount !== 'undefined' ? posOrder.discountAmount : 0;
            posOrder.total = parseFloat(document.querySelector('.summary-total').textContent.replace('₱', ''));
            // Status and createdAt
            posOrder.status = 'pending payment';
            posOrder.createdAt = new Date().toISOString();
            // Save to sessionStorage
            sessionStorage.setItem('posOrder', JSON.stringify(posOrder));
            // Navigate to payment page
            window.location.href = '/html/payment.html';
        });
    }

    // Also update order number when clearing the order
    // Handles Clear/New Order button: resets everything
    const closeOrderBtn = document.querySelector('.btn-close-order');
    if (closeOrderBtn) {
        closeOrderBtn.addEventListener('click', async function() {
            if (confirm('Are you sure you want to clear this order?')) {
                // Clear the reserved order number first
                sessionStorage.removeItem('reservedOrderNumber');
                sessionStorage.removeItem('hasProceeded'); // Clear flag on Clear
                document.querySelector('.order-items').innerHTML = '';
                updateOrderSummary();
                // Reset Table No and Pax fields to null
                const tableInput = document.querySelector('.table-number input');
                const paxInput = document.querySelector('.pax-number input');
                if (tableInput) tableInput.value = '';
                if (paxInput) paxInput.value = '';
                // Get a new order number for the cleared order
                await updateOrderNumber();
            }
        });
    }

    loadMenuForPOS();
    updateOrderNumber();

    // Helper function to update order status in Firebase
    window.updateOrderStatus = async function(orderNumber, status) {
        try {
            const db = firebase.firestore();
            const orderDoc = await db.collection('orders').doc(orderNumber).get();
            
            if (orderDoc.exists) {
                await db.collection('orders').doc(orderNumber).update({
                    status: status,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Order ${orderNumber} status updated to ${status}`);
                return true;
            } else {
                console.error(`Order ${orderNumber} not found`);
                return false;
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            return false;
        }
    };

    // Add event listener for order type change to handle table number visibility
    // Handle order type dropdown selection
    document.addEventListener('click', function(e) {
        if (e.target.matches('.dropdown-item[data-type]')) {
            e.preventDefault();
            const selectedType = e.target.getAttribute('data-type');
            const orderTypeButton = document.querySelector('.order-type span');
            const tableInput = document.querySelector('.table-number input');
            const paxInput = document.querySelector('.pax-number input');
            
            // Update the dropdown button text
            if (orderTypeButton) {
                orderTypeButton.textContent = selectedType;
            }
            
            // Handle table and pax input visibility based on order type
            if (selectedType === 'Dine in') {
                // Show table and pax inputs for dine in
                document.querySelector('.table-number').style.display = 'block';
                document.querySelector('.pax-number').style.display = 'block';
                if (tableInput) {
                    tableInput.required = true;
                }
                if (paxInput) {
                    paxInput.required = true;
                }
            } else if (selectedType === 'Take out') {
                // Hide table and pax inputs for take out
                document.querySelector('.table-number').style.display = 'none';
                document.querySelector('.pax-number').style.display = 'none';
                if (tableInput) {
                    tableInput.required = false;
                    tableInput.value = '';
                }
                if (paxInput) {
                    paxInput.required = false;
                    paxInput.value = '';
                }
            }
        }
    });

    // Check for start new order flag first
    const startNewOrder = sessionStorage.getItem('startNewOrder');
    if (startNewOrder === 'true') {
        // Clear the flag and start fresh
        sessionStorage.removeItem('startNewOrder');
        sessionStorage.removeItem('reservedOrderNumber'); // Clear any reserved order number
        sessionStorage.removeItem('hasProceeded'); // Clear flag on New Order
        // Clear order items and reset interface
        const orderItems = document.querySelector('.order-items');
        if (orderItems) {
            orderItems.innerHTML = '';
        }
        // Clear table number
        const tableInput = document.querySelector('.table-number input');
        if (tableInput) {
            tableInput.value = '';
        }
        // Reset order type to default
        const orderTypeSpan = document.querySelector('.order-type span');
        if (orderTypeSpan) {
            orderTypeSpan.textContent = 'Dine in';
        }
        // Update order summary
        updateOrderSummary();
        // Get a new order number for the fresh order
        await updateOrderNumber();
        console.log('Started new order - POS interface cleared and new order number assigned');
        return; // Don't restore any pending orders
    }

    // Check for orders to restore (Back from Payment)
    const hasProceeded = sessionStorage.getItem('hasProceeded') === 'true';
    const pendingOrder = sessionStorage.getItem('pendingOrder');
    const editingOrder = sessionStorage.getItem('editingOrder');
    const shouldRestore = sessionStorage.getItem('shouldRestoreOrder') === 'true';
    const isEditMode = sessionStorage.getItem('isEditMode') === 'true';
    const originalOrderId = sessionStorage.getItem('originalOrderId');
    console.log('POS Order restoration check:', {
        pendingOrderExists: !!pendingOrder,
        editingOrderExists: !!editingOrder,
        shouldRestore,
        isEditMode,
        originalOrderId,
        hasProceeded
    });
    // Only restore if hasProceeded is true and shouldRestoreOrder is set
    if (hasProceeded && (pendingOrder || editingOrder) && (shouldRestore || isEditMode)) {
        try {
            // Parse the order data
            const orderData = JSON.parse(pendingOrder || editingOrder);
            console.log('Restoring order data:', orderData);

            // Set the order number
            if (orderData.orderNumberFormatted) {
                const orderNumberElement = document.querySelector('.order-number');
                if (orderNumberElement) {
                    orderNumberElement.textContent = `Order No. ${orderData.orderNumberFormatted}`;
                    currentOrderNumber = typeof orderData.orderNumber === 'number' ? orderData.orderNumber : parseInt(orderData.orderNumberFormatted) || currentOrderNumber;
                }
            }

            // Clear old items
            const orderItems = document.querySelector('.order-items');
            if (orderItems) orderItems.innerHTML = '';

            // Load items
            if (orderData.items && Array.isArray(orderData.items)) {
                orderData.items.forEach(item => {
                    addItemToOrder(item.name, `₱${parseFloat(item.unitPrice).toFixed(2)}`, '');
                    // Set correct quantity if not 1
                    const orderItemEl = document.querySelector(`.order-item[data-item-name="${item.name}"]`);
                    if (orderItemEl) {
                        const qtySpan = orderItemEl.querySelector('.quantity');
                        if (qtySpan) qtySpan.textContent = item.quantity;
                        const priceEl = orderItemEl.querySelector('.item-price');
                        if (priceEl) priceEl.textContent = `₱${parseFloat(item.lineTotal).toFixed(2)}`;
                    }
                });
            }

            // Restore order details
            if (orderData.orderType) {
                const orderTypeSpan = document.querySelector('.order-type span');
                if (orderTypeSpan) orderTypeSpan.textContent = orderData.orderType;
            }
            if (orderData.tableNumber) {
                const tableInput = document.querySelector('.table-number input');
                if (tableInput) tableInput.value = orderData.tableNumber;
            }
            if (orderData.paxNumber) {
                const paxInput = document.querySelector('.pax-number input');
                if (paxInput) paxInput.value = orderData.paxNumber;
            }
            if (orderData.discount) {
                const discountInput = document.querySelector('.discount-input input');
                if (discountInput) discountInput.value = orderData.discount.toString();
            }

            // Update order summary
            updateOrderSummary();

            // Clean up restoration flags so POS is ready for normal use
            sessionStorage.removeItem('pendingOrder');
            sessionStorage.removeItem('shouldRestoreOrder');
            // Do NOT clear hasProceeded, so order persists until New Order/Clear

            // Show success
            console.log('Order restoration complete:', {
                orderNumber: orderData.orderNumberFormatted,
                table: orderData.tableNumber,
                pax: orderData.paxNumber,
                items: orderData.items ? orderData.items.length : 0,
                total: orderData.total
            });
        } catch (error) {
            console.error('Error restoring order:', error);
            sessionStorage.removeItem('pendingOrder');
            sessionStorage.removeItem('shouldRestoreOrder');
            showToast('Error loading order: ' + error.message, 'error');
        }
    }

    } catch (error) {
        console.error('Error initializing POS system:', error);
    }
}

async function reduceInventoryForOrder(orderItems) {
    const db = firebase.firestore();
    const batch = db.batch();
    
    console.log('Reducing inventory for order items:', orderItems);
    
    let deductionSummary = [];
    let batchOperations = 0;
    
    try {
        for (const item of orderItems) {
            console.log(`Processing item: ${item.name} (quantity: ${item.quantity})`);
            
            let productData = null;
            if (typeof menuItemsData !== 'undefined' && menuItemsData[item.name]) {
                productData = menuItemsData[item.name];
            } else {
                try {
                    const productQuery = await db.collection('menu')
                        .where('name', '==', item.name)
                        .limit(1)
                        .get();
                    if (!productQuery.empty) {
                        productData = productQuery.docs[0].data();
                    }
                } catch (queryError) {
                    console.warn(`Error fetching product data for ${item.name}:`, queryError);
                    continue;
                }
            }
            if (!productData) {
                console.warn(`Product data not found for: ${item.name}`);
                continue;
            }
            if (!productData.ingredients || productData.ingredients.length === 0) {
                console.warn(`No ingredients found for product: ${item.name}`);
                continue;
            }
            
            console.log(`Found ${productData.ingredients.length} ingredients for ${item.name}`);
            
            // Process each ingredient for this item
            for (const ingredient of productData.ingredients) {
                let docId = ingredient.docId;
                
                console.log(`Processing ingredient: ${ingredient.name} (quantity per product: ${ingredient.quantity})`);
                
                // If docId is missing, try to find it by name
                    if (!docId) {
                        try {
                            const invQuery = await db.collection('inventory').where('name', '==', ingredient.name).limit(1).get();
                            if (!invQuery.empty) {
                            docId = invQuery.docs[0].id;
                            ingredient.docId = docId;
                            console.log(`Found docId for ${ingredient.name}: ${docId}`);
                        } else {
                                console.warn(`No inventory record found for ingredient: ${ingredient.name}`);
                                continue;
                            }
                        } catch (err) {
                            console.warn(`Error finding inventory docId for ingredient: ${ingredient.name}`, err);
                            continue;
                        }
                    }
                
                const ingredientQuantityPerProduct = ingredient.quantity || 0;
                const totalIngredientQuantity = ingredientQuantityPerProduct * (item.quantity || 0);
                
                console.log(`Ingredient validation: ${ingredient.name} - per product: ${ingredientQuantityPerProduct}, total needed: ${totalIngredientQuantity}`);
                
                if (ingredientQuantityPerProduct <= 0) {
                    console.warn(`Skipping ingredient '${ingredient.name}' - no quantity specified in recipe (value: ${ingredient.quantity})`);
                    continue;
                }
                
                if (totalIngredientQuantity <= 0) {
                    console.warn(`Skipping ingredient '${ingredient.name}' - total quantity to deduct is zero (item qty: ${item.quantity})`);
                    continue;
                }
                
                console.log(`Will deduct ${totalIngredientQuantity} units of ${ingredient.name} from inventory`);
                
                const inventoryDoc = db.collection('inventory').doc(docId);
                    try {
                    const docSnapshot = await inventoryDoc.get();
                    if (docSnapshot.exists) {
                        const currentData = docSnapshot.data();
                        const currentQuantity = currentData.quantity || 0;
                        const newQuantity = Math.max(0, currentQuantity - totalIngredientQuantity);
                        
                        console.log(`Updating inventory for ${ingredient.name}: ${currentQuantity} -> ${newQuantity}`);
                        
                        batch.update(inventoryDoc, {
                            quantity: newQuantity,
                            lastUpdated: firebase.firestore.Timestamp.now()
                        });
                        batchOperations++;
                        
                        deductionSummary.push({
                            name: ingredient.name,
                            deducted: totalIngredientQuantity,
                            previousQty: currentQuantity,
                            newQty: newQuantity,
                            unit: ingredient.unit || currentData.unitOfMeasure || ''
                        });
                    } else {
                        console.warn(`Inventory document not found for ingredient: ${ingredient.name} (docId: ${docId})`);
                    }
                } catch (docError) {
                    console.warn(`Error accessing inventory document for ${ingredient.name}:`, docError);
                }
            }
        }
        
        // Commit all inventory updates
        console.log(`Total batch operations prepared: ${batchOperations}`);
        
        if (batchOperations > 0) {
            await batch.commit();
            console.log(`Inventory successfully reduced for ${batchOperations} ingredients`);
            console.log('Deduction summary:', deductionSummary);
            
            // Show deduction summary in UI
            if (deductionSummary.length > 0) {
                showIngredientDeductionNotification(deductionSummary);
            }
        } else {
            console.log('No inventory updates to commit - no valid ingredients found');
        }
    } catch (error) {
        console.error('Error reducing inventory:', error);
        console.warn('Order will continue despite inventory reduction failure');
    }

    // Helper to show deduction summary in UI
    function showIngredientDeductionNotification(summaryArr) {
        let msg = 'Ingredients deducted from inventory:<br>';
        msg += summaryArr.map(s => `- ${s.name}: ${s.deducted} ${s.unit}`).join('<br>');
        let notif = document.createElement('div');
        notif.className = 'ingredient-deduction-notification';
        notif.style.position = 'fixed';
        notif.style.bottom = '30px';
        notif.style.right = '30px';
        notif.style.background = '#f8f9fa';
        notif.style.border = '1px solid #28a745';
        notif.style.color = '#212529';
        notif.style.padding = '16px 24px';
        notif.style.borderRadius = '8px';
        notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        notif.style.zIndex = '9999';
        notif.innerHTML = `<strong>Inventory Updated</strong><br>${msg}`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 6000);
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('POS page loaded, waiting for Firebase...');
    
    // Initialize order type dropdown state
    initializeOrderTypeState();
    
    // Initialize scan button functionality
    initializeScanButton();
    
    // Check for OMR scan results from scanner page
    checkForOMRResults();
    
    // Add global debug function for OMR testing
    window.debugOMR = function() {
        console.log('🔧 DEBUG: Manual OMR check');
        console.log('Session Storage omr_scan_results:', sessionStorage.getItem('omr_scan_results'));
        console.log('Session Storage omr_scan_timestamp:', sessionStorage.getItem('omr_scan_timestamp'));
        console.log('Menu Items Data:', Object.keys(menuItemsData));
        checkForOMRResults();
    };
    
    // Add global function to show OMR scans from Firebase
    window.loadLatestOMR = function() {
        console.log('  MANUAL: Showing OMR scans from Firebase');
        showOMRScansModal();
    };
    
    // Add global function to show OMR scan history
    window.showOMRHistory = async function() {
        try {
            console.log('📋 MANUAL: Showing OMR scan history');
            if (!window.isFirebaseReady || !window.isFirebaseReady()) {
                showToast('⏳ Firebase not ready, please wait...', 'warning');
                return;
            }
            
            const db = firebase.firestore();
            const omrQuery = db.collection('omr_scans')
                .orderBy('timestamp', 'desc')
                .limit(10);
                
            const querySnapshot = await omrQuery.get();
            
            if (!querySnapshot.empty) {
                console.log('📋 Recent OMR scans:');
                querySnapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    console.log(`${index + 1}. ${data.timestamp} - ${data.totalItems} items (₱${data.totalAmount})`);
                });
                showToast(`📋 Found ${querySnapshot.size} recent OMR scans (check console)`, 'info');
            } else {
                showToast('📋 No OMR scans found in history', 'info');
            }
        } catch (error) {
            console.error('❌ Error loading OMR history:', error);
            showToast('❌ Error loading OMR history', 'error');
        }
    };
    
    // Add global function to create test OMR data (for development/testing)
    window.createTestOMRData = async function() {
        try {
            console.log('🧪 Creating test OMR data...');
            
            if (!window.isFirebaseReady || !window.isFirebaseReady()) {
                showToast('⏳ Firebase not ready, please wait...', 'warning');
                return;
            }
            
            const db = firebase.firestore();
            
            // Sample test data
            const testScans = [
                {
                    scanId: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    scanType: 'OMR_FORM',
                    totalItems: 3,
                    totalAmount: 450.00,
                    items: [
                        { item: 'Burger Deluxe', quantity: 1, price: 250.00, firebase_id: 'menu_001' },
                        { item: 'French Fries', quantity: 2, price: 100.00, firebase_id: 'menu_002' }
                    ],
                    status: 'completed'
                },
                {
                    scanId: (Date.now() - 300000).toString(), // 5 minutes ago
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    scanType: 'OMR_FORM',
                    totalItems: 2,
                    totalAmount: 320.00,
                    items: [
                        { item: 'Pizza Margherita', quantity: 1, price: 220.00, firebase_id: 'menu_003' },
                        { item: 'Soft Drink', quantity: 1, price: 100.00, firebase_id: 'menu_004' }
                    ],
                    status: 'completed'
                }
            ];
            
            // Add test data to Firebase
            for (const scan of testScans) {
                await db.collection('omr_scans').add(scan);
            }
            
            showToast('🧪 Test OMR data created successfully!', 'success');
            console.log('✅ Test OMR data created');
            
        } catch (error) {
            console.error('❌ Error creating test OMR data:', error);
            showToast('❌ Error creating test data', 'error');
        }
    };
    
    // Listen for OMR results from popup windows
    initializeOMRMessageListener();
    
    waitForFirebase();
});

// Show OMR scans in a modal/popup
async function showOMRScansModal() {
    try {
        console.log('📋 Loading OMR scans from Firebase...');
        
        // Wait for Firebase to be ready
        if (!window.isFirebaseReady || !window.isFirebaseReady()) {
            showToast('⏳ Firebase not ready, please wait...', 'warning');
            return;
        }

        const db = firebase.firestore();
        
        // Query for recent OMR scans (last 20)
        const omrQuery = db.collection('omr_scans')
            .orderBy('timestamp', 'desc')
            .limit(20);
            
        const querySnapshot = await omrQuery.get();
        
        if (querySnapshot.empty) {
            showToast('📋 No OMR scans found in Firebase', 'info');
            return;
        }
        
        // Create modal HTML
        const modalHTML = `
            <div id="omrScansModal" class="modal fade" tabindex="-1" aria-labelledby="omrScansModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="omrScansModalLabel">🔥 OMR Scans from Firebase</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="omrScansList">
                                <!-- OMR scans will be populated here -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('omrScansModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Populate scan data
        const scansList = document.getElementById('omrScansList');
        let scansHTML = '';
        
        querySnapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const scanDate = new Date(data.timestamp);
            const timeAgo = getTimeAgo(scanDate);
            
            scansHTML += `
                <div class="card mb-3 omr-scan-card" data-scan-id="${doc.id}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h6 class="card-title">
                                    📋 Scan #${data.scanId || doc.id.substring(0, 8)}
                                    <small class="text-muted">(${timeAgo})</small>
                                </h6>
                                <p class="card-text mb-1">
                                    <strong>📅 Time:</strong> ${scanDate.toLocaleString()}<br>
                                    <strong>📊 Items:</strong> ${data.totalItems || 0}<br>
                                    <strong>💰 Total:</strong> ₱${(data.totalAmount || 0).toFixed(2)}
                                </p>
                                ${data.items && data.items.length > 0 ? `
                                    <div class="mt-2">
                                        <small class="text-muted">Items:</small>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${data.items.slice(0, 3).map(item => 
                                                `<span class="badge bg-light text-dark">${item.item} (${item.quantity}x)</span>`
                                            ).join('')}
                                            ${data.items.length > 3 ? `<span class="badge bg-secondary">+${data.items.length - 3} more</span>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <button class="btn btn-primary btn-sm mb-2" onclick="loadOMRScan('${doc.id}')">
                                    📥 Load to POS
                                </button><br>
                                <button class="btn btn-outline-info btn-sm" onclick="viewOMRDetails('${doc.id}')">
                                    👁️ View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        scansList.innerHTML = scansHTML;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('omrScansModal'));
        modal.show();
        
        console.log(`📋 Loaded ${querySnapshot.size} OMR scans from Firebase`);
        
    } catch (error) {
        console.error('❌ Error loading OMR scans:', error);
        showToast('❌ Error loading OMR scans from Firebase', 'error');
    }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Load specific OMR scan to POS
// Load specific OMR scan to order processing panel
// Load specific OMR scan directly to order panel
async function loadOMRScan(scanId) {
    try {
        console.log(`📥 Loading OMR scan ${scanId} to order panel...`);
        
        const db = firebase.firestore();
        const scanDoc = await db.collection('omr_scans').doc(scanId).get();
        
        if (!scanDoc.exists) {
            showToast('❌ OMR scan not found', 'error');
            return;
        }
        
        const scanData = scanDoc.data();
        
        // Close scans modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('omrScansModal'));
        if (modal) modal.hide();
        
        // Add items directly to order panel
        addOMRItemsToOrder(scanData, scanId);
        
        // Track this OMR scan ID for later removal
        trackLoadedOMRScan(scanId);
        
    } catch (error) {
        console.error('❌ Error loading OMR scan:', error);
        showToast('❌ Error loading OMR scan', 'error');
    }
}

// Track loaded OMR scan IDs for removal when proceeding
function trackLoadedOMRScan(scanId) {
    try {
        // Get existing loaded OMR scans from session storage
        let loadedOMRScans = JSON.parse(sessionStorage.getItem('loadedOMRScans') || '[]');
        
        // Add this scan ID if not already tracked
        if (!loadedOMRScans.includes(scanId)) {
            loadedOMRScans.push(scanId);
            sessionStorage.setItem('loadedOMRScans', JSON.stringify(loadedOMRScans));
            console.log(`🔖 Tracked OMR scan ${scanId} for removal on proceed`);
        }
    } catch (error) {
        console.error('❌ Error tracking OMR scan:', error);
    }
}

// Remove loaded OMR scans from Firebase when proceeding
async function removeLoadedOMRScans() {
    try {
        const loadedOMRScans = JSON.parse(sessionStorage.getItem('loadedOMRScans') || '[]');
        
        if (loadedOMRScans.length === 0) {
            console.log('ℹ️ No OMR scans to remove');
            return;
        }
        
        console.log(`🗑️ Removing ${loadedOMRScans.length} OMR scans from Firebase...`);
        
        const db = firebase.firestore();
        const batch = db.batch();
        
        // Add each OMR scan deletion to the batch
        for (const scanId of loadedOMRScans) {
            const scanRef = db.collection('omr_scans').doc(scanId);
            batch.delete(scanRef);
            console.log(`🗑️ Queued deletion of OMR scan: ${scanId}`);
        }
        
        // Execute the batch deletion
        await batch.commit();
        
        // Clear the tracking list
        sessionStorage.removeItem('loadedOMRScans');
        
        console.log(`✅ Successfully removed ${loadedOMRScans.length} OMR scans from Firebase`);
        
    } catch (error) {
        console.error('❌ Error removing OMR scans:', error);
        // Don't show user error for this cleanup operation
    }
}

// Add OMR items directly to the order panel
function addOMRItemsToOrder(scanData, scanId) {
    try {
        console.log('🛒 Adding OMR items to order panel...');
        
        // Check if order items container exists
        const orderItemsContainer = document.querySelector('.order-items');
        if (!orderItemsContainer) {
            console.error('❌ Order items container not found');
            showToast('❌ Order panel not ready', 'error');
            return;
        }
        
        const items = scanData.items || [];
        if (items.length === 0) {
            showToast('⚠️ No items found in OMR scan', 'warning');
            return;
        }
        
        let addedCount = 0;
        let totalAmount = 0;
        let addedItems = [];
        let failedItems = [];
        
        // Add each item to the order
        items.forEach(item => {
            try {
                const itemName = item.item;
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;
                const itemImage = item.photoUrl || '/src/Icons/default-food.png';
                const priceString = `₱${itemPrice.toFixed(2)}`;
                
                console.log(`🔧 Processing: ${itemName} (${itemQuantity}x) at ${priceString}`);
                
                // Add item to order with the specified quantity
                for (let i = 0; i < itemQuantity; i++) {
                    try {
                        window.addItemToOrder(itemName, priceString, itemImage);
                    } catch (addError) {
                        console.error(`❌ Error adding ${itemName} (attempt ${i + 1}):`, addError);
                        failedItems.push(`${itemName} (${i + 1}/${itemQuantity})`);
                    }
                }
                
                addedCount += itemQuantity;
                totalAmount += (itemPrice * itemQuantity);
                addedItems.push(`${itemName} (${itemQuantity}x)`);
                
                console.log(`✅ Added ${itemQuantity}x ${itemName} to order panel`);
                
            } catch (itemError) {
                console.error(`❌ Error processing item:`, item, itemError);
                failedItems.push(item.item || 'Unknown item');
            }
        });
        
        // Update order summary if any items were added
        if (addedCount > 0) {
            try {
                window.updateOrderSummary();
            } catch (summaryError) {
                console.error('❌ Error updating order summary:', summaryError);
            }
        }
        
        // Show appropriate message
        if (failedItems.length > 0) {
            const failureMessage = `⚠️ Some items failed to load: ${failedItems.join(', ')}`;
            showToast(failureMessage, 'warning');
            console.warn('⚠️ Failed items:', failedItems);
        }
        
        if (addedCount > 0) {
            // Show success message with Firebase details
            const scanTime = new Date(scanData.timestamp).toLocaleString();
            const message = `🔥 OMR scan loaded to order panel!\n📅 Scan: ${scanTime}\n📊 Added: ${addedCount} items\n💰 Total: ₱${totalAmount.toFixed(2)}`;
            showToast(message, 'success');
            
            // Enhanced logging for Firebase integration
            console.log('🔥 === OMR TO ORDER PANEL COMPLETE ===');
            console.log(`🆔 Firebase Scan ID: ${scanId}`);
            console.log(`📅 Scan Time: ${scanTime}`);
            console.log(`📊 Items Added: ${addedCount}`);
            console.log(`💰 Total Amount: ₱${totalAmount.toFixed(2)}`);
            console.log(`📋 Items: ${addedItems.join(', ')}`);
            if (failedItems.length > 0) {
                console.log(`⚠️ Failed Items: ${failedItems.join(', ')}`);
            }
            console.log('🔥 ================================');
        } else {
            showToast('❌ No items could be added to order panel', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error adding OMR items to order:', error);
        showToast(`❌ Error adding items to order panel: ${error.message}`, 'error');
    }
}

// Show OMR data in processing panel with quantity controls
function showOMRProcessingPanel(scanData, scanId) {
    try {
        // Create processing modal HTML
        const processingHTML = `
            <div id="omrProcessingModal" class="modal fade" tabindex="-1" aria-labelledby="omrProcessingModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="omrProcessingModalLabel">
                                🛒 Process OMR Scan to Order
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <h6 class="text-muted mb-2">📋 Scan Information</h6>
                                <div class="row text-sm">
                                    <div class="col-6"><strong>Scan Time:</strong> ${new Date(scanData.timestamp).toLocaleString()}</div>
                                    <div class="col-6"><strong>Total Items:</strong> ${scanData.totalItems || 0}</div>
                                </div>
                                <div class="row text-sm mt-1">
                                    <div class="col-6"><strong>Original Total:</strong> ₱${(scanData.totalAmount || 0).toFixed(2)}</div>
                                    <div class="col-6"><strong>Status:</strong> <span class="badge bg-success">${scanData.status || 'completed'}</span></div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <h6 class="mb-2">🛒 Items to Add to Order</h6>
                                <div id="omrItemsList" class="border rounded p-2" style="max-height: 400px; overflow-y: auto;">
                                    <!-- Items will be populated here -->
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-6">
                                    <div class="card bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted">Selected Items:</small>
                                            <div id="selectedItemsCount" class="fw-bold">0</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card bg-light">
                                        <div class="card-body p-2">
                                            <small class="text-muted">Updated Total:</small>
                                            <div id="updatedTotal" class="fw-bold text-success">₱0.00</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-success" onclick="processSelectedOMRItems('${scanId}')">
                                🛒 Add Selected Items to Order
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing processing modal if any
        const existingModal = document.getElementById('omrProcessingModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', processingHTML);
        
        // Populate items list
        populateOMRItemsList(scanData.items || []);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('omrProcessingModal'));
        modal.show();
        
        showToast('📋 OMR scan loaded for processing', 'success');
        
    } catch (error) {
        console.error('❌ Error showing OMR processing panel:', error);
        showToast('❌ Error showing processing panel', 'error');
    }
}

// Populate the items list with quantity controls
function populateOMRItemsList(items) {
    const itemsList = document.getElementById('omrItemsList');
    if (!itemsList) return;
    
    let itemsHTML = '';
    
    if (items && items.length > 0) {
        items.forEach((item, index) => {
            const itemPrice = item.price || 0;
            const itemQuantity = item.quantity || 1;
            const itemTotal = itemPrice * itemQuantity;
            
            itemsHTML += `
                <div class="omr-item-row mb-3 p-3 border rounded" data-item-index="${index}">
                    <div class="row align-items-center">
                        <div class="col-1">
                            <div class="form-check">
                                <input class="form-check-input omr-item-checkbox" type="checkbox" 
                                       id="item_${index}" checked onchange="updateOMRTotals()">
                            </div>
                        </div>
                        <div class="col-5">
                            <div class="fw-bold">${item.item}</div>
                            <small class="text-muted">₱${itemPrice.toFixed(2)} each</small>
                        </div>
                        <div class="col-3">
                            <div class="input-group input-group-sm">
                                <button class="btn btn-outline-secondary btn-sm" type="button" 
                                        onclick="changeOMRQuantity(${index}, -1)">-</button>
                                <input type="number" class="form-control text-center omr-quantity-input" 
                                       id="qty_${index}" value="${itemQuantity}" min="0" max="99" 
                                       onchange="updateOMRTotals()">
                                <button class="btn btn-outline-secondary btn-sm" type="button" 
                                        onclick="changeOMRQuantity(${index}, 1)">+</button>
                            </div>
                        </div>
                        <div class="col-3 text-end">
                            <div class="fw-bold text-success item-total" id="total_${index}">
                                ₱${itemTotal.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        itemsHTML = '<div class="text-center text-muted py-3">No items found in OMR scan</div>';
    }
    
    itemsList.innerHTML = itemsHTML;
    
    // Initial totals calculation
    updateOMRTotals();
}

// Change quantity for OMR item
function changeOMRQuantity(itemIndex, change) {
    const qtyInput = document.getElementById(`qty_${itemIndex}`);
    if (!qtyInput) return;
    
    let currentQty = parseInt(qtyInput.value) || 0;
    currentQty += change;
    
    if (currentQty < 0) currentQty = 0;
    if (currentQty > 99) currentQty = 99;
    
    qtyInput.value = currentQty;
    updateOMRTotals();
}

// Update totals based on selected items and quantities
function updateOMRTotals() {
    let selectedCount = 0;
    let totalAmount = 0;
    
    const checkboxes = document.querySelectorAll('.omr-item-checkbox');
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            selectedCount++;
            
            const qtyInput = document.getElementById(`qty_${index}`);
            const quantity = parseInt(qtyInput?.value) || 0;
            
            // Get price from the item data (you'll need to store this)
            const itemRow = checkbox.closest('.omr-item-row');
            const priceText = itemRow.querySelector('.text-muted').textContent;
            const price = parseFloat(priceText.replace('₱', '').replace(' each', '')) || 0;
            
            const itemTotal = price * quantity;
            totalAmount += itemTotal;
            
            // Update individual item total
            const totalElement = document.getElementById(`total_${index}`);
            if (totalElement) {
                totalElement.textContent = `₱${itemTotal.toFixed(2)}`;
                totalElement.className = quantity > 0 ? 'fw-bold text-success item-total' : 'fw-bold text-muted item-total';
            }
        } else {
            // Update individual item total for unchecked items
            const totalElement = document.getElementById(`total_${index}`);
            if (totalElement) {
                totalElement.textContent = '₱0.00';
                totalElement.className = 'fw-bold text-muted item-total';
            }
        }
    });
    
    // Update summary
    const selectedCountElement = document.getElementById('selectedItemsCount');
    const updatedTotalElement = document.getElementById('updatedTotal');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = selectedCount;
    }
    
    if (updatedTotalElement) {
        updatedTotalElement.textContent = `₱${totalAmount.toFixed(2)}`;
    }
}

// Process selected OMR items and add them to the order
async function processSelectedOMRItems(scanId) {
    try {
        console.log('🛒 Processing selected OMR items...');
        
        const checkboxes = document.querySelectorAll('.omr-item-checkbox:checked');
        if (checkboxes.length === 0) {
            showToast('⚠️ Please select at least one item to add', 'warning');
            return;
        }
        
        let addedCount = 0;
        let totalAmount = 0;
        let addedItems = [];
        
        // Get the original scan data
        const db = firebase.firestore();
        const scanDoc = await db.collection('omr_scans').doc(scanId).get();
        const originalScanData = scanDoc.exists ? scanDoc.data() : null;
        
        checkboxes.forEach((checkbox, index) => {
            const itemIndex = parseInt(checkbox.closest('.omr-item-row').dataset.itemIndex);
            const qtyInput = document.getElementById(`qty_${itemIndex}`);
            const quantity = parseInt(qtyInput?.value) || 0;
            
            if (quantity > 0) {
                // Get item data from original scan
                const originalItem = originalScanData?.items?.[itemIndex];
                if (originalItem) {
                    const itemName = originalItem.item;
                    const itemPrice = originalItem.price || 0;
                    const itemImage = originalItem.photoUrl || '/src/Icons/default-food.png';
                    const priceString = `₱${itemPrice.toFixed(2)}`;
                    
                    // Add item to order with the specified quantity
                    for (let i = 0; i < quantity; i++) {
                        addItemToOrder(itemName, priceString, itemImage);
                    }
                    
                    addedCount += quantity;
                    totalAmount += (itemPrice * quantity);
                    addedItems.push(`${itemName} (${quantity}x)`);
                    
                    console.log(`✅ Added ${quantity}x ${itemName} to order`);
                }
            }
        });
        
        // Close processing modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('omrProcessingModal'));
        if (modal) modal.hide();
        
        // Update order summary
        updateOrderSummary();
        
        // Show success message
        if (addedCount > 0) {
            const message = `🛒 Successfully added ${addedCount} item(s) to order!\n📋 Items: ${addedItems.join(', ')}\n💰 Total Added: ₱${totalAmount.toFixed(2)}`;
            showToast(message, 'success');
            
            console.log('🔥 === OMR PROCESSING COMPLETE ===');
            console.log(`📊 Items Added: ${addedCount}`);
            console.log(`💰 Total Amount: ₱${totalAmount.toFixed(2)}`);
            console.log(`📋 Items: ${addedItems.join(', ')}`);
            console.log('🔥 ===========================');
        } else {
            showToast('⚠️ No items were added (zero quantities)', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error processing OMR items:', error);
        showToast('❌ Error processing OMR items', 'error');
    }
}

// View OMR scan details
async function viewOMRDetails(scanId) {
    try {
        console.log(`👁️ Viewing OMR scan details for ${scanId}...`);
        
        const db = firebase.firestore();
        const scanDoc = await db.collection('omr_scans').doc(scanId).get();
        
        if (!scanDoc.exists) {
            showToast('❌ OMR scan not found', 'error');
            return;
        }
        
        const scanData = scanDoc.data();
        
        // Create details modal
        const detailsHTML = `
            <div id="omrDetailsModal" class="modal fade" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🔍 OMR Scan Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>📋 Scan Information</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Scan ID:</strong></td><td>${scanData.scanId || scanId}</td></tr>
                                        <tr><td><strong>Timestamp:</strong></td><td>${new Date(scanData.timestamp).toLocaleString()}</td></tr>
                                        <tr><td><strong>Type:</strong></td><td>${scanData.scanType || 'OMR_FORM'}</td></tr>
                                        <tr><td><strong>Status:</strong></td><td><span class="badge bg-success">${scanData.status || 'completed'}</span></td></tr>
                                        <tr><td><strong>Total Items:</strong></td><td>${scanData.totalItems || 0}</td></tr>
                                        <tr><td><strong>Total Amount:</strong></td><td>₱${(scanData.totalAmount || 0).toFixed(2)}</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6>📊 Items Scanned</h6>
                                    <div style="max-height: 300px; overflow-y: auto;">
                                        ${scanData.items && scanData.items.length > 0 ? scanData.items.map((item, index) => `
                                            <div class="card mb-2">
                                                <div class="card-body p-2">
                                                    <div class="d-flex justify-content-between">
                                                        <div>
                                                            <strong>${item.item}</strong><br>
                                                            <small class="text-muted">Qty: ${item.quantity || 1}</small>
                                                        </div>
                                                        <div class="text-end">
                                                            <strong>₱${(item.price || 0).toFixed(2)}</strong><br>
                                                            <small class="text-muted">Total: ₱${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('') : '<p class="text-muted">No items found</p>'}
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6>🔧 Raw Data</h6>
                                    <textarea class="form-control" rows="8" readonly>${JSON.stringify(scanData, null, 2)}</textarea>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" onclick="loadOMRScan('${scanId}'); bootstrap.Modal.getInstance(document.getElementById('omrDetailsModal')).hide();">
                                📥 Load to POS
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing details modal if any
        const existingModal = document.getElementById('omrDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', detailsHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('omrDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('❌ Error viewing OMR details:', error);
        showToast('❌ Error viewing OMR details', 'error');
    }
}

// Initialize scan button functionality
function initializeScanButton() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', function() {
            console.log('🔍 Scan button clicked - Opening OMR scanner...');
            
            // Show loading state briefly
            const originalHTML = scanBtn.innerHTML;
            scanBtn.disabled = true;
            scanBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Opening...';
            
            // Open OMR scanner directly
            setTimeout(() => {
                openOMRScanner();
                resetScanButton();
            }, 500);
        });
    }
}

// Check if OMR server is running
async function checkOMRServerStatus() {
    try {
        const response = await fetch('http://127.0.0.1:5000/status', {
            method: 'GET',
            timeout: 2000
        });
        
        if (response.ok) {
            console.log('✅ OMR server is already running');
            return true;
        } else {
            console.log('⚠️ OMR server not responding properly');
            return false;
        }
    } catch (error) {
        console.log('⚠️ OMR server is not running:', error.message);
        return false;
    }
}

// Start OMR server automatically
// Note: startOMRServer function removed - replaced with user instruction modal
// Server auto-start is handled via showOMRStartInstructions() function

// Auto-start OMR server using launcher service
async function startOMRServerBatch() {
    try {
        console.log('🚀 Attempting to start OMR server via launcher service...');
        
        // First, check if launcher service is running
        try {
            const launcherResponse = await fetch('http://localhost:3001/status', {
                method: 'GET',
                timeout: 2000
            });
            
            if (launcherResponse.ok) {
                console.log('✅ Launcher service is running');
                
                // Start the OMR server via launcher
                const startResponse = await fetch('http://localhost:3001/start-omr', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                const result = await startResponse.json();
                
                if (result.success) {
                    console.log('✅ OMR server started via launcher:', result.message);
                    showToast('✅ OMR server started successfully!', 'success');
                    return true;
                } else {
                    console.error('❌ Failed to start OMR server:', result.message);
                    showToast('❌ Failed to start OMR server: ' + result.message, 'error');
                    return false;
                }
            }
        } catch (launcherError) {
            console.log('⚠️ Launcher service not available:', launcherError.message);
        }
        
        // Fallback: Try direct batch file execution
        console.log('🔄 Direct batch file execution...');
        
        // Method 1: Try to open/execute the batch file directly
        try {
            // Create a direct link to the batch file
            const link = document.createElement('a');
            link.href = './start_omr_server.bat';
            link.target = '_blank';
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Try to open the batch file (may trigger execution prompt)
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 1000);
            
            console.log('✅ Batch file open attempted - browser should prompt to run');
            showToast('🚀 Starting OMR server... Please allow the batch file to run', 'info');
            return true;
            
        } catch (openError) {
            console.log('⚠️ Direct open failed:', openError.message);
        }
        
        // Method 2: Try using file:// protocol for direct execution
        try {
            // Get the current page location to construct absolute path
            const currentUrl = new URL(window.location.href);
            const baseUrl = currentUrl.origin + currentUrl.pathname.substring(0, currentUrl.pathname.lastIndexOf('/'));
            const batchFileUrl = `${baseUrl}/start_omr_server.bat`;
            
            console.log('📁 Trying to execute batch file at:', batchFileUrl);
            
            // Create iframe to try to execute the batch file
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = batchFileUrl;
            document.body.appendChild(iframe);
            
            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 3000);
            
            console.log('✅ Batch file execution via iframe attempted');
            showToast('🚀 Attempting to run batch file... Server should start soon', 'info');
            return true;
            
        } catch (iframeError) {
            console.log('⚠️ Iframe execution failed:', iframeError.message);
        }
        
        // Method 3: Try downloading the batch file for manual execution
        // Method 3: Try downloading the batch file for manual execution
        try {
            const link = document.createElement('a');
            link.href = './start_omr_server.bat';
            link.download = 'start_omr_server.bat';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
            }, 1000);
            
            console.log('✅ Batch file downloaded for manual execution');
            showToast('📁 Batch file downloaded! Please run start_omr_server.bat', 'info');
            return true;
            
        } catch (downloadError) {
            console.log('⚠️ Download method failed:', downloadError.message);
        }
        
        // Method 2: Show manual instructions
        showToast('📋 Please manually run start_omr_server.bat from the project folder', 'warning');
        
        // Also try to open file explorer to the batch file location
        try {
            const currentPath = window.location.pathname;
            const projectPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            const batchUrl = window.location.origin + projectPath + '/start_omr_server.bat';
            
            // Try to navigate to the batch file (browser will show it)
            setTimeout(() => {
                window.open(batchUrl, '_blank');
            }, 1000);
        } catch (e) {
            console.log('Could not open batch file location:', e.message);
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Failed to start OMR server:', error);
        showToast('❌ Please manually start the OMR server', 'error');
        return false;
    }
}

// Start server process (requires additional setup)
async function startServerProcess() {
    // Browser security prevents direct process execution
    // Show user-friendly instructions instead
    
    const startInstructions = `
🚀 OMR Scanner Auto-Start Instructions:

Option 1 (Recommended):
📁 Double-click: start_omr_server.bat

Option 2 (Manual):
1. Open Command Prompt/PowerShell
2. Navigate to project folder
3. Run: python omr/omr_web_circle_scanner.py

Option 3 (Node.js):
1. Install Node.js (if not installed)
2. Run: node omr-autostart.js

The server will start at: http://127.0.0.1:5000
    `;
    
    console.log('📋 OMR Server start instructions:', startInstructions);
    
    // Show modal with instructions
    showOMRStartInstructions();
    
    return false; // Indicate manual start needed
}

// Show OMR start instructions modal
function showOMRStartInstructions() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('omrStartModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'omrStartModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">🚀 Start OMR Scanner Server</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <strong>📋 Quick Start:</strong> Double-click <code>start_omr_server.bat</code> in the project folder
                        </div>
                        
                        <h6>📂 Manual Options:</h6>
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title">Option 1: Batch File</h6>
                                <p class="card-text">Double-click: <code>start_omr_server.bat</code></p>
                            </div>
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title">Option 2: Command Line</h6>
                                <p class="card-text">
                                    1. Open Command Prompt<br>
                                    2. Navigate to project folder<br>
                                    3. Run: <code>python omr/omr_web_circle_scanner.py</code>
                                </p>
                            </div>
                        </div>
                        
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title">Option 3: Node.js</h6>
                                <p class="card-text">Run: <code>node omr-autostart.js</code></p>
                            </div>
                        </div>
                        
                        <div class="alert alert-success">
                            <strong>✅ Server Address:</strong> <a href="http://127.0.0.1:5000" target="_blank">http://127.0.0.1:5000</a>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="retryOMRConnection()">🔄 Try Again</button>
                        <button type="button" class="btn btn-success" onclick="openOMRDirect()">📋 Open Scanner</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Retry OMR connection
async function retryOMRConnection() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('omrStartModal'));
    
    try {
        const isRunning = await checkOMRServerStatus();
        
        if (isRunning) {
            modal.hide();
            showToast('✅ OMR server detected! Opening scanner...', 'success');
            openOMRScanner();
        } else {
            showToast('⚠️ OMR server still not running. Please start it manually.', 'warning');
        }
    } catch (error) {
        showToast('❌ Connection failed. Please check server status.', 'error');
    }
}

// Open OMR scanner directly (even if server might not be ready)
function openOMRDirect() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('omrStartModal'));
    modal.hide();
    
    // Try both local and server versions
    setTimeout(() => {
        openOMRScanner();
    }, 500);
}

// Open OMR scanner interface
function openOMRScanner() {
    console.log('📋 Opening OMR Scanner interface...');
    
    // Open the Python Flask OMR server directly
    const omrWindow = window.open('http://127.0.0.1:5000', 'omr_scanner', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (omrWindow) {
        showToast('📋 OMR Scanner opened in new window', 'success');
        
        // Focus the new window
        omrWindow.focus();
        
        // Set up message listener for results
        const messageHandler = (event) => {
            if (event.origin === 'http://127.0.0.1:5000' && event.data.type === 'OMR_SCAN_RESULT') {
                console.log('📨 Received OMR results from scanner:', event.data);
                processDirectOMRResults(event.data.results || event.data.data);
                showToast('📋 OMR scan results imported successfully!', 'success');
                
                // Remove the event listener
                window.removeEventListener('message', messageHandler);
            }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Cleanup listener after 10 minutes
        setTimeout(() => {
            window.removeEventListener('message', messageHandler);
        }, 600000);
        
    } else {
        // Fallback to local OMR page
        console.log('🔄 Falling back to local OMR page...');
        window.location.href = './omr.html';
    }
}

// Initialize listener for OMR scanner messages (popup integration)
function initializeOMRMessageListener() {
    window.addEventListener('message', function(event) {
        // Security: Check origin if needed
        // if (event.origin !== 'expected-origin') return;
        
        if (event.data && event.data.type === 'OMR_SCAN_RESULT') {
            console.log('📨 Received OMR results via postMessage:', event.data.results);
            
            // Process the results
            processDirectOMRResults(event.data.results);
            
            // Show notification
            showToast('📋 OMR scan results imported successfully!', 'success');
        }
    });
}

// Check for OMR scan results from session storage and Firebase
function checkForOMRResults() {
    console.log('🔍 POS: Checking for OMR scan results...');
    
    // First check for results from direct OMR scanner (session storage)
    const omrResults = sessionStorage.getItem('omr_scan_results');
    const omrTimestamp = sessionStorage.getItem('omr_scan_timestamp');
    
    console.log('📋 POS: OMR results in storage:', omrResults ? 'FOUND' : 'NOT FOUND');
    if (omrTimestamp) {
        console.log('📅 POS: OMR scan timestamp:', omrTimestamp);
    }
    
    if (omrResults) {
        try {
            const scanResults = JSON.parse(omrResults);
            console.log('📋 POS: Found Direct OMR scan results:', scanResults);
            
            // Clear the results from session storage
            sessionStorage.removeItem('omr_scan_results');
            sessionStorage.removeItem('omr_scan_timestamp');
            
            // Add a small delay to ensure DOM is ready
            setTimeout(() => {
                console.log('⏰ POS: Processing OMR results after delay...');
                processDirectOMRResults(scanResults);
            }, 500);
            
        } catch (error) {
            console.error('❌ POS: Error processing OMR results:', error);
            sessionStorage.removeItem('omr_scan_results');
            sessionStorage.removeItem('omr_scan_timestamp');
        }
    } else {
        console.log('ℹ️ POS: No OMR scan results found in session storage');
        // If no session storage results, check Firebase for latest OMR scan
        checkLatestOMRFromFirebase();
    }
}

// Check Firebase for latest OMR scan data
let firebaseCheckAttempts = 0;
const maxFirebaseCheckAttempts = 10;

async function checkLatestOMRFromFirebase() {
    try {
        console.log('🔥 POS: Checking Firebase for latest OMR scan...');
        
        // Wait for Firebase to be ready
        if (!window.isFirebaseReady || !window.isFirebaseReady()) {
            firebaseCheckAttempts++;
            
            if (firebaseCheckAttempts > maxFirebaseCheckAttempts) {
                console.error('❌ POS: Firebase initialization timeout after', maxFirebaseCheckAttempts, 'attempts');
                return;
            }
            
            console.log('⏳ POS: Waiting for Firebase to initialize... (attempt', firebaseCheckAttempts, '/', maxFirebaseCheckAttempts, ')');
            setTimeout(checkLatestOMRFromFirebase, 2000); // Increased delay to prevent rapid loops
            return;
        }
        
        // Reset counter on successful Firebase detection
        firebaseCheckAttempts = 0;

        const db = firebase.firestore();
        
        // Query for the latest OMR scan (ordered by timestamp, limit 1)
        const omrQuery = db.collection('omr_scans')
            .orderBy('timestamp', 'desc')
            .limit(1);
            
        const querySnapshot = await omrQuery.get();
        
        if (!querySnapshot.empty) {
            const latestScan = querySnapshot.docs[0];
            const scanData = latestScan.data();
            
            console.log('🔥 POS: Found latest OMR scan from Firebase:', scanData);
            console.log('📅 POS: Scan timestamp:', scanData.timestamp);
            console.log('📋 POS: Total items:', scanData.totalItems);
            
            // Check if this scan was taken recently (within last 5 minutes)
            const scanTime = new Date(scanData.timestamp);
            const now = new Date();
            const timeDiff = (now - scanTime) / 1000 / 60; // difference in minutes
            
            if (timeDiff <= 5) {
                console.log('✅ POS: Recent OMR scan found (within 5 minutes), processing...');
                
                // Convert Firebase OMR data to the format expected by processDirectOMRResults
                const formattedScanResults = {
                    success: true,
                    timestamp: scanData.timestamp,
                    scan_type: scanData.scanType || 'OMR_FORM',
                    results: {
                        shaded_selections: scanData.items || []
                    },
                    firebase_omr_id: latestScan.id
                };
                
                // Show notification that we're loading from Firebase
                showToast('🔥 Loading latest OMR scan from Firebase...', 'info');
                
                // Process the Firebase OMR results
                setTimeout(() => {
                    processDirectOMRResults(formattedScanResults);
                    showToast('✅ Latest OMR scan loaded from Firebase!', 'success');
                }, 500);
                
            } else {
                console.log(`ℹ️ POS: Latest OMR scan is ${timeDiff.toFixed(1)} minutes old, skipping auto-load`);
            }
            
        } else {
            console.log('ℹ️ POS: No OMR scans found in Firebase');
        }
        
    } catch (error) {
        console.error('❌ POS: Error checking Firebase for OMR scans:', error);
    }
}

// Reset scan button to original state
function resetScanButton() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<img src="/src/Icons/scan.png" alt="Scan" class="scan-icon">';
    }
}

// Process OMR file by sending to Python backend
async function processOMRFile(file) {
    try {
        console.log('🔍 Processing OMR file:', file.name);
        showToast('📷 Connecting to Python OMR Scanner...', 'info');
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('📤 Sending file to Python scanner at http://localhost:5000/upload');
        showToast('🐍 Running Python OMR detection...', 'info');
        
        // Send to OMR scanner backend
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });
        
        console.log('📥 Response received from Python:', response.status);
        
        if (!response.ok) {
            throw new Error(`Python scanner error! HTTP status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Python OMR scan completed:', result);
        
        if (result.success && result.results) {
            showToast('🎯 Python scan successful! Processing results...', 'success');
            processOMRResults(result.results);
        } else {
            showToast('⚠️ Python scan completed but no items detected', 'warning');
            console.log('No results from Python scanner:', result);
        }
        
    } catch (error) {
        console.error('❌ Python OMR processing error:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('🔌 Cannot connect to Python scanner. Please ensure the OMR server is running on port 5000', 'error');
        } else {
            showToast('❌ Python OMR processing failed: ' + error.message, 'error');
        }
    }
}

// Process OMR scan results and add to order
function processOMRResults(scanResults) {
    if (!scanResults || !scanResults.shaded_selections) {
        showToast('No items selected in OMR scan', 'warning');
        return;
    }
    
    console.log('Processing OMR results:', scanResults);
    
    // Add each selected item to the order
    scanResults.shaded_selections.forEach(selection => {
        const itemName = selection.item;
        
        // Find the menu item in our data
        const menuItem = findMenuItemByName(itemName);
        if (menuItem) {
            // Add to order with quantity 1
            addToOrder(menuItem, 1);
            console.log(`Added ${itemName} to order`);
        } else {
            console.warn(`Menu item not found: ${itemName}`);
        }
    });
    
    // Show success message
    const itemCount = scanResults.shaded_selections.length;
    showToast(`Successfully added ${itemCount} item(s) from OMR scan!`, 'success');
}

// Process Direct OMR scan results and add to order
function processDirectOMRResults(scanResults) {
    console.log('📋 Processing OMR scan results:', scanResults);
    console.log('🏪 Available menu items in POS:', Object.keys(menuItemsData));
    
    // Show processing message
    showToast('📋 Processing OMR scan results...', 'info');
    
    // Handle different data structures
    let selections = [];
    
    if (scanResults.results && scanResults.results.shaded_selections) {
        selections = scanResults.results.shaded_selections;
    } else if (scanResults.shaded_selections) {
        selections = scanResults.shaded_selections;
    } else {
        showToast('No items selected in OMR scan', 'warning');
        return;
    }

    if (selections.length === 0) {
        showToast('No shaded circles detected in OMR form', 'warning');
        return;
    }
    
    let addedCount = 0;
    let notFoundItems = [];
    let mappedItems = [];
    
    // Add each selected item to the order
    selections.forEach(selection => {
        const itemName = selection.item;
        const quantity = selection.quantity || 1;
        const fillPercent = selection.fill_percent || 100;
        const mappedFrom = selection.mapped_from || null;
        const isUnmapped = selection.unmapped || false;
        
        console.log(`🔍 Processing OMR item: "${itemName}" (Qty: ${quantity}, Fill: ${fillPercent}%)`);
        if (mappedFrom) {
            console.log(`🔄 Originally mapped from: "${mappedFrom}"`);
        }
        
        // If the item already has Firebase data from OMR scanner
        if (selection.firebase_id && selection.price) {
            console.log(`🔥 Using Firebase data from OMR: ${itemName} (₱${selection.price})`);
            
            const itemPrice = `₱${selection.price.toFixed(2)}`;
            const itemImage = selection.photoUrl || '/src/Icons/default-food.png';
            
            // Add item to order with specified quantity
            for (let i = 0; i < quantity; i++) {
                addItemToOrder(itemName, itemPrice, itemImage);
            }
            
            addedCount += quantity;
            totalAmount += (selection.price * quantity);
            mappedItems.push(`${itemName} (${quantity}x)`);
        } else {
            // Find the menu item in local POS data as fallback
            const menuItem = findMenuItemByName(itemName);
            if (menuItem) {
                const itemPrice = `₱${menuItem.price.toFixed(2)}`;
                const itemImage = menuItem.photoUrl || '/src/Icons/default-food.png';
                
                // Add item to order with specified quantity
                for (let i = 0; i < quantity; i++) {
                    addItemToOrder(menuItem.name, itemPrice, itemImage);
                }
                
                console.log(`✅ Added "${itemName}" -> "${menuItem.name}" (${quantity}x) to order (${fillPercent}% filled)`);
                addedCount += quantity;
                totalAmount += (menuItem.price * quantity);
                mappedItems.push(`${menuItem.name} (${quantity}x)`);
            } else {
                console.warn(`⚠️ Menu item not found for OMR item: "${itemName}"`);
                notFoundItems.push(itemName + (mappedFrom ? ` (from ${mappedFrom})` : ''));
            }
        }
    });
    
    // Show comprehensive success/warning message
    let message;
    let toastType = 'success';
    
    if (addedCount > 0) {
        if (isFromFirebase) {
            message = `🔥 Successfully loaded ${addedCount} item(s) from Firebase OMR scan!`;
            message += `\n📅 Scan time: ${new Date(scanTimestamp).toLocaleString()}`;
            message += `\n💰 Total: ₱${totalAmount.toFixed(2)}`;
        } else {
            message = `✅ Successfully added ${addedCount} item(s) from OMR scan!`;
        }
        
        if (mappedItems.length > 0) {
            message += `\n📋 Items: ${mappedItems.join(', ')}`;
        }
        if (notFoundItems.length > 0) {
            message += `\n⚠️ ${notFoundItems.length} items not found: ${notFoundItems.join(', ')}`;
            toastType = 'warning';
        }
    } else {
        message = `❌ No items could be added. Items not found in menu: ${notFoundItems.join(', ')}`;
        toastType = 'error';
    }
    
    showToast(message, toastType);
    
    // Enhanced logging for Firebase integration
    if (isFromFirebase) {
        console.log('🔥 === FIREBASE OMR INTEGRATION SUMMARY ===');
        console.log(`📅 Scan Time: ${new Date(scanTimestamp).toLocaleString()}`);
        console.log(`🆔 Firebase ID: ${scanResults.firebase_omr_id}`);
        console.log(`📊 Total Items: ${addedCount}`);
        console.log(`💰 Total Amount: ₱${totalAmount.toFixed(2)}`);
        console.log(`✅ Successfully Mapped: ${mappedItems.length}`);
        console.log(`❌ Not Found: ${notFoundItems.length}`);
        if (notFoundItems.length > 0) {
            console.log(`📋 Missing Items: ${notFoundItems.join(', ')}`);
        }
        console.log('🔥 ========================================');
    } else {
        console.log(`📊 OMR Processing Summary: Added ${addedCount}, Not Found ${notFoundItems.length}`);
    }
    
    // Update the order summary
    updateOrderSummary();
    
    // Clear the session storage after processing
    sessionStorage.removeItem('omr_scan_results');
    sessionStorage.removeItem('omr_scan_timestamp');
}

// Helper function to find menu item by name
function findMenuItemByName(itemName) {
    console.log(`🔍 Looking for menu item: "${itemName}"`);
    console.log('📋 Available menu items:', Object.keys(menuItemsData));
    
    // First try exact match (case insensitive)
    for (const menuItemName in menuItemsData) {
        if (menuItemName.toLowerCase() === itemName.toLowerCase()) {
            console.log(`✅ Found exact match: ${menuItemName}`);
            return menuItemsData[menuItemName];
        }
    }
    
    // Then try partial matching (item name contains search term or vice versa)
    for (const menuItemName in menuItemsData) {
        if (menuItemName.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(menuItemName.toLowerCase())) {
            console.log(`✅ Found partial match: ${menuItemName} for search "${itemName}"`);
            return menuItemsData[menuItemName];
        }
    }
    
    // If not found by name matching, try common OMR form mappings
    const omrMappings = {
        // Actual OMR menu items from Python scanner
        'isda': 'Fish',
        'water': 'Water',
        'sinigang': 'Sinigang',
        'chicken': 'Chicken',
        'pusit': 'Squid', 
        'egg': 'Egg',
        'milk': 'Milk',
        'beef': 'Beef',
        
        // Generic mappings for compatibility
        'burger': 'Burger',
        'pizza': 'Pizza', 
        'pasta': 'Pasta',
        'rice': 'Rice Bowl',
        'drink': 'Soft Drink',
        'coffee': 'Coffee',
        'sandwich': 'Sandwich',
        'salad': 'Caesar Salad',
        'fries': 'French Fries',
        
        // Numbered menu items
        'menu item 1': 'isda',
        'menu item 2': 'Water',
        'menu item 3': 'Sinigang',
        'menu item 4': 'Chicken',
        'menu item 5': 'pusit',
        'menu item 6': 'egg',
        'menu item 7': 'milk',
        'menu item 8': 'beef',
        'item 1': 'isda',
        'item 2': 'Water',
        'item 3': 'Sinigang',
        'item 4': 'Chicken',
        'item 5': 'pusit',
        'item 6': 'egg',
        'item 7': 'milk',
        'item 8': 'beef',
        'item_1': 'isda',
        'item_2': 'Water',
        'item_3': 'Sinigang',
        'item_4': 'Chicken',
        'item_5': 'pusit',
        'item_6': 'egg',
        'item_7': 'milk',
        'item_8': 'beef'
    };
    
    const mappedName = omrMappings[itemName.toLowerCase()];
    if (mappedName) {
        console.log(`🔄 Using mapping: "${itemName}" -> "${mappedName}"`);
        return findMenuItemByName(mappedName);
    }
    
    console.log(`❌ Menu item not found: "${itemName}"`);
    return null;
}

    // Initializes order type dropdown and input visibility
    function initializeOrderTypeState() {
    const orderTypeSpan = document.querySelector('.order-type span');
    const tableInput = document.querySelector('.table-number');
    const paxInput = document.querySelector('.pax-number');
    
    if (orderTypeSpan && tableInput && paxInput) {
        const currentType = orderTypeSpan.textContent || 'Dine in';
        
        if (currentType === 'Dine in') {
            // Show table and pax inputs for dine in
            tableInput.style.display = 'block';
            paxInput.style.display = 'block';
        } else if (currentType === 'Take out') {
            // Hide table and pax inputs for take out
            tableInput.style.display = 'none';
            paxInput.style.display = 'none';
        }
    }
}

// Quantity control functions
// Increases the quantity of an order item
function increaseQuantity(button) {
window.increaseQuantity = increaseQuantity;
    try {
        const orderItem = button.closest('.order-item');
        const quantitySpan = button.parentElement.querySelector('.quantity');
        if (!quantitySpan) return;
        
        // Get item number element to keep it in sync
        const itemNumberElement = orderItem.querySelector('.item-number');
        
        const unitPrice = parseFloat(orderItem.getAttribute('data-unit-price'));
        let currentQty = parseInt(quantitySpan.textContent) || 0;
        
        // Set a reasonable maximum quantity limit
        if (currentQty >= 99) {
            button.style.background = '#ff6b6b';
            setTimeout(() => {
                button.style.background = '';
            }, 300);
            return;
        }
        
        // Increase quantity
        currentQty += 1;
        
        // Update all quantity displays
        quantitySpan.textContent = currentQty;
        if (itemNumberElement) {
            itemNumberElement.textContent = currentQty;
        }
        
        // Calculate new line total
        const lineTotal = unitPrice * currentQty;
        
        // Update item price display
        const itemPriceElement = orderItem.querySelector('.item-price');
        if (itemPriceElement) {
            itemPriceElement.textContent = `₱${lineTotal.toFixed(2)}`;
        }
        
        // Animation feedback
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
    // Always update summary after quantity change
    updateOrderSummary();
    } catch (error) {
        console.error('Error increasing quantity:', error);
    }
}

// Decreases the quantity of an order item or removes it
function decreaseQuantity(button) {
window.decreaseQuantity = decreaseQuantity;
    try {
        const orderItem = button.closest('.order-item');
        const quantitySpan = button.parentElement.querySelector('.quantity');
        if (!quantitySpan) return;
        
        // Get item number element to keep it in sync
        const itemNumberElement = orderItem.querySelector('.item-number');
        
        const unitPrice = parseFloat(orderItem.getAttribute('data-unit-price'));
        let currentQty = parseInt(quantitySpan.textContent) || 0;
        
        // Animation feedback
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        if (currentQty > 1) {
            // Decrease quantity
            currentQty -= 1;
            // Update all quantity displays
            quantitySpan.textContent = currentQty;
            if (itemNumberElement) {
                itemNumberElement.textContent = currentQty;
            }
            // Calculate new line total
            const lineTotal = unitPrice * currentQty;
            // Update item price display
            const itemPriceElement = orderItem.querySelector('.item-price');
            if (itemPriceElement) {
                itemPriceElement.textContent = `₱${lineTotal.toFixed(2)}`;
            }
            updateOrderSummary();
        } else {
            // Remove item immediately (no animation for speed)
            orderItem.remove();
            updateOrderSummary();
        }
    } catch (error) {
        console.error('Error decreasing quantity:', error);
    }
}

const navLinks = document.querySelectorAll('#categoryNav .nav-link:not(.more-categories)');
const moreBtn = document.querySelector('.more-categories');

let currentIndex = 0;
const itemsPerPage = 8; // number of categories shown at a time

function showPage() {
  navLinks.forEach((btn, i) => {
    if (i >= currentIndex && i < currentIndex + itemsPerPage) {
      btn.style.display = "inline-block";
    } else {
      btn.style.display = "none";
    }
  });
}

// initial render
showPage();

moreBtn.addEventListener('click', () => {
  currentIndex += itemsPerPage;
  if (currentIndex >= navLinks.length) {
    currentIndex = 0; // loop back to start
  }
  showPage();
});
// --- ADD 'ALL' CATEGORY TAB IF NOT PRESENT ---
const categoryNav = document.getElementById('categoryNav');
if (categoryNav && !categoryNav.querySelector('[data-category="all"]')) {
    const allBtn = document.createElement('button');
    allBtn.className = 'nav-link';
    allBtn.setAttribute('data-category', 'all');
    allBtn.textContent = 'All';
    categoryNav.insertBefore(allBtn, categoryNav.firstChild);
}
// Re-select navLinks to include 'All'
const navLinksAll = document.querySelectorAll('#categoryNav .nav-link:not(.more-categories)');
// --- CATEGORY FILTER FUNCTIONALITY ---
navLinksAll.forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from all buttons
        navLinksAll.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Get selected category
        const selectedCategory = btn.getAttribute('data-category');
        filterMenuGridByCategory(selectedCategory);
    });
});

function filterMenuGridByCategory(category) {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    const cards = menuGrid.querySelectorAll('.menu-item-card');
    const selected = category.toLowerCase();
    let found = false;
    if (selected === 'all') {
        // Sort cards by category
        const sortedCards = Array.from(cards).sort((a, b) => {
            const catA = (a.getAttribute('data-category') || '').toLowerCase();
            const catB = (b.getAttribute('data-category') || '').toLowerCase();
            if (catA < catB) return -1;
            if (catA > catB) return 1;
            return 0;
        });
        sortedCards.forEach(card => {
            card.style.display = '';
            menuGrid.appendChild(card);
            found = true;
        });
    } else {
        cards.forEach(card => {
            const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
            if (cardCategory === selected) {
                card.style.display = '';
                found = true;
            } else {
                card.style.display = 'none';
            }
        });
    }
    // If no items found, show a message
    let noItemsMsg = menuGrid.querySelector('.no-items-msg');
    if (!found) {
        if (!noItemsMsg) {
            noItemsMsg = document.createElement('div');
            noItemsMsg.className = 'no-items-msg text-center text-muted d-flex justify-content-center align-items-center';
            noItemsMsg.style.height = '250px';
            noItemsMsg.style.fontSize = '1.5rem';
            noItemsMsg.textContent = 'No Items Registered';
            menuGrid.appendChild(noItemsMsg);
        }
    } else {
        if (noItemsMsg) noItemsMsg.remove();
    }
}

