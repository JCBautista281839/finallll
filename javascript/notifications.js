// Kitchen role access control for kitchen.html page
async function setupKitchenPageAccess() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }

        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for kitchen page access:', error);
    }

    firebase.auth().onAuthStateChanged(async function (user) {
        if (!user) return;

        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'user';

                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen role detected - Ensuring Home link is visible');

                    // Ensure Home link is visible and points to kitchen.html
                    const homeNavLink = document.querySelector('a[title="Home"]');
                    if (homeNavLink) {
                        homeNavLink.href = '/html/kitchen.html';
                        homeNavLink.title = 'Home';
                        homeNavLink.style.display = '';
                        console.log('🍳 Kitchen: Home link ensured visible');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking user role for kitchen page:', error);
        }
    });
}

// Kitchen role access control for notifications page
async function setupKitchenNotificationsAccess() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }

        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for kitchen notifications access:', error);
    }

    firebase.auth().onAuthStateChanged(async function (user) {
        if (!user) return;

        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role || 'user';

                if (userRole === 'kitchen') {
                    console.log('🍳 Kitchen role detected - Setting up limited navigation');

                    // Hide navigation items except Home (kitchen.html), Notifications (notifi.html), and Inventory
                    const allNavLinks = document.querySelectorAll('.nav-link');
                    allNavLinks.forEach(link => {
                        const href = link.getAttribute('href');
                        const title = link.getAttribute('title');

                        // Keep only Home (kitchen.html), Notifications (notifi.html), and Inventory
                        if (href && !href.includes('kitchen.html') &&
                            !href.includes('notifi.html') &&
                            !href.includes('Inventory.html') &&
                            title !== 'Logout' &&
                            title !== 'Home') {
                            link.style.display = 'none';
                        }
                    });

                    // Redirect home link to kitchen dashboard
                    const homeNavLink = document.querySelector('#homeNavLink') || document.querySelector('a[href*="Dashboard.html"]');
                    if (homeNavLink) {
                        homeNavLink.href = '/html/kitchen.html';
                        homeNavLink.title = 'Kitchen Dashboard';
                        console.log('🍳 Kitchen: Home link redirected to kitchen.html');
                    } else {
                        // If no home link exists, create one for kitchen users
                        const navContainer = document.querySelector('.nav');
                        if (navContainer) {
                            const homeLink = document.createElement('a');
                            homeLink.href = '/html/kitchen.html';
                            homeLink.className = 'nav-link text-white';
                            homeLink.title = 'Home';
                            homeLink.innerHTML = `
                                <img src="../src/Icons/home.png" alt="Home" class="nav-icon">
                                <div class="nav-text">Home</div>
                            `;

                            // Insert at the beginning of the nav
                            navContainer.insertBefore(homeLink, navContainer.firstChild);
                            console.log('🍳 Kitchen: Created new home link to kitchen.html');
                        }
                    }

                    // Update page title and subtitle for kitchen users
                    const pageTitle = document.querySelector('.inventory-title');
                    const pageSubtitle = document.querySelector('.inventory-subtitle');
                    if (pageTitle) {
                        pageTitle.textContent = 'Kitchen Notifications';
                    }
                    if (pageSubtitle) {
                        pageSubtitle.textContent = 'Inventory alerts and restocking reminders';
                    }
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
        }
    });
}

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

// Lalamove Helper Functions - Duplicated from shipping.js

// Function to format phone number to Philippine +63 format
function formatPhoneNumber(phone) {
    if (!phone) return '+639568992189'; // Default fallback

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Handle different Philippine number formats
    if (digits.startsWith('63')) {
        // Already has country code (63)
        return '+' + digits;
    } else if (digits.startsWith('09')) {
        // Mobile number starting with 09 (e.g., 09171234567)
        return '+63' + digits.substring(1); // Remove '0' and add '+63'
    } else if (digits.startsWith('9') && digits.length === 10) {
        // Mobile number without leading 0 (e.g., 9171234567)
        return '+63' + digits;
    } else {
        // Invalid format, return default
        console.warn('[notifications.js] Invalid phone number format:', phone, 'Using default.');
        return '+639568992189';
    }
}

// Function to check if quotation has expired
function isQuotationExpired(quotationData) {
    console.log('[notifications.js] 🕐 Checking quotation expiry...');

    if (!quotationData?.data?.expiresAt) {
        console.log('[notifications.js] ⚠️ No expiry date found in quotation');
        return false;
    }

    try {
        const expiresAt = new Date(quotationData.data.expiresAt);
        const now = new Date();
        const isExpired = now >= expiresAt;

        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60));

        console.log('[notifications.js] 📅 Quotation expiry check:', {
            expiresAt: expiresAt.toISOString(),
            now: now.toISOString(),
            isExpired: isExpired,
            minutesUntilExpiry: minutesUntilExpiry
        });

        if (isExpired) {
            console.log('[notifications.js] ❌ Quotation has EXPIRED');
        } else {
            console.log(`[notifications.js] ✅ Quotation valid for ${minutesUntilExpiry} more minutes`);
        }

        return isExpired;
    } catch (error) {
        console.error('[notifications.js] Error checking quotation expiry:', error);
        return false;
    }
}

// Function to refresh expired quotation with same addresses
async function refreshExpiredQuotation(expiredQuotation) {
    console.log('[notifications.js] 🔄 Refreshing expired quotation...');

    try {
        if (!expiredQuotation?.data?.stops || expiredQuotation.data.stops.length < 2) {
            throw new Error('Invalid expired quotation structure - missing stops');
        }

        const stops = expiredQuotation.data.stops;
        const pickupStop = stops[0];
        const deliveryStop = stops[1];

        console.log('[notifications.js] 📍 Extracting addresses from expired quotation:', {
            pickup: pickupStop.address,
            delivery: deliveryStop.address,
            pickupCoords: pickupStop.coordinates,
            deliveryCoords: deliveryStop.coordinates
        });

        // Create fresh quotation request using same addresses and coordinates
        const bodyObj = {
            data: {
                serviceType: expiredQuotation.data.serviceType || 'MOTORCYCLE',
                specialRequests: expiredQuotation.data.specialRequests || [],
                language: 'en_PH', // Always use lowercase, don't inherit from expired quotation
                stops: [
                    {
                        coordinates: {
                            lat: pickupStop.coordinates.lat,
                            lng: pickupStop.coordinates.lng
                        },
                        address: pickupStop.address
                    },
                    {
                        coordinates: {
                            lat: deliveryStop.coordinates.lat,
                            lng: deliveryStop.coordinates.lng
                        },
                        address: deliveryStop.address
                    }
                ],
                isRouteOptimized: expiredQuotation.data.isRouteOptimized || false,
                item: {
                    quantity: "1",
                    weight: "LESS_THAN_3_KG",
                    categories: ["FOOD_DELIVERY"],
                    handlingInstructions: ["KEEP_UPRIGHT"]
                }
            }
        };

        console.log('[notifications.js] 📤 Sending fresh quotation request:', bodyObj);

        // Call quotation API
        const response = await fetch('/api/quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Fresh quotation API failed: ${response.status} ${errorText}`);
        }

        const freshQuotation = await response.json();
        console.log('[notifications.js] ✅ Fresh quotation received:', freshQuotation);

        // Validate fresh quotation
        if (!freshQuotation.data || !freshQuotation.data.quotationId) {
            throw new Error('Fresh quotation response is invalid');
        }

        console.log('[notifications.js] 🆕 Fresh quotation validated successfully:', {
            newQuotationId: freshQuotation.data.quotationId,
            newExpiresAt: freshQuotation.data.expiresAt,
            stops: freshQuotation.data.stops?.length || 0
        });

        return freshQuotation;

    } catch (error) {
        console.error('[notifications.js] ❌ Error refreshing quotation:', error);
        throw new Error(`Failed to refresh quotation: ${error.message}`);
    }
}

