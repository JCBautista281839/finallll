// Utility function to generate unique IDs
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Note: updateOrderTimestamp is implemented later in the file with a single-document update
// to avoid ambiguous behavior when orderNumber is used as a document id.

// Store orders globally for filtering
let allOrders = [];
let retryCount = 0;
const maxRetries = 5;

// Track order IDs to prevent duplicates
const seenOrderIds = new Set();

document.addEventListener('DOMContentLoaded', function () {
    console.debug('Order page loaded, initializing...');

    // Ensure Firebase is properly loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded! Check script imports.');
        showError('Firebase library is not loaded', 'Make sure all Firebase scripts are properly loaded.');
        return;
    }

    // Initialize Firebase first (from main.js)
    if (typeof initializeFirebase === 'function') {
        try {
            const firebaseApp = initializeFirebase();
            console.log('Firebase initialized successfully:', firebaseApp.name);
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Don't block the app if Firebase fails to initialize
            console.log('Continuing without Firebase initialization...');
        }
    } else {
        console.warn('initializeFirebase function not found in main.js');
    }

    // Add a small delay to ensure Firebase is fully initialized
    setTimeout(() => {
        // Show loading state
        showLoadingState();

        // Automatically retry Firebase connection
        autoRetryFirebaseConnection();
    }, 100);

    // Setup search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const searchTerm = e.target.value.trim().toLowerCase();
            filterOrders(searchTerm);
        });

        // Add clear button functionality
        const clearSearch = () => {
            searchInput.value = '';
            filterOrders('');
        };

        // Clear on ESC key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearSearch();
            }
        });
    }
});

// Helper function to sanitize order data
function sanitizeOrderData(orderData) {
    if (!orderData) return null;

    try {
        return {
            ...orderData,
            id: orderData.id || orderData.orderNumberFormatted || orderData.orderNumber || '',
            orderNumber: orderData.orderNumber || orderData.id,
            orderNumberFormatted: orderData.orderNumberFormatted ||
                (orderData.orderNumber ? String(orderData.orderNumber) :
                    (orderData.id ? String(orderData.id) : '')),
            status: orderData.status || 'Processing',
            items: Array.isArray(orderData.items) ? orderData.items.map(item => ({
                id: item.id || generateUniqueId(),
                name: item.name || 'Unnamed Item',
                unitPrice: parseFloat(item.unitPrice || item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                lineTotal: parseFloat((item.unitPrice || item.price) * (parseInt(item.quantity) || 1)),
                notes: item.notes || '',
                category: item.category || '',
                imageUrl: item.imageUrl || '',
                itemId: item.itemId || item.id || ''
            })) : [],
            orderType: orderData.orderType || 'Dine in',
            tableNumber: orderData.tableNumber || '',
            paxNumber: orderData.paxNumber || orderData.pax || '',
            subtotal: parseFloat(orderData.subtotal) || 0,
            tax: parseFloat(orderData.tax) || 0,
            discount: parseFloat(orderData.discount) || 0,
            total: parseFloat(orderData.total) || 0
        };
    } catch (error) {
        console.error('Error sanitizing order data:', error);
        return orderData; // Return original if sanitization fails
    }
}

// Helper to return the Firestore document id we should use for an order
function getDocId(order) {
    if (!order) return '';
    return order.id || order.orderNumberFormatted || order.orderNumber || '';
}

// Helper to create a hash of order data for duplicate detection
function createOrderHash(orderData) {
    if (!orderData) return '';

    // Create a hash based on key order properties
    const keyData = {
        orderNumber: orderData.orderNumberFormatted || orderData.orderNumber || orderData.id,
        status: orderData.status,
        total: orderData.total,
        items: orderData.items ? orderData.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })) : [],
        timestamp: orderData.timestamp,
        orderType: orderData.orderType,
        tableNumber: orderData.tableNumber
    };

    return JSON.stringify(keyData);
}

// Show loading state while connecting
function showLoadingState() {
    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML =
            '<tr>' +
            '<td colspan="8" class="text-center py-4">' +
            '<div class="spinner-border text-primary mb-2" role="status">' +
            '<span class="visually-hidden">Loading...</span>' +
            '</div>' +
            '<div>Connecting to Firebase...</div>' +
            '<small class="text-muted">Please wait while we load your orders</small>' +
            '</td>' +
            '</tr>';
    }
}

// Automatic retry mechanism for Firebase connection
async function autoRetryFirebaseConnection() {
    console.debug(`🔄 Attempting Firebase connection (attempt ${retryCount + 1}/${maxRetries})`);

    try {
        const success = await testFirebaseConnection();
        if (success) {
            console.log('✅ Firebase connection successful, initializing orders listener');
            initializeOrdersListener();
            return;
        }
    } catch (error) {
        console.error(`❌ Connection attempt ${retryCount + 1} failed:`, error);
    }

    retryCount++;

    if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);

        setTimeout(() => {
            autoRetryFirebaseConnection();
        }, delay);
    } else {
        console.error('❌ Max retries reached, showing error state');
        showFinalErrorState();
    }
}

// Show final error state when all retries are exhausted
function showFinalErrorState() {
    const tableBody = document.querySelector('table tbody');
    if (tableBody) {
        tableBody.innerHTML =
            '<tr>' +
            '<td colspan="8" class="text-center py-4 text-warning">' +
            '<i class="fa fa-exclamation-triangle fa-2x mb-2 d-block"></i>' +
            '<div>Unable to Connect to Firebase</div>' +
            '<small class="text-muted">Please check your internet connection and try refreshing the page</small>' +
            '<br>' +
            '<button class="btn btn-sm btn-outline-primary mt-2" onclick="location.reload()">' +
            'Refresh Page' +
            '</button>' +
            '</td>' +
            '</tr>';
    }
}

