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

        // Log the full order structure to help diagnose the issue
        console.log('[notifications.js] 🔍 Order data structure:', {
            topLevelKeys: Object.keys(orderData),
            hasPaymentInfo: !!orderData.paymentInfo,
            paymentInfoKeys: orderData.paymentInfo ? Object.keys(orderData.paymentInfo) : [],
            hasShippingInfo: !!orderData.shippingInfo,
            shippingInfoKeys: orderData.shippingInfo ? Object.keys(orderData.shippingInfo) : [],
            hasItems: !!orderData.items,
            hasQuotationId: !!orderData.quotationId
        });

        // Try multiple possible locations for stops data
        let stops = null;
        let serviceType = null;
        let distance = null;

        // PRIORITY 1: Check lalamoveData.stops (NEW LOCATION - from updated order creation)
        if (orderData.lalamoveData?.stops && Array.isArray(orderData.lalamoveData.stops) && orderData.lalamoveData.stops.length >= 2) {
            stops = orderData.lalamoveData.stops;
            serviceType = orderData.lalamoveData.serviceType;
            distance = orderData.lalamoveData.distance;
            console.log('[notifications.js] ✅ Found stops in lalamoveData (NEW LOCATION)');
        }

        // PRIORITY 2: Check paymentInfo.orderSummary.deliveryDetails (most common location based on image 3)
        if (!stops && orderData.paymentInfo?.orderSummary?.deliveryDetails) {
            const deliveryDetails = orderData.paymentInfo.orderSummary.deliveryDetails;
            console.log('[notifications.js] 🔍 Found deliveryDetails:', Object.keys(deliveryDetails));

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
                console.log('[notifications.js] ✅ Found stops in paymentInfo.orderSummary.deliveryDetails (pickup/dropoff)');
            }
            // Check if stops array exists directly
            else if (Array.isArray(deliveryDetails.stops) && deliveryDetails.stops.length >= 2) {
                stops = deliveryDetails.stops;
                serviceType = deliveryDetails.service || deliveryDetails.serviceType;
                distance = deliveryDetails.distance;
                console.log('[notifications.js] ✅ Found stops array in paymentInfo.orderSummary.deliveryDetails');
            }
        }

        // Check if quotationId exists directly in the order (Image 3 shows this)
        if (!stops && orderData.quotationId) {
            console.log('[notifications.js] 🔍 Order has quotationId but no stops in standard locations');
            console.log('[notifications.js] 🔍 Checking if shippingInfo has address data...');
        }

        // PRIORITY 3: Check shippingInfo.fullAddressWithCoordinates (NEW LOCATION)
        if (!stops && orderData.shippingInfo?.fullAddressWithCoordinates) {
            const custAddr = orderData.shippingInfo.fullAddressWithCoordinates;
            if (custAddr.address || custAddr.coordinates) {
                stops = [
                    {
                        coordinates: { lat: '14.4456718', lng: '120.992947' }, // Restaurant default coordinates
                        address: 'Viktoria\'s Bistro, Rizito St, Imus, Cavite, Philippines',
                        stopId: 'SENDER_STOP'
                    },
                    {
                        coordinates: custAddr.coordinates || { lat: '', lng: '' },
                        address: custAddr.address,
                        stopId: 'RECIPIENT_STOP'
                    }
                ];
                serviceType = 'MOTORCYCLE';
                console.log('[notifications.js] ✅ Found stops from shippingInfo.fullAddressWithCoordinates (NEW LOCATION)');
            }
        }

        // PRIORITY 4: Check shippingInfo.quotationData (OLD LOCATION)
        if (!stops && orderData.shippingInfo?.quotationData?.data?.stops) {
            stops = orderData.shippingInfo.quotationData.data.stops;
            serviceType = orderData.shippingInfo.quotationData.data.serviceType;
            distance = orderData.shippingInfo.quotationData.data.distance;
            console.log('[notifications.js] ✅ Found stops in shippingInfo.quotationData');
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

            // Try multiple locations for customer address - be more aggressive
            let customerAddress = null;

            // Try shippingInfo first
            if (orderData.shippingInfo) {
                // Build address from components
                const parts = [];
                if (orderData.shippingInfo.address) parts.push(orderData.shippingInfo.address);
                if (orderData.shippingInfo.barangay) parts.push(orderData.shippingInfo.barangay);
                if (orderData.shippingInfo.city) parts.push(orderData.shippingInfo.city);
                if (orderData.shippingInfo.province) parts.push(orderData.shippingInfo.province);
                if (orderData.shippingInfo.postalCode) parts.push(orderData.shippingInfo.postalCode);

                if (parts.length > 0) {
                    customerAddress = parts.join(', ');
                } else if (orderData.shippingInfo.fullAddress) {
                    customerAddress = orderData.shippingInfo.fullAddress;
                }
            }

            // Fallback to customerInfo
            if (!customerAddress && orderData.customerInfo?.address) {
                customerAddress = orderData.customerInfo.address;
            }

            // Fallback to top-level fields
            if (!customerAddress) {
                customerAddress = orderData.address || orderData.deliveryAddress;
            }

            // Try to get customer name and phone for logging
            const customerName = orderData.customerInfo?.fullName ||
                orderData.customerInfo?.firstName + ' ' + orderData.customerInfo?.lastName ||
                'Unknown Customer';
            const customerPhone = orderData.shippingInfo?.phone ||
                orderData.customerInfo?.phone ||
                orderData.phone ||
                'No phone';

            console.log('[notifications.js] 🔍 Customer address search:', {
                foundAddress: !!customerAddress,
                address: customerAddress,
                customerName: customerName,
                phone: customerPhone,
                shippingInfoKeys: orderData.shippingInfo ? Object.keys(orderData.shippingInfo) : 'none',
                customerInfoKeys: orderData.customerInfo ? Object.keys(orderData.customerInfo) : 'none'
            });

            if (customerAddress && customerAddress.trim().length > 0) {
                stops = [
                    {
                        coordinates: { lat: '14.4456718', lng: '120.992947' }, // Restaurant coordinates (Rizito St, Imus)
                        address: 'Viktoria\'s Bistro, Rizito St, Imus, 4103 Cavite, Philippines',
                        stopId: 'SENDER_STOP'
                    },
                    {
                        coordinates: { lat: '', lng: '' }, // Customer coordinates unknown - Lalamove will geocode
                        address: customerAddress.trim(),
                        stopId: 'RECIPIENT_STOP'
                    }
                ];
                serviceType = 'MOTORCYCLE'; // Default service type
                console.log('[notifications.js] ✅ Built stops from customer address:', customerAddress);
            } else {
                console.log('[notifications.js] ❌ No customer address found in any location');
                console.log('[notifications.js] 📋 Available order data:', {
                    hasShippingInfo: !!orderData.shippingInfo,
                    hasCustomerInfo: !!orderData.customerInfo,
                    topLevelKeys: Object.keys(orderData)
                });
            }
        }

        if (!stops || stops.length < 2) {
            console.error('[notifications.js] ❌ Could not find valid stops data in order:', {
                orderId,
                hasPaymentInfo: !!orderData.paymentInfo,
                hasShippingInfo: !!orderData.shippingInfo,
                hasQuotationData: !!orderData.quotationData,
                stopsFound: stops?.length || 0
            });

            // Log the full shippingInfo and paymentInfo structures for debugging
            if (orderData.shippingInfo) {
                console.error('[notifications.js] 📋 Full shippingInfo:', orderData.shippingInfo);
            }
            if (orderData.paymentInfo) {
                console.error('[notifications.js] 📋 Full paymentInfo:', orderData.paymentInfo);
            }

            throw new Error('Could not extract stops data from order document. Check console for order structure details.');
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

            // If expired, try to refresh it automatically
            if (expired) {
                console.warn('[notifications.js] ⚠️ Quotation has expired, attempting to refresh automatically...');

                // Check if we have stops to use for refresh
                if (Array.isArray(quotationObj.stops) && quotationObj.stops.length >= 2) {
                    try {
                        console.log('[notifications.js] 🔄 Refreshing quotation using existing stops...');

                        // Build quotation object for refresh
                        const quotationToRefresh = {
                            data: {
                                quotationId: quotationObj.id,
                                stops: quotationObj.stops,
                                serviceType: quotationObj.serviceType || 'MOTORCYCLE',
                                expiresAt: quotationObj.expiresAt
                            }
                        };

                        // Call the refresh function
                        const freshQuotation = await refreshExpiredQuotation(quotationToRefresh);

                        console.log('[notifications.js] ✅ Quotation refreshed successfully!', {
                            oldQuotationId: quotationObj.id,
                            newQuotationId: freshQuotation.data.quotationId,
                            newExpiresAt: freshQuotation.data.expiresAt
                        });

                        // Update the quotation object with fresh data
                        quotationObj.id = freshQuotation.data.quotationId;
                        quotationObj.expiresAt = freshQuotation.data.expiresAt;
                        quotationObj.price = freshQuotation.data.priceBreakdown?.total || quotationObj.price;
                        quotationObj.stops = freshQuotation.data.stops;
                        expired = false; // Mark as no longer expired

                    } catch (refreshError) {
                        console.error('[notifications.js] ❌ Failed to refresh expired quotation:', refreshError);
                        throw new Error(`Quotation has expired and refresh failed: ${refreshError.message}. Please try again or create a new order.`);
                    }
                } else {
                    // No stops available to refresh with
                    console.error('[notifications.js] ❌ Cannot refresh quotation - no stops data available');
                    throw new Error('Quotation has expired and cannot be refreshed automatically. Please create a new order with delivery details.');
                }
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

        // Refresh dropdown notifications if available
        if (typeof loadDropdownNotifications === 'function') {
            loadDropdownNotifications();
        }

        // Update notification badge
        if (typeof refreshUnseenNotificationBadge === 'function') {
            refreshUnseenNotificationBadge();
        }
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

// Force refresh notifications - useful for testing
window.forceRefreshNotifications = function () {
    console.log('[Notifications] Force refreshing notifications...');
    if (typeof loadNotifications === 'function') {
        loadNotifications();
    } else {
        console.error('[Notifications] loadNotifications function not available');
    }
};

// Debug function to check what notifications exist in the database
window.debugNotifications = async function () {
    console.log('[Notifications] Debugging notifications in database...');
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        console.error('[Notifications] Firestore not available');
        return;
    }

    try {
        const snapshot = await db.collection('notifications').limit(20).get();
        console.log('[Notifications] Found', snapshot.size, 'notifications in database');

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('[Notifications] Notification:', {
                id: doc.id,
                type: data.type,
                message: data.message,
                item: data.item,
                timestamp: data.timestamp,
                seen: data.seen
            });
        });

        // Check specifically for inventory notifications
        const inventorySnapshot = await db.collection('notifications')
            .where('type', 'in', ['empty', 'restock', 'inventory'])
            .limit(10)
            .get();
        console.log('[Notifications] Found', inventorySnapshot.size, 'inventory notifications');

    } catch (error) {
        console.error('[Notifications] Error debugging notifications:', error);
    }
};