// Function to place Lalamove order from notifications (main function)
async function placeLalamoveOrderFromNotifications(quotationData, customerInfo) {
    try {
        console.log('[notifications.js] ====== PLACE LALAMOVE ORDER START ======');

        if (!quotationData) {
            throw new Error('No quotation data provided');
        }

        let quotation = quotationData;

        // Basic validation
        if (!quotation.data || !quotation.data.quotationId || !Array.isArray(quotation.data.stops) || quotation.data.stops.length < 2) {
            throw new Error('Invalid quotation data format');
        }

        console.log('[notifications.js] 🔍 Initial quotation loaded:', {
            quotationId: quotation.data.quotationId,
            expiresAt: quotation.data.expiresAt,
            stopsCount: quotation.data.stops.length
        });

        // Check if quotation has expired and refresh if needed
        if (isQuotationExpired(quotation)) {
            console.log('[notifications.js] 🔄 Quotation expired, attempting to refresh...');

            try {
                // Get fresh quotation using same addresses
                const freshQuotation = await refreshExpiredQuotation(quotation);

                // Update quotation variable with fresh data
                quotation = freshQuotation;

                console.log('[notifications.js] ✅ Successfully refreshed expired quotation:', {
                    oldQuotationId: quotationData.data.quotationId,
                    newQuotationId: freshQuotation.data.quotationId,
                    newExpiresAt: freshQuotation.data.expiresAt
                });

            } catch (refreshError) {
                console.error('[notifications.js] ❌ Failed to refresh expired quotation:', refreshError);
                throw new Error(`Quotation expired and refresh failed: ${refreshError.message}`);
            }
        } else {
            console.log('[notifications.js] ✅ Quotation is still valid, proceeding with existing quotation');
        }

        // Use provided customer info
        const customerName = customerInfo.name || 'Guest';
        const customerPhone = customerInfo.phone || '';

        // Build payload to match Lalamove /v3/orders expected body (wrapped with data)
        const payload = {
            data: {
                quotationId: quotation.data.quotationId,
                sender: {
                    stopId: quotation.data.stops[0].stopId || quotation.data.stops[0].id || 'SENDER_STOP',
                    name: 'Restaurant',
                    phone: '+639568992189' // Restaurant phone
                },
                recipients: [
                    {
                        stopId: quotation.data.stops[1].stopId || quotation.data.stops[1].id || 'RECIPIENT_STOP',
                        name: customerName,
                        phone: formatPhoneNumber(customerPhone)
                    }
                ],
                metadata: {
                    orderRef: 'NOTIF_ORDER_' + Date.now()
                }
            }
        };

        console.log('[notifications.js] 📤 Sending Lalamove order with valid quotation:', {
            quotationId: payload.data.quotationId,
            senderStopId: payload.data.sender.stopId,
            recipientStopId: payload.data.recipients[0].stopId,
            customerName: payload.data.recipients[0].name,
            customerPhone: payload.data.recipients[0].phone
        });

        const resp = await fetch('/api/place-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await resp.json();
        if (!resp.ok) {
            console.error('[notifications.js] ❌ Lalamove API returned error:', {
                status: resp.status,
                statusText: resp.statusText,
                error: result
            });
            throw new Error(result.error || JSON.stringify(result));
        }

        console.log('[notifications.js] ✅ Lalamove order placed successfully:', result);
        console.log('[notifications.js] ====== PLACE LALAMOVE ORDER SUCCESS ======');

        return result;
    } catch (error) {
        console.error('[notifications.js] ❌ placeLalamoveOrderFromNotifications error:', error);
        console.error('[notifications.js] ====== PLACE LALAMOVE ORDER FAILED ======');
        throw error;
    }
}

// Helper function to get stops array from order document
async function getStopsFromOrder(orderId) {
    console.log('[notifications.js] 🔍 Getting stops data from order:', orderId);

    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Get order document
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new Error(`Order not found: ${orderId}`);
        }

        const orderData = orderDoc.data();
        console.log('[notifications.js] 📋 Order data retrieved for stops extraction');

        // Try multiple possible locations for stops data
        let stops = null;
        let serviceType = null;
        let distance = null;

        // Check paymentInfo.orderSummary.deliveryDetails (most common location based on image 3)
        if (orderData.paymentInfo?.orderSummary?.deliveryDetails) {
            const deliveryDetails = orderData.paymentInfo.orderSummary.deliveryDetails;
            
            // Build stops array from delivery details
            if (deliveryDetails.pickupLocation || deliveryDetails.dropoffLocation) {
                stops = [];
                
                // Add pickup stop (sender)
                if (deliveryDetails.pickupLocation) {
                    stops.push({
                        coordinates: deliveryDetails.pickupLocation.coordinates || { lat: '', lng: '' },
                        address: deliveryDetails.pickupLocation.address || deliveryDetails.pickupLocation,
                        stopId: 'SENDER_STOP'
                    });
                }
                
                // Add delivery stop (recipient)
                if (deliveryDetails.dropoffLocation) {
                    stops.push({
                        coordinates: deliveryDetails.dropoffLocation.coordinates || { lat: '', lng: '' },
                        address: deliveryDetails.dropoffLocation.address || deliveryDetails.dropoffLocation,
                        stopId: 'RECIPIENT_STOP'
                    });
                }
                
                serviceType = deliveryDetails.service || deliveryDetails.serviceType;
                distance = deliveryDetails.distance;
                console.log('[notifications.js] ✅ Found stops in paymentInfo.orderSummary.deliveryDetails');
            }
            // Check if stops array exists directly
            else if (Array.isArray(deliveryDetails.stops) && deliveryDetails.stops.length >= 2) {
                stops = deliveryDetails.stops;
                serviceType = deliveryDetails.service || deliveryDetails.serviceType;
                distance = deliveryDetails.distance;
                console.log('[notifications.js] ✅ Found stops array in paymentInfo.orderSummary.deliveryDetails');
            }
        }

        // Fallback: Check shippingInfo
        if (!stops && orderData.shippingInfo) {
            if (orderData.shippingInfo.quotationData?.data?.stops) {
                stops = orderData.shippingInfo.quotationData.data.stops;
                serviceType = orderData.shippingInfo.quotationData.data.serviceType;
                distance = orderData.shippingInfo.quotationData.data.distance;
                console.log('[notifications.js] ✅ Found stops in shippingInfo.quotationData');
            }
        }

        // Fallback: Check direct quotationData field
        if (!stops && orderData.quotationData?.data?.stops) {
            stops = orderData.quotationData.data.stops;
            serviceType = orderData.quotationData.data.serviceType;
            distance = orderData.quotationData.data.distance;
            console.log('[notifications.js] ✅ Found stops in quotationData');
        }

        // Fallback: Build stops from customer address and restaurant location
        if (!stops) {
            console.log('[notifications.js] ⚠️ No stops found, attempting to build from customer address...');
            
            const customerAddress = orderData.shippingInfo?.address || 
                                   orderData.customerInfo?.address || 
                                   orderData.address;
            
            if (customerAddress) {
                stops = [
                    {
                        coordinates: { lat: '', lng: '' },
                        address: 'Viktoria\'s Bistro, Restaurant Address', // Default restaurant address
                        stopId: 'SENDER_STOP'
                    },
                    {
                        coordinates: { lat: '', lng: '' },
                        address: customerAddress,
                        stopId: 'RECIPIENT_STOP'
                    }
                ];
                console.log('[notifications.js] ✅ Built stops from customer address');
            }
        }

        if (!stops || stops.length < 2) {
            console.error('[notifications.js] ❌ Could not find valid stops data in order:', {
                orderId,
                hasPaymentInfo: !!orderData.paymentInfo,
                hasShippingInfo: !!orderData.shippingInfo,
                hasQuotationData: !!orderData.quotationData
            });
            throw new Error('Could not extract stops data from order document');
        }

        console.log('[notifications.js] ✅ Successfully extracted stops:', {
            stopsCount: stops.length,
            serviceType,
            distance
        });

        return {
            stops,
            serviceType,
            distance
        };

    } catch (error) {
        console.error('[notifications.js] ❌ Error getting stops from order:', error);
        throw error;
    }
}

