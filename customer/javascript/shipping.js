/**
 * Shipping Page JavaScript - Clean Version
 * 
 * Features:
 * - Loads order data from details page (form data and quotation)
 * - Updates UI with customer information and delivery costs
 * - Handles shipping option selection (Pickup vs Lalamove Delivery)
 * - Integrates "Place Order" functionality into Payment button
 * - Places real orders via Lalamove API or creates pickup orders
 * - Stores order results for confirmation page
 * 
 * Dependencies:
 * - Requires data from details.js (sessionStorage)
 * - Connects to server.js /api/place-order endpoint
 * - Works with both real API and fallback mock orders
 */

// Utility function to format Philippine phone numbers to E.164 format
function formatPhoneNumber(phone) {
  if (!phone) return '+639189876543'; // Default fallback

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
    console.warn('Invalid phone number format:', phone, 'Using default.');
    return '+639189876543';
  }
}

// Utility function to parse price from string
function parsePrice(priceString) {
  if (typeof priceString === 'number') return priceString;
  if (!priceString) return 0;
  return parseFloat(priceString.replace(/[^0-9.-]+/g, '')) || 0;
}

// Make parsePrice available globally
window.parsePrice = parsePrice;

// Function to send payment verification notification to admin
window.sendPaymentVerificationNotification = async function (paymentInfo) {
  console.log('🔔 Starting payment verification notification process...');
  console.log('Payment info received:', paymentInfo);

  // Validate payment info
  if (!paymentInfo || typeof paymentInfo !== 'object') {
    console.warn('Invalid payment info provided:', paymentInfo);
    return false;
  }

  // Get complete form data from session storage
  let formData;
  try {
    formData = JSON.parse(sessionStorage.getItem('orderFormData'));
    if (!formData) {
      console.warn('No form data found in session storage');
      formData = {};
    }
  } catch (error) {
    console.error('Error parsing form data from session storage:', error);
    formData = {};
  }

  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not available, order will proceed without admin notification');
      return false; // Return false instead of throwing error
    }

    // Get customer data from session storage
    const formData = JSON.parse(sessionStorage.getItem('orderFormData') || '{}');
    console.log('Customer form data:', formData);

    const customerName = formData.firstName && formData.lastName ? 
      `${formData.firstName} ${formData.lastName}` : 'Unknown Customer';
    const customerPhone = formData.phone || 'Unknown Phone';
    const customerEmail = formData.email || 'No email provided';
    const customerAddress = formData.fullAddress || formData.address || 'No address provided';

    // Initialize Firestore
    console.log('📊 Initializing Firestore...');
    const db = firebase.firestore();

    if (!db) {
      console.warn('Failed to initialize Firestore, order will proceed without admin notification');
      return false; // Return false instead of throwing error
    }

    // Ensure user is authenticated (try anonymous if not)
    if (!firebase.auth().currentUser) {
      console.log('No authenticated user, proceeding without authentication for notifications');
      // Don't try to authenticate for notifications - just proceed
    }

    // Create notification data with proper validation
    const notificationData = {
      type: 'payment_verification',
      message: `Payment verification required for ${formData.firstName} ${formData.lastName} (${(paymentInfo.type || 'Unknown').toUpperCase()}) - Reference: ${paymentInfo.reference || 'No reference'}`,
      customerInfo: {
        name: formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : customerName,
        phone: formData.phone || customerPhone,
        email: formData.email || 'No email provided',
        address: formData.fullAddress || formData.address || 'No address provided'
      },
      paymentInfo: {
        type: paymentInfo.type || 'unknown',
        reference: paymentInfo.reference || 'no-reference',
        receiptName: paymentInfo.receiptName || 'receipt.jpg',
        receiptData: paymentInfo.receiptData || null,
        receiptUrl: paymentInfo.receiptUrl || null,
        timestamp: paymentInfo.timestamp || new Date().toISOString()
      },
      status: 'pending', // pending, approved, declined
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      seen: false,
      requiresAction: true // Flag to show this needs admin action
    };

    console.log('📝 Notification data to be sent:', notificationData);

    // Add to notifications collection with timeout
    console.log('💾 Adding notification to Firestore...');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timeout')), 10000)
    );

    const addPromise = db.collection('notifications').add(notificationData);

    const docRef = await Promise.race([addPromise, timeoutPromise]);
    console.log('✅ Payment verification notification sent successfully! Document ID:', docRef.id);

    // Show success message to user (non-blocking)
    console.log('Payment verification request sent to admin successfully!');
    return true;

  } catch (error) {
    console.warn('Could not send payment verification notification:', error.message);
    // Don't show error alert to user - just log it
    console.warn('Full error details:', error);
    return false;
  }
}

