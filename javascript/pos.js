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
    const discountIdInput = document.getElementById('discount-id-input');
    if (discountIdInput) {
        discountIdInput.value = '';
        discountIdInput.style.display = 'none';
    }
    const discountInputContainer = document.querySelector('.discount-input');
    if (discountInputContainer) discountInputContainer.style.display = 'none';
    const customDiscountInputRow = document.getElementById('customDiscountInputRow');
    if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
    const customDiscountInput = document.getElementById('customDiscountInput');
    if (customDiscountInput) customDiscountInput.value = '';
    const discountDropdown = document.querySelector('.discount-dropdown');
    if (discountDropdown) discountDropdown.value = 'none';
    sessionStorage.removeItem('activeOrderDiscount');
    sessionStorage.removeItem('posOrder'); // Clear posOrder to reset discount state
    window.activeDiscountID = '';
}
// Global variables accessible throughout the file
// --- POS ACTIVE ORDER RESET/RESTORE LOGIC ---
// On page load, clear session if not proceeding to payment
window.addEventListener('load', function () {
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

        // Check if we're restoring a pending order from Orders page
        const shouldRestoreOrder = sessionStorage.getItem('shouldRestoreOrder') === 'true';
        const pendingOrderData = sessionStorage.getItem('pendingOrder');
        const editingOrderData = sessionStorage.getItem('editingOrder');

        // Only clear session storage if we're NOT restoring a pending order
        if (!shouldRestoreOrder || (!pendingOrderData && !editingOrderData)) {
            // Clear any leftover session storage that might interfere with new orders
            sessionStorage.removeItem('editingOrder');
            sessionStorage.removeItem('originalOrderId');
            sessionStorage.removeItem('isEditMode');

            // FORCE CLEAR all order-related flags to ensure fresh start
            sessionStorage.removeItem('shouldRestoreOrder');
            sessionStorage.removeItem('pendingOrder');
            sessionStorage.removeItem('hasProceeded');
            sessionStorage.removeItem('forceNewOrder');
        }

        // FORCE CLEAR pending order ID to ensure fresh Order ID generation
        // Only keep it if we're explicitly continuing an existing order
        const isExplicitlyContinuing = sessionStorage.getItem('isEditMode') === 'true' ||
            sessionStorage.getItem('editingOrder') !== null;

        if (!isExplicitlyContinuing) {
            sessionStorage.removeItem('pendingOrderId');
            sessionStorage.removeItem('savedPendingOrderId');
            console.log('🔄 Cleared pending order ID for fresh start');
        }

        // ALWAYS generate new Order ID unless explicitly continuing an existing order
        // Check if we're explicitly continuing an existing order
        const isContinuingOrder = sessionStorage.getItem('shouldRestoreOrder') === 'true' ||
            sessionStorage.getItem('isEditMode') === 'true' ||
            sessionStorage.getItem('editingOrder') !== null;

        let nextOrderId = sessionStorage.getItem('pendingOrderId');

        // Check if user explicitly wants to start a new order
        const forceNewOrder = sessionStorage.getItem('forceNewOrder') === 'true';

        // Generate new Order ID unless explicitly continuing an existing order
        if (!isContinuingOrder || !nextOrderId || forceNewOrder) {
            // Generate new order ID for new orders
            nextOrderId = generateProgressiveOrderId();
            sessionStorage.setItem('pendingOrderId', nextOrderId);
            sessionStorage.removeItem('forceNewOrder'); // Clear the flag
            console.log('🆕 Starting new order with ID:', nextOrderId);
            console.log('🆕 Session flags:', {
                shouldRestoreOrder: sessionStorage.getItem('shouldRestoreOrder'),
                isEditMode: sessionStorage.getItem('isEditMode'),
                editingOrder: sessionStorage.getItem('editingOrder'),
                pendingOrder: sessionStorage.getItem('pendingOrder'),
                hasProceeded: sessionStorage.getItem('hasProceeded'),
                forceNewOrder: forceNewOrder,
                isContinuingOrder: isContinuingOrder
            });
        } else {
            console.log('🔄 Continuing existing pending order:', nextOrderId);
            console.log('🔄 Session flags:', {
                shouldRestoreOrder: sessionStorage.getItem('shouldRestoreOrder'),
                isEditMode: sessionStorage.getItem('isEditMode'),
                editingOrder: sessionStorage.getItem('editingOrder'),
                pendingOrder: sessionStorage.getItem('pendingOrder'),
                hasProceeded: sessionStorage.getItem('hasProceeded'),
                forceNewOrder: forceNewOrder,
                isContinuingOrder: isContinuingOrder
            });
        }

        // Initialize order number
        // Assign a new unique order number for every new order, but only finalize on payment
        let currentOrderNumber = null;
        let currentOrderNumberFormatted = null;
        // Helper to generate progressive order ID (4 digits, then 5 digits)
        function generateProgressiveOrderId() {
            // Get used order IDs from localStorage
            const usedIds = JSON.parse(localStorage.getItem('usedOrderIds') || '[]');

            // Check if we need to switch to 5 digits (when 4-digit range is 90% full)
            const fourDigitMax = 9999;
            const fourDigitUsed = usedIds.filter(id => id.length === 4 && parseInt(id) <= fourDigitMax).length;
            const fourDigitCapacity = 9000; // 1000-9999
            const shouldUseFiveDigits = fourDigitUsed >= (fourDigitCapacity * 0.9);

            // Debug logging
            console.log(`Order ID Status: 4-digit used: ${fourDigitUsed}/${fourDigitCapacity}, Using 5-digit: ${shouldUseFiveDigits}`);

            let newId;
            let attempts = 0;
            const maxAttempts = 100;

            do {
                if (shouldUseFiveDigits) {
                    // Generate 5-digit number (10000-99999)
                    newId = (Math.floor(Math.random() * 90000) + 10000).toString();
                } else {
                    // Generate 4-digit number (1000-9999)
                    newId = (Math.floor(Math.random() * 9000) + 1000).toString();
                }
                attempts++;
            } while (usedIds.includes(newId) && attempts < maxAttempts);

            // If we couldn't find a unique ID after max attempts, use timestamp fallback
            if (attempts >= maxAttempts) {
                newId = 'T' + Date.now();
                console.warn('Could not generate unique ID after max attempts, using timestamp fallback');
            }

            // Add the new ID to used IDs and save to localStorage
            usedIds.push(newId);
            localStorage.setItem('usedOrderIds', JSON.stringify(usedIds));

            console.log(`Generated Order ID: ${newId} (${newId.length} digits, attempt ${attempts})`);
            return newId;
        }

        // Helper function to get order ID statistics
        function getOrderIdStats() {
            const usedIds = JSON.parse(localStorage.getItem('usedOrderIds') || '[]');
            const fourDigitUsed = usedIds.filter(id => id.length === 4 && parseInt(id) <= 9999).length;
            const fiveDigitUsed = usedIds.filter(id => id.length === 5 && parseInt(id) >= 10000 && parseInt(id) <= 99999).length;
            const totalUsed = usedIds.length;

            return {
                fourDigitUsed,
                fiveDigitUsed,
                totalUsed,
                fourDigitCapacity: 9000,
                fiveDigitCapacity: 90000
            };
        }

        // Make functions globally accessible for debugging
        window.getOrderIdStats = getOrderIdStats;
        window.generateProgressiveOrderId = generateProgressiveOrderId;

        // Add a function to reset order ID tracking (for testing)
        window.resetOrderIdTracking = function () {
            localStorage.removeItem('usedOrderIds');
            console.log('Order ID tracking reset');
        };

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
                pendingOrderId = generateProgressiveOrderId();
                sessionStorage.setItem('pendingOrderId', pendingOrderId);
            }
            currentOrderNumber = pendingOrderId;
            currentOrderNumberFormatted = String(pendingOrderId);
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
            pendingOrderId = generateProgressiveOrderId();
            sessionStorage.setItem('pendingOrderId', pendingOrderId);
        }
        currentOrderNumber = pendingOrderId;
        currentOrderNumberFormatted = String(pendingOrderId);
        if (orderNumberElement) {
            orderNumberElement.textContent = `Order No. ${currentOrderNumberFormatted}`;
        }

        // Load menu items
        const menuGrid = document.querySelector('.menu-items-grid');

        // Category filtering functions
        function setupCategoryFiltering(items) {
            const categoryButtons = document.querySelectorAll('#categoryNav .nav-link[data-category]');

            categoryButtons.forEach(button => {
                button.addEventListener('click', function () {
                    // Remove active class from all buttons
                    categoryButtons.forEach(btn => btn.classList.remove('active'));

                    // Add active class to clicked button
                    this.classList.add('active');

                    // Get the selected category
                    const selectedCategory = this.getAttribute('data-category');

                    // Get current search term
                    const searchInput = document.querySelector('.search-input');
                    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

                    // Filter and render items
                    const filteredItems = filterItemsByCategoryAndSearch(items, selectedCategory, searchTerm);
                    renderMenuCards(filteredItems);

                    console.log(`Filtered by category: ${selectedCategory}, showing ${filteredItems.length} items`);
                });
            });
        }

        function filterItemsByCategoryAndSearch(items, category, searchTerm) {
            let filteredItems = items;

            // Filter by category
            if (category && category !== 'all') {
                filteredItems = filteredItems.filter(item => {
                    const itemCategory = (item.category || '').toLowerCase();
                    return itemCategory === category.toLowerCase();
                });
            }

            // Filter by search term
            if (searchTerm) {
                filteredItems = filteredItems.filter(item => {
                    const itemName = (item.name || '').toLowerCase();
                    const itemDescription = (item.description || '').toLowerCase();
                    return itemName.includes(searchTerm) || itemDescription.includes(searchTerm);
                });
            }

            return filteredItems;
        }

        function updateCategoryButtons(items) {
            // Get unique categories from items
            const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

            // Get the category navigation container
            const categoryNav = document.querySelector('#categoryNav');
            if (!categoryNav) return;

            // Keep the "All" button and "More" button
            const allButton = categoryNav.querySelector('[data-category="all"]');
            const moreButton = categoryNav.querySelector('.more-categories');

            // Clear existing category buttons (except "All" and "More")
            const existingCategoryButtons = categoryNav.querySelectorAll('.nav-link[data-category]:not([data-category="all"])');
            existingCategoryButtons.forEach(btn => btn.remove());

            // Add category buttons for available categories
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'nav-link';
                button.setAttribute('data-category', category.toLowerCase());
                button.textContent = category;

                // Insert before the "More" button
                if (moreButton) {
                    categoryNav.insertBefore(button, moreButton);
                } else {
                    categoryNav.appendChild(button);
                }
            });

            // Re-setup category filtering with updated buttons
            setupCategoryFiltering(items);

            console.log(`Updated category buttons for ${categories.length} categories:`, categories);
        }

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

                // Store all items globally for filtering
                window.allMenuItems = items;

                renderMenuCards(items);

                // Enable search functionality
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.addEventListener('input', function () {
                        const searchTerm = this.value.trim().toLowerCase();
                        const currentCategory = document.querySelector('.nav-link.active')?.getAttribute('data-category') || 'all';
                        const filteredItems = filterItemsByCategoryAndSearch(items, currentCategory, searchTerm);
                        renderMenuCards(filteredItems);
                    });
                }

                // Enable category filtering
                setupCategoryFiltering(items);

                // Update category buttons based on available categories
                updateCategoryButtons(items);

                console.log(`Loaded ${items.length} menu items successfully`);

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

            // Show message if no items found
            if (items.length === 0) {
                menuGrid.innerHTML = `
                <div class="alert alert-info text-center p-4">
                    <h5>No items found</h5>
                    <p>No menu items match the current filter.</p>
                    <button class="btn btn-primary" onclick="document.querySelector('[data-category=\\'all\\']').click()">Show All Items</button>
                </div>
            `;
                return;
            }

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
                card.addEventListener('click', async function () {
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
                const unitPrice = parseFloat(String(price).replace('₱', '').replace(',', ''));

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
                        minusBtn.addEventListener('click', function () {
                            window.decreaseQuantity(this);
                            window.updateOrderSummary();
                        });
                        plusBtn.addEventListener('click', function () {
                            window.increaseQuantity(this);
                            window.updateOrderSummary();
                        });
                    }

                    // Attach remove button event
                    const removeBtn = orderItem.querySelector('.btn-remove-item');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function () {
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
                discountDropdown.addEventListener('change', function () {
                    window.updateOrderSummary();
                });
                discountDropdown.hasListener = true;
            }
        }
        // Attach listener on DOMContentLoaded
        window.addEventListener('DOMContentLoaded', function () {
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

            // Calculate tax as fixed amount (₱5.00)
            const tax = 5.00;
            let discountPercent = 0;
            let discount = 0;
            let discountType = 'none';
            let discountID = '';
            const discountDropdown = document.querySelector('.discount-dropdown');
            const customDiscountInputRow = document.getElementById('customDiscountInputRow');
            const customDiscountInput = document.getElementById('customDiscountInput');
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
                } else if (discountDropdown.value === 'pwd' || discountDropdown.value === 'senior') {
                    discountType = discountDropdown.value;
                    discountPercent = 20;
                    discount = subtotal * 0.20;
                    if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
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
                            customDiscountInput.oninput = function () { updateOrderSummary(); };
                        }
                    }
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
            if (totalEl) {
                totalEl.textContent = `₱${total.toFixed(2)}`;
                console.log('Updated total display to:', totalEl.textContent);
            }
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
            proceedBtn.addEventListener('click', async function () {
                await saveOrder();
            });
        }

        async function saveOrder() {
            // CRITICAL: For "Pending Payment" orders, we MUST reuse the same Order ID and Firestore document
            // This prevents creating new documents and maintains consistency across all pages

            let pendingOrderId = null;

            // Check if we're editing an existing pending order
            try {
                const existingPosOrder = JSON.parse(sessionStorage.getItem('posOrder') || 'null');
                if (existingPosOrder && existingPosOrder.status === 'Pending Payment' &&
                    (existingPosOrder.orderNumberFormatted || existingPosOrder.orderNumber)) {
                    pendingOrderId = String(existingPosOrder.orderNumberFormatted || existingPosOrder.orderNumber);
                    console.log('🔄 Resuming existing pending order:', pendingOrderId);
                }
            } catch (e) {
                console.log('No existing posOrder found, creating new order');
            }

            // If no existing pending order, check for saved pending ID from previous sessions
            if (!pendingOrderId) {
                pendingOrderId = sessionStorage.getItem('savedPendingOrderId') || sessionStorage.getItem('pendingOrderId');
                if (pendingOrderId) {
                    // Verify this order exists and is still pending
                    try {
                        const db = firebase.firestore();
                        const existingDoc = await db.collection('orders').doc(String(pendingOrderId)).get();
                        if (existingDoc.exists && existingDoc.data().status === 'Pending Payment') {
                            console.log('🔄 Resuming existing pending order:', pendingOrderId);
                        } else {
                            // Order exists but is not pending, generate new ID
                            pendingOrderId = null;
                        }
                    } catch (error) {
                        console.log('Error checking existing order, will create new:', error);
                        pendingOrderId = null;
                    }
                }
            }

            // Generate new Order ID only if no existing pending order
            if (!pendingOrderId) {
                pendingOrderId = generateProgressiveOrderId();
                console.log('🆕 Creating new order:', pendingOrderId);
            }

            // Ensure it's stored for this session so other pages can reuse it
            sessionStorage.setItem('pendingOrderId', String(pendingOrderId));
            sessionStorage.setItem('savedPendingOrderId', String(pendingOrderId));
            sessionStorage.setItem('hasProceeded', 'true');
            const orderItemsContainer = document.querySelector('.order-items');
            const orderItems = orderItemsContainer ? Array.from(orderItemsContainer.children).filter(el => el.classList.contains('order-item') && el.offsetParent !== null) : [];
            if (!orderItems || orderItems.length === 0) {
                alert('Please add items from the menu first.');
                return;
            }
            // Build orderData from DOM
            const orderTypeEl = document.querySelector('.order-type span');
            const tableNumberInput = document.querySelector('.table-number input');
            const paxNumberInput = document.querySelector('.pax-number input');
            const orderType = orderTypeEl ? orderTypeEl.textContent.trim() : '';
            const tableNumberValue = tableNumberInput ? tableNumberInput.value.trim() : '';
            const paxValue = paxNumberInput ? paxNumberInput.value.trim() : '';
            // Defensive validation
            if (orderType === 'Dine in' && (!tableNumberValue || !paxValue)) {
                alert('Please enter both Table Number and Pax before proceeding.');
                return;
            }
            const items = orderItems.map(item => {
                const quantity = parseInt(item.querySelector('.quantity').textContent);
                const unitPrice = parseFloat(item.getAttribute('data-unit-price'));
                const price = unitPrice; // for compatibility
                const total = parseFloat(item.querySelector('.item-price').textContent.replace('₱', '').replace(',', ''));
                return {
                    name: item.getAttribute('data-item-name'),
                    quantity,
                    unitPrice,
                    price,
                    total
                };
            });
            if (!items.length) {
                alert('Order must have at least one item.');
                return;
            }
            // Ensure order summary is up to date before reading values
            updateOrderSummary();

            // Numeric fields
            const subtotal = parseFloat(document.querySelector('.summary-subtotal').textContent.replace('₱', ''));
            const tax = parseFloat(document.querySelector('.summary-tax').textContent.replace('₱', ''));

            // Get discount from posOrder object instead of sessionStorage
            let discount = 0;
            try {
                const posOrder = JSON.parse(sessionStorage.getItem('posOrder')) || {};
                discount = posOrder.discountAmount || 0;
            } catch (e) {
                console.log('Error getting discount from posOrder:', e.message);
            }

            const total = parseFloat(document.querySelector('.summary-total').textContent.replace('₱', ''));
            const orderNumberFormatted = String(currentOrderNumber);
            const status = 'Pending Payment';
            const createdAt = new Date().toISOString();
            // Get discount details from posOrder for persistence
            let discountDetails = {};
            try {
                const posOrder = JSON.parse(sessionStorage.getItem('posOrder')) || {};
                discountDetails = {
                    discountType: posOrder.discountType || 'None',
                    discountPercent: posOrder.discountPercent || 0,
                    discountAmount: posOrder.discountAmount || 0,
                    discountID: posOrder.discountID || '',
                    discountName: posOrder.discountName || ''
                };
            } catch (e) {
                console.log('Error getting discount details:', e.message);
            }

            const orderData = {
                orderId: orderNumberFormatted,
                orderNumber: orderNumberFormatted,
                orderNumberFormatted: orderNumberFormatted,
                orderType,
                tableNumber: tableNumberValue,
                pax: paxValue,
                items,
                subtotal,
                tax,
                discount,
                total,
                status,
                createdAt,
                timestamp: (window.firebase && window.firebase.firestore) ? window.firebase.firestore.FieldValue.serverTimestamp() : null,
                // Include discount details for restoration
                discountType: discountDetails.discountType,
                discountPercent: discountDetails.discountPercent,
                discountAmount: discountDetails.discountAmount,
                discountID: discountDetails.discountID,
                discountName: discountDetails.discountName
            };

            // Debug logging
            console.log('Saving order with values:', { subtotal, tax, discount, total });
            try {
                const db = firebase.firestore();
                const orderRef = db.collection('orders').doc(String(pendingOrderId));

                // CRITICAL: Use the same Firestore document reference for all "Pending Payment" orders
                // This ensures Payment, Kitchen, and Orders pages all reference the same document

                // Always check if document exists in Firestore before deciding to update or create
                const docSnapshot = await orderRef.get();
                if (docSnapshot.exists) {
                    // Document exists, update it
                    console.log('🔄 Updating existing order document:', pendingOrderId);
                    await orderRef.update({
                        ...orderData,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Document doesn't exist, create it
                    console.log('🆕 Creating new order document:', pendingOrderId);
                    await orderRef.set(orderData);
                }

                // Save to sessionStorage for payment page and persist pending id markers
                sessionStorage.setItem('posOrder', JSON.stringify(orderData));
                sessionStorage.setItem('savedPendingOrderId', String(pendingOrderId));
                sessionStorage.setItem('pendingOrderId', String(pendingOrderId));
                // UI cleanup
                document.querySelector('.order-items').innerHTML = '';
                updateOrderSummary();
                if (tableNumberInput) tableNumberInput.value = '';

                // IMPORTANT: Do NOT generate new Order ID here - keep the same ID for pending orders
                // Only refresh Order ID when order is completed/processed (not pending)
                // This ensures the same Order ID persists through Payment page and back to POS for edits

                window.location.href = '/html/payment.html';
            } catch (error) {
                console.error('Error saving order:', error);
                alert('There was an error processing your order. Please try again.');
            }
        }

        // Also update order number when clearing the order
        // Handles Clear/New Order button: resets everything
        const closeOrderBtn = document.querySelector('.btn-close-order');
        if (closeOrderBtn) {
            closeOrderBtn.addEventListener('click', async function () {
                if (confirm('Are you sure you want to clear this order?')) {
                    // Clear the reserved order number first
                    sessionStorage.removeItem('reservedOrderNumber');
                    sessionStorage.removeItem('hasProceeded'); // Clear flag on Clear

                    // Clear current order items
                    document.querySelector('.order-items').innerHTML = '';
                    updateOrderSummary();

                    // Reset Table No and Pax fields to null
                    const tableInput = document.querySelector('.table-number input');
                    const paxInput = document.querySelector('.pax-number input');
                    if (tableInput) tableInput.value = '';
                    if (paxInput) paxInput.value = '';

                    // IMPORTANT: Clear pending order data and generate new Order ID
                    // This ensures we start fresh with a new order
                    sessionStorage.setItem('forceNewOrder', 'true');
                    await refreshOrderIdForNewOrder();
                }
            });
        }

        loadMenuForPOS();
        updateOrderNumber();

        // Initialize category filtering after menu is loaded
        setTimeout(() => {
            initializeCategoryFiltering();
        }, 1000);

        // Helper function to update order status in Firebase
        window.updateOrderStatus = async function (orderNumber, status) {
            try {
                const db = firebase.firestore();
                const orderDoc = await db.collection('orders').doc(orderNumber).get();

                if (orderDoc.exists) {
                    await db.collection('orders').doc(orderNumber).update({
                        status: status,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Order ${orderNumber} status updated to ${status}`);

                    // CRITICAL: Only refresh Order ID when order is completed/processed (not pending)
                    // This ensures new orders get fresh IDs while pending orders keep their IDs
                    if (status === 'Completed' || status === 'Ready' || status === 'Delivered' || status === 'Cancelled') {
                        console.log('🔄 Order completed, refreshing Order ID for next order');
                        await refreshOrderIdForNewOrder();
                    }

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

        // Function to refresh Order ID only when an order is completed
        async function refreshOrderIdForNewOrder() {
            try {
                // Clear existing pending order IDs
                sessionStorage.removeItem('pendingOrderId');
                sessionStorage.removeItem('savedPendingOrderId');
                sessionStorage.removeItem('posOrder');
                sessionStorage.removeItem('hasProceeded');

                // Generate new Order ID for the next order
                const newOrderId = generateProgressiveOrderId();
                sessionStorage.setItem('pendingOrderId', newOrderId);

                // Update the display
                await updateOrderNumber();

                console.log('✅ Order ID refreshed for new order:', newOrderId);
            } catch (error) {
                console.error('Error refreshing Order ID:', error);
            }
        }

        // Add event listener for order type change to handle table number visibility
        // Handle order type dropdown selection
        document.addEventListener('click', function (e) {
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

            // IMPORTANT: Use the centralized refresh function to ensure consistency
            await refreshOrderIdForNewOrder();

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
        // Restore if: (hasProceeded and shouldRestoreOrder) OR (shouldRestoreOrder from back button)
        if ((hasProceeded && shouldRestore) || (shouldRestore && !isEditMode)) {
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
                // Restore discount state from posOrder or orderData if available
                try {
                    let posOrder = JSON.parse(sessionStorage.getItem('posOrder')) || {};

                    // If posOrder doesn't have discount info, try to get it from orderData
                    if (!posOrder.discountType && orderData.discountType && orderData.discountType !== 'None') {
                        posOrder = {
                            discountType: orderData.discountType,
                            discountPercent: orderData.discountPercent || 0,
                            discountAmount: orderData.discountAmount || 0,
                            discountID: orderData.discountID || '',
                            discountName: orderData.discountName || ''
                        };
                        // Save the restored discount info to posOrder
                        sessionStorage.setItem('posOrder', JSON.stringify(posOrder));
                    }

                    if (posOrder.discountType && posOrder.discountType !== 'None') {
                        const discountDropdown = document.querySelector('.discount-dropdown');
                        const customDiscountInputRow = document.getElementById('customDiscountInputRow');
                        const customDiscountInput = document.getElementById('customDiscountInput');

                        if (discountDropdown) {
                            // Map discount type back to dropdown value
                            if (posOrder.discountType === 'PWD') {
                                discountDropdown.value = 'pwd';
                                if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
                            } else if (posOrder.discountType === 'Senior Citizen') {
                                discountDropdown.value = 'senior';
                                if (customDiscountInputRow) customDiscountInputRow.style.display = 'none';
                            } else if (posOrder.discountType === 'Special Discount') {
                                discountDropdown.value = 'custom';
                                if (customDiscountInputRow) customDiscountInputRow.style.display = '';
                                if (customDiscountInput && posOrder.discountPercent) {
                                    customDiscountInput.value = posOrder.discountPercent.toString();
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('No discount data to restore:', e.message);
                }

                // Update order summary
                updateOrderSummary();

                // Ensure discount dropdown listener is attached after restoration
                ensureDiscountDropdownListener();

                // Update order number display if we have order number data
                if (orderData.orderNumber || orderData.orderNumberFormatted) {
                    const orderNumberElement = document.querySelector('.order-number');
                    if (orderNumberElement) {
                        const displayNumber = orderData.orderNumberFormatted || orderData.orderNumber;
                        orderNumberElement.textContent = `Order No. ${displayNumber}`;
                    }
                }

                // Set hasProceeded flag if it wasn't already set (for back button restoration)
                if (!hasProceeded) {
                    sessionStorage.setItem('hasProceeded', 'true');
                }

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
document.addEventListener('DOMContentLoaded', function () {
    console.debug('POS page loaded, waiting for Firebase...');

    // Check if this is an approved order from notifications
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const orderId = urlParams.get('orderId');

    if (mode === 'approved-order' && orderId) {
        console.log('🎯 Loading approved order:', orderId);
        loadApprovedOrder(orderId);
    } else {
        // Check for pending order from Orders page
        const shouldRestoreOrder = sessionStorage.getItem('shouldRestoreOrder') === 'true';
        const pendingOrderData = sessionStorage.getItem('pendingOrder');
        const editingOrderData = sessionStorage.getItem('editingOrder');

        if (shouldRestoreOrder && (pendingOrderData || editingOrderData)) {
            console.log('🎯 Loading pending order from Orders page');
            // Wait for POS system to be ready before loading
            setTimeout(() => {
                loadPendingOrderFromOrders();
            }, 1000);
        }
    }

    // Initialize order type dropdown state
    initializeOrderTypeState();

    waitForFirebase();
});

// Function to load approved order from notifications
async function loadApprovedOrder(orderId) {
    try {
        // Show loading state
        showToast('Loading approved order...', 'info');

        // Get order data from session storage first
        const orderDataString = sessionStorage.getItem('approvedOrderData');
        let orderData = null;

        if (orderDataString) {
            orderData = JSON.parse(orderDataString);
            console.log('📋 Order data from session:', orderData);
        }

        // If no session data, fetch from Firebase
        if (!orderData && typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('📡 Fetching order from Firebase:', orderId);
            const db = firebase.firestore();
            const orderDoc = await db.collection('orders').doc(orderId).get();

            if (orderDoc.exists) {
                orderData = orderDoc.data();
            } else {
                throw new Error('Order not found in database');
            }
        }

        if (!orderData) {
            throw new Error('No order data available');
        }

        // Clear current order
        clearOrderAndSummary();

        // Load order items into POS
        if (orderData.items && Array.isArray(orderData.items)) {
            console.log('📦 Loading', orderData.items.length, 'items into POS');

            for (const item of orderData.items) {
                await addApprovedItemToPOS(item);
            }
        }

        // Set order type if available
        if (orderData.orderType || orderData.type) {
            const orderTypeDropdown = document.getElementById('order-type');
            if (orderTypeDropdown) {
                orderTypeDropdown.value = orderData.orderType || orderData.type || 'Dine in';
                orderTypeDropdown.dispatchEvent(new Event('change'));
            }
        }

        // Set customer info if available
        if (orderData.customerInfo) {
            displayCustomerInfo(orderData.customerInfo);
        }

        // Update order summary
        if (typeof updateOrderSummary === 'function') {
            updateOrderSummary();
        }

        // Show success message
        showToast('✅ Approved order loaded successfully! Review and click "Proceed to Kitchen" when ready.', 'success');

        // Store original order ID for processing
        sessionStorage.setItem('processingOrderId', orderId);
        sessionStorage.setItem('isApprovedOrder', 'true');

        // Change the proceed button text
        updateProceedButton();

        // Clear session data
        sessionStorage.removeItem('approvedOrderData');

    } catch (error) {
        console.error('Error loading approved order:', error);
        showToast('❌ Error loading approved order: ' + error.message, 'error');
    }
}

// Function to load pending order from Orders page
async function loadPendingOrderFromOrders() {
    try {
        console.log('🎯 Loading pending order from Orders page...');

        // Get order data from session storage
        const pendingOrderData = sessionStorage.getItem('pendingOrder');
        const editingOrderData = sessionStorage.getItem('editingOrder');
        const orderData = pendingOrderData ? JSON.parse(pendingOrderData) : JSON.parse(editingOrderData);

        if (!orderData) {
            console.log('No pending order data found');
            return;
        }

        console.log('📋 Pending order data:', orderData);

        // Set the order ID
        if (orderData.orderNumberFormatted || orderData.orderNumber) {
            const orderId = orderData.orderNumberFormatted || orderData.orderNumber;
            console.log('🔢 Setting Order ID:', orderId);
            sessionStorage.setItem('pendingOrderId', String(orderId));
            sessionStorage.setItem('savedPendingOrderId', String(orderId));

            // Update the order number display
            const orderNumberElement = document.querySelector('.order-number');
            console.log('🔢 Order number element found:', !!orderNumberElement);
            if (orderNumberElement) {
                orderNumberElement.textContent = `Order No. ${orderId}`;
                console.log('🔢 Order number updated to:', orderNumberElement.textContent);
            } else {
                console.error('🔢 Order number element not found!');
            }
        } else {
            console.log('🔢 No order ID found in data:', {
                orderNumberFormatted: orderData.orderNumberFormatted,
                orderNumber: orderData.orderNumber,
                id: orderData.id
            });
        }

        // Set order type
        if (orderData.orderType) {
            const orderTypeDropdown = document.querySelector('.order-type select');
            if (orderTypeDropdown) {
                orderTypeDropdown.value = orderData.orderType;
                // Trigger change event
                orderTypeDropdown.dispatchEvent(new Event('change'));
            }
        }

        // Set table number
        if (orderData.tableNumber) {
            const tableNumberInput = document.querySelector('.table-number input');
            if (tableNumberInput) {
                tableNumberInput.value = orderData.tableNumber;
            }
        }

        // Set pax
        if (orderData.paxNumber || orderData.pax) {
            const paxInput = document.querySelector('.pax-number input');
            if (paxInput) {
                paxInput.value = orderData.paxNumber || orderData.pax;
            }
        }

        // Add items to POS
        console.log('🛒 Items data:', orderData.items);
        if (orderData.items && Array.isArray(orderData.items)) {
            console.log('🛒 Found', orderData.items.length, 'items to add');
            const orderItemsContainer = document.querySelector('.order-items');
            console.log('🛒 Order items container found:', !!orderItemsContainer);
            if (orderItemsContainer) {
                orderItemsContainer.innerHTML = ''; // Clear existing items

                for (const item of orderData.items) {
                    console.log('🛒 Adding item:', item);
                    await addItemToPOSFromOrder(item);
                }
                console.log('🛒 All items added');
            } else {
                console.error('🛒 Order items container not found!');
            }
        } else {
            console.log('🛒 No items found in order data');
        }

        // Update order summary after all items are added
        setTimeout(() => {
            if (window.updateOrderSummary) {
                console.log('🔄 Updating order summary...');
                window.updateOrderSummary();
                console.log('✅ Order summary updated');
            } else {
                console.error('🔄 updateOrderSummary function not found!');
            }
        }, 100);

        // Clear the session storage flags
        sessionStorage.removeItem('shouldRestoreOrder');
        sessionStorage.removeItem('pendingOrder');
        sessionStorage.removeItem('editingOrder');
        sessionStorage.removeItem('isEditMode');

        console.log('✅ Pending order loaded successfully');
        showToast('Pending order loaded', 'success');

    } catch (error) {
        console.error('Error loading pending order:', error);
        showToast('Error loading pending order', 'error');
    }
}

// Helper function to add item to POS from order data
async function addItemToPOSFromOrder(item) {
    try {
        console.log('🛒 Processing item:', item);
        const name = item.name;
        const price = parseFloat(item.unitPrice || item.price || 0);
        const quantity = parseInt(item.quantity || 1);

        console.log('🛒 Item details:', { name, price, quantity });

        // Create order item element with proper structure for POS system
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';

        // Set required data attributes for updateOrderSummary function
        orderItem.setAttribute('data-unit-price', price);
        orderItem.setAttribute('data-item-name', name);

        orderItem.innerHTML = `
            <div class="item-info">
                <div class="item-quantity">
                    <i class="bi bi-chevron-right"></i>
                    <span class="item-number">${quantity}</span>
                </div>
                <div class="item-details">
                    <h6 class="item-name">${name}</h6>
                </div>
                <button class="btn-remove-item">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div class="quantity-controls">
                <p class="item-price">₱${price.toFixed(2)}</p>
                <button class="btn-quantity btn-minus">
                    <i class="bi bi-dash"></i>
                </button>
                <span class="quantity">${quantity}</span>
                <button class="btn-quantity btn-plus">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
        `;

        // Add event listeners for quantity controls
        const minusBtn = orderItem.querySelector('.btn-minus');
        const plusBtn = orderItem.querySelector('.btn-plus');

        if (minusBtn && plusBtn) {
            minusBtn.addEventListener('click', function () {
                window.decreaseQuantity(this);
                window.updateOrderSummary();
            });
            plusBtn.addEventListener('click', function () {
                window.increaseQuantity(this);
                window.updateOrderSummary();
            });
        }

        // Attach remove button event
        const removeBtn = orderItem.querySelector('.btn-remove-item');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                this.closest('.order-item').remove();
                window.updateOrderSummary();
            });
        }

        // Add to order items container
        const orderItemsContainer = document.querySelector('.order-items');
        console.log('🛒 Container found:', !!orderItemsContainer);
        if (orderItemsContainer) {
            orderItemsContainer.appendChild(orderItem);
            console.log('✅ Added item to POS:', name, 'x', quantity);
        } else {
            console.error('🛒 Order items container not found when adding item!');
        }

    } catch (error) {
        console.error('Error adding item to POS:', error);
    }
}

// Helper function to add approved items to POS
async function addApprovedItemToPOS(item) {
    try {
        // Prepare item details
        const name = item.name;
        const price = '₱' + (item.price || item.unitPrice || 0).toFixed(2);
        const image = item.imageUrl || 'https://via.placeholder.com/100x100?text=No+Image';
        const quantity = item.quantity || 1;

        // Add to POS order multiple times for quantity
        for (let i = 0; i < quantity; i++) {
            if (typeof addItemToOrder === 'function') {
                addItemToOrder(name, price, image);
            }
        }

        console.log('✅ Added approved item to POS:', name, 'x', quantity);

    } catch (error) {
        console.error('Error adding approved item to POS:', error);
    }
}

// Helper function to display customer info
function displayCustomerInfo(customerInfo) {
    // You can customize this to show customer info in the POS UI
    const customerDisplay = document.createElement('div');
    customerDisplay.className = 'customer-info-display';
    customerDisplay.innerHTML = `
        <div class="alert alert-info mb-3">
            <strong>Customer Order:</strong> ${customerInfo.name || 'Unknown'}<br>
            <small>Phone: ${customerInfo.phone || 'N/A'} | Email: ${customerInfo.email || 'N/A'}</small>
        </div>
    `;

    // Insert at top of order items
    const orderItemsContainer = document.querySelector('.order-items');
    if (orderItemsContainer) {
        orderItemsContainer.insertBefore(customerDisplay, orderItemsContainer.firstChild);
    }
}

// Helper function to update proceed button for approved orders
function updateProceedButton() {
    const proceedButton = document.querySelector('.proceed-btn, .payment-btn, [onclick*="proceedToPayment"]');
    if (proceedButton) {
        proceedButton.textContent = '🍳 Proceed to Kitchen';
        proceedButton.style.backgroundColor = '#28a745';
        proceedButton.style.color = 'white';

        // Update onclick to use new function
        proceedButton.setAttribute('onclick', 'proceedApprovedOrderToKitchen()');
    }
}

// Function to proceed approved order to kitchen with inventory deduction
window.proceedApprovedOrderToKitchen = async function () {
    try {
        const orderId = sessionStorage.getItem('processingOrderId');
        const isApprovedOrder = sessionStorage.getItem('isApprovedOrder') === 'true';

        if (!orderId || !isApprovedOrder) {
            throw new Error('No approved order to process');
        }

        // Confirm action
        if (!confirm('Proceed with sending this approved order to the kitchen? This will deduct inventory and start preparation.')) {
            return;
        }

        // Show processing state
        showToast('Processing order to kitchen...', 'info');

        // Get current order items from POS
        const orderItems = getCurrentOrderItems();
        if (!orderItems || orderItems.length === 0) {
            throw new Error('No items in order');
        }

        // Update order in Firebase
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const db = firebase.firestore();

            await db.collection('orders').doc(orderId).update({
                status: 'In the Kitchen',
                processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: 'admin',
                processedInPOS: true,
                finalItems: orderItems, // Store final processed items
                inventoryDeducted: true // Flag to prevent double deduction
            });

            console.log('✅ Order status updated to "In the Kitchen"');
        }

        // Deduct inventory for each item
        await deductInventoryForOrder(orderItems);

        // Show success message
        showToast('✅ Order sent to kitchen successfully! Inventory has been deducted.', 'success');

        // Clear session data
        sessionStorage.removeItem('processingOrderId');
        sessionStorage.removeItem('isApprovedOrder');

        // Clear POS order
        clearOrderAndSummary();

        // Optionally redirect back to notifications or show kitchen view
        setTimeout(() => {
            if (confirm('Order processed successfully! View kitchen dashboard to monitor preparation?')) {
                window.location.href = '/html/kitchen.html';
            } else {
                window.location.href = '/html/notifi.html';
            }
        }, 2000);

    } catch (error) {
        console.error('Error proceeding approved order to kitchen:', error);
        showToast('❌ Error processing order: ' + error.message, 'error');
    }
}

// Function to get current order items from POS
function getCurrentOrderItems() {
    const orderItemElements = document.querySelectorAll('.order-item');
    const items = [];

    orderItemElements.forEach(element => {
        const name = element.querySelector('.item-name')?.textContent?.trim();
        const quantityEl = element.querySelector('.quantity');
        const quantity = quantityEl ? parseInt(quantityEl.textContent) || 1 : 1;
        const unitPrice = parseFloat(element.getAttribute('data-unit-price')) || 0;

        if (name) {
            items.push({
                name: name,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: unitPrice * quantity,
                itemId: element.getAttribute('data-item-id') || '',
                category: element.getAttribute('data-category') || 'Unknown'
            });
        }
    });

    return items;
}

// Function to deduct inventory for order items
async function deductInventoryForOrder(orderItems) {
    try {
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.warn('Firebase not available for inventory deduction');
            return;
        }

        const db = firebase.firestore();

        for (const item of orderItems) {
            // Find menu item data from Firebase to get ingredients
            const menuData = await getMenuItemData(db, item.name);

            if (menuData && menuData.ingredients && Array.isArray(menuData.ingredients)) {
                console.log(`🔄 Deducting inventory for ${item.name} (qty: ${item.quantity})`);

                for (const ingredient of menuData.ingredients) {
                    const ingredientName = ingredient.name;
                    const qtyToDeduct = (ingredient.quantity || 0) * item.quantity;

                    if (qtyToDeduct > 0) {
                        await deductInventoryItem(db, ingredientName, qtyToDeduct);
                    }
                }
            } else {
                console.warn('No ingredients found for item:', item.name);
            }
        }

        console.log('✅ Inventory deduction completed for all items');

    } catch (error) {
        console.error('Error deducting inventory:', error);
        // Don't throw - let the order proceed even if inventory fails
    }
}

// Function to get menu item data from Firebase
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

        // If not found, try case-insensitive search
        const allMenuQuery = await db.collection('menu').get();

        for (const doc of allMenuQuery.docs) {
            const data = doc.data();
            if (data.name && data.name.toLowerCase() === itemName.toLowerCase()) {
                return data;
            }
        }

        console.warn('Menu item not found in database:', itemName);
        return null;

    } catch (error) {
        console.error('Error getting menu item data:', error);
        return null;
    }
}

// Function to deduct a single inventory item
async function deductInventoryItem(db, ingredientName, quantity) {
    try {
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

        await db.collection('inventory').doc(inventoryDoc.id).update({
            quantity: newQty,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Deducted ${quantity} of ${ingredientName}: ${currentQty} → ${newQty}`);

    } catch (error) {
        console.error('Error deducting inventory item:', error);
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




// Show page
function showPage() {
    navLinks.forEach((btn, i) => {
        btn.classList.remove('active');
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        if (btn.classList.contains('active')) {
            document.querySelectorAll('.page')[i].style.display = 'block';
        }
    });
}

// Initialize category filtering functionality
function initializeCategoryFiltering() {
    const categoryButtons = document.querySelectorAll('#categoryNav .nav-link[data-category]');
    const moreCategoriesBtn = document.querySelector('#categoryNav .more-categories');

    // Store current page state
    window.currentCategoryPage = 0;
    window.categoriesPerPage = 9;

    // Initially show first page
    showCategoryPage(0);

    // Add click handlers for category buttons
    categoryButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Get the category and filter menu items
            const category = this.getAttribute('data-category');
            filterMenuGridByCategory(category);
        });
    });

    // Add click handler for "next/prev" button
    if (moreCategoriesBtn) {
        moreCategoriesBtn.addEventListener('click', function (e) {
            e.preventDefault();
            toggleCategoryPage();
        });
    }
}

// Show specific category page
function showCategoryPage(pageNumber) {
    const categoryButtons = document.querySelectorAll('#categoryNav .nav-link[data-category]');
    const moreCategoriesBtn = document.querySelector('#categoryNav .more-categories');
    const chevronIcon = moreCategoriesBtn.querySelector('i');

    const startIndex = pageNumber * window.categoriesPerPage;
    const endIndex = startIndex + window.categoriesPerPage;

    // Show/hide categories based on current page
    categoryButtons.forEach((button, index) => {
        if (index >= startIndex && index < endIndex) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });

    // Update chevron direction and visibility
    const totalPages = Math.ceil(categoryButtons.length / window.categoriesPerPage);

    if (totalPages <= 1) {
        moreCategoriesBtn.style.display = 'none';
    } else {
        moreCategoriesBtn.style.display = 'block';

        if (pageNumber === 0) {
            chevronIcon.classList.remove('bi-chevron-left');
            chevronIcon.classList.add('bi-chevron-right');
        } else {
            chevronIcon.classList.remove('bi-chevron-right');
            chevronIcon.classList.add('bi-chevron-left');
        }
    }
}

// Toggle between category pages
function toggleCategoryPage() {
    const totalPages = Math.ceil(document.querySelectorAll('#categoryNav .nav-link[data-category]').length / window.categoriesPerPage);

    if (window.currentCategoryPage === 0) {
        // Go to next page
        window.currentCategoryPage = 1;
    } else {
        // Go back to first page
        window.currentCategoryPage = 0;
    }

    showCategoryPage(window.currentCategoryPage);
}

// Scroll categories horizontally to show more categories
function scrollCategoriesRight() {
    const categoryTabs = document.querySelector('.category-tabs');
    if (categoryTabs) {
        categoryTabs.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    }
}

// Filter menu grid by category
function filterMenuGridByCategory(category) {
    const menuGrid = document.querySelector('.menu-items-grid');
    const menuItems = menuGrid.querySelectorAll('.menu-item-card');

    menuItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (category === 'all' || itemCategory === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
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


// Helper function to find menu item by name
function findMenuItemByName(itemName) {
    console.log(`🔍 Looking for menu item: "${itemName}"`);
    console.log('📋 Available menu items:', Object.keys(menuItemsData));

    // Try to find exact match first
    for (const [key, item] of Object.entries(menuItemsData)) {
        if (item.name.toLowerCase() === itemName.toLowerCase()) {
            console.log(`✅ Found exact match: ${item.name}`);
            return item;
        }
    }

    // If no exact match, try partial match
    for (const [key, item] of Object.entries(menuItemsData)) {
        if (item.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(item.name.toLowerCase())) {
            console.log(`✅ Found partial match: ${item.name}`);
            return item;
        }
    }

    // No match found
    console.log(`❌ No matching menu item found for: "${itemName}"`);
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

        // If quantity is 1 or less, remove the item
        if (currentQty <= 1) {
            // Animation feedback before removal
            orderItem.style.transform = 'scale(0.9)';
            orderItem.style.opacity = '0.5';

            setTimeout(() => {
                orderItem.remove();
                updateOrderSummary();
            }, 150);
            return;
        }

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

        // Animation feedback
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);

        // Always update summary after quantity change
        updateOrderSummary();
    } catch (error) {
        console.error('Error decreasing quantity:', error);
    }
}