// Function to get quotation data by quotation ID from Firestore
async function getQuotationById(quotationId) {
    console.log('[notifications.js] 🔍 Getting quotation data for quotation ID:', quotationId);

    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Only use notifications collection
        const notifQuery = await db.collection('notifications')
            .where('quotation.id', '==', quotationId)
            .limit(1)
            .get();

        if (!notifQuery.empty) {
            const notifDoc = notifQuery.docs[0];
            const notifData = notifDoc.data();
            const quotationObj = notifData.quotation || {};
            
            // Check if quotation has expired
            let expired = false;
            if (quotationObj.expiresAt) {
                const expiresAt = quotationObj.expiresAt.toDate ? quotationObj.expiresAt.toDate() : new Date(quotationObj.expiresAt);
                if (expiresAt < new Date()) expired = true;
            }
            if (expired) {
                throw new Error('Quotation has expired. Please create a new quotation.');
            }
            
            // Check if stops array is missing or too short
            let stopsData = null;
            if (!Array.isArray(quotationObj.stops) || quotationObj.stops.length < 2) {
                console.warn('[notifications.js] ⚠️ Stops array missing or incomplete in notification quotation');
                console.log('[notifications.js] 📋 Notification quotation structure:', {
                    hasStops: !!quotationObj.stops,
                    stopsLength: quotationObj.stops?.length || 0,
                    quotationKeys: Object.keys(quotationObj)
                });
                
                // Try to get stops from associated order document
                if (notifData.orderId) {
                    console.log('[notifications.js] 🔄 Attempting to fetch stops from order:', notifData.orderId);
                    try {
                        stopsData = await getStopsFromOrder(notifData.orderId);
                        console.log('[notifications.js] ✅ Successfully retrieved stops from order document');
                    } catch (stopsError) {
                        console.error('[notifications.js] ❌ Failed to get stops from order:', stopsError);
                        throw new Error(`Invalid quotation data: stops array missing in notification and could not retrieve from order (${stopsError.message})`);
                    }
                } else {
                    throw new Error('Invalid quotation data: stops array missing or too short and no orderId available for fallback.');
                }
            } else {
                // Stops are present in notification quotation
                stopsData = {
                    stops: quotationObj.stops,
                    serviceType: quotationObj.serviceType,
                    distance: quotationObj.distance
                };
            }
            
            // Return in expected format for Lalamove order placement
            return {
                firestoreDocId: notifDoc.id,
                quotationId: quotationObj.id,
                orderId: notifData.orderId,
                customerInfo: notifData.customerInfo,
                quotationData: quotationObj,
                status: notifData.status || 'unknown',
                createdAt: notifData.createdAt,
                updatedAt: notifData.updatedAt,
                data: {
                    quotationId: quotationObj.id,
                    stops: stopsData.stops,
                    expiresAt: quotationObj.expiresAt,
                    serviceType: stopsData.serviceType || quotationObj.serviceType,
                    priceBreakdown: {
                        total: quotationObj.price,
                        currency: quotationObj.currency || 'PHP'
                    },
                    distance: stopsData.distance || quotationObj.distance,
                    status: quotationObj.status
                }
            };
        }

        // Not found in notifications collection
        throw new Error(`No quotation found with ID: ${quotationId}`);
    } catch (error) {
        console.error('[notifications.js] ❌ Error retrieving quotation by ID:', error);
        throw error;
    }
}