// Function to store Lalamove quotation in Firestore
async function storeLalamoveQuotation(quotationData, orderData) {
  try {
    const db = firebase.firestore();
    const quotationRef = db.collection('lalamove_quotations').doc();
    
    await quotationRef.set({
      quotationId: quotationData.data.quotationId,
      orderId: orderData.orderId,
      customerInfo: {
        name: orderData.customerInfo.fullName,
        email: orderData.customerInfo.email,
        phone: orderData.customerInfo.phone,
        address: orderData.shippingInfo.address
      },
      quotationData: {
        serviceType: quotationData.data.serviceType,
        price: quotationData.data.priceBreakdown.total,
        currency: quotationData.data.priceBreakdown.currency,
        expiresAt: quotationData.data.expiresAt
      },
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('[SHIPPING] Lalamove quotation stored in Firestore:', quotationRef.id);
    return quotationRef.id;
  } catch (error) {
    console.error('[SHIPPING] Error storing Lalamove quotation:', error);
    throw error;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  console.log('[SHIPPING] DOMContentLoaded event fired, starting initialization...');

  try {

    // Initialize Firebase with error handling
    function initializeFirebaseForShipping() {
      try {
        if (typeof firebase !== 'undefined' && typeof initializeFirebase === 'function') {
          console.log('Initializing Firebase for shipping page...');
          initializeFirebase().then(() => {
            console.log('Firebase initialized successfully for shipping');
            // Check if user is already authenticated
            return new Promise((resolve) => {
              firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                  console.log('User already authenticated:', user.uid);
                  resolve(user);
                } else {
                  console.log('No user authenticated, continuing without auth');
                  resolve(null);
                }
              });
            });
          }).then((user) => {
            console.log('Firebase auth state resolved for shipping');
          }).catch(error => {
            console.warn('Firebase initialization/auth warning:', error.message);
          });
        } else {
          console.log('Firebase initialization not available, continuing without it');
        }
      } catch (error) {
        console.warn('Firebase initialization error:', error.message);
      }
    }

    // Initialize Firebase after a short delay to allow scripts to load
    setTimeout(initializeFirebaseForShipping, 500);

    // Initialize Firestore Cart Manager
    function initializeFirestoreCart() {
      try {
        if (typeof FirestoreCartManager !== 'undefined') {
          window.firestoreCart = new FirestoreCartManager();
          console.log('[shipping.js] Firestore Cart Manager initialized');
        } else {
          console.log('[shipping.js] FirestoreCartManager not available');
        }
      } catch (error) {
        console.warn('[shipping.js] Firestore Cart Manager initialization error:', error.message);
      }
    }

    // Initialize Firestore Cart Manager after scripts load
    setTimeout(initializeFirestoreCart, 1000);

    // Utility function to display messages/status
    function showStatus(message, isError = false) {
      // Create or update status display
      let statusEl = document.getElementById('status-message');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-message';
        statusEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
      `;
        document.body.appendChild(statusEl);
      }

      statusEl.textContent = message;
      statusEl.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
      statusEl.style.display = 'block';

      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (statusEl) statusEl.style.display = 'none';
      }, 5000);
    }

    // Helper function to enable the Place Order button
    function enablePlaceOrderButton(buttonElement = null) {
      const placeOrderBtn = buttonElement || document.getElementById('place-order-btn') || document.querySelector('.continue-btn');
      if (placeOrderBtn) {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = 'Place Order';
        placeOrderBtn.style.opacity = '1';
        placeOrderBtn.style.cursor = 'pointer';
        placeOrderBtn.style.backgroundColor = '#28a745'; // Green color to indicate ready
      }
    }

    // Helper function to disable the Place Order button
    function disablePlaceOrderButton(buttonElement = null) {
      const placeOrderBtn = buttonElement || document.getElementById('place-order-btn') || document.querySelector('.continue-btn');
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Complete Payment First';
        placeOrderBtn.style.opacity = '0.6';
        placeOrderBtn.style.cursor = 'not-allowed';
        placeOrderBtn.style.backgroundColor = '#6c757d'; // Gray color to indicate disabled
      }
    }

    // Load cart data from Firestore or sessionStorage
    async function loadCartData() {
      try {
        // First try to get from Firestore if Firebase is available
        if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
          const user = firebase.auth().currentUser;
          const customerId = user.uid;

          console.log('[shipping.js] Loading cart data from Firestore for user:', customerId);

          // Wait for Firestore to be ready
          if (window.firestoreCart) {
            await window.firestoreCart.waitForFirebase();
            const cartItems = await window.firestoreCart.getCartItems(customerId);

            if (cartItems.length > 0) {
              console.log('[shipping.js] Cart items from Firestore:', cartItems);

              // Convert Firestore cart items to the format expected by updateOrderForm
              const cartData = {};
              cartItems.forEach(item => {
                cartData[item.productName] = {
                  name: item.productName,
                  price: item.price,
                  quantity: item.quantity
                };
              });

              console.log('[shipping.js] Converted cart data:', cartData);
              return cartData;
            }
          }
        }

        // Fallback to sessionStorage
        const cartData = sessionStorage.getItem('cartData');
        console.log('[shipping.js] Loading cart data from sessionStorage:', cartData);
        if (cartData) {
          const parsedData = JSON.parse(cartData);
          console.log('[shipping.js] Parsed cart data:', parsedData);
          return parsedData;
        }

        console.log('[shipping.js] No cart data found in Firestore or sessionStorage');
        return {};
      } catch (error) {
        console.error('[shipping.js] Error loading cart data:', error);

        // Fallback to sessionStorage on error
        const cartData = sessionStorage.getItem('cartData');
        if (cartData) {
          return JSON.parse(cartData);
        }
        return {};
      }
    }

    // Load and display customer information
    function loadCustomerInfo() {
      console.log('[shipping.js] Loading customer information...');

      // Try both possible keys for backward compatibility
      let formData = sessionStorage.getItem('orderFormData') || sessionStorage.getItem('formData');
      console.log('[shipping.js] Raw formData from sessionStorage:', formData);

      if (formData) {
        try {
          const customerData = JSON.parse(formData);
          console.log('[shipping.js] Parsed customer data:', customerData);

          // Update the customer information display
          const deliveryInfoElement = document.getElementById('delivery-info');
          if (deliveryInfoElement) {
            deliveryInfoElement.innerHTML = `
              <b>Name:</b> ${customerData.name || customerData.firstName + ' ' + customerData.lastName || 'N/A'}<br>
              <b>Address:</b> ${customerData.fullAddress || customerData.address || 'N/A'}<br>
              <b>Email:</b> ${customerData.email || 'N/A'}<br>
              <b>Phone:</b> ${customerData.phone || 'N/A'}
            `;
            console.log('[shipping.js] Customer information updated successfully');
          } else {
            console.warn('[shipping.js] delivery-info element not found');
          }
        } catch (error) {
          console.error('[shipping.js] Error parsing customer data:', error);
        }
      } else {
        console.warn('[shipping.js] No customer data found in sessionStorage');
        // Display placeholder information
        const deliveryInfoElement = document.getElementById('delivery-info');
        if (deliveryInfoElement) {
          deliveryInfoElement.innerHTML = `
            <b>Name:</b> Not provided<br>
            <b>Address:</b> Not provided<br>
            <b>Email:</b> Not provided<br>
            <b>Phone:</b> Not provided
          `;
        }
      }
    }

    // Initialize shipping options with proper cost display
    function initShippingOptions() {
      console.log('[shipping.js] Initializing shipping options...');

      const pickupOption = document.getElementById('pickup-option');
      const lalamoveOption = document.getElementById('lalamove-option');
      const pickupRadio = document.getElementById('pickup-radio');
      const lalamoveRadio = document.getElementById('lalamove-radio');
      const shippingFeeElement = document.getElementById('shipping-fee-amount');
      const totalElement = document.getElementById('total-amount');

      if (!pickupOption || !lalamoveOption || !shippingFeeElement || !totalElement) {
        console.warn('[shipping.js] Some shipping option elements not found');
        return;
      }

      // Check if delivery is available or if we're in pickup-only mode
      const useRealDelivery = sessionStorage.getItem('useRealDelivery') !== 'false';
      const storedQuotationData = JSON.parse(sessionStorage.getItem('quotationData') || '{}');

      // If delivery is not available, hide the delivery option and show a notice
      if (!useRealDelivery || (storedQuotationData.data && storedQuotationData.data.pickupOnly)) {
        console.log('[shipping.js] Delivery not available, enabling pickup-only mode');

        // Hide the delivery option
        if (lalamoveOption) {
          lalamoveOption.style.display = 'none';
        }

        // Force pickup selection
        if (pickupRadio) {
          pickupRadio.checked = true;
          pickupRadio.disabled = true; // User can't change this
        }

        // Add a notice explaining why delivery is not available
        const noticeElement = document.createElement('div');
        noticeElement.style.cssText = `
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 5px;
          padding: 15px;
          margin: 10px 0;
          color: #856404;
          font-size: 14px;
        `;
        noticeElement.innerHTML = `
          <strong>📍 Pickup Only Available</strong><br>
          <small>Due to address verification issues, delivery service is not available for your location. 
          You can collect your order from our store once it's ready.</small>
        `;

        // Insert notice after shipping options
        const shippingContainer = pickupOption.parentElement;
        if (shippingContainer) {
          shippingContainer.appendChild(noticeElement);
        }
      }

      // Function to update shipping costs
      function updateShippingCosts() {
        const subtotal = parseFloat(sessionStorage.getItem('orderSubtotal') || '0');
        let shippingCost = 0;

        if (lalamoveRadio && lalamoveRadio.checked) {
          // Try to get actual quotation data from Lalamove API
          const quotationData = JSON.parse(sessionStorage.getItem('quotationData') || '{}');
          if (quotationData.data && quotationData.data.priceBreakdown) {
            shippingCost = parseFloat(quotationData.data.priceBreakdown.total) || 89.00;
            const currency = quotationData.data.priceBreakdown.currency || 'PHP';
            shippingFeeElement.textContent = `₱${shippingCost.toFixed(2)}`;
          } else {
            shippingCost = 89.00; // Fallback cost
            shippingFeeElement.textContent = '₱89.00';
          }
        } else {
          shippingCost = 0; // Pickup is free
          shippingFeeElement.textContent = 'FREE';
        }

        const total = subtotal + shippingCost;
        totalElement.textContent = `₱${total.toFixed(0)}`;

        console.log('[shipping.js] Shipping costs updated - Subtotal:', subtotal, 'Shipping:', shippingCost, 'Total:', total);
      }

      // Add event listeners to shipping options
      if (pickupRadio) {
        pickupRadio.addEventListener('change', function () {
          if (this.checked) {
            // Remove selected class from other options
            lalamoveOption.classList.remove('selected');
            pickupOption.classList.add('selected');
            updateShippingCosts();
          }
        });
      }

      if (lalamoveRadio) {
        lalamoveRadio.addEventListener('change', function () {
          if (this.checked) {
            // Remove selected class from other options
            pickupOption.classList.remove('selected');
            lalamoveOption.classList.add('selected');
            updateShippingCosts();
          }
        });
      }

      // Initialize with pickup selected (free)
      if (pickupRadio) {
        pickupRadio.checked = true;
        pickupOption.classList.add('selected');
        updateShippingCosts();
      }

      // Update Lalamove option with actual quotation data
      const quotationData = JSON.parse(sessionStorage.getItem('quotationData') || '{}');
      if (quotationData.data && quotationData.data.priceBreakdown && lalamoveOption) {
        const price = parseFloat(quotationData.data.priceBreakdown.total);
        const serviceType = quotationData.data.serviceType || 'MOTORCYCLE';

        // Handle distance - it might be a string or an object
        let distance = '0.5km';
        if (quotationData.data.distance) {
          if (typeof quotationData.data.distance === 'string') {
            distance = quotationData.data.distance;
          } else if (typeof quotationData.data.distance === 'object' && quotationData.data.distance.value) {
            distance = `${quotationData.data.distance.value}${quotationData.data.distance.unit || 'km'}`;
          } else if (typeof quotationData.data.distance === 'number') {
            distance = `${quotationData.data.distance}km`;
          }
        }

        // Update the price display in the Lalamove option
        const priceElement = lalamoveOption.querySelector('.price');
        if (priceElement) {
          priceElement.innerHTML = `₱${price.toFixed(2)}<br><small>${serviceType} • ${distance}</small>`;
        }
        console.log('[shipping.js] Updated Lalamove option with quotation data:', price, serviceType, distance);
      }
    }
    // Update order form with cart data
    function updateOrderForm(cartData) {
      console.log('[shipping.js] updateOrderForm called with cartData:', cartData);

      const orderItemsContainer = document.getElementById('order-menu');
      const totalElement = document.getElementById('subtotal-amount');

      console.log('[shipping.js] Found elements:', {
        orderItemsContainer: !!orderItemsContainer,
        totalElement: !!totalElement
      });

      if (!orderItemsContainer || !totalElement) return;

      const cartItems = Object.values(cartData);
      let totalPrice = 0;

      console.log('[shipping.js] Cart items:', cartItems);

      // Clear existing items
      orderItemsContainer.innerHTML = '';

      if (cartItems.length === 0) {
        console.log('[shipping.js] No cart items, showing empty message');
        orderItemsContainer.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Your cart is empty</p>';
        totalElement.textContent = '₱0';
        return;
      }

      // Create container for all items
      const itemsContainer = document.createElement('div');
      itemsContainer.style.cssText = 'margin-bottom: 15px;';

      // Add each cart item
      cartItems.forEach(item => {
        const price = window.parsePrice(item.price);
        const itemTotal = price * item.quantity;
        totalPrice += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 5px;';

        const itemName = document.createElement('div');
        itemName.style.cssText = 'flex: 1;';
        itemName.innerHTML = '<span style="font-weight: 600;">' + item.name + '</span><br><small style="color: #666;">Qty: ' + item.quantity + ' × ' + item.price + '</small>';

        const itemPrice = document.createElement('div');
        itemPrice.style.cssText = 'text-align: right;';
        itemPrice.innerHTML = '<span class="price" style="font-weight: 600; color: #8b1d1d;">₱' + itemTotal.toFixed(0) + '</span>';

        itemDiv.appendChild(itemName);
        itemDiv.appendChild(itemPrice);
        itemsContainer.appendChild(itemDiv);
      });

      orderItemsContainer.appendChild(itemsContainer);

      // Update total
      totalElement.textContent = '₱' + totalPrice.toFixed(0);

      // Store total for Firebase integration
      sessionStorage.setItem('orderSubtotal', totalPrice.toString());
    }

    // Payment Modal Functionality
    function initPaymentModal() {
      const gcashPayment = document.getElementById('gcash-payment');
      const bankTransferPayment = document.getElementById('bank-transfer-payment');
      const paymentModal = document.getElementById('payment-modal');
      const modalTitle = document.getElementById('payment-modal-title');
      const qrCodeImage = document.getElementById('payment-qr-code');
      const modalClose = document.getElementById('payment-modal-close');
      const paymentCancel = document.getElementById('payment-cancel');
      const paymentConfirm = document.getElementById('payment-confirm');
      const referenceCode = document.getElementById('reference-code');
      const receiptUpload = document.getElementById('receipt-upload');
      const fileUploadArea = document.getElementById('file-upload-area');
      const filePreview = document.getElementById('file-preview');
      const previewImage = document.getElementById('preview-image');
      const removeFile = document.getElementById('remove-file');

      // Debug: Check if all elements are found
      console.log('Payment modal elements check:', {
        gcashPayment: !!gcashPayment,
        bankTransferPayment: !!bankTransferPayment,
        paymentModal: !!paymentModal,
        modalTitle: !!modalTitle,
        qrCodeImage: !!qrCodeImage,
        modalClose: !!modalClose,
        paymentCancel: !!paymentCancel,
        paymentConfirm: !!paymentConfirm,
        referenceCode: !!referenceCode,
        receiptUpload: !!receiptUpload,
        fileUploadArea: !!fileUploadArea,
        filePreview: !!filePreview,
        previewImage: !!previewImage,
        removeFile: !!removeFile
      });

      if (!gcashPayment || !bankTransferPayment || !paymentModal) {
        console.error('Critical payment modal elements not found!');
        return;
      }

      // QR Code images - replace these paths with your actual QR code images
      const qrCodes = {
        gcash: '../src/IMG/gcash-qr.png', // Replace with your GCash QR code
        bank_transfer: '../src/IMG/bank-transfer-qr.png'    // Replace with your Bank Transfer QR code
      };

      // Fallback QR code text for when images are not available
      const qrCodeFallback = {
        gcash: 'GCash QR Code - Please scan or use: 09XX-XXX-XXXX',
        bank_transfer: 'Bank Transfer Details - Account: XXXX-XXXX-XXXX'
      };

      let uploadedFile = null;
      let currentPaymentType = '';

      // Show payment modal
      function showPaymentModal(paymentType) {
        currentPaymentType = paymentType;
        modalTitle.textContent = paymentType === 'gcash' ? 'Complete GCash Payment' : 'Complete Bank Transfer Payment';

        // Try to load QR code, with fallback handling
        qrCodeImage.src = qrCodes[paymentType];
        qrCodeImage.alt = (paymentType === 'gcash' ? 'GCash' : 'Bank Transfer') + ' QR Code';

        // Handle image load error
        qrCodeImage.onerror = function () {
          console.log('QR code image not found, showing fallback text');
          qrCodeImage.style.display = 'none';

          // Create or update fallback text
          let fallbackDiv = document.querySelector('.qr-fallback');
          if (!fallbackDiv) {
            fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'qr-fallback';
            fallbackDiv.style.cssText = 'text-align: center; padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; margin: 10px 0;';
            qrCodeImage.parentNode.appendChild(fallbackDiv);
          }
          fallbackDiv.innerHTML = '<h4>' + (paymentType === 'gcash' ? 'GCash Payment' : 'Bank Transfer Payment') + '</h4><p>' + qrCodeFallback[paymentType] + '</p><small>Please add your QR code image to display here</small>';
          fallbackDiv.style.display = 'block';
        };

        qrCodeImage.onload = function () {
          // Hide fallback if image loads successfully
          const fallbackDiv = document.querySelector('.qr-fallback');
          if (fallbackDiv) fallbackDiv.style.display = 'none';
          qrCodeImage.style.display = 'block';
        };

        // Reset form
        referenceCode.value = '';
        uploadedFile = null;
        resetFileUpload();
        updateConfirmButton();

        // Add instruction message if not already present
        const instructionEl = document.querySelector('.payment-instruction');
        if (instructionEl) {
          instructionEl.textContent = 'You must complete this payment and provide both reference code and receipt screenshot before you can place your order.';
        }

        paymentModal.style.display = 'flex';

        // Disable place order button until payment is confirmed
        disablePlaceOrderButton();
      }

      // Hide payment modal
      function hidePaymentModal() {
        paymentModal.style.display = 'none';
        referenceCode.value = '';
        uploadedFile = null;
        resetFileUpload();
        currentPaymentType = '';

        // Check if payment was completed, if not, show reminder
        const paymentInfo = sessionStorage.getItem('paymentInfo');
        if (!paymentInfo) {
          showStatus('Payment not completed. You must complete payment to place your order.', true);
          disablePlaceOrderButton();
        }
      }

      // Reset payment selection - allows user to choose different payment method
      function resetPaymentSelection() {
        const gcashPayment = document.getElementById('gcash-payment');
        const bankTransferPayment = document.getElementById('bank-transfer-payment');

        if (gcashPayment) gcashPayment.checked = false;
        if (bankTransferPayment) bankTransferPayment.checked = false;

        // Clear any stored payment info
        sessionStorage.removeItem('paymentInfo');
        sessionStorage.removeItem('paymentReference');
        sessionStorage.removeItem('paymentMethod');

        // Reset current payment type
        currentPaymentType = '';

        // Keep place order button disabled until new payment is confirmed
        disablePlaceOrderButton();
      }

      // Reset file upload area
      function resetFileUpload() {
        const uploadPlaceholder = fileUploadArea.querySelector('.upload-placeholder');
        uploadPlaceholder.style.display = 'block';
        filePreview.style.display = 'none';
        receiptUpload.value = '';
      }

      // Update confirm button state
      function updateConfirmButton() {
        const hasReference = referenceCode.value.trim().length >= 5; // Increased minimum length
        const hasReceipt = uploadedFile !== null;
        const isComplete = hasReference && hasReceipt;

        paymentConfirm.disabled = !isComplete;

        // Update button text to be more descriptive
        if (!hasReference && !hasReceipt) {
          paymentConfirm.textContent = 'Enter Reference Code & Upload Receipt';
        } else if (!hasReference) {
          paymentConfirm.textContent = 'Enter Reference Code (min 5 chars)';
        } else if (!hasReceipt) {
          paymentConfirm.textContent = 'Upload Payment Receipt';
        } else {
          paymentConfirm.textContent = 'Confirm Payment';
        }
      }

      // File upload handling
      function handleFileSelect(file) {
        console.log('File selected:', file);
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please upload an image file.');
          return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB.');
          return;
        }

        uploadedFile = file;
        console.log('File accepted, showing preview...');

        // Show preview
        const reader = new FileReader();
        reader.onload = function (e) {
          console.log('File preview loaded');
          previewImage.src = e.target.result;
          const uploadPlaceholder = fileUploadArea.querySelector('.upload-placeholder');
          if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
          if (filePreview) filePreview.style.display = 'block';
          updateConfirmButton();
        };
        reader.readAsDataURL(file);
      }

      // Event Listeners

      // Payment option click handlers
      gcashPayment.addEventListener('change', function () {
        if (this.checked) {
          // Clear any existing payment info when switching methods
          sessionStorage.removeItem('paymentInfo');
          disablePlaceOrderButton();
          showPaymentModal('gcash');
        }
      });

      bankTransferPayment.addEventListener('change', function () {
        if (this.checked) {
          // Clear any existing payment info when switching methods  
          sessionStorage.removeItem('paymentInfo');
          disablePlaceOrderButton();
          showPaymentModal('bank_transfer');
        }
      });

      // Modal close handlers - allow users to go back and change payment method
      modalClose.addEventListener('click', function () {
        hidePaymentModal();
        resetPaymentSelection();
      });

      paymentCancel.addEventListener('click', function () {
        hidePaymentModal();
        resetPaymentSelection();
      });

      // Click outside modal to close
      paymentModal.addEventListener('click', function (e) {
        if (e.target === paymentModal) {
          hidePaymentModal();
        }
      });

      // Reference code input
      referenceCode.addEventListener('input', updateConfirmButton);

      // File upload events
      receiptUpload.addEventListener('change', function (e) {
        console.log('Receipt upload change event triggered', e.target.files);
        if (e.target.files[0]) {
          handleFileSelect(e.target.files[0]);
        }
      });

      // Click on upload area to trigger file input
      fileUploadArea.addEventListener('click', function (e) {
        console.log('Upload area clicked', e.target);
        // Don't trigger if clicking on the remove button or if file is already uploaded
        if (!e.target.classList.contains('remove-file') && !uploadedFile) {
          console.log('Triggering file input click');
          receiptUpload.click();
        }
      });

      // Drag and drop functionality
      fileUploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        this.classList.add('dragover');
      });

      fileUploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        this.classList.remove('dragover');
      });

      fileUploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        this.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files[0]) {
          handleFileSelect(files[0]);
        }
      });

      // Remove file
      removeFile.addEventListener('click', function () {
        uploadedFile = null;
        resetFileUpload();
        updateConfirmButton();
      });

      // Payment confirmation
      paymentConfirm.addEventListener('click', async function () {
        const refCode = referenceCode.value.trim();

        // Validate required fields
        if (!refCode) {
          alert('Please enter a reference code');
          return;
        }

        if (!uploadedFile) {
          alert('Please upload a receipt image');
          return;
        }

        if (!currentPaymentType) {
          alert('Payment type not selected');
          return;
        }

        console.log('Payment confirmation values:', {
          refCode,
          currentPaymentType,
          uploadedFileName: uploadedFile.name
        });

        if (!refCode || refCode.length < 5) {
          alert('Please enter a valid reference code (minimum 5 characters).');
          referenceCode.focus();
          return;
        }

        if (!uploadedFile) {
          alert('Please upload your payment receipt screenshot.');
          return;
        }

        // Additional validation for reference code format (basic)
        if (!/^[a-zA-Z0-9]+$/.test(refCode)) {
          alert('Reference code should only contain letters and numbers.');
          referenceCode.focus();
          return;
        }

        // Store payment data and upload receipt to Cloudinary
        const paymentData = {
          type: currentPaymentType,
          reference: refCode,
          receiptFile: uploadedFile,
          timestamp: new Date().toISOString()
        };

        // Show loading state
        paymentConfirm.disabled = true;
        paymentConfirm.textContent = 'Uploading Receipt...';

        try {
          // Check if Cloudinary function is available
          if (typeof window.uploadImageToCloudinary !== 'function') {
            console.warn('Cloudinary upload function not available. Using base64 fallback.');
            throw new Error('Cloudinary upload function not available. Please check if cloud.js is loaded.');
          }

          // Upload receipt to Cloudinary
          console.log('Uploading receipt to Cloudinary...');

          // Add timeout to Cloudinary upload
          const uploadPromise = window.uploadImageToCloudinary(uploadedFile);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Cloudinary upload timeout')), 30000)
          );

          const cloudinaryResult = await Promise.race([uploadPromise, timeoutPromise]);
          console.log('Cloudinary upload result:', cloudinaryResult);

          const paymentInfo = {
            type: currentPaymentType,
            reference: refCode,
            receiptUrl: cloudinaryResult.secure_url,
            receiptPublicId: cloudinaryResult.public_id,
            receiptName: uploadedFile.name,
            timestamp: new Date().toISOString()
          };

          sessionStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
          sessionStorage.setItem('paymentReference', refCode);
          sessionStorage.setItem('paymentMethod', currentPaymentType);

          // Hide modal and show success
          hidePaymentModal();
          showStatus((currentPaymentType === 'gcash' ? 'GCash' : 'Bank Transfer') + ' payment confirmed! Receipt uploaded successfully.', false);

          // Enable the Place Order button
          enablePlaceOrderButton();

          // Send notification to admin for payment verification
          console.log('About to send payment verification notification with:', paymentInfo);
          console.log('Current payment type:', currentPaymentType);
          console.log('Reference code:', refCode);

          // Don't await this - let it run in background
          sendPaymentVerificationNotification(paymentInfo).catch(notificationError => {
            console.warn('Payment verification notification failed:', notificationError.message);
          });

          console.log('Payment confirmation saved:', { type: currentPaymentType, reference: refCode, receiptUrl: paymentInfo.receiptUrl });

        } catch (error) {
          console.error('Error uploading receipt:', error);

          // Fallback to base64 storage if Cloudinary fails
          console.log('Fallback: Using base64 storage for receipt');
          try {
            const reader = new FileReader();
            reader.onload = function (e) {
              const paymentInfo = {
                type: currentPaymentType,
                reference: refCode,
                receiptData: e.target.result, // base64 fallback
                receiptName: uploadedFile.name,
                timestamp: new Date().toISOString()
              };

              sessionStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
              sessionStorage.setItem('paymentReference', refCode);
              sessionStorage.setItem('paymentMethod', currentPaymentType);

              // Hide modal and show success
              hidePaymentModal();
              showStatus((currentPaymentType === 'gcash' ? 'GCash' : 'Bank Transfer') + ' payment confirmed! Receipt saved locally.', false);

              // Enable the Place Order button
              enablePlaceOrderButton();

              // Send notification to admin for payment verification
              console.log('About to send payment verification notification (fallback) with:', paymentInfo);
              console.log('Current payment type (fallback):', currentPaymentType);
              console.log('Reference code (fallback):', refCode);

              // Don't await this - let it run in background
              sendPaymentVerificationNotification(paymentInfo).catch(notificationError => {
                console.warn('Payment verification notification failed (fallback):', notificationError.message);
              });

              console.log('Payment confirmation saved with base64 fallback:', { type: currentPaymentType, reference: refCode });

              // Reset button state
              paymentConfirm.disabled = false;
              paymentConfirm.textContent = 'Confirm Payment';
            };

            reader.onerror = function () {
              console.error('FileReader error');
              throw new Error('Failed to read file');
            };

            reader.readAsDataURL(uploadedFile);
          } catch (fallbackError) {
            console.error('Base64 fallback also failed:', fallbackError);
            alert('Failed to process receipt. Please try again.');
            showStatus('Failed to process receipt. Please try again.', true);
            // Reset button state
            paymentConfirm.disabled = false;
            paymentConfirm.textContent = 'Confirm Payment';
          }
        }
      });

      // Escape key to close modal
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && paymentModal.style.display === 'flex') {
          hidePaymentModal();
        }
      });
    }

    // Initialize the page
    function init() {
      console.log('[shipping.js] Initializing shipping page');

      // Load and display customer information
      loadCustomerInfo();

      // Load and display cart data
      loadCartData().then(cartData => {
        console.log('[shipping.js] Cart data loaded:', cartData);
        console.log('[shipping.js] Cart data keys:', Object.keys(cartData));
        console.log('[shipping.js] Cart data values:', Object.values(cartData));
        updateOrderForm(cartData);
      }).catch(error => {
        console.error('[shipping.js] Error loading cart data:', error);
        updateOrderForm({});
      });

      // Initialize shipping options
      initShippingOptions();

      // Find and modify the payment button
      const paymentBtn = document.querySelector('.continue-btn');
      if (paymentBtn) {
        // Remove the onclick attribute (if present)
        paymentBtn.removeAttribute('onclick');

        // Enable the button
        paymentBtn.disabled = false;
        paymentBtn.textContent = 'Place Order';
        paymentBtn.style.opacity = '1';
        paymentBtn.style.cursor = 'pointer';

        // Attach direct order handler
        paymentBtn.addEventListener('click', async (event) => {
          event.preventDefault();
          
          try {
            // Disable button while processing
            paymentBtn.disabled = true;
            paymentBtn.textContent = 'Processing...';

            // Get the cart data
            const cartData = await loadCartData();
            const formData = JSON.parse(sessionStorage.getItem('orderFormData') || sessionStorage.getItem('formData') || '{}');
            const quotationData = JSON.parse(sessionStorage.getItem('quotationData') || '{}');

            // Generate order ID
            const orderId = 'ORD' + Date.now();

            // Create order in Firebase
            const orderData = await createFirebaseOrder(formData, cartData, quotationData);

            // Send notification to admin
            await sendOrderNotificationToAdmin(orderId, orderData);

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.style.cssText = `
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: #28a745;
              color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              z-index: 1000;
              text-align: center;
            `;
            successMsg.innerHTML = `
              <h4 style="margin: 0 0 10px 0;">Order Sent Successfully!</h4>
              <p style="margin: 0;">Your order has been sent to the admin for review.</p>
            `;
            document.body.appendChild(successMsg);

            // Remove success message after 3 seconds
            setTimeout(() => {
              successMsg.remove();
              // Clear cart and redirect to menu
              sessionStorage.removeItem('cart');
              window.location.href = '../customer/html/menucustomer.html';
            }, 3000);

          } catch (error) {
            console.error('Error processing order:', error);
            paymentBtn.disabled = false;
            paymentBtn.textContent = 'Place Order';
            alert('There was an error processing your order. Please try again.');
          }
        });

        console.log('[shipping.js] Payment button enabled and handler attached');

        // --- Add a small Lalamove test button under the Place Order button ---
        try {
          const lalamoveTestBtn = document.createElement('button');
          lalamoveTestBtn.id = 'place-lalamove-btn';
          lalamoveTestBtn.className = 'continue-btn place-lalamove-btn';
          lalamoveTestBtn.type = 'button';
          lalamoveTestBtn.textContent = 'Place Lalamove Order (test)';
          lalamoveTestBtn.style.marginTop = '8px';
          lalamoveTestBtn.style.display = 'block';
          lalamoveTestBtn.style.width = paymentBtn.offsetWidth ? paymentBtn.offsetWidth + 'px' : 'auto';

          // Insert right after the existing payment button
          if (paymentBtn.parentNode) paymentBtn.parentNode.insertBefore(lalamoveTestBtn, paymentBtn.nextSibling);

          lalamoveTestBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            
            // Prevent multiple clicks
            lalamoveTestBtn.disabled = true;
            lalamoveTestBtn.textContent = 'Checking quotation validity...';
            
            try {
              // Show initial status
              showStatus('Checking quotation and placing Lalamove order...', false);
              
              // Update button to show progress
              lalamoveTestBtn.textContent = 'Validating quotation...';
              
              await placeLalamoveOrder();
              
              // Success - update button and show success message
              lalamoveTestBtn.textContent = 'Order Placed Successfully!';
              showStatus('Lalamove order placed successfully! 🎉', false);
              
              // Reset button after delay
              setTimeout(() => {
                lalamoveTestBtn.textContent = 'Place Lalamove Order (test)';
              }, 3000);
              
            } catch (err) {
              console.error('Lalamove test order failed:', err);
              
              // Show detailed error message
              let errorMsg = 'Lalamove test failed: ';
              if (err.message.includes('expired')) {
                errorMsg += 'Quotation expired and could not be refreshed';
              } else if (err.message.includes('422')) {
                errorMsg += 'Invalid order data (422 error)';
              } else {
                errorMsg += (err.message || err);
              }
              
              showStatus(errorMsg, true);
              lalamoveTestBtn.textContent = 'Order Failed - Try Again';
              
              // Reset button after delay
              setTimeout(() => {
                lalamoveTestBtn.textContent = 'Place Lalamove Order (test)';
              }, 3000);
              
            } finally {
              lalamoveTestBtn.disabled = false;
            }
          });
        } catch (btnErr) {
          console.warn('Could not create Lalamove test button:', btnErr);
        }
      } else {
        console.error('[shipping.js] Payment button not found');
        showStatus('Error: Payment button not found', true);
      }
    }

    // Main payment button handler
    async function handlePayment(event) {
      event.preventDefault();

      try {
        // Relaxed behavior: don't block order creation for missing payment
        // or customer verification. Use sensible defaults where necessary.
        let selectedPaymentMethod = getSelectedPaymentMethod();
        if (!selectedPaymentMethod) selectedPaymentMethod = 'none';

        let payment = {};
        try {
          const raw = sessionStorage.getItem('paymentInfo');
          if (raw) payment = JSON.parse(raw) || {};
        } catch (e) {
          console.warn('[shipping.js] Failed to parse paymentInfo; proceeding without it');
          payment = {};
          sessionStorage.removeItem('paymentInfo');
        }

        // Show loading status
        showStatus('Creating your order...', false);

        // Get all required data for order creation
        const formData = JSON.parse(sessionStorage.getItem('formData') || '{}');
        // Provide fallback values if customer info is missing so order creation
        // doesn't fail downstream.
        if (!formData.name) formData.name = formData.firstName ? (formData.firstName + (formData.lastName ? ' ' + formData.lastName : '')) : 'Guest';
        if (!formData.email) formData.email = 'guest@example.com';
        const cartData = JSON.parse(sessionStorage.getItem('cartData') || '{}');
        const quotationData = JSON.parse(sessionStorage.getItem('quotationResponse') || '{}');


        if (Object.keys(cartData).length === 0) {
          alert('No items in cart. Please add items before placing order.');
          return;
        }

        // Try to create Firebase order first
        let orderId = null;
        try {
          orderId = await createFirebaseOrder(formData, cartData, quotationData, payment, selectedPaymentMethod);
        } catch (error) {
          console.error('Firebase order creation failed:', error);
          // Create a fallback order ID
          orderId = 'ORDER_FALLBACK_' + Date.now();
        }

        if (orderId) {
          // Try to send admin notification (non-blocking)
          try {
            await sendOrderApprovalNotification(orderId, formData, cartData, quotationData, payment, selectedPaymentMethod);
            console.log('Admin notification sent successfully');
          } catch (notificationError) {
            console.warn('Admin notification failed, but order was created:', notificationError);
            // Still proceed - order was created successfully
          }

          // Store order ID for confirmation page
          sessionStorage.setItem('orderId', orderId);

          showStatus('Order placed successfully! Admin will be notified for approval.', false);

          // Navigate to confirmation page
          setTimeout(() => {
            window.location.href = 'payment.html';
          }, 1500);
        } else {
          throw new Error('Failed to create order');
        }

      } catch (error) {
        console.error('[shipping.js] Payment process failed:', error);
        showStatus('Error: ' + error.message, true);
      }
    }

    // Get selected payment method
    function getSelectedPaymentMethod() {
      const gcashPayment = document.getElementById('gcash-payment');
      const cardPayment = document.getElementById('card-payment');

      if (gcashPayment && gcashPayment.checked) {
        return 'gcash';
      } else if (cardPayment && cardPayment.checked) {
        return 'card';
      }

      return 'gcash'; // default
    }

    // Function to check if quotation has expired
    function isQuotationExpired(quotationData) {
      console.log('[shipping.js] 🕐 Checking quotation expiry...');
      
      if (!quotationData?.data?.expiresAt) {
        console.log('[shipping.js] ⚠️ No expiry date found in quotation');
        return false;
      }
      
      try {
        const expiresAt = new Date(quotationData.data.expiresAt);
        const now = new Date();
        const isExpired = now >= expiresAt;
        
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const minutesUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60));
        
        console.log('[shipping.js] 📅 Quotation expiry check:', {
          expiresAt: expiresAt.toISOString(),
          now: now.toISOString(),
          isExpired: isExpired,
          minutesUntilExpiry: minutesUntilExpiry
        });
        
        if (isExpired) {
          console.log('[shipping.js] ❌ Quotation has EXPIRED');
        } else {
          console.log(`[shipping.js] ✅ Quotation valid for ${minutesUntilExpiry} more minutes`);
        }
        
        return isExpired;
      } catch (error) {
        console.error('[shipping.js] Error checking quotation expiry:', error);
        return false;
      }
    }

    // Function to refresh expired quotation with same addresses
    async function refreshExpiredQuotation(expiredQuotation) {
      console.log('[shipping.js] 🔄 Refreshing expired quotation...');
      
      try {
        if (!expiredQuotation?.data?.stops || expiredQuotation.data.stops.length < 2) {
          throw new Error('Invalid expired quotation structure - missing stops');
        }
        
        const stops = expiredQuotation.data.stops;
        const pickupStop = stops[0];
        const deliveryStop = stops[1];
        
        console.log('[shipping.js] 📍 Extracting addresses from expired quotation:', {
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
        
        console.log('[shipping.js] 📤 Sending fresh quotation request:', bodyObj);
        
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
        console.log('[shipping.js] ✅ Fresh quotation received:', freshQuotation);
        
        // Validate fresh quotation
        if (!freshQuotation.data || !freshQuotation.data.quotationId) {
          throw new Error('Fresh quotation response is invalid');
        }
        
        console.log('[shipping.js] 🆕 Fresh quotation validated successfully:', {
          newQuotationId: freshQuotation.data.quotationId,
          newExpiresAt: freshQuotation.data.expiresAt,
          stops: freshQuotation.data.stops?.length || 0
        });
        
        return freshQuotation;
        
      } catch (error) {
        console.error('[shipping.js] ❌ Error refreshing quotation:', error);
        throw new Error(`Failed to refresh quotation: ${error.message}`);
      }
    }

    // Place a Lalamove order using the stored quotation (for testing connectivity)
    async function placeLalamoveOrder() {
      try {
        console.log('[shipping.js] ====== PLACE LALAMOVE ORDER START ======');
        
        // Get quotation from session storage (different keys might be used)
        const rawQuotation = sessionStorage.getItem('quotationData') || sessionStorage.getItem('quotationResponse') || sessionStorage.getItem('quotation');
        if (!rawQuotation) {
          throw new Error('No quotation data found in sessionStorage');
        }

        let quotation = typeof rawQuotation === 'string' ? JSON.parse(rawQuotation) : rawQuotation;

        // Basic validation
        if (!quotation.data || !quotation.data.quotationId || !Array.isArray(quotation.data.stops) || quotation.data.stops.length < 2) {
          throw new Error('Invalid quotation data format');
        }

        console.log('[shipping.js] 🔍 Initial quotation loaded:', {
          quotationId: quotation.data.quotationId,
          expiresAt: quotation.data.expiresAt,
          stopsCount: quotation.data.stops.length
        });

        // Check if quotation has expired and refresh if needed
        if (isQuotationExpired(quotation)) {
          console.log('[shipping.js] 🔄 Quotation expired, attempting to refresh...');
          
          try {
            // Get fresh quotation using same addresses
            const freshQuotation = await refreshExpiredQuotation(quotation);
            
            // Update quotation variable with fresh data
            quotation = freshQuotation;
            
            // Update sessionStorage with fresh quotation
            sessionStorage.setItem('quotationData', JSON.stringify(freshQuotation));
            console.log('[shipping.js] 💾 Fresh quotation stored in sessionStorage');
            
            // Log the refresh success
            console.log('[shipping.js] ✅ Successfully refreshed expired quotation:', {
              oldQuotationId: JSON.parse(rawQuotation).data.quotationId,
              newQuotationId: freshQuotation.data.quotationId,
              newExpiresAt: freshQuotation.data.expiresAt
            });
            
          } catch (refreshError) {
            console.error('[shipping.js] ❌ Failed to refresh expired quotation:', refreshError);
            throw new Error(`Quotation expired and refresh failed: ${refreshError.message}`);
          }
        } else {
          console.log('[shipping.js] ✅ Quotation is still valid, proceeding with existing quotation');
        }

        // Get customer info
        const formData = JSON.parse(sessionStorage.getItem('formData') || '{}');
        const customerName = formData.name || (formData.firstName ? (formData.firstName + (formData.lastName ? ' ' + formData.lastName : '')) : 'Guest');
        const customerPhone = formData.phone || formData.contact || '';

        // Build payload to match Lalamove /v3/orders expected body (wrapped with data)
        const payload = {
          data: {
            quotationId: quotation.data.quotationId,
            sender: {
              stopId: quotation.data.stops[0].stopId || quotation.data.stops[0].id || 'SENDER_STOP',
              name: 'Restaurant',
              phone: '+639568992189' // Hardcoded restaurant phone for testing
            },
            recipients: [
              {
                stopId: quotation.data.stops[1].stopId || quotation.data.stops[1].id || 'RECIPIENT_STOP',
                name: customerName,
                phone: formatPhoneNumber(customerPhone)
              }
            ],
            metadata: {
              orderRef: 'TEST_ORDER_' + Date.now()
            }
          }
        };
        
        console.log('[shipping.js] 📤 Sending Lalamove order with valid quotation:', {
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
          console.error('[shipping.js] ❌ Lalamove API returned error:', {
            status: resp.status,
            statusText: resp.statusText,
            error: result
          });
          throw new Error(result.error || JSON.stringify(result));
        }

        console.log('[shipping.js] ✅ Lalamove order placed successfully:', result);
        showStatus('Lalamove order placed successfully! Check server logs for details.', false);
        
        // Store result for inspection
        sessionStorage.setItem('lalamoveTestResult', JSON.stringify(result));
        console.log('[shipping.js] ====== PLACE LALAMOVE ORDER SUCCESS ======');
        
        return result;
      } catch (error) {
        console.error('[shipping.js] ❌ placeLalamoveOrder error:', error);
        console.error('[shipping.js] ====== PLACE LALAMOVE ORDER FAILED ======');
        throw error;
      }
    }

    // Initialize when DOM is ready
    init();

  } catch (initError) {
    console.error('[SHIPPING] Error during initialization:', initError);
    console.error('Error details:', initError.message);
    console.error('Error stack:', initError.stack);

    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4757;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.innerHTML = `
      <strong>⚠️ Initialization Error</strong><br>
      <small>Please refresh the page and try again</small>
    `;
    document.body.appendChild(errorDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }
});

// Function to send notification to admin when order with payment proof is placed
async function sendOrderNotificationToAdmin(orderId, orderData) {
  try {
    const db = firebase.firestore();

    const notificationMessage = `New order #${orderId} requires approval. Customer: ${orderData.customerInfo.fullName}, Total: ₱${orderData.total}, Payment: ${orderData.paymentMethod} (Reference: ${orderData.paymentInfo.reference})`;

    await db.collection('notifications').add({
      type: 'order_approval',
      orderId: orderId,
      message: notificationMessage,
      // Customer Information
      customerName: orderData.customerInfo.fullName,
      customerEmail: orderData.customerInfo.email,
      customerPhone: orderData.customerInfo.phone,
      // Payment Information
      orderTotal: orderData.total,
      paymentMethod: orderData.paymentMethod,
      paymentReference: orderData.paymentInfo.reference,
      // Order Summary
      items: orderData.items,
      subtotal: orderData.subtotal,
      shippingCost: orderData.shippingCost,
      shippingMethod: orderData.shippingInfo.method,
      // Additional Details
      notes: orderData.notes,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      seen: false,
      requiresAction: true
    });

    console.log('[shipping.js] Admin notification sent for order:', orderId);
  } catch (error) {
    console.error('[shipping.js] Error sending admin notification:', error);
  }
}

// Function to create Firebase order
async function createFirebaseOrder(formData, cartData, quotationData, paymentInfo, paymentMethod) {
  try {
    // Initialize Lalamove Quotation Manager
    const quotationManager = new LalamoveQuotationManager();
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not available for order creation');
      // Create a mock order ID for testing
      const mockOrderId = 'ORDER_MOCK_' + Date.now();
      console.log('Created mock order ID:', mockOrderId);
      return mockOrderId;
    }

    // Wait for Firebase to be ready
    let firebaseReady = false;
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    while (!firebaseReady && attempts < maxAttempts) {
      try {
        if (firebase.apps && firebase.apps.length > 0 && firebase.firestore) {
          firebaseReady = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      } catch (checkError) {
        console.warn('Firebase readiness check failed:', checkError.message);
        break;
      }
    }

    if (!firebaseReady) {
      console.warn('Firebase not ready, creating mock order');
      const mockOrderId = 'ORDER_MOCK_' + Date.now();
      return mockOrderId;
    }

    // Initialize Firebase Order Manager
    if (typeof FirebaseOrderManager === 'undefined') {
      console.warn('FirebaseOrderManager not available. Creating simple order...');

      // Fallback: Create order directly with Firestore
      const db = firebase.firestore();
      const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Convert cart data to items array
      const items = Object.values(cartData).map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        totalPrice: parseFloat(item.price.replace(/[^\d.]/g, '')) * item.quantity
      }));

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const shippingCost = quotationData.totalAmount ? parseFloat(quotationData.totalAmount) : 0;
      const total = subtotal + shippingCost;

      // Ensure user is authenticated
      if (!firebase.auth().currentUser) {
        console.log('No authenticated user, proceeding without authentication for order creation');
        // Don't try to authenticate - just proceed with null userId
      }

      const orderData = {
        orderId: orderId,
        userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
        status: 'pending_approval',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        customerInfo: {
          fullName: formData.name || '',
          email: formData.email || '',
          phone: formData.phone || ''
        },
        items: items,
        subtotal: subtotal,
        shippingCost: shippingCost,
        total: total,
        paymentMethod: paymentMethod,
        paymentInfo: paymentInfo,
        source: 'customer_web'
      };

      await db.collection('orders').doc(orderId).set(orderData);
      console.log('Order created successfully with fallback method:', orderId);
      return orderId;
    }

    const orderManager = new FirebaseOrderManager();

    // Wait for Firebase Order Manager to initialize with timeout
    let initialized = false;
    attempts = 0;
    const maxInitAttempts = 30; // 3 seconds max

    while (!initialized && attempts < maxInitAttempts) {
      if (orderManager.isInitialized) {
        initialized = true;
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }

    if (!initialized) {
      throw new Error('Firebase Order Manager initialization timeout');
    }

    // Convert cart data to items array
    const items = Object.values(cartData).map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      totalPrice: parseFloat(item.price.replace(/[^\d.]/g, '')) * item.quantity
    }));

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const shippingCost = quotationData.totalAmount ? parseFloat(quotationData.totalAmount) : 0;
    const total = subtotal + shippingCost;

    // Get current user ID if available
    let currentUserId = null;
    try {
      if (firebase.auth().currentUser) {
        currentUserId = firebase.auth().currentUser.uid;
      } else {
        // Don't try to authenticate - just proceed with null userId
        console.log('No authenticated user, proceeding with null userId');
        currentUserId = null;
      }
    } catch (error) {
      console.log('Authentication error, proceeding without userId:', error.message);
    }

    // Prepare order data
    const orderData = {
      customerInfo: {
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        fullName: formData.firstName && formData.lastName ? 
          `${formData.firstName} ${formData.lastName}` : 'Unknown Customer',
        email: formData.email || 'No email provided',
        phone: formData.phone || 'Unknown Phone',
        address: formData.fullAddress || formData.address || 'No address provided'
      },
      shippingInfo: {
        address: formData.address || '',
        barangay: formData.barangay || '',
        city: formData.city || '',
        province: formData.province || '',
        postalCode: formData.postalCode || '',
        method: quotationData.serviceType || 'pickup',
        cost: shippingCost
      },
      items: items,
      subtotal: subtotal,
      shippingCost: shippingCost,
      total: total,
      paymentMethod: paymentMethod,
      paymentInfo: {
        type: paymentInfo.type,
        reference: paymentInfo.reference,
        receiptUrl: paymentInfo.receiptUrl || null,
        receiptData: paymentInfo.receiptData || null,
        receiptName: paymentInfo.receiptName || '',
        timestamp: paymentInfo.timestamp
      },
      status: 'pending_approval', // Order needs admin approval
      notes: formData.notes || '',
      estimatedDeliveryTime: quotationData.estimatedDeliveryTime || null,
      userId: currentUserId
    };

    console.log('[shipping.js] Creating order with data:', orderData);

    // Create the order with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Order creation timeout')), 15000)
    );

    const createPromise = orderManager.createOrder(orderData);
    const orderId = await Promise.race([createPromise, timeoutPromise]);

    console.log('[shipping.js] Order created successfully with ID:', orderId);

    // Store Lalamove quotation if it exists and has quotationId
    if (quotationData?.data?.quotationId) {
      try {
        console.log('[shipping.js] Current auth state:', firebase.auth().currentUser);
        console.log('[shipping.js] Storing Lalamove quotation data:', quotationData);
        await quotationManager.storeQuotation(quotationData, {
          orderId: orderId,
          customerInfo: orderData.customerInfo
        });
        console.log('[shipping.js] Lalamove quotation stored successfully');
      } catch (quotationError) {
        console.error('[shipping.js] Error storing Lalamove quotation:', quotationError);
        // Continue with order process even if quotation storage fails
      }
    }
    return orderId;

  } catch (error) {
    console.error('[shipping.js] Error creating Firebase order:', error);

    // Create a fallback order ID so the process doesn't completely fail
    const fallbackOrderId = 'ORDER_FALLBACK_' + Date.now();
    console.log('[shipping.js] Created fallback order ID:', fallbackOrderId);

    // Store order data in session storage as backup
    try {
      const fallbackOrderData = {
        orderId: fallbackOrderId,
        customerInfo: formData,
        cartData: cartData,
        paymentInfo: paymentInfo,
        timestamp: new Date().toISOString(),
        status: 'pending_approval'
      };
      sessionStorage.setItem('fallbackOrderData', JSON.stringify(fallbackOrderData));
      console.log('Fallback order data stored in session storage');
    } catch (storageError) {
      console.warn('Could not store fallback order data:', storageError.message);
    }

    return fallbackOrderId;
  }
}