async function testFirebaseConnection() {
    try {
        console.debug('🔍 Testing Firebase connection...');

        if (typeof firebase === 'undefined') {
            throw new Error('Firebase is not loaded');
        }

        // Check if Firebase is properly initialized
        if (!firebase.apps || firebase.apps.length === 0) {
            throw new Error('Firebase app not initialized');
        }

        if (!firebase.firestore) {
            throw new Error('Firestore is not initialized');
        }

        const db = firebase.firestore();

        // Test basic connectivity by trying to read orders collection
        const testQuery = await db.collection('orders').limit(1).get();
        console.debug('✅ Firebase connection successful');
        console.debug('📦 Orders collection accessible:', !testQuery.empty);

        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);

        // Handle specific Firebase errors
        if (error.message.includes('Target ID already exists')) {
            console.log('🔄 Target ID already exists - Firebase already initialized, retrying...');
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 500));
            return await testFirebaseConnection();
        }

        if (error.message.includes('Missing or insufficient permissions')) {
            console.warn('⚠️ Firebase permissions issue - domain may not be authorized');
        }

        // Just return false - error handling is done by autoRetryFirebaseConnection
        return false;
    }
}

function initializeOrdersListener() {
    console.debug('Initializing orders listener...');

    // Wait for Firebase to be ready
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log('Firebase not ready yet, waiting...');
        setTimeout(initializeOrdersListener, 1000);
        return;
    }

    const db = firebase.firestore();
    const tableBody = document.querySelector('table tbody');

    // Clear loading state and show success
    if (tableBody && tableBody.innerHTML.includes('spinner-border')) {
        tableBody.innerHTML = ''; // Clear loading state
    }

    if (!tableBody) {
        console.error('Table body not found');
        return;
    }

    // Show loading state
    tableBody.innerHTML =
        '<tr>' +
        '<td colspan="7" class="text-center py-4">' +
        '<div class="spinner-border text-primary" role="status">' +
        '<span class="visually-hidden">Loading orders...</span>' +
        '</div>' +
        '<p class="mt-2 mb-0">Connecting to Firebase...</p>' +
        '</td>' +
        '</tr>';

    // Listen for all orders - use a more flexible query
    db.collection('orders')
        .onSnapshot((snapshot) => {
            console.debug('Received orders update:', snapshot.size, 'orders');
            console.debug('Snapshot docs:', snapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
            })));

            // AGGRESSIVE CLEANUP - Clear everything
            allOrders = [];
            seenOrderIds.clear();

            // Clear the table completely before processing
            const tableBody = document.querySelector('table tbody');
            if (tableBody) {
                tableBody.innerHTML = '';
            }

            if (snapshot.empty) {
                console.log('No orders found in Firebase');
                displayNoOrders();
                return;
            }

            // Process documents with aggressive duplicate prevention
            const processedDocs = new Set();
            const processedOrderIds = new Set();

            snapshot.forEach((doc) => {
                try {
                    // Skip if we've already processed this document
                    if (processedDocs.has(doc.id)) {
                        console.warn('🚫 DUPLICATE DOCUMENT SKIPPED:', doc.id);
                        return;
                    }
                    processedDocs.add(doc.id);

                    // Get the raw order data
                    const rawOrderData = {
                        id: doc.id,
                        ...doc.data()
                    };

                    // Sanitize and normalize the order data
                    const orderData = sanitizeOrderData(rawOrderData);

                    if (orderData) {
                        const orderId = getDocId(orderData) || doc.id;

                        // AGGRESSIVE duplicate check
                        if (processedOrderIds.has(orderId)) {
                            console.warn('🚫 DUPLICATE ORDER ID SKIPPED:', orderId);
                            return;
                        }
                        processedOrderIds.add(orderId);

                        console.debug('✅ Processing unique order:', orderId, 'doc.id:', doc.id);
                        allOrders.push(orderData);
                    } else {
                        console.error('Failed to process order:', doc.id);
                    }
                } catch (error) {
                    console.error('Error processing order document:', error, doc.id);
                }
            });

            // Sort orders by timestamp or creation date (newest first)
            allOrders.sort((a, b) => {
                const getOrderDate = (order) => {
                    try {
                        if (order.timestamp) {
                            // Handle Firestore timestamp objects
                            if (typeof order.timestamp.toDate === 'function') {
                                return order.timestamp.toDate();
                            }
                            // Handle Firestore timestamps stored as objects with seconds
                            else if (order.timestamp.seconds) {
                                return new Date(order.timestamp.seconds * 1000);
                            }
                            // Handle ISO string timestamps
                            else if (typeof order.timestamp === 'string') {
                                return new Date(order.timestamp);
                            }
                            // Handle numeric timestamps (milliseconds since epoch)
                            else if (typeof order.timestamp === 'number') {
                                return new Date(order.timestamp);
                            }
                        }

                        // Try alternative timestamp fields
                        if (order.createdAt) {
                            if (typeof order.createdAt === 'object' && order.createdAt.seconds) {
                                return new Date(order.createdAt.seconds * 1000);
                            } else {
                                return new Date(order.createdAt);
                            }
                        }

                        if (order.dateCreated) {
                            if (typeof order.dateCreated === 'object' && order.dateCreated.seconds) {
                                return new Date(order.dateCreated.seconds * 1000);
                            } else {
                                return new Date(order.dateCreated);
                            }
                        }

                        if (order.updatedAt) {
                            if (typeof order.updatedAt === 'object' && order.updatedAt.seconds) {
                                return new Date(order.updatedAt.seconds * 1000);
                            } else {
                                return new Date(order.updatedAt);
                            }
                        }

                        // Last resort - check if the ID contains a timestamp pattern
                        if (order.id && /^\d{8,}/.test(order.id)) {
                            return new Date(parseInt(order.id.substring(0, 13)));
                        }

                        return new Date(0); // Very old date as fallback
                    } catch (error) {
                        console.error("Error parsing order date for sorting:", error, order);
                        return new Date(0);
                    }
                };

                return getOrderDate(b) - getOrderDate(a); // Newest first
            });

            console.debug('Displaying', allOrders.length, 'orders');
            // Display all orders initially
            displayOrders(allOrders);
        }, (error) => {
            console.error("Error getting orders:", error);
            const tableBody = document.querySelector('table tbody');
            if (tableBody) {
                tableBody.innerHTML =
                    '<tr>' +
                    '<td colspan="8" class="text-center py-4 text-danger">' +
                    '<i class="fa fa-exclamation-triangle fa-2x mb-2 d-block"></i>' +
                    '<div>Error loading orders from Firebase</div>' +
                    '<small class="text-muted">' + error.message + '</small>' +
                    '<br/>' +
                    '<button class="btn btn-sm btn-outline-primary mt-2" onclick="initializeOrdersListener()">' +
                    'Retry' +
                    '</button>' +
                    '</td>' +
                    '</tr>';
            }
        });
}