// Function to get quotation data from order document
async function getOrderQuotationData(orderId) {
    console.log('[notifications.js] 🔍 Getting quotation data for order:', orderId);

    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Get order document
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new Error('Order not found');
        }

        const orderData = orderDoc.data();
        console.log('[notifications.js] 📋 Order data retrieved:', {
            orderId: orderId,
            hasShippingInfo: !!orderData.shippingInfo,
            hasQuotationData: !!(orderData.quotationData || orderData.lalamoveQuotation)
        });

        // Try to get quotation data from various possible locations
        let quotationData = null;

        // Check for quotation in shippingInfo
        if (orderData.shippingInfo?.quotationData) {
            quotationData = orderData.shippingInfo.quotationData;
            console.log('[notifications.js] ✅ Found quotation in shippingInfo.quotationData');
        }
        // Check for direct quotation field
        else if (orderData.quotationData) {
            quotationData = orderData.quotationData;
            console.log('[notifications.js] ✅ Found quotation in quotationData field');
        }
        // Check for lalamove-specific field
        else if (orderData.lalamoveQuotation) {
            quotationData = orderData.lalamoveQuotation;
            console.log('[notifications.js] ✅ Found quotation in lalamoveQuotation field');
        }
        // Check sessionStorage as fallback (might be available if order was just placed)
        else {
            console.log('[notifications.js] ⚠️ No quotation found in order, checking sessionStorage...');
            const rawQuotation = sessionStorage.getItem('quotationData') || sessionStorage.getItem('quotationResponse');
            if (rawQuotation) {
                quotationData = typeof rawQuotation === 'string' ? JSON.parse(rawQuotation) : rawQuotation;
                console.log('[notifications.js] ✅ Found quotation in sessionStorage as fallback');
            }
        }

        if (!quotationData) {
            throw new Error('No quotation data found for this order');
        }

        // Validate quotation structure
        if (!quotationData.data || !quotationData.data.quotationId) {
            throw new Error('Invalid quotation data structure');
        }

        console.log('[notifications.js] ✅ Quotation data validated:', {
            quotationId: quotationData.data.quotationId,
            expiresAt: quotationData.data.expiresAt,
            stopsCount: quotationData.data.stops?.length || 0
        });

        return quotationData;

    } catch (error) {
        console.error('[notifications.js] ❌ Error getting quotation data:', error);
        throw error;
    }
}