// Test function to create a manual inventory notification
window.createTestInventoryNotification = async function () {
    console.log('[Notifications] Creating test inventory notification...');
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        console.error('[Notifications] Firestore not available');
        return;
    }

    try {
        const testNotification = {
            type: 'empty',
            message: 'Test ingredient is out of stock!',
            item: 'Test Ingredient',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            seen: false
        };

        const docRef = await db.collection('notifications').add(testNotification);
        console.log('[Notifications] Test notification created with ID:', docRef.id);

        // Refresh notifications display
        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }

    } catch (error) {
        console.error('[Notifications] Error creating test notification:', error);
    }
};

// Debug function to check notification sorting
window.debugNotificationSorting = async function () {
    console.log('[Notifications] Debugging notification sorting...');
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        console.error('[Notifications] Firestore not available');
        return;
    }

    try {
        const snapshot = await db.collection('notifications').limit(10).get();
        console.log('[Notifications] Found', snapshot.size, 'notifications');

        const notifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let timestamp = null;

            if (data.timestamp) {
                try {
                    if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                        timestamp = data.timestamp.toDate();
                    } else if (data.timestamp instanceof Date) {
                        timestamp = data.timestamp;
                    } else if (typeof data.timestamp === 'string') {
                        timestamp = new Date(data.timestamp);
                    }
                } catch (e) {
                    console.warn('Error processing timestamp for', doc.id, e);
                }
            }

            notifications.push({
                id: doc.id,
                type: data.type,
                message: data.message,
                timestamp: timestamp,
                timestampString: timestamp ? timestamp.toISOString() : 'No timestamp'
            });
        });

        // Sort by timestamp (newest first)
        notifications.sort((a, b) => {
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return b.timestamp - a.timestamp;
        });

        console.log('[Notifications] Sorted notifications (newest first):');
        notifications.forEach((notif, index) => {
            console.log(`${index + 1}. ${notif.type} - ${notif.message} - ${notif.timestampString}`);
        });

    } catch (error) {
        console.error('[Notifications] Error debugging sorting:', error);
    }
};

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
                    const getTimestamp = (doc) => {
                        const timestamp = doc.data().timestamp;
                        if (!timestamp) return new Date(0);
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                return timestamp.toDate();
                            } else if (timestamp instanceof Date) {
                                return timestamp;
                            } else if (typeof timestamp === 'string') {
                                return new Date(timestamp);
                            } else {
                                return new Date(0);
                            }
                        } catch (e) {
                            return new Date(0);
                        }
                    };
                    const timestampA = getTimestamp(a);
                    const timestampB = getTimestamp(b);
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
                            const getTimestamp = (doc) => {
                                const timestamp = doc.data().timestamp;
                                if (!timestamp) return new Date(0);
                                try {
                                    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                        return timestamp.toDate();
                                    } else if (timestamp instanceof Date) {
                                        return timestamp;
                                    } else if (typeof timestamp === 'string') {
                                        return new Date(timestamp);
                                    } else {
                                        return new Date(0);
                                    }
                                } catch (e) {
                                    return new Date(0);
                                }
                            };
                            const timestampA = getTimestamp(a);
                            const timestampB = getTimestamp(b);
                            return timestampB - timestampA;
                        });
                        return { docs: docs.slice(0, 50) };
                    });
            });
    } else {
        // Admin users see all notifications - using ordered query for consistency
        console.log('👑 Admin: Querying for all notifications with orderBy timestamp...');

        queryPromise = db.collection('notifications')
            .orderBy('timestamp', 'desc') // Order by timestamp, newest first
            .limit(500) // Increased from 100 to 500 to capture more notifications
            .get()
            .then(function (querySnapshot) {
                console.log('👑 Admin: Loaded', querySnapshot.size, 'notifications (ordered by timestamp)');
                // Docs are already sorted by Firestore
                const docs = [];
                querySnapshot.forEach(function (doc) {
                    docs.push(doc);
                });
                // Return all docs (up to 500), but display only first 100
                return { docs: docs.slice(0, 100) };
            })
            .catch(function (error) {
                console.error('❌ Admin: Query error (might need composite index):', error.message);

                // Fallback: Get all notifications without ordering and sort in JavaScript
                console.log('⚠️ Attempting fallback: Query without orderBy...');
                return db.collection('notifications')
                    .limit(500)
                    .get()
                    .then(function (querySnapshot) {
                        console.log('👑 Admin: Fallback - Loaded', querySnapshot.size, 'notifications, sorting in JavaScript...');
                        const docs = [];
                        querySnapshot.forEach(function (doc) {
                            docs.push(doc);
                        });

                        // Sort by timestamp in JavaScript
                        docs.sort(function (a, b) {
                            const getTimestamp = (doc) => {
                                const timestamp = doc.data().timestamp;
                                if (!timestamp) return new Date(0);
                                try {
                                    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                        return timestamp.toDate();
                                    } else if (timestamp instanceof Date) {
                                        return timestamp;
                                    } else if (typeof timestamp === 'string') {
                                        return new Date(timestamp);
                                    } else {
                                        return new Date(0);
                                    }
                                } catch (e) {
                                    return new Date(0);
                                }
                            };
                            const timestampA = getTimestamp(a);
                            const timestampB = getTimestamp(b);
                            return timestampB - timestampA; // Descending order (newest first)
                        });
                        return { docs: docs.slice(0, 100) };
                    });
            });
    }

    queryPromise
        .then(function (result) {
            // Handle both QuerySnapshot and custom result format
            var docs = result.docs || result;

            // Ensure docs are in array format
            if (docs && docs.forEach && !Array.isArray(docs)) {
                const docsArray = [];
                docs.forEach(doc => docsArray.push(doc));
                docs = docsArray;
            }

            if (Array.isArray(docs)) {
                console.log('📊 Admin: Processing', docs.length, 'notifications');
                console.log('📊 Admin: Notification types found:', docs.map(doc => doc.data().type));

                // Ensure docs are sorted by timestamp (descending - newest first)
                docs.sort(function (a, b) {
                    const getTimestamp = (doc) => {
                        const timestamp = doc.data().timestamp;
                        if (!timestamp) return new Date(0);
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                return timestamp.toDate();
                            } else if (timestamp instanceof Date) {
                                return timestamp;
                            } else if (typeof timestamp === 'string') {
                                return new Date(timestamp);
                            } else {
                                return new Date(0);
                            }
                        } catch (e) {
                            return new Date(0);
                        }
                    };
                    const timestampA = getTimestamp(a);
                    const timestampB = getTimestamp(b);
                    return timestampB - timestampA; // Descending order (newest first)
                });
                console.log('✅ Admin: Notifications sorted by timestamp (newest first)');
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

                    // Safe timestamp handling for console log
                    let timestampForLog = 'No timestamp';
                    if (data.timestamp) {
                        try {
                            if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
                                timestampForLog = data.timestamp.toDate();
                            } else if (data.timestamp instanceof Date) {
                                timestampForLog = data.timestamp;
                            } else if (typeof data.timestamp === 'string') {
                                timestampForLog = new Date(data.timestamp);
                            } else {
                                timestampForLog = 'Invalid timestamp';
                            }
                        } catch (e) {
                            timestampForLog = 'Error processing timestamp';
                        }
                    }

                    console.log('🔔 Admin: Processing notification', notifCount, ':', {
                        id: doc.id,
                        type: data.type,
                        status: data.status,
                        timestamp: timestampForLog,
                        message: data.message ? data.message.substring(0, 50) + '...' : 'No message'
                    });

                    var typeText = '';
                    if (data.type === 'empty') {
                        typeText = 'Empty';
                    } else if (data.type === 'restock') {
                        typeText = 'Restock';
                    } else if (data.type === 'payment_verification') {
                        typeText = 'Payment Verification';
                    } else if (data.type === 'payment_declined') {
                        typeText = 'Payment Declined';
                    } else if (data.type === 'order_approval') {
                        typeText = 'Order Approval';
                    } else if (data.type === 'lalamove_order_success') {
                        typeText = 'Delivery Update';
                    } else if (data.type === 'order_pickup') {
                        typeText = 'Pick Up Update';
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
                    // Show for both 'pending' and 'declined' status, but disable buttons if declined
                    if (data.type === 'payment_verification' && (data.status === 'pending' || data.status === 'declined') && userRole !== 'kitchen') {
                        const isDeclined = data.status === 'declined' || data.buttonsDisabled === true;
                        const declinedBanner = isDeclined ? `<div style="background: #933F32; color: white; padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; text-align: center; font-weight: 600;">
                            <i class="fas fa-times-circle"></i> Payment Declined
                        </div>` : '';
                        
                        rows += `<tr class="payment-verification-row ${isDeclined ? 'declined-row' : ''}" data-doc-id="${doc.id}" style="${isDeclined ? 'opacity: 0.7;' : ''}">
                        <td><span style='font-weight:600; color: #933F32;'>${typeText}</span></td>
                        <td>
                            <div class="payment-notification-content">
                                ${declinedBanner}
                                <p><strong>${data.message || ''}</strong></p>
                                <div class="customer-details">
                                    <small><strong>Customer:</strong> ${data.customerInfo?.name || 'Unknown'} | 
                                    <strong>Phone:</strong> ${data.customerInfo?.phone || 'Unknown'} | 
                                    <strong>Payment:</strong> ${data.paymentInfo?.type?.toUpperCase() || 'Unknown'} | 
                                    <strong>Reference:</strong> ${data.paymentInfo?.reference || 'Unknown'}</small>
                                </div>
                                <div class="order-details" style="margin-top: 5px;">
                                    <small>
                                        <strong>Service:</strong> ${data.quotation?.serviceType || 'PICKUP'}
                                    </small>
                                </div>
                                <div class="order-summary" style="margin-top: 5px; padding: 5px; background: #f8f9fa; border-radius: 4px;">
                                    <small>
                                        <strong>Order Summary:</strong><br>
                                        ${data.orderSummary?.items?.map(item =>
                            `${item.name} x${item.quantity} - ₱${(typeof item.total === 'number' ? item.total.toFixed(2) : '0.00')}`
                        ).join('<br>') || 'No items'}<br>
                                        <strong>Subtotal:</strong> ₱${(typeof data.orderSummary?.subtotal === 'number' ? data.orderSummary.subtotal.toFixed(2) : '0.00')}<br>
                                        <strong>Shipping Fee:</strong> ₱${(() => {
                                            let shippingFee = typeof data.orderSummary?.shippingFee === 'number' ? data.orderSummary.shippingFee : 0;
                                            // If shipping fee is 0 but total > subtotal, calculate it
                                            if (shippingFee === 0 && data.orderSummary?.total > data.orderSummary?.subtotal) {
                                                shippingFee = data.orderSummary.total - data.orderSummary.subtotal;
                                            }
                                            return shippingFee.toFixed(2);
                                        })()}<br>
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
                                    ${data.quotation?.serviceType && data.quotation.serviceType !== 'PICKUP' ? `
                                    <button class="btn btn-warning btn-sm me-2" onclick="${isDeclined ? 'return false;' : `handleLalamoveReady('${doc.id}')`}" 
                                            ${data.lalamoveOrderPlaced || isDeclined ? 'disabled' : ''}
                                            style="background: ${data.lalamoveOrderPlaced || isDeclined ? '#6c757d' : '#ffc107'}; border: none; padding: 5px 15px; border-radius: 4px; color: ${data.lalamoveOrderPlaced || isDeclined ? 'white' : 'black'}; cursor: ${data.lalamoveOrderPlaced || isDeclined ? 'not-allowed' : 'pointer'};">
                                        <i class="fas fa-${data.lalamoveOrderPlaced ? 'check' : 'motorcycle'}"></i> ${data.lalamoveOrderPlaced ? 'Order Placed' : 'Lalamove Ready!'}
                                    </button>
                                    ` : `
                                    <button class="btn btn-success btn-sm me-2" onclick="${isDeclined ? 'return false;' : `handleOrderPickedUp('${doc.id}')`}" 
                                            ${data.orderPickedUp || isDeclined ? 'disabled' : ''}
                                            style="background: ${data.orderPickedUp || isDeclined ? '#6c757d' : '#28a745'}; border: none; padding: 5px 15px; border-radius: 4px; color: white; cursor: ${data.orderPickedUp || isDeclined ? 'not-allowed' : 'pointer'};">
                                        <i class="fas fa-${data.orderPickedUp ? 'check' : 'shopping-bag'}"></i> ${data.orderPickedUp ? 'Picked Up' : 'Mark as Picked Up'}
                                    </button>
                                    `}
                                    <button class="btn btn-danger btn-sm" onclick="${isDeclined ? 'return false;' : `handlePaymentVerification('${doc.id}', 'declined')`}" 
                                            ${isDeclined ? 'disabled' : ''}
                                            style="background: ${isDeclined ? '#6c757d' : '#933F32'}; border: none; padding: 5px 15px; border-radius: 4px; color: white; cursor: ${isDeclined ? 'not-allowed' : 'pointer'};">
                                        ✗ ${isDeclined ? 'Declined' : 'Decline'}
                                    </button>
                                </div>
                            </div>
                        </td>
                        <td>${time}</td>
                    </tr>`;
                    } else {
                        // Skip rendering payment_verification and order_approval in regular row format
                        // These should only appear in their expanded forms above
                        // Exception: payment_verification with status other than 'pending' or 'declined' can be shown in regular format
                        if ((data.type === 'payment_verification' && (data.status === 'pending' || data.status === 'declined')) || data.type === 'order_approval') {
                            console.log('✅ Skipping', data.type, 'from regular display - already shown in expanded form');
                            return; // Skip this notification
                        }

                        var statusColor = '';
                        if (data.type === 'lalamove_order_success') {
                            statusColor = 'color: #933F32;';
                        } else if (data.type === 'order_pickup') {
                            statusColor = 'color: #933F32;';
                        } else if (data.type === 'payment_declined') {
                            statusColor = 'color: #dc3545; font-weight: 700;';
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

            // Debug: Log first few notifications to check sorting
            if (docs.length > 0) {
                console.log('🔍 Admin: First 3 notifications (should be newest first):');
                for (let i = 0; i < Math.min(3, docs.length); i++) {
                    const data = docs[i].data();
                    const timestamp = data.timestamp;
                    let timestampStr = 'No timestamp';
                    if (timestamp) {
                        try {
                            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                                timestampStr = timestamp.toDate().toISOString();
                            } else if (timestamp instanceof Date) {
                                timestampStr = timestamp.toISOString();
                            } else if (typeof timestamp === 'string') {
                                timestampStr = new Date(timestamp).toISOString();
                            }
                        } catch (e) {
                            timestampStr = 'Error parsing timestamp';
                        }
                    }
                    console.log(`  ${i + 1}. ${data.type} - ${data.message} - ${timestampStr}`);
                }
            }

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

    // Debug logging for timestamp accuracy
    console.log('🕐 TimeAgo Debug:', {
        now: now.toISOString(),
        date: date.toISOString(),
        secondsDiff: seconds,
        minutesDiff: Math.floor(seconds / 60)
    });

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

// Utility function to test notification timestamp accuracy
window.testNotificationTimestamps = function () {
    console.log('🧪 Testing notification timestamp accuracy...');

    // Create a test notification with current timestamp
    const db = firebase.firestore();
    db.collection('notifications').add({
        type: 'test',
        message: 'Test notification for timestamp accuracy',
        item: 'Test Item',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        seen: false
    }).then(() => {
        console.log('✅ Test notification created');
        // Refresh notifications to see the timestamp
        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }
    }).catch((error) => {
        console.error('❌ Error creating test notification:', error);
    });
};

// Utility function to check notification timestamps
window.debugNotificationTimestamps = function () {
    console.log('🔍 Debugging notification timestamps...');
    const db = firebase.firestore();

    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get()
        .then((snapshot) => {
            console.log('📋 Recent notifications:');
            snapshot.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.timestamp;
                let date = null;

                if (timestamp && typeof timestamp.toDate === 'function') {
                    date = timestamp.toDate();
                } else if (timestamp instanceof Date) {
                    date = timestamp;
                } else if (typeof timestamp === 'string') {
                    date = new Date(timestamp);
                }

                console.log(`📄 ${doc.id}:`, {
                    message: data.message,
                    timestamp: timestamp,
                    date: date ? date.toISOString() : 'Invalid',
                    timeAgo: date ? timeAgo(date) : 'Invalid'
                });
            });
        })
        .catch((error) => {
            console.error('❌ Error fetching notifications:', error);
        });
};

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