function createOrderRow(orderData) {
    const row = document.createElement('tr');
    // Normalize status comparison (case-insensitive)
    const statusLower = String(orderData.status || '').toLowerCase();
    const isPendingPayment = statusLower === 'pending payment';

    // Only make pending payment orders clickable
    if (isPendingPayment) {
        row.style.cursor = 'pointer';
        row.classList.add('clickable-order-row', 'pending-payment-row');

        row.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            console.debug('Opening pending order in POS edit mode:', getDocId(orderData));

            try {
                // First sanitize the order data to ensure it has all required fields
                const sanitizedOrder = sanitizeOrderData(orderData);

                // Then add the flags for POS restoration
                const orderForNavigation = {
                    ...sanitizedOrder,
                    status: 'Pending Payment',
                    timestamp: orderData.timestamp,
                    dateCreated: orderData.dateCreated || new Date().toISOString(),
                    customerName: orderData.customerName || '',
                    customerPhone: orderData.customerPhone || '',
                    customerEmail: orderData.customerEmail || '',
                    specialInstructions: orderData.specialInstructions || '',

                    // ✅ Flags for POS restoration
                    isEditable: true,
                    isEdit: true,
                    isEditing: true,
                    shouldRestoreOrder: true,

                    originalOrderId: orderData.id,
                    lastEdited: new Date().toISOString()
                };

                sessionStorage.setItem('pendingOrder', JSON.stringify(orderForNavigation));
                sessionStorage.setItem('editingOrder', JSON.stringify(orderForNavigation));
                sessionStorage.setItem('isEditMode', 'true');
                sessionStorage.setItem('shouldRestoreOrder', 'true');
                sessionStorage.setItem('originalOrderId', getDocId(orderData));

                // ✅ Show loading spinner
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75';
                loadingDiv.style.zIndex = '9999';
                loadingDiv.innerHTML =
                    '<div class="text-center text-white">' +
                    '<div class="spinner-border text-primary mb-2" role="status"></div>' +
                    '<p>Opening POS with your order...</p>' +
                    '</div>';
                document.body.appendChild(loadingDiv);

                setTimeout(() => {
                    window.location.href = window.location.origin + '/html/pos.html';
                }, 400);
            } catch (error) {
                console.error('Error processing order for POS navigation:', error);
                alert('Error preparing order data. Please try again.');
            }
        });
    }

    // Always use the actual transaction timestamp, never overwrite with current date
    let orderDate;
    if (orderData.completedAt) {
        orderDate = new Date(orderData.completedAt);
    } else if (orderData.timestamp && typeof orderData.timestamp.toDate === 'function') {
        orderDate = orderData.timestamp.toDate();
    } else if (orderData.timestamp && orderData.timestamp.seconds) {
        orderDate = new Date(orderData.timestamp.seconds * 1000);
    } else if (orderData.dateCreated) {
        orderDate = new Date(orderData.dateCreated);
    } else if (orderData.createdAt) {
        orderDate = new Date(orderData.createdAt);
    } else {
        orderDate = null;
    }

    // Only format if orderDate is valid
    let dateStr = '';
    let timeStr = '';
    if (orderDate) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateStr = orderDate.toLocaleDateString(undefined, options);
        let hours = orderDate.getHours();
        let minutes = orderDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } else {
        dateStr = 'Unknown';
        timeStr = '';
    }

    // Use the saved total from orderData for consistency
    const total = parseFloat(orderData.total) || 0;

    row.innerHTML =
        '<td class="align-middle text-center text-primary">' +
        '<div class="fw-bold">#' + (orderData.orderNumberFormatted || orderData.orderNumber || orderData.id || 'N/A') + '</div>' +
        '<small class="text-muted">' + dateStr + ' ' + timeStr + '</small>' +
        '</td>' +
        '<td class="align-middle text-center">' +
        '<div class="text-capitalize">' + (orderData.orderType || 'Dine in') + '</div>' +
        '</td>' +
        '<td class="align-middle text-center">' +
        (orderData.orderType === 'Dine in' ? (orderData.tableNumber || 'N/A') : '-') +
        '</td>' +
        '<td class="align-middle text-center">' +
        (orderData.orderType === 'Dine in' ? (orderData.paxNumber || orderData.pax || 'N/A') : '-') +
        '</td>' +
        '<td class="align-middle">' + formatOrderItems(orderData.items) + '</td>' +
        // Always use the saved total for display
        '<td class="align-middle text-center">₱' + total.toFixed(2) + '</td>' +
        '<td class="align-middle text-center status-cell">' +
        (() => {
            const normalizedStatus = normalizeOrderStatus(orderData.status);
            return normalizedStatus === 'Pending Payment' ?
                '<span class="badge badge-pending-payment">' + normalizedStatus + '</span>' :
                '<span class="badge ' + getStatusBadgeClass(normalizedStatus) + '">' + (normalizedStatus || 'Unknown') + '</span>';
        })() +
        '<small class="edit-hint" style="visibility: ' + (isPendingPayment ? 'visible' : 'hidden') + ';">' +
        '<i class="fas fa-edit"></i>' +
        '</small>' +
        '</td>' +
        '<td class="align-middle text-center">' +
        '<button class="btn btn-sm btn-outline-primary me-2" onclick="viewOrderDetails(\'' + getDocId(orderData) + '\')">' +
        'View' +
        '</button>' +
        '<small class="edit-hint" style="visibility: ' + (isPendingPayment ? 'visible' : 'hidden') + ';">' +
        '<i class="fas fa-edit"></i>' +
        '</small>' +
        '</td>';

    return row;
}