// Function to get customer info from order document
async function getCustomerInfoFromOrder(orderId) {
    console.log('[notifications.js] 👤 Getting customer info for order:', orderId);

    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Get order document
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new Error('Order not found');
        }

        const orderData = orderDoc.data();

        // Extract customer info from various possible locations
        let customerInfo = {
            name: 'Guest',
            phone: ''
        };

        // Try customerInfo field first
        if (orderData.customerInfo) {
            customerInfo.name = orderData.customerInfo.fullName ||
                orderData.customerInfo.name ||
                (orderData.customerInfo.firstName ?
                    (orderData.customerInfo.firstName + (orderData.customerInfo.lastName ? ' ' + orderData.customerInfo.lastName : '')) :
                    'Guest');
            customerInfo.phone = orderData.customerInfo.phone || '';
        }
        // Try top-level fields as fallback
        else {
            customerInfo.name = orderData.customerName || orderData.name || 'Guest';
            customerInfo.phone = orderData.customerPhone || orderData.phone || '';
        }

        console.log('[notifications.js] ✅ Customer info extracted:', {
            name: customerInfo.name,
            phone: customerInfo.phone ? '***' + customerInfo.phone.slice(-4) : 'None'
        });

        return customerInfo;

    } catch (error) {
        console.error('[notifications.js] ❌ Error getting customer info:', error);
        throw error;
    }
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
async function refreshUnseenNotificationBadge() {
    try {
        // Ensure Firebase is initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }

        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        console.error('Error initializing Firebase for notification badge:', error);
        return;
    }

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

    // Check user role to determine which notifications to count
    let userRole = 'admin'; // Default to admin
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userRole = userData.role || 'admin';
            }
        }
    } catch (error) {
        console.error('Error checking user role for badge:', error);
    }

    let queryPromise;

    if (userRole === 'kitchen') {
        // Kitchen users only count inventory-related notifications - OPTIMIZED BADGE QUERY
        console.log('🍳 Kitchen: FAST BADGE - Counting inventory notifications...');
        queryPromise = db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .where('seen', '==', false)
            .get()
            .then(function (querySnapshot) {
                console.log('🍳 Kitchen: Badge count:', querySnapshot.size, 'unseen inventory notifications');
                return querySnapshot;
            });
    } else {
        // Admin users count all notifications
        queryPromise = db.collection('notifications')
            .where('seen', '==', false)
            .get();
    }

    queryPromise
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
    async function markAllNotificationsSeen() {
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;

        // Check user role to determine which notifications to mark as seen
        let userRole = 'admin'; // Default to admin
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userRole = userData.role || 'admin';
                }
            }
        } catch (error) {
            console.error('Error checking user role for mark seen:', error);
        }

        let queryPromise;

        if (userRole === 'kitchen') {
            // Kitchen users only mark inventory notifications as seen - OPTIMIZED MARK SEEN QUERY
            console.log('🍳 Kitchen: FAST MARK SEEN - Marking inventory notifications as seen...');
            queryPromise = db.collection('notifications')
                .where('type', 'in', ['empty', 'restock', 'inventory'])
                .where('seen', '==', false)
                .get()
                .then(function (querySnapshot) {
                    console.log('🍳 Kitchen: Marking', querySnapshot.size, 'inventory notifications as seen');
                    return querySnapshot;
                });
        } else {
            // Admin users mark all notifications as seen
            queryPromise = db.collection('notifications')
                .where('seen', '==', false)
                .get();
        }

        queryPromise
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
async function loadNotifications() {
    try {
        // Ensure Firebase is initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }

        // Use global db instance from main.js if available
        var db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            console.error('Firestore not available');
            var notificationStatus = document.getElementById('notificationStatus');
            if (notificationStatus) {
                notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error: Firestore not initialized.</td></tr>';
            }
            updateNotificationBadge(0);
            return;
        }
    } catch (error) {
        console.error('Error initializing Firebase for notifications:', error);
        var notificationStatus = document.getElementById('notificationStatus');
        if (notificationStatus) {
            notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error: Firebase initialization failed.</td></tr>';
        }
        updateNotificationBadge(0);
        return;
    }
    var notificationStatus = document.getElementById('notificationStatus');
    if (!notificationStatus) return;
    notificationStatus.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Loading notifications...</td></tr>';

    // Check user role to determine which notifications to show
    let userRole = 'admin'; // Default to admin
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            console.log('🔍 Checking user role for UID:', user.uid);
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userRole = userData.role || 'admin';
                console.log('👤 User role detected:', userRole);
            } else {
                console.log('⚠️ User document not found, defaulting to admin');
            }
        } else {
            console.log('⚠️ No authenticated user, defaulting to admin');
        }
    } catch (error) {
        console.error('❌ Error checking user role:', error);
    }

    console.log('📊 User role:', userRole, '- Loading notifications...');

    let queryPromise;

    if (userRole === 'kitchen') {
        // Kitchen users only see inventory-related notifications - SIMPLE QUERY
        console.log('🍳 Kitchen: Loading inventory notifications with simple query...');
        queryPromise = db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .limit(50)
            .get()
            .then(function (querySnapshot) {
                console.log('🍳 Kitchen: Loaded', querySnapshot.size, 'inventory notifications');
                // Sort by timestamp in JavaScript to avoid composite index requirement
                const docs = [];
                querySnapshot.forEach(function (doc) {
                    docs.push(doc);
                });
                docs.sort(function (a, b) {
                    const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
                    const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
                    return timestampB - timestampA; // Descending order
                });
                return { docs: docs };
            })
            .catch(function (error) {
                console.log('🍳 Kitchen: Index error, using simple query:', error);
                // Final fallback - get all notifications and filter client-side
                return db.collection('notifications')
                    .limit(100)
                    .get()
                    .then(function (querySnapshot) {
                        const docs = [];
                        querySnapshot.forEach(function (doc) {
                            const data = doc.data();
                            if (['empty', 'restock', 'inventory'].includes(data.type)) {
                                docs.push(doc);
                            }
                        });
                        docs.sort(function (a, b) {
                            const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
                            const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
                            return timestampB - timestampA;
                        });
                        return { docs: docs.slice(0, 50) };
                    });
            });
    } else {
        // Admin users see all notifications - using simple query to avoid index issues
        console.log('👑 Admin: Querying for all notifications with simple query...');

        queryPromise = db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get()
            .catch(function (error) {
                console.log('⚠️ Admin: Error with timestamp orderBy query, using basic query:', error);
                // Final fallback - just get recent notifications without ordering
                return db.collection('notifications')
                    .limit(50)
                    .get()
                    .then(function (querySnapshot) {
                        console.log('👑 Admin: Fallback loaded', querySnapshot.size, 'notifications (no ordering)');
                        // Sort by timestamp in JavaScript
                        const docs = [];
                        querySnapshot.forEach(function (doc) {
                            docs.push(doc);
                        });
                        docs.sort(function (a, b) {
                            const timestampA = a.data().timestamp ? a.data().timestamp.toDate() : new Date(0);
                            const timestampB = b.data().timestamp ? b.data().timestamp.toDate() : new Date(0);
                            return timestampB - timestampA; // Descending order
                        });
                        return { docs: docs };
                    });
            });
    }

    queryPromise
        .then(function (result) {
            // Handle both QuerySnapshot and custom result format
            var docs = result.docs || result;
            if (Array.isArray(docs)) {
                console.log('📊 Admin: Processing', docs.length, 'notifications');
            } else {
                console.log('📊 Admin: Processing', docs.size || 0, 'notifications');
            }

            // Check if docs is empty (handle both array and QuerySnapshot)
            const isEmpty = Array.isArray(docs) ? docs.length === 0 : (docs.empty || docs.size === 0);
            if (isEmpty) {
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

            // Handle both QuerySnapshot.forEach and array iteration
            const forEachMethod = docs.forEach || Array.prototype.forEach;
            forEachMethod.call(docs, function (doc) {
                try {
                    var data = doc.data();

                    // Skip non-inventory notifications for kitchen users
                    if (userRole === 'kitchen' && !['empty', 'restock', 'inventory'].includes(data.type)) {
                        console.log('🍳 Kitchen: Skipping non-inventory notification:', data.type);
                        return; // Skip this notification
                    }

                    notifCount++;

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
                    } else if (data.type === 'order_approval') {
                        typeText = 'Order Approval';
                    } else {
                        typeText = data.type || 'Other';
                    }
                    var time = '';
                    try {
                        if (data.timestamp) {
                            if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                                // Firestore timestamp
                                time = timeAgo(data.timestamp.toDate());
                            } else if (typeof data.timestamp === 'string') {
                                // ISO string timestamp
                                time = timeAgo(new Date(data.timestamp));
                            } else if (data.timestamp instanceof Date) {
                                // Already a Date object
                                time = timeAgo(data.timestamp);
                            } else if (typeof data.timestamp === 'object' && data.timestamp.seconds) {
                                // Firestore timestamp object format
                                time = timeAgo(new Date(data.timestamp.seconds * 1000));
                            } else {
                                // Fallback
                                time = 'Unknown time';
                            }
                        } else {
                            time = 'No timestamp';
                        }
                    } catch (timestampError) {
                        console.warn('Error processing timestamp for notification:', doc.id, timestampError);
                        time = 'Invalid timestamp';
                    }
                    if (!data.seen) {
                        unseenCount++;
                        batch.update(doc.ref, { seen: true });
                    }

                    // Handle payment verification notifications with action buttons (only for admin users)
                    if (data.type === 'payment_verification' && data.status === 'pending' && userRole !== 'kitchen') {
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
                                <div class="order-details" style="margin-top: 5px;">
                                    <small>
                                        <strong>Order ID:</strong> ${data.orderId || 'N/A'} | 
                                        <strong>Quotation ID:</strong> ${data.quotation?.id || 'N/A'} | 
                                        <strong>Service:</strong> ${data.quotation?.serviceType || 'N/A'} | 
                                        <strong>Est. Time:</strong> ${data.quotation?.estimatedTime || 'N/A'}
                                    </small>
                                </div>
                                <div class="order-summary" style="margin-top: 5px; padding: 5px; background: #f8f9fa; border-radius: 4px;">
                                    <small>
                                        <strong>Order Summary:</strong><br>
                                        ${data.orderSummary?.items?.map(item =>
                            `${item.name} x${item.quantity} - ₱${(typeof item.total === 'number' ? item.total.toFixed(2) : '0.00')}`
                        ).join('<br>') || 'No items'}<br>
                                        <strong>Subtotal:</strong> ₱${(typeof data.orderSummary?.subtotal === 'number' ? data.orderSummary.subtotal.toFixed(2) : '0.00')} | 
                                        <strong>Shipping:</strong> ₱${(typeof data.orderSummary?.shippingFee === 'number' ? data.orderSummary.shippingFee.toFixed(2) : '0.00')} | 
                                        <strong>Total:</strong> ₱${(typeof data.orderSummary?.total === 'number' ? data.orderSummary.total.toFixed(2) : '0.00')}
                                    </small>
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
                                    <button class="btn btn-danger btn-sm me-2" onclick="handlePaymentVerification('${doc.id}', 'declined')" 
                                            style="background: #dc3545; border: none; padding: 5px 15px; border-radius: 4px; color: white;">
                                        ✗ Decline
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="handleLalamoveReady('${doc.id}')" 
                                            style="background: #ffc107; border: none; padding: 5px 15px; border-radius: 4px; color: black;">
                                        <i class="fas fa-motorcycle"></i> Lalamove Ready!
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td>${time}</td>
                    </tr>`;
                    } else if (data.type === 'order_approval' && data.requiresAction) {
                        // Handle order approval notifications with action buttons
                        rows += `<tr class="order-approval-row" data-doc-id="${doc.id}">
                        <td><span style='font-weight:600; color: #007bff;'>${typeText}</span></td>
                        <td>
                            <div class="order-notification-content">
                                <p><strong>${data.message || ''}</strong></p>
                                <div class="order-details">
                                    <small><strong>Customer:</strong> ${data.customerInfo?.name || 'Unknown'} | 
                                    <strong>Email:</strong> ${data.customerInfo?.email || 'Unknown'} | 
                                    <strong>Total:</strong> ₱${data.orderDetails?.total || 'Unknown'} | 
                                    <strong>Payment:</strong> ${data.paymentDetails?.method?.toUpperCase() || 'Unknown'} | 
                                    <strong>Reference:</strong> ${data.paymentDetails?.reference || 'Unknown'}</small>
                                </div>
                                ${data.paymentDetails?.receiptUrl ?
                                `<div class="receipt-preview">
                                        <small><strong>Receipt:</strong> 
                                        <a href="#" onclick="viewReceipt('${data.paymentDetails.receiptUrl}', '${data.paymentDetails.receiptName || 'receipt.jpg'}')" 
                                           style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                        </small>
                                    </div>` :
                                (data.paymentDetails?.receiptData ?
                                    `<div class="receipt-preview">
                                            <small><strong>Receipt:</strong> 
                                            <a href="#" onclick="viewReceipt('${data.paymentDetails.receiptData}', '${data.paymentDetails.receiptName || 'receipt.jpg'}')" 
                                               style="color: #007bff; text-decoration: underline;">View Receipt</a>
                                            </small>
                                        </div>` : ''
                                )
                            }
                                <div class="action-buttons" style="margin-top: 10px;">
                                    <button class="btn btn-success btn-sm me-2" onclick="approveOrder('${data.orderId}', '${doc.id}')" 
                                            style="background: #28a745; border: none; padding: 5px 15px; border-radius: 4px; color: white; font-size: 0.8rem;">
                                        <i class="fas fa-check"></i> Accept Order
                                    </button>
                                    <button class="btn btn-danger btn-sm me-2" onclick="declineOrder('${data.orderId}', '${doc.id}')" 
                                            style="background: #dc3545; border: none; padding: 5px 15px; border-radius: 4px; color: white; font-size: 0.8rem;">
                                        <i class="fas fa-times"></i> Decline Order
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="handleLalamoveReady('${data.orderId}')" 
                                            style="background: #ffc107; border: none; padding: 5px 15px; border-radius: 4px; color: black; font-size: 0.8rem;">
                                        <i class="fas fa-motorcycle"></i> Lalamove Ready!
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td>${time}</td>
                    </tr>`;
                    } else {
                        // Regular notification display (skip payment verification for kitchen users)
                        if (userRole === 'kitchen' && data.type === 'payment_verification') {
                            console.log('🍳 Kitchen: Skipping payment verification notification');
                            return; // Skip this notification for kitchen users
                        }

                        var statusColor = '';
                        if (data.type === 'payment_verification') {
                            if (data.status === 'approved') statusColor = 'color: #28a745;';
                            else if (data.status === 'declined') statusColor = 'color: #dc3545;';
                        }
                        rows += `<tr><td><span style='font-weight:600; ${statusColor}'>${typeText}</span></td><td>${data.message || ''}</td><td>${time}</td></tr>`;
                    }
                } catch (notificationError) {
                    console.error('Error processing notification:', doc.id, notificationError);
                    // Skip this notification and continue with the next one
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

            // Hide "See all incoming activity" link for kitchen users
            if (typeof hideSeeAllLinkForKitchen === 'function') {
                hideSeeAllLinkForKitchen(userRole);
            }
            // Mark all loaded notifications as seen
            if (unseenCount > 0) {
                batch.commit();
            }
        })
        .catch(function (err) {
            console.error('❌ Error in loadNotifications:', err);
            console.error('❌ Error stack:', err.stack);
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

// Auto-load notifications after Firebase initialization
async function initializeNotifications() {
    try {
        // Wait for Firebase to be initialized
        if (typeof initializeFirebase === 'function') {
            await initializeFirebase();
        }

        // Wait a bit for Firebase to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Now load notifications
        loadNotifications();
    } catch (error) {
        console.error('Error initializing notifications:', error);
        // Fallback: try to load notifications anyway
        setTimeout(loadNotifications, 1000);
    }
}

// Auto-load notifications on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotifications);
} else {
    initializeNotifications();
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

        // Find the related order using customer info and payment reference
        const ordersQuery = await db.collection('orders')
            .where('status', '==', 'Pending Payment')
            .get();

        let orderDoc = null;
        let bestMatch = null;
        let bestMatchScore = 0;

        ordersQuery.forEach(doc => {
            const orderData = doc.data();
            let matchScore = 0;

            // Check payment reference match (highest priority)
            if (orderData.paymentInfo?.reference === reference && reference !== 'Unknown' && reference !== 'no-reference') {
                matchScore += 10;
            }

            // Check customer name match
            if (orderData.customerInfo?.name === customerName && customerName !== 'Unknown Customer') {
                matchScore += 5;
            }

            // Check customer phone match if available
            if (data.customerInfo?.phone && orderData.customerInfo?.phone === data.customerInfo.phone) {
                matchScore += 3;
            }

            // Check payment type match
            if (orderData.paymentInfo?.type?.toLowerCase() === paymentType.toLowerCase()) {
                matchScore += 2;
            }

            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = doc;
            }
        });

        orderDoc = bestMatch;

        console.log('🔍 Looking for order with:', { customerName, paymentType, reference });
        console.log('🔍 Found', ordersQuery.size, 'orders with Pending Payment status');

        if (!orderDoc && action === 'approved') {
            console.warn('❌ No matching order found for approval. Details:', {
                customerName,
                paymentType,
                reference,
                searchedOrders: ordersQuery.size
            });
            alert('Related order not found. Please ensure the order exists and has "Pending Payment" status.');
            return;
        }

        console.log('✅ Found matching order:', orderDoc ? orderDoc.id : 'none', 'with score:', bestMatchScore);

        // If approving, redirect to POS with pre-loaded order data
        if (action === 'approved' && orderDoc) {
            // Mark order as payment approved but not yet processed
            await db.collection('orders').doc(orderDoc.id).update({
                status: 'Payment Approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                approvedBy: 'admin',
                paymentVerified: true
            });

            // Update the notification status
            await docRef.update({
                status: action,
                adminAction: {
                    action: action,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    admin: 'Admin'
                },
                message: `Payment verification ${action} for ${customerName} (${paymentType}) - Reference: ${reference}. Redirecting to POS for order processing.`
            });

            // Redirect to POS with order data
            alert('✅ Payment approved! Redirecting to POS for order processing...');

            // Store order data for POS to pick up
            sessionStorage.setItem('approvedOrderId', orderDoc.id);
            sessionStorage.setItem('approvedOrderData', JSON.stringify(orderDoc.data()));

            // Redirect to POS page
            window.location.href = '/html/pos.html?mode=approved-order&orderId=' + orderDoc.id;
            return;
        }

        // Handle decline action
        if (action === 'declined') {
            // Update the notification status
            await docRef.update({
                status: action,
                adminAction: {
                    action: action,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    admin: 'Admin'
                },
                message: `Payment verification ${action} for ${customerName} (${paymentType}) - Reference: ${reference}`
            });

            // If order was found, mark it as declined
            if (orderDoc) {
                await db.collection('orders').doc(orderDoc.id).update({
                    status: 'Payment Declined',
                    declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    declinedBy: 'admin'
                });
            }

            // Show success message
            alert('Payment verification declined.');

            // Reload notifications to update the display
            loadNotifications();
        }

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
        // Setup kitchen role access control
        setupKitchenNotificationsAccess();

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

// Function to approve an order
async function approveOrder(orderId, notificationId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            alert('Database not available');
            return;
        }

        if (!confirm('Are you sure you want to APPROVE this order? The customer will be notified and the order will proceed to preparation.')) {
            return;
        }

        // Update order status to 'In the Kitchen' to make it appear in orders page and kitchen workflow
        await db.collection('orders').doc(orderId).update({
            status: 'In the Kitchen',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: 'admin'
        });

        // Mark notification as no longer requiring action
        await db.collection('notifications').doc(notificationId).update({
            requiresAction: false,
            actionTaken: 'approved',
            actionTakenAt: firebase.firestore.FieldValue.serverTimestamp(),
            message: `Order #${orderId} has been APPROVED by admin and sent to kitchen`
        });

        // Send notification to kitchen/orders
        await sendOrderToKitchen(orderId);

        // Reload notifications to update UI
        loadNotifications();

        alert('✅ Order approved successfully! It has been sent to the kitchen for preparation.');

    } catch (error) {
        console.error('Error approving order:', error);
        alert('Error approving order. Please try again.');
    }
}

// Function to decline an order
async function declineOrder(orderId, notificationId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            alert('Database not available');
            return;
        }

        const reason = prompt('Please provide a reason for declining this order (required):');
        if (reason === null) return; // User cancelled

        if (!reason.trim()) {
            alert('Please provide a reason for declining the order.');
            return;
        }

        if (!confirm('Are you sure you want to DECLINE this order? The customer will be notified that their order was rejected.')) {
            return;
        }

        // Update order status to 'declined'
        await db.collection('orders').doc(orderId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            declinedBy: 'admin',
            declineReason: reason
        });

        // Mark notification as no longer requiring action
        await db.collection('notifications').doc(notificationId).update({
            requiresAction: false,
            actionTaken: 'declined',
            actionTakenAt: firebase.firestore.FieldValue.serverTimestamp(),
            declineReason: reason,
            message: `Order #${orderId} has been DECLINED by admin - Reason: ${reason}`
        });

        // Reload notifications to update UI
        loadNotifications();

        alert('❌ Order declined successfully. Customer will be notified.');

    } catch (error) {
        console.error('Error declining order:', error);
        alert('Error declining order. Please try again.');
    }
}