// Function to send order approval notification to admin
async function sendOrderApprovalNotification(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod) {
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not available for admin notification');
      return await sendNotificationViaServer(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod);
    }

    // Wait for Firebase to be ready
    let firebaseReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!firebaseReady && attempts < maxAttempts) {
      try {
        if (firebase.apps && firebase.apps.length > 0 && firebase.firestore) {
          firebaseReady = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      } catch (checkError) {
        console.warn('Firebase readiness check failed:', checkError.message);
        break;
      }
    }

    if (!firebaseReady) {
      console.warn('Firebase not ready for notification, trying server fallback');
      return await sendNotificationViaServer(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod);
    }

    const db = firebase.firestore();

    // Don't try to authenticate - just proceed
    console.log('Sending notification without authentication');

    // Calculate totals for display
    const items = Object.values(cartData);
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
      return sum + (price * item.quantity);
    }, 0);
    const shippingCost = quotationData.totalAmount ? parseFloat(quotationData.totalAmount) : 0;
    const total = subtotal + shippingCost;

    // Create comprehensive notification for admin
    const notificationData = {
      type: 'order_approval',
      orderId: orderId,
      message: `New order #${orderId} requires approval from ${formData.name}. Total: ₱${total.toFixed(2)} (${paymentMethod.toUpperCase()}: ${paymentInfo.reference})`,

      // Customer details
      customerInfo: {
        name: formData.name || 'Unknown Customer',
        email: formData.email || 'No email',
        phone: formData.phone || 'No phone'
      },

      // Order details
      orderDetails: {
        orderId: orderId,
        subtotal: subtotal,
        shippingCost: shippingCost,
        total: total,
        itemCount: items.length,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      },

      // Payment details
      paymentDetails: {
        method: paymentMethod,
        reference: paymentInfo.reference,
        receiptUrl: paymentInfo.receiptUrl || null,
        receiptData: paymentInfo.receiptData || null,
        timestamp: paymentInfo.timestamp
      },

      // Shipping details
      shippingDetails: {
        address: formData.address || '',
        method: quotationData.serviceType || 'pickup',
        cost: shippingCost
      },

      // Notification metadata
      timestamp: new Date().toISOString(), // Use regular timestamp instead of server timestamp
      seen: false,
      requiresAction: true,
      status: 'pending', // pending, approved, declined

      // Action buttons for admin
      actions: {
        approve: true,
        decline: true
      }
    };

    console.log('[shipping.js] Sending admin notification:', notificationData);

    // Try to add notification to Firestore with timeout
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Notification send timeout')), 5000)
      );

      const addPromise = db.collection('notifications').add(notificationData);
      const docRef = await Promise.race([addPromise, timeoutPromise]);

      console.log('[shipping.js] Admin notification sent successfully! Document ID:', docRef.id);
      return true;
    } catch (firestoreError) {
      console.warn('Firestore notification failed, trying server fallback:', firestoreError.message);
      return await sendNotificationViaServer(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod);
    }

  } catch (error) {
    console.error('[shipping.js] Error sending order approval notification:', error);
    console.warn('Trying server fallback for notification');
    return await sendNotificationViaServer(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod);
  }
}

// Fallback function to send notification via server API
async function sendNotificationViaServer(orderId, formData, cartData, quotationData, paymentInfo, paymentMethod) {
  try {
    const items = Object.values(cartData);
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
      return sum + (price * item.quantity);
    }, 0);
    const shippingCost = quotationData.totalAmount ? parseFloat(quotationData.totalAmount) : 0;
    const total = subtotal + shippingCost;

    const notificationPayload = {
      type: 'order_approval',
      orderId: orderId,
      customerName: formData.name,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      total: total,
      paymentMethod: paymentMethod,
      paymentReference: paymentInfo.reference,
      items: items,
      timestamp: new Date().toISOString()
    };

    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPayload)
    });

    if (response.ok) {
      console.log('Notification sent via server successfully');
      return true;
    } else {
      console.warn('Server notification failed');
      return false;
    }
  } catch (error) {
    console.error('Server notification error:', error);
    return false;
  }
}