// Function to edit order in POS
function editInPOS(orderNumber) {
    console.log('Editing order in POS:', orderNumber);

    firebase.firestore().collection('orders').doc(orderNumber).get()
        .then(doc => {
            if (doc.exists) {
                const orderData = doc.data();
                console.log('Retrieved order data for POS editing:', orderData);

                try {
                    // ✅ First sanitize the raw data
                    const sanitizedOrder = sanitizeOrderData({
                        ...orderData,
                        id: doc.id
                    });

                    // ✅ Then add the editing flags and additional needed data
                    const orderForPOS = {
                        ...sanitizedOrder,
                        status: 'Pending Payment',
                        timestamp: orderData.timestamp,
                        dateCreated: orderData.dateCreated || new Date().toISOString(),
                        customerName: orderData.customerName || '',
                        customerPhone: orderData.customerPhone || '',
                        customerEmail: orderData.customerEmail || '',
                        specialInstructions: orderData.specialInstructions || '',

                        // ✅ Flags for editing in POS
                        isEditable: true,
                        isEdit: true,
                        isEditing: true,
                        shouldRestoreOrder: true,

                        originalOrderId: doc.id,
                        lastEdited: new Date().toISOString()
                    };

                    // ✅ Store order for POS restore
                    sessionStorage.setItem('pendingOrder', JSON.stringify(orderForPOS));
                    sessionStorage.setItem('editingOrder', JSON.stringify(orderForPOS));
                    sessionStorage.setItem('isEditMode', 'true');

                    // ✅ Show loading spinner before redirect
                    const loadingDiv = document.createElement('div');
                    loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75';
                    loadingDiv.style.zIndex = '9999';
                    loadingDiv.innerHTML =
                        '<div class="text-center text-white">' +
                        '<div class="spinner-border text-primary mb-2" role="status"></div>' +
                        '<p>Opening POS with your order...</p>' +
                        '</div>';
                    document.body.appendChild(loadingDiv);

                    // ✅ Redirect to POS
                    setTimeout(() => {
                        window.location.href = window.location.origin + '/html/pos.html';
                    }, 400);
                } catch (error) {
                    console.error('Error processing order for POS:', error);
                    alert('Error preparing order data. Please try again.');
                }
            } else {
                alert('Order not found in database.');
            }
        })
        .catch(error => {
            console.error('Error loading order for POS editing:', error);
            alert('Error loading order details. Please try again.');
        });
}


// Function to go directly to payment
function goToPayment(orderNumber) {
    console.log('Going to payment for order:', orderNumber);

    firebase.firestore().collection('orders').doc(orderNumber).get()
        .then(doc => {
            if (doc.exists) {
                const orderData = doc.data();
                console.log('Retrieved order data for payment:', orderData);

                // Store order data for payment page, always recalculate total
                const subtotal = parseFloat(orderData.subtotal) || 0;
                const tax = parseFloat(orderData.tax) || 0;
                const discount = parseFloat(orderData.discount) || 0;
                const total = subtotal + tax - discount;
                const orderForPayment = {
                    orderNumber: orderData.orderNumber,
                    orderNumberFormatted: orderData.orderNumberFormatted,
                    items: orderData.items.map(item => ({
                        name: item.name,
                        unitPrice: item.unitPrice || item.price,
                        quantity: item.quantity,
                        lineTotal: (item.unitPrice || item.price) * item.quantity
                    })),
                    orderType: orderData.orderType || 'Dine in',
                    tableNumber: orderData.tableNumber,
                    subtotal: subtotal,
                    tax: tax,
                    discount: discount,
                    total: total,
                    status: orderData.status,
                    timestamp: orderData.timestamp,
                    dateCreated: orderData.dateCreated || new Date().toISOString()
                };

                console.log('Storing order for payment:', orderForPayment);
                sessionStorage.setItem('posOrder', JSON.stringify(orderForPayment));
                window.location.href = '/html/payment.html';
            }
        })
        .catch(error => {
            console.error('Error loading order for payment:', error);
            alert('Error loading order details. Please try again.');
        });
}