// Function to send approved order to kitchen
async function sendOrderToKitchen(orderId) {
    try {
        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) return;

        // Get the order details
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            throw new Error('Order not found');
        }

        const orderData = orderDoc.data();

        // Create a kitchen notification
        await db.collection('notifications').add({
            type: 'kitchen_order',
            orderId: orderId,
            message: `New approved order #${orderId} for ${orderData.customerInfo.fullName} - ${orderData.shippingInfo.method}`,
            customerName: orderData.customerInfo.fullName,
            shippingMethod: orderData.shippingInfo.method,
            items: orderData.items,
            total: orderData.total,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            seen: false,
            targetScreen: 'kitchen'
        });

        console.log('Order sent to kitchen:', orderId);

    } catch (error) {
        console.error('Error sending order to kitchen:', error);
    }
}

// Function to handle Lalamove Ready button
window.handleLalamoveReady = async function (docId) {
    console.log('[notifications.js] Lalamove Ready button clicked for:', docId);

    // Find the button that was clicked for visual feedback
    const clickedButton = document.querySelector(`button[onclick*="handleLalamoveReady('${docId}')"]`);
    let originalButtonText = '';

    if (clickedButton) {
        originalButtonText = clickedButton.innerHTML;
        clickedButton.disabled = true;
        clickedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        // Show initial status
        showToast('Checking quotation and order data...', 'info');

        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Get notification data to extract quotation ID
        let notificationData = null;
        let quotationId = null;
        let orderId = null;

        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-search"></i> Getting notification data...';
        }

        console.log('[notifications.js] 🔍 Getting notification data for docId:', docId);

        // Get the notification document to extract quotation ID
        const notificationDoc = await db.collection('notifications').doc(docId).get();
        if (notificationDoc.exists) {
            notificationData = notificationDoc.data();
            quotationId = notificationData.quotation?.id;
            orderId = notificationData.orderId;

            console.log('[notifications.js] 📋 Notification data:', {
                type: notificationData.type,
                quotationId: quotationId,
                orderId: orderId,
                hasQuotationData: !!notificationData.quotation,
                quotationStructure: notificationData.quotation ? Object.keys(notificationData.quotation) : [],
                hasOrderId: !!orderId
            });
        } else {
            throw new Error(`Notification document not found with ID: ${docId}`);
        }

        if (!quotationId) {
            console.error('[notifications.js] ❌ Missing quotation ID in notification:', {
                docId,
                notificationKeys: Object.keys(notificationData),
                quotationField: notificationData.quotation
            });
            throw new Error('No quotation ID found in notification. Cannot place Lalamove order. Please ensure the payment verification notification contains a valid quotation ID.');
        }

        if (!orderId) {
            console.warn('[notifications.js] ⚠️ No orderId found in notification - stops fallback may not work');
        }

        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-search"></i> Retrieving quotation...';
        }

        // Get quotation data using the quotation ID
        console.log('[notifications.js] 🔍 Retrieving quotation with ID:', quotationId);
        const quotationData = await getQuotationById(quotationId);

        // Get customer info from notification (it should be there)
        const customerInfo = {
            fullName: notificationData.customerInfo?.name || 'Unknown Customer',
            email: notificationData.customerInfo?.email || 'no-email@example.com',
            phone: notificationData.customerInfo?.phone || 'Unknown Phone',
            address: notificationData.customerInfo?.address || 'Unknown Address'
        };

        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-motorcycle"></i> Placing Lalamove order...';
        }

        // Place the Lalamove order using retrieved quotation
        console.log('[notifications.js] 🚀 Placing Lalamove order with quotation:', quotationId);
        const result = await placeLalamoveOrderFromNotifications(quotationData, customerInfo);

        // Success feedback
        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-check"></i> Order Placed!';
            clickedButton.classList.remove('btn-warning');
            clickedButton.classList.add('btn-success');
        }

        // Update notification status to indicate Lalamove order was placed
        try {
            await db.collection('notifications').doc(docId).update({
                lalamoveOrderPlaced: true,
                lalamoveOrderId: result.data?.id || null,
                lalamoveOrderStatus: result.data?.status || 'unknown',
                lalamoveOrderPlacedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lalamoveOrderPlacedBy: 'admin', // or get current user if available
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[notifications.js] ✅ Updated notification with Lalamove order info');
        } catch (updateError) {
            console.warn('[notifications.js] ⚠️ Failed to update notification with Lalamove info:', updateError);
        }

        // Create a success notification for admin
        try {
            await db.collection('notifications').add({
                type: 'lalamove_order_success',
                message: `Lalamove order placed successfully! Order ID: ${result.data?.id || 'Unknown'} | Quotation ID: ${quotationId}`,
                lalamoveOrderId: result.data?.id || null,
                quotationId: quotationId,
                originalNotificationId: docId,
                orderDetails: {
                    customerName: customerInfo.fullName,
                    customerPhone: customerInfo.phone,
                    status: result.data?.status || 'unknown'
                },
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                seen: false,
                priority: 'normal'
            });
            console.log('[notifications.js] ✅ Created success notification for Lalamove order');
        } catch (notificationError) {
            console.warn('[notifications.js] ⚠️ Failed to create success notification:', notificationError);
        }

        showToast(`Lalamove order placed successfully! 🎉<br>Quotation ID: ${quotationId}<br>Order ID: ${result.data?.id || 'N/A'}`, 'success');
        console.log('[notifications.js] ✅ Lalamove order result:', result);

        // Reset button after delay
        setTimeout(() => {
            if (clickedButton) {
                clickedButton.innerHTML = originalButtonText;
                clickedButton.classList.remove('btn-success');
                clickedButton.classList.add('btn-warning');
                clickedButton.disabled = false;
            }
        }, 3000);

    } catch (error) {
        console.error('[notifications.js] ❌ Lalamove Ready failed:', error);

        // Log error details for debugging
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            docId: docId,
            quotationId: quotationId,
            orderId: orderId,
            timestamp: new Date().toISOString()
        };
        console.error('[notifications.js] 📋 Error details:', errorDetails);

        // Create error notification for tracking
        try {
            const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
            if (db) {
                await db.collection('notifications').add({
                    type: 'lalamove_order_error',
                    message: `Lalamove order failed: ${error.message}`,
                    error: {
                        message: error.message,
                        quotationId: quotationId,
                        orderId: orderId,
                        originalNotificationId: docId
                    },
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    seen: false,
                    priority: 'high'
                });
                console.log('[notifications.js] ✅ Created error notification for Lalamove failure');
            }
        } catch (notificationError) {
            console.warn('[notifications.js] ⚠️ Failed to create error notification:', notificationError);
        }

        // Error feedback
        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-times"></i> Failed!';
            clickedButton.classList.remove('btn-warning');
            clickedButton.classList.add('btn-danger');
        }

        // Show detailed error message
        let errorMsg = 'Lalamove order failed: ';
        let errorHint = '';
        
        if (error.message.includes('expired')) {
            errorMsg += 'Quotation has expired. Please create a new quotation.';
            errorHint = 'The quotation is no longer valid. Request a new delivery quote.';
        } else if (error.message.includes('stops array missing')) {
            errorMsg += 'Delivery location data is missing.';
            errorHint = 'Could not find pickup/delivery locations in the notification or order. Please check Firebase data structure.';
        } else if (error.message.includes('Notification document not found')) {
            errorMsg += 'Notification not found.';
            errorHint = 'The notification document may have been deleted or the ID is incorrect.';
        } else if (error.message.includes('No quotation ID found')) {
            errorMsg += 'Missing quotation ID in notification.';
            errorHint = 'The payment verification notification does not contain a valid quotation ID. Please verify the notification structure in Firebase.';
        } else if (error.message.includes('Order not found')) {
            errorMsg += 'Associated order not found.';
            errorHint = `Could not find order document${orderId ? ` with ID: ${orderId}` : ''}. Check if the order exists in Firebase.`;
        } else if (error.message.includes('not found')) {
            errorMsg += 'Required data not found in database.';
            errorHint = 'Quotation or order data is missing. Verify Firebase collections.';
        } else if (error.message.includes('Database not available')) {
            errorMsg += 'Database connection error. Please try again.';
            errorHint = 'Firebase connection failed. Check your internet connection.';
        } else if (error.message.includes('Invalid quotation data')) {
            errorMsg += error.message;
            errorHint = 'The quotation data structure is incomplete or invalid. Check Firebase notification and order documents.';
        } else {
            errorMsg += error.message;
        }

        console.error('[notifications.js] 💡 Error hint:', errorHint);
        showToast(errorMsg + (errorHint ? `<br><small>${errorHint}</small>` : ''), 'error');

        // Reset button after delay
        setTimeout(() => {
            if (clickedButton) {
                clickedButton.innerHTML = originalButtonText;
                clickedButton.classList.remove('btn-danger');
                clickedButton.classList.add('btn-warning');
                clickedButton.disabled = false;
            }
        }, 3000);
    }
}

// Function to show toast messages (enhanced for Lalamove integration)
function showToast(message, type = "info", duration = 3000) {
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
            min-width: 300px;
            max-width: 500px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8';
    const textColor = type === 'warning' ? '#000' : '#fff';

    toast.style.cssText = `
        background: ${bgColor};
        color: ${textColor};
        padding: 15px 20px;
        border-radius: 5px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        word-wrap: break-word;
        max-width: 100%;
    `;

    // Add icon based on type
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `${icon} ${message}`;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after specified duration
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}