// Function to create decline confirmation modal
function createDeclineConfirmationModal(customerName, paymentType, reference, onConfirm, onCancel) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'decline-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-in-out;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'decline-modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
    `;

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'decline-modal-header';
    modalHeader.style.cssText = `
        background: linear-gradient(135deg, #933F32 0%, #7a2f25 100%);
        color: white;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    modalHeader.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Decline Payment Verification</h3>
    `;

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'decline-modal-body';
    modalBody.style.cssText = `
        padding: 24px;
        color: #333;
    `;
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p style="font-size: 16px; margin-bottom: 16px; color: #555;">Are you sure you want to decline this payment verification?</p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid #933F32;">
                <div style="margin-bottom: 8px;">
                    <strong style="color: #333;">Customer:</strong> 
                    <span style="color: #555;">${customerName}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: #333;">Payment Type:</strong> 
                    <span style="color: #555;">${paymentType}</span>
                </div>
                <div>
                    <strong style="color: #333;">Reference Number:</strong> 
                    <span style="color: #555; font-family: monospace; background: #fff; padding: 2px 8px; border-radius: 4px;">${reference}</span>
                </div>
            </div>
        </div>
    `;

    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'decline-modal-footer';
    modalFooter.style.cssText = `
        padding: 16px 24px;
        background: #f8f9fa;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        border-top: 1px solid #dee2e6;
    `;

    // Create Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'decline-btn-cancel';
    cancelButton.style.cssText = `
        padding: 10px 24px;
        border: 2px solid #6c757d;
        background: white;
        color: #6c757d;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    cancelButton.onmouseover = () => {
        cancelButton.style.background = '#6c757d';
        cancelButton.style.color = 'white';
    };
    cancelButton.onmouseout = () => {
        cancelButton.style.background = 'white';
        cancelButton.style.color = '#6c757d';
    };
    cancelButton.onclick = () => {
        document.body.removeChild(modalOverlay);
        if (onCancel) onCancel();
    };

    // Create Confirm Decline button
    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm Decline';
    confirmButton.className = 'decline-btn-confirm';
    confirmButton.style.cssText = `
        padding: 10px 24px;
        border: none;
        background: linear-gradient(135deg, #933F32 0%, #7a2f25 100%);
        color: white;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(147, 63, 50, 0.3);
    `;
    confirmButton.onmouseover = () => {
        confirmButton.style.transform = 'translateY(-2px)';
        confirmButton.style.boxShadow = '0 4px 12px rgba(147, 63, 50, 0.4)';
    };
    confirmButton.onmouseout = () => {
        confirmButton.style.transform = 'translateY(0)';
        confirmButton.style.boxShadow = '0 2px 8px rgba(147, 63, 50, 0.3)';
    };
    confirmButton.onclick = () => {
        document.body.removeChild(modalOverlay);
        if (onConfirm) onConfirm();
    };

    // Assemble modal
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(confirmButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);

    // Close modal when clicking overlay
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
            if (onCancel) onCancel();
        }
    };

    // Close modal with ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modalOverlay);
            document.removeEventListener('keydown', escHandler);
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', escHandler);

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Add modal to page
    document.body.appendChild(modalOverlay);

    // Focus on confirm button for accessibility
    setTimeout(() => confirmButton.focus(), 100);
}

// Function to create success modal
function createSuccessModal(message, referenceNumber) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'success-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        animation: fadeIn 0.2s ease-in-out;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'success-modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        max-width: 450px;
        width: 90%;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
    `;

    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'success-modal-header';
    modalHeader.style.cssText = `
        background: linear-gradient(135deg, #933F32 0%, #7a2f25 100%);
        color: white;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    modalHeader.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 28px;"></i>
        <h3 style="margin: 0; font-size: 20px; font-weight: 600;">Order Declined Successfully</h3>
    `;

    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'success-modal-body';
    modalBody.style.cssText = `
        padding: 24px;
        text-align: center;
        color: #333;
    `;
    modalBody.innerHTML = `
        <div style="margin-bottom: 16px;">
            <p style="font-size: 16px; margin-bottom: 12px; color: #555;">${message}</p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; display: inline-block;">
                <strong style="color: #333;">Reference Number:</strong><br>
                <span style="color: #933F32; font-family: monospace; font-size: 18px; font-weight: 600;">${referenceNumber}</span>
            </div>
        </div>
        <p style="font-size: 14px; color: #6c757d; margin-top: 16px;">
            <i class="fas fa-info-circle"></i> A notification has been created for this action.
        </p>
    `;

    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'success-modal-footer';
    modalFooter.style.cssText = `
        padding: 16px 24px;
        background: #f8f9fa;
        display: flex;
        justify-content: center;
        border-top: 1px solid #dee2e6;
    `;

    // Create OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.cssText = `
        padding: 10px 32px;
        border: none;
        background: linear-gradient(135deg, #933F32 0%, #7a2f25 100%);
        color: white;
        border-radius: 6px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(147, 63, 50, 0.3);
        min-width: 120px;
    `;
    okButton.onmouseover = () => {
        okButton.style.transform = 'translateY(-2px)';
        okButton.style.boxShadow = '0 4px 12px rgba(147, 63, 50, 0.4)';
    };
    okButton.onmouseout = () => {
        okButton.style.transform = 'translateY(0)';
        okButton.style.boxShadow = '0 2px 8px rgba(147, 63, 50, 0.3)';
    };
    okButton.onclick = () => {
        document.body.removeChild(modalOverlay);
    };

    // Assemble modal
    modalFooter.appendChild(okButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalOverlay.appendChild(modalContent);

    // Close modal when clicking overlay
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    };

    // Close modal with ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modalOverlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Add modal to page
    document.body.appendChild(modalOverlay);

    // Focus on OK button for accessibility
    setTimeout(() => okButton.focus(), 100);

    // Auto-close after 3 seconds
    setTimeout(() => {
        if (document.body.contains(modalOverlay)) {
            document.body.removeChild(modalOverlay);
        }
    }, 3000);
}

// Function to handle payment verification (approve/decline)
window.handlePaymentVerification = async function (docId, action) {
    const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
    if (!db) {
        createSuccessModal('Database connection error. Please try again.', 'ERROR');
        return;
    }

    try {
        // Get the notification document
        const docRef = db.collection('notifications').doc(docId);
        const doc = await docRef.get();

        if (!doc.exists) {
            createSuccessModal('Notification not found.', 'ERROR');
            return;
        }

        const data = doc.data();
        const customerName = data.customerInfo?.name || 'Unknown Customer';
        const paymentType = data.paymentInfo?.type?.toUpperCase() || 'UNKNOWN';
        const reference = data.paymentInfo?.reference || 'Unknown';

        // Show confirmation modal for decline action
        if (action === 'declined') {
            createDeclineConfirmationModal(
                customerName,
                paymentType,
                reference,
                async () => {
                    // User confirmed decline - process it
                    await processDeclineAction(db, docRef, data, customerName, paymentType, reference, doc);
                },
                () => {
                    // User cancelled - do nothing
                    console.log('User cancelled decline action');
                }
            );
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
            createSuccessModal('Related order not found. Please ensure the order exists and has "Pending Payment" status.', 'ERROR');
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
            createSuccessModal('Payment approved! Redirecting to POS for order processing...', reference);
            
            // Store order data for POS to pick up
            sessionStorage.setItem('approvedOrderId', orderDoc.id);
            sessionStorage.setItem('approvedOrderData', JSON.stringify(orderDoc.data()));

            // Redirect to POS page after a short delay
            setTimeout(() => {
                window.location.href = '/html/pos.html?mode=approved-order&orderId=' + orderDoc.id;
            }, 2000);
            return;
        }

    } catch (error) {
        console.error('Error handling payment verification:', error);
        createSuccessModal('Error processing payment verification. Please try again.', 'ERROR');
    }
}

// Helper function to process decline action
async function processDeclineAction(db, docRef, data, customerName, paymentType, reference, originalDoc) {
    try {
        // Find the related order
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

        console.log('🔍 Processing decline for order:', orderDoc ? orderDoc.id : 'none');

        // Update the original notification status (mark as declined but keep it visible)
        await docRef.update({
            status: 'declined',
            buttonsDisabled: true, // Flag to disable buttons
            adminAction: {
                action: 'declined',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                admin: 'Admin'
            },
            message: `Payment verification declined for ${customerName} (${paymentType}) - Reference: ${reference}`
        });

        // If order was found, mark it as declined
        if (orderDoc) {
            await db.collection('orders').doc(orderDoc.id).update({
                status: 'Payment Declined',
                declinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                declinedBy: 'admin'
            });
        }

        // Create NEW notification for the decline action
        await db.collection('notifications').add({
            type: 'payment_declined',
            message: `The Order has been declined (Reference Number: ${reference})`,
            customerInfo: {
                name: customerName,
                phone: data.customerInfo?.phone || 'N/A'
            },
            paymentInfo: {
                type: paymentType,
                reference: reference
            },
            orderId: orderDoc ? orderDoc.id : null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'unread',
            seen: false,
            declinedBy: 'admin',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Decline notification created successfully');

        // Show success modal
        createSuccessModal('The payment verification has been declined.', reference);

        // Reload notifications after a short delay
        setTimeout(() => {
            loadNotifications();
        }, 3000);

    } catch (error) {
        console.error('❌ Error processing decline action:', error);
        createSuccessModal('Error processing decline. Please try again.', 'ERROR');
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

        showToast('✅ Order approved successfully! It has been sent to the kitchen for preparation.', 'success');

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

        showToast('❌ Order declined successfully. Customer will be notified.', 'success');

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
            // Get reference number from notification data
            const referenceNumber = notificationData.paymentInfo?.reference ||
                notificationData.paymentDetails?.reference ||
                'No reference';

            await db.collection('notifications').add({
                type: 'lalamove_order_success',
                message: `Lalamove order placed successfully! (Reference Number: ${referenceNumber})`,
                lalamoveOrderId: result.data?.id || null,
                quotationId: quotationId,
                originalNotificationId: docId,
                referenceNumber: referenceNumber,
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

        showToast(`Lalamove order placed successfully! 🎉<br>Delivery has been scheduled.`, 'success');
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
            // Sanitize error message to remove URLs and technical details
            let sanitizedMessage = error.message;
            if (sanitizedMessage.includes('http://') || sanitizedMessage.includes('https://') || sanitizedMessage.includes('127.') || sanitizedMessage.includes('localhost')) {
                sanitizedMessage = 'Connection error. Please try again.';
            }
            errorMsg += sanitizedMessage;
        }

        console.error('[notifications.js] 💡 Error hint:', errorHint);
        showToast(errorMsg, 'error');

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
    // Sanitize message to remove any URLs or technical details
    if (typeof message === 'string') {
        message = message.replace(/https?:\/\/[^\s]+/g, '[URL]');
        message = message.replace(/127\.\d+\.\d+\.\d+/g, '[IP]');
        message = message.replace(/localhost:\d+/g, '[LOCAL]');
        message = message.replace(/ID:\s*[A-Za-z0-9-]+/g, 'ID: [HIDDEN]');
        message = message.replace(/Reference:\s*[A-Za-z0-9-]+/g, 'Reference: [HIDDEN]');
    }
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
    const bgColor = type === 'success' ? '#933F32' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8';
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

// Function to handle order picked up
window.handleOrderPickedUp = async function (docId) {
    console.log('[notifications.js] Order Picked Up button clicked for:', docId);

    // Find the button that was clicked for visual feedback
    const clickedButton = document.querySelector(`button[onclick*="handleOrderPickedUp('${docId}')"]`);
    let originalButtonText = '';

    if (clickedButton) {
        originalButtonText = clickedButton.innerHTML;
        clickedButton.disabled = true;
        clickedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    try {
        showToast('Processing pickup confirmation...', 'info');

        const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
        if (!db) {
            throw new Error('Database not available');
        }

        // Get notification data
        console.log('[notifications.js] 🔍 Getting notification data for docId:', docId);
        const notificationDoc = await db.collection('notifications').doc(docId).get();

        if (!notificationDoc.exists) {
            throw new Error(`Notification document not found with ID: ${docId}`);
        }

        const notificationData = notificationDoc.data();
        const orderId = notificationData.orderId;
        const customerName = notificationData.customerInfo?.name || 'Unknown Customer';
        const referenceNumber = notificationData.paymentInfo?.reference || notificationData.paymentDetails?.reference || 'No reference';

        console.log('[notifications.js] 📋 Notification data:', {
            orderId: orderId,
            customerName: customerName,
            referenceNumber: referenceNumber
        });

        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-check"></i> Updating...';
        }

        // Update notification status to indicate order was picked up
        await db.collection('notifications').doc(docId).update({
            orderPickedUp: true,
            pickedUpAt: firebase.firestore.FieldValue.serverTimestamp(),
            pickedUpBy: 'admin', // or get current user if available
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('[notifications.js] ✅ Updated notification with pickup info');

        // Create a pickup confirmation notification
        await db.collection('notifications').add({
            type: 'order_pickup',
            message: `The order has been picked up (Reference Number: ${referenceNumber})`,
            customerInfo: {
                name: customerName,
                phone: notificationData.customerInfo?.phone || 'Unknown',
                email: notificationData.customerInfo?.email || 'Unknown'
            },
            orderInfo: {
                orderId: orderId || 'Unknown',
                referenceNumber: referenceNumber
            },
            originalNotificationId: docId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            seen: false
        });

        console.log('[notifications.js] ✅ Created pickup confirmation notification');

        // Success feedback
        if (clickedButton) {
            clickedButton.innerHTML = '<i class="fas fa-check"></i> Picked Up';
            clickedButton.classList.remove('btn-success');
            clickedButton.style.background = '#6c757d';
            clickedButton.style.cursor = 'not-allowed';
        }

        showToast(`Order marked as picked up! Delivery confirmed.`, 'success');

        // Refresh notifications after a short delay
        setTimeout(() => {
            loadNotifications();
        }, 1500);

    } catch (error) {
        console.error('[notifications.js] ❌ Error marking order as picked up:', error);

        // Restore button on error
        if (clickedButton) {
            clickedButton.disabled = false;
            clickedButton.innerHTML = originalButtonText;
        }

        showToast(`Error: ${error.message}`, 'error');
    }
}