// Function to view receipt for completed orders
function viewReceipt(orderNumber) {
    console.log('Viewing receipt for order:', orderNumber);

    firebase.firestore().collection('orders').doc(orderNumber).get()
        .then(doc => {
            if (doc.exists) {
                const orderData = doc.data();

                // Store order data for receipt page
                sessionStorage.setItem('receiptOrder', JSON.stringify(orderData));
                window.location.href = '/html/receipt.html';
            }
        })
        .catch(error => {
            console.error('Error loading order for receipt:', error);
            alert('Error loading order details. Please try again.');
        });
}

// Helper function to update timestamps when any order is changed
function updateOrderTimestamp(orderNumber) {
    const db = firebase.firestore();
    return db.collection('orders').doc(orderNumber).update({
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function updateOrderStatus(orderNumber, status) {
    const db = firebase.firestore();
    // Fetch the order to get subtotal, tax, discount
    return db.collection('orders').doc(orderNumber).get()
        .then(doc => {
            if (!doc.exists) throw new Error('Order not found');
            const data = doc.data();
            const subtotal = parseFloat(data.subtotal) || 0;
            const tax = parseFloat(data.tax) || 0;
            const discount = parseFloat(data.discount) || 0;
            const total = subtotal + tax - discount;
            return db.collection('orders').doc(orderNumber).update({
                status: status,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: new Date().toISOString(),
                total: total
            });
        })
        .then(() => {
            console.log("Order " + orderNumber + " status updated to " + status);
        })
        .catch((error) => {
            console.error("Error updating order status:", error);
            throw error;
        });
}

function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
        case 'completed':
            return 'bg-success';
        case 'pending payment':
            return 'badge-pending-payment'; // Special class for clickable pending payment orders
        case 'in the kitchen':
            return 'bg-info text-dark';
        default:
            // For any invalid status, default to secondary
            return 'bg-secondary';
    }
}

// Function to validate and normalize order status
function normalizeOrderStatus(status) {
    if (!status) return null;

    const statusLower = status.toLowerCase().trim();
    const originalStatus = status;

    // Map invalid statuses to valid ones
    let normalizedStatus;
    switch (statusLower) {
        case 'processing':
        case 'payment approved':
            normalizedStatus = 'In the Kitchen';
            break;
        case 'ready':
            normalizedStatus = 'Completed';
            break;
        case 'cancelled':
            normalizedStatus = null; // Don't show cancelled orders
            break;
        case 'in the kitchen':
            normalizedStatus = 'In the Kitchen';
            break;
        case 'pending payment':
            normalizedStatus = 'Pending Payment';
            break;
        case 'completed':
            normalizedStatus = 'Completed';
            break;
        default:
            console.warn('Unknown order status:', status);
            normalizedStatus = null; // Don't show orders with unknown status
            break;
    }

    // Log status normalization for debugging
    if (originalStatus !== normalizedStatus && normalizedStatus !== null) {
        console.log(`Order status normalized: "${originalStatus}" → "${normalizedStatus}"`);
    }

    return normalizedStatus;
}

// Function to determine the display status based on the order status
function getDisplayStatus(orderData) {
    // Only use the normal status, ignoring any kitchen status
    return normalizeOrderStatus(orderData.status) || 'Unknown';
}

function formatOrderItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return '<span class="text-muted">No items</span>';
    }

    try {
        // Make a safe copy of the items array, filtering out any invalid items
        const validItems = items.filter(item => item && typeof item === 'object');

        if (validItems.length === 0) {
            return '<span class="text-muted">No valid items</span>';
        }

        const sortedItems = [...validItems].sort((a, b) => {
            const quantityA = parseInt(a.quantity) || 0;
            const quantityB = parseInt(b.quantity) || 0;
            return quantityB - quantityA;
        });

        const displayItems = sortedItems.slice(0, 3);
        const remaining = sortedItems.length - 3;

        const itemsList = displayItems.map(function (item) {
            return '<div class="item-row text-center">' +
                '<span class="text-nowrap d-inline-flex justify-content-center align-items-center">' +
                '<span class="item-name">' + (item.name || 'Unnamed Item') + '</span>' +
                '<span class="item-quantity">× ' + (item.quantity || 1) + '</span>' +
                '</span>' +
                '</div>';
        }).join('');

        const remainingText = remaining > 0 ?
            '<div class="text-muted small">+' + remaining + ' more item' + (remaining !== 1 ? 's' : '') + '</div>' : '';

        return '<div class="order-items-list">' + itemsList + remainingText + '</div>';
    } catch (error) {
        console.error('Error formatting order items:', error);
        return '<span class="text-danger">Error displaying items</span>';
    }
}

// Function to filter orders based on search term
function filterOrders(searchTerm) {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    if (!searchTerm) {
        displayOrders(allOrders);
        return;
    }

    // Remove # and leading zeros for number comparison
    const cleanSearchTerm = searchTerm.replace(/^#0*/, '').toLowerCase();

    const filteredOrders = allOrders.filter(order => {
        // Get the order number without leading zeros
        const orderNum = order.orderNumber?.toString() || '';
        const cleanNum = orderNum.replace(/^0+/, '');

        // Try different matching patterns
        return cleanNum === cleanSearchTerm || // Exact match without leading zeros
            orderNum.includes(cleanSearchTerm) || // Partial match with original number
            order.orderNumberFormatted?.toLowerCase().includes(searchTerm.toLowerCase()); // Match with formatting
    });

    if (filteredOrders.length === 0) {
        tableBody.innerHTML =
            '<tr>' +
            '<td colspan="8" class="text-center py-4">' +
            '<div class="text-muted">No orders found matching "' + searchTerm + '"</div>' +
            '</td>' +
            '</tr>';
    } else {
        displayOrders(filteredOrders);
    }
}

// Function to display filtered or all orders
function displayOrders(orders) {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    console.debug('Displaying orders:', orders.length);
    console.debug('Orders before filtering:', orders.map(o => ({
        id: getDocId(o),
        status: o.status,
        total: o.total,
        timestamp: o.timestamp
    })));

    // Check for exact duplicates in the input array
    const inputOrderIds = orders.map(o => getDocId(o));
    const duplicateIds = inputOrderIds.filter((id, index) => inputOrderIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        console.warn('Duplicate order IDs in input array:', duplicateIds);
    }

    if (orders.length === 0) {
        tableBody.innerHTML =
            '<tr>' +
            '<td colspan="8" class="text-center py-4 text-muted">' +
            '<i class="bi bi-search me-2"></i>No orders found' +
            '</td>' +
            '</tr>';
        return;
    }

    // NUCLEAR DOM CLEANUP - Remove everything
    tableBody.innerHTML = '';

    // Remove all existing rows
    const existingRows = tableBody.querySelectorAll('tr');
    existingRows.forEach(row => row.remove());

    // Force complete cleanup
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    // Additional safety - clear any lingering data attributes
    tableBody.removeAttribute('data-processed');
    tableBody.removeAttribute('data-orders-count');

    // Only show orders with valid statuses: 'In the Kitchen', 'Pending Payment', 'Completed'
    const filteredOrders = orders.filter(orderData => {
        const normalizedStatus = normalizeOrderStatus(orderData.status);
        return normalizedStatus !== null; // Only show orders with valid statuses
    });

    // NUCLEAR OPTION - Multiple layers of duplicate prevention
    const seenIds = new Set();
    const seenDocIds = new Set();
    const seenOrderNumbers = new Set();

    const finalUniqueOrders = filteredOrders.filter(orderData => {
        const orderId = getDocId(orderData);
        const docId = orderData.id;
        const orderNumber = orderData.orderNumberFormatted || orderData.orderNumber;

        // TRIPLE CHECK for duplicates
        if (seenIds.has(orderId) || seenDocIds.has(docId) || seenOrderNumbers.has(orderNumber)) {
            console.warn('🚫🚫🚫 TRIPLE DUPLICATE DETECTED AND BLOCKED:', {
                orderId,
                docId,
                orderNumber,
                status: orderData.status
            });
            return false; // Skip duplicate
        }

        seenIds.add(orderId);
        seenDocIds.add(docId);
        seenOrderNumbers.add(orderNumber);
        return true;
    });

    console.debug('Final unique orders to display:', finalUniqueOrders.length);

    finalUniqueOrders.forEach(orderData => {
        // Create a log-friendly version of the order for debugging
        const orderSummary = {
            id: orderData.id,
            orderNumber: orderData.orderNumberFormatted || orderData.orderNumber,
            status: orderData.status,
            kitchenStatus: orderData.kitchenStatus,
            items: orderData.items?.length || 0,
            total: orderData.total
        };
        console.debug('Creating row for order:', orderSummary);
        try {
            const orderRow = createOrderRow(orderData);

            // Add unique identifier to prevent DOM duplicates
            const uniqueId = `order-${orderData.id}-${Date.now()}`;
            orderRow.setAttribute('data-order-id', orderData.id);
            orderRow.setAttribute('data-unique-id', uniqueId);

            // Check if this order already exists in DOM
            const existingRow = tableBody.querySelector(`[data-order-id="${orderData.id}"]`);
            if (existingRow) {
                console.warn('🚫 DOM DUPLICATE PREVENTED:', orderData.id);
                return;
            }

            tableBody.appendChild(orderRow);
        } catch (error) {
            console.error('Error creating row for order:', error, orderSummary);
            // Create a basic fallback row with error indicator
            const errorRow = document.createElement('tr');
            errorRow.innerHTML = '<td colspan="8" class="text-danger">Error displaying order #' +
                (orderData.orderNumberFormatted || orderData.orderNumber || 'Unknown') +
                ' - ' + error.message + '</td>';
            tableBody.appendChild(errorRow);
        }
    });
}

// Function to display no orders message
function displayNoOrders() {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    tableBody.innerHTML =
        '<tr>' +
        '<td colspan="7" class="text-center py-4">' +
        '<div class="text-muted">' +
        '<i class="fa fa-inbox fa-2x mb-2 d-block text-secondary"></i>' +
        'No orders found in Firebase' +
        '</div>' +
        '</td>' +
        '</tr>';
}

function viewOrderDetails(orderNumber) {
    console.log('Viewing details for order:', orderNumber);
    const db = firebase.firestore();

    // Update the order timestamp when viewed to ensure it's current
    updateOrderTimestamp(orderNumber).catch(err => {
        console.warn('Unable to update order timestamp:', err);
        // Continue even if update fails
    });

    db.collection('orders').doc(orderNumber).get().then((doc) => {
        if (doc.exists) {
            // Get raw data and sanitize it to ensure all required fields exist
            const rawOrderData = doc.data();

            // Merge the raw data with the ID to ensure it's available
            const orderWithId = {
                id: doc.id,
                ...rawOrderData
            };
            // Ensure discountType and discountPercent are present if available in raw data
            if (rawOrderData.discountType) orderWithId.discountType = rawOrderData.discountType;
            if (rawOrderData.discountPercent) orderWithId.discountPercent = rawOrderData.discountPercent;

            // Sanitize the order data for consistency
            const orderData = sanitizeOrderData(orderWithId);
            // Debug: log discount fields to verify presence
            console.log('[Order Modal] Discount fields:', {
                discount: orderData.discount,
                discountType: orderData.discountType,
                discountPercent: orderData.discountPercent
            });

            // Format timestamp - try multiple date fields
            let dateTimeStr = 'N/A';
            try {
                // Extract date from various possible fields
                let orderDate;

                // Always ensure we have a valid date - start with current date as fallback
                const fallbackDate = new Date();

                if (orderData.timestamp) {
                    // Handle Firestore timestamp objects
                    if (typeof orderData.timestamp.toDate === 'function') {
                        orderDate = orderData.timestamp.toDate();
                    }
                    // Handle Firestore timestamps stored as objects with seconds
                    else if (orderData.timestamp.seconds) {
                        orderDate = new Date(orderData.timestamp.seconds * 1000);
                    }
                    // Handle ISO string timestamps
                    else if (typeof orderData.timestamp === 'string') {
                        orderDate = new Date(orderData.timestamp);
                    }
                    // Handle numeric timestamps
                    else if (typeof orderData.timestamp === 'number') {
                        orderDate = new Date(orderData.timestamp);
                    }
                } else if (orderData.dateCreated) {
                    // Handle dateCreated in various formats
                    if (typeof orderData.dateCreated === 'string') {
                        orderDate = new Date(orderData.dateCreated);
                    } else if (orderData.dateCreated.toDate) {
                        orderDate = orderData.dateCreated.toDate();
                    } else if (orderData.dateCreated.seconds) {
                        orderDate = new Date(orderData.dateCreated.seconds * 1000);
                    } else {
                        orderDate = new Date(orderData.dateCreated);
                    }
                } else if (orderData.createdAt) {
                    // Handle createdAt in various formats
                    if (typeof orderData.createdAt === 'string') {
                        orderDate = new Date(orderData.createdAt);
                    } else if (orderData.createdAt.toDate) {
                        orderDate = orderData.createdAt.toDate();
                    } else if (orderData.createdAt.seconds) {
                        orderDate = new Date(orderData.createdAt.seconds * 1000);
                    } else {
                        orderDate = new Date(orderData.createdAt);
                    }
                } else if (orderData.lastUpdated) {
                    // Check for lastUpdated field from order updates
                    if (typeof orderData.lastUpdated === 'object' && orderData.lastUpdated.toDate) {
                        orderDate = orderData.lastUpdated.toDate();
                    } else if (orderData.lastUpdated.seconds) {
                        orderDate = new Date(orderData.lastUpdated.seconds * 1000);
                    } else {
                        orderDate = new Date(orderData.lastUpdated);
                    }
                }

                // If no valid date found, use the current date
                if (!orderDate || !(orderDate instanceof Date) || isNaN(orderDate.getTime())) {
                    console.warn('No valid date found for order, using current date as fallback');
                    orderDate = fallbackDate;
                }

                // Format the date using the obtained date object in the form:
                // Saturday, October 11, 2025 at 01:03 AM
                const datePart = orderDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const timePart = orderDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                dateTimeStr = datePart + ' at ' + timePart;
            } catch (error) {
                console.error('Error formatting date:', error);
            }

            // Calculate subtotal from items
            let itemsHtml = '<tr><td colspan="3" class="text-center text-muted">No items in this order</td></tr>';
            let computedSubtotal = 0;
            if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
                itemsHtml = orderData.items.map(item => {
                    const qty = item.quantity || 1;
                    const price = parseFloat(item.unitPrice || item.price || 0);
                    const lineTotal = qty * price;
                    computedSubtotal += lineTotal;
                    return '<tr>' +
                        '<td>' + (item.name || 'Unnamed Item') + '</td>' +
                        '<td class="text-center">' + qty + '</td>' +
                        '<td class="text-end">₱' + price.toFixed(2) + '</td>' +
                        '</tr>';
                }).join('');
            }
            // Use orderData.tax and orderData.discount if present, else 0
            const computedTax = parseFloat(orderData.tax || 0);
            const computedDiscount = parseFloat(orderData.discount || 0);
            // Always use the saved total for display
            const savedTotal = parseFloat(orderData.total) || (computedSubtotal + computedTax - computedDiscount);
            // Create the modal using DOM methods instead of template literals to avoid syntax issues
            // First, create a container to hold the modal HTML
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML =
                '<div class="modal fade" id="orderDetailsModal" tabindex="-1">' +
                '<div class="modal-dialog modal-lg">' +
                '<div class="modal-content">' +
                '<div class="modal-header">' +
                '<h5 class="modal-title">Order #' + orderData.orderNumberFormatted + '</h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
                '</div>' +
                '<div class="modal-body">' +
                '<div class="row mb-3">' +
                '<div class="col-md-6">' +
                '<p><strong>Date:</strong> ' + dateTimeStr + '</p>' +
                '<p><strong>Order Type:</strong> ' + (orderData.orderType || 'Dine in') + '</p>' +
                '<p><strong>Status:</strong> ' +
                '<span class="badge ' + getStatusBadgeClass(orderData.status) + '">' +
                (orderData.status || 'Processing') +
                '</span>' +
                '</p>' +
                (orderData.customerName ? '<p><strong>Customer:</strong> ' + orderData.customerName + '</p>' : '') +
                '</div>' +
                '<div class="col-md-6">' +
                '<p><strong>Table:</strong> ' + (orderData.tableNumber || 'N/A') + '</p>' +
                '<p><strong>Pax:</strong> ' + (orderData.paxNumber || orderData.pax || 'N/A') + '</p>' +
                '<p><strong>Order ID:</strong> ' + (orderData.orderNumberFormatted || orderData.orderNumber || 'N/A') + '</p>' +
                (orderData.specialInstructions ?
                    '<p><strong>Special Instructions:</strong><br>' +
                    '<small class="text-muted">' + orderData.specialInstructions + '</small></p>' : '') +
                '</div>' +
                '</div>' +
                '<div class="table-responsive">' +
                '<table class="table">' +
                '<thead>' +
                '<tr>' +
                '<th>Item</th>' +
                '<th class="text-center">Quantity</th>' +
                '<th class="text-end">Unit Price</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>' +
                itemsHtml +
                '</tbody>' +
                '<tfoot>' +
                '<tr>' +
                '<td colspan="2" class="text-end"><strong>Subtotal:</strong></td>' +
                '<td class="text-end">₱' + computedSubtotal.toFixed(2) + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td colspan="2" class="text-end"><strong>Tax:</strong></td>' +
                '<td class="text-end">₱' + computedTax.toFixed(2) + '</td>' +
                '</tr>' +
                ((computedDiscount > 0 || (orderData.discountType && orderData.discountPercent)) ? (
                    '<tr>' +
                    '<td colspan="2" class="text-end"><strong>Discount:</strong></td>' +
                    '<td class="text-end">' +
                    (
                        (orderData.discountType && orderData.discountPercent)
                            ? (orderData.discountType + ' ' + orderData.discountPercent + '%')
                            : (orderData.discountType ? orderData.discountType : ('₱' + computedDiscount.toFixed(2)))
                    ) +
                    '</td>' +
                    '</tr>'
                ) : '') +
                '<tr>' +
                '<td colspan="2" class="text-end"><strong>Total:</strong></td>' +
                '<td class="text-end"><strong>₱' + savedTotal.toFixed(2) + '</strong></td>' +
                '</tr>' +
                '</tfoot>' +
                '</table>' +
                '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>' +
                '<button type="button" class="btn btn-primary" onclick="printOrder(\'' + orderNumber + '\')">' +
                '<i class="fas fa-print me-1"></i> Print' +
                '</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            // Extract the modal HTML
            const modalHtml = modalContainer.innerHTML;

            // Remove existing modal if any
            const existingModal = document.getElementById('orderDetailsModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to document
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();
        } else {
            console.error('Order not found:', orderNumber);
            alert('Order not found');
        }
    }).catch((error) => {
        console.error('Error getting order details:', error);
        alert('Error loading order details');
    });
}

function printOrder(orderNumber) {
    // You can implement print functionality here
    window.print();
}

const dateInput = document.querySelector('.date-input');
const calendarIcon = document.querySelector('.calendar-icon');

calendarIcon.addEventListener('click', () => {
    if (dateInput.showPicker) {
        dateInput.showPicker();
    } else {
        dateInput.focus();
    }
});

function formatOrderDate(date) {
    // Example: 2025-09-13 02:44 AM
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${yyyy}-${mm}-${dd} ${hours}:${minutes} ${ampm}`;
}

// ---------------------------
// Orders UI post-processor
// Appended code: safely runs after existing order rendering to format
// item rows and inject a visible 'Click View for More' prompt.
// This code intentionally does not modify existing functions; it only
// post-processes DOM nodes created by the code above.
(function () {
    'use strict';

    function processOrderItemsList(container) {
        if (!container) return;

        const itemRows = Array.from(container.querySelectorAll('.item-row'));
        const originalMore = container.querySelector('.text-muted.small');

        // Show only the first item-row and left-align it
        itemRows.forEach((r, i) => {
            if (i === 0) {
                r.style.display = 'flex';
                r.style.justifyContent = 'flex-start';
                r.style.textAlign = 'left';
            } else {
                r.style.display = 'none';
            }
        });

        // Ensure name and qty display inline like 'Bangsilog  x 1'
        if (itemRows.length > 0) {
            const first = itemRows[0];
            const nameEl = first.querySelector('.item-name');
            const qtyEl = first.querySelector('.item-quantity');
            if (nameEl && qtyEl) {
                nameEl.style.display = 'inline-block';
                nameEl.style.marginRight = '8px';
                qtyEl.style.display = 'inline-block';
                qtyEl.style.marginLeft = '4px';
            }
        }

        // Create or update a visible prompt element below the items
        let prompt = container.querySelector('.order-view-more-prompt');
        if (!prompt) {
            prompt = document.createElement('div');
            prompt.className = 'order-view-more-prompt text-muted small';
            prompt.textContent = 'Click View for More';
            container.appendChild(prompt);
        } else if (/\+\d+\s+more/i.test(prompt.textContent)) {
            prompt.textContent = 'Click View for More';
        }

        // Show prompt only when there are extra items
        const hasMore = itemRows.length > 1 || (originalMore && /\+\d+\s+more/i.test(originalMore.textContent));
        prompt.style.display = hasMore ? 'block' : 'none';
        prompt.style.fontStyle = 'italic';
        prompt.style.marginTop = '6px';
        prompt.style.color = '#6c757d';

        // Hide the original '+N more' if present
        if (originalMore && originalMore !== prompt) {
            originalMore.style.display = 'none';
        }
    }

    function processAll() {
        document.querySelectorAll('.order-items-list').forEach(processOrderItemsList);
    }

    // Run after initial render (give order.js a moment)
    document.addEventListener('DOMContentLoaded', () => setTimeout(processAll, 120));

    // Observe table body for changes (re-renders) and re-apply
    const tbody = document.querySelector('table tbody');
    if (tbody) {
        const mo = new MutationObserver(() => {
            clearTimeout(window.__orderUiFixTimeout);
            window.__orderUiFixTimeout = setTimeout(processAll, 80);
        });
        mo.observe(tbody, { childList: true, subtree: true });
    }
})();

