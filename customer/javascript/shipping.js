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

  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      console.warn('Firebase not available, order will proceed without admin notification');
      return false; // Return false instead of throwing error
    }

    // Get customer data from session storage
    const formData = JSON.parse(sessionStorage.getItem('orderFormData') || sessionStorage.getItem('formData') || '{}');
    console.log('Customer form data:', formData);

    const customerName = formData.name || 'Unknown Customer';
    const customerPhone = formData.phone || 'Unknown Phone';

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
      message: `Payment verification required for ${customerName} (${(paymentInfo.type || 'Unknown').toUpperCase()}) - Reference: ${paymentInfo.reference || 'No reference'}`,
      customerInfo: {
        name: customerName,
        phone: customerPhone,
        email: formData.email || 'No email provided'
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

    // Load cart data from sessionStorage
    function loadCartData() {
      const cartData = sessionStorage.getItem('cartData');
      console.log('[shipping.js] Loading cart data from sessionStorage:', cartData);
      if (cartData) {
        const parsedData = JSON.parse(cartData);
        console.log('[shipping.js] Parsed cart data:', parsedData);
        return parsedData;
      }
      console.log('[shipping.js] No cart data found in sessionStorage');
      return {};
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

      const orderMenuContainer = document.getElementById('order-menu');
      const subtotalElement = document.getElementById('subtotal-amount');
      const totalElement = document.getElementById('total-amount');

      console.log('[shipping.js] Found elements:', {
        orderMenuContainer: !!orderMenuContainer,
        subtotalElement: !!subtotalElement,
        totalElement: !!totalElement
      });

      if (!orderMenuContainer || !subtotalElement || !totalElement) {
        console.error('[shipping.js] Required elements not found');
        return;
      }

      const cartItems = Object.values(cartData);
      let subtotal = 0;

      console.log('[shipping.js] Cart items:', cartItems);

      // Clear existing items
      orderMenuContainer.innerHTML = '';

      if (cartItems.length === 0) {
        console.log('[shipping.js] No cart items, showing empty message');
        orderMenuContainer.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Your cart is empty</p>';
        subtotalElement.textContent = '₱0';
        totalElement.textContent = '₱0';
        return;
      }

      // Add each cart item
      cartItems.forEach(item => {
        const price = window.parsePrice ? window.parsePrice(item.price) : parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
        const quantity = parseInt(item.quantity) || 1;
        const itemTotal = price * quantity;
        subtotal += itemTotal;

        console.log(`[shipping.js] Item: ${item.name}, Price: ${price}, Quantity: ${quantity}, Total: ${itemTotal}`);

        // Create order item element
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; border: 1px solid #e9ecef;';

        orderItem.innerHTML = `
          <div class="item-details" style="flex: 1;">
            <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600;">${item.name}</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">x${quantity}</p>
          </div>
          <div class="item-price" style="text-align: right;">
            <span style="font-weight: 600; color: #8b1d1d;">₱${itemTotal.toFixed(0)}</span>
          </div>
        `;

        orderMenuContainer.appendChild(orderItem);
      });

      // Update subtotal and initial total
      subtotalElement.textContent = `₱${subtotal.toFixed(0)}`;

      // Also update the subtotal amount element if it exists
      const subtotalAmountElement = document.getElementById('subtotal-amount');
      if (subtotalAmountElement) {
        subtotalAmountElement.textContent = `₱${subtotal.toFixed(0)}`;
      }

      // Store updated subtotal in sessionStorage for consistency
      sessionStorage.setItem('orderSubtotal', subtotal.toString());

      // Calculate total with shipping (initially pickup - free)
      const shippingFee = 0; // Start with pickup (free)
      const total = subtotal + shippingFee;
      totalElement.textContent = `₱${total.toFixed(0)}`;

      // Store subtotal for shipping calculations
      sessionStorage.setItem('orderSubtotal', subtotal.toString());

      console.log('[shipping.js] Order summary updated - Subtotal:', subtotal, 'Total:', total);
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

    // Order Confirmation Modal
    function showOrderConfirmationModal(orderData) {
      console.log('[shipping.js] Showing order confirmation modal with data:', orderData);

      // Create modal HTML
      const modalHTML = `
        <div id="order-confirmation-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        ">
          <div style="
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideIn 0.3s ease-out;
          ">
            <div style="
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 15px 15px 0 0;
            ">
              <div style="
                width: 60px;
                height: 60px;
                background: white;
                border-radius: 50%;
                margin: 0 auto 15px;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="30" height="30" fill="#28a745" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.061L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
              </div>
              <h2 style="margin: 0; font-size: 24px;">Order Confirmed!</h2>
              <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your order</p>
            </div>
            
            <div style="padding: 25px;">
              <div style="
                background: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                border-left: 4px solid #28a745;
              ">
                <h3 style="margin: 0 0 15px; color: #333; font-size: 18px;">Order Summary</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #666;">Order ID:</span>
                  <strong style="color: #333;">#${orderData.orderId}</strong>
                </div>
                ${orderData.lalamoveOrderId ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #666;">Delivery ID:</span>
                  <strong style="color: #333;">#${orderData.lalamoveOrderId}</strong>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #666;">Payment Method:</span>
                  <strong style="color: #333;">${orderData.paymentMethod === 'gcash' ? 'GCash' : 'Bank Transfer'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #666;">Delivery Method:</span>
                  <strong style="color: #333;">${orderData.deliveryMethod === 'delivery' ? 'Lalamove Delivery' : 'Store Pickup'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">Total Amount:</span>
                  <strong style="color: #28a745; font-size: 18px;">₱${orderData.totalAmount}</strong>
                </div>
              </div>

              <div style="
                background: #e7f3ff;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid #007bff;
              ">
                <h4 style="margin: 0 0 10px; color: #333; font-size: 16px;">📱 What's Next?</h4>
                <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.6;">
                  <li>Our admin will review and approve your order</li>
                  <li>You'll receive SMS/email updates on your order status</li>
                  ${orderData.deliveryMethod === 'delivery' ?
          '<li>A Lalamove rider will pick up and deliver your order</li>' :
          '<li>You can pick up your order at our store once ready</li>'
        }
                  <li>Keep your order ID for reference</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <button id="close-order-modal" style="
                  background: #28a745;
                  color: white;
                  border: none;
                  padding: 12px 30px;
                  border-radius: 25px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: background 0.3s ease;
                  margin-right: 10px;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                  Continue Shopping
                </button>
                <button id="view-orders-btn" style="
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 30px;
                  border-radius: 25px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: background 0.3s ease;
                " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                  View My Orders
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.8) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        </style>
      `;

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Add event listeners
      const modal = document.getElementById('order-confirmation-modal');
      const closeBtn = document.getElementById('close-order-modal');
      const viewOrdersBtn = document.getElementById('view-orders-btn');

      // Close modal and go to menu
      closeBtn.addEventListener('click', function () {
        modal.remove();
        // Clear cart and order data
        sessionStorage.removeItem('cartData');
        sessionStorage.removeItem('orderFormData');
        sessionStorage.removeItem('formData');
        sessionStorage.removeItem('paymentInfo');
        sessionStorage.removeItem('quotationData');
        // Redirect to menu or home page
        window.location.href = '../index.html';
      });

      // View orders (you can customize this)
      viewOrdersBtn.addEventListener('click', function () {
        modal.remove();
        // Clear cart and order data
        sessionStorage.removeItem('cartData');
        sessionStorage.removeItem('orderFormData');
        sessionStorage.removeItem('formData');
        sessionStorage.removeItem('paymentInfo');
        sessionStorage.removeItem('quotationData');
        // Redirect to orders page (customize as needed)
        window.location.href = '../index.html';
      });

      // Close modal when clicking outside
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          closeBtn.click();
        }
      });

      // Auto-scroll to top if needed
      modal.scrollTop = 0;
    }

    // Initialize the page
    function init() {
      console.log('[shipping.js] Initializing shipping page');

      // Load and display customer information
      loadCustomerInfo();

      // Load and display cart data
      const cartData = loadCartData();
      updateOrderForm(cartData);

      // Initialize shipping options
      initShippingOptions();

      // Initialize payment modal
      initPaymentModal();

      // Find and modify the payment button
      const paymentBtn = document.querySelector('.continue-btn');
      if (paymentBtn) {
        // Remove the onclick attribute
        paymentBtn.removeAttribute('onclick');

        // Initialize button as disabled until payment is confirmed
        paymentBtn.disabled = true;
        paymentBtn.textContent = 'Complete Payment First';
        paymentBtn.style.opacity = '0.6';
        paymentBtn.style.cursor = 'not-allowed';

        // Check if payment was already completed
        const existingPaymentInfo = sessionStorage.getItem('paymentInfo');
        if (existingPaymentInfo) {
          try {
            const payment = JSON.parse(existingPaymentInfo);
            if (payment.reference && payment.receiptData) {
              enablePlaceOrderButton(paymentBtn);
            }
          } catch (error) {
            console.error('Invalid payment info in session storage:', error);
            sessionStorage.removeItem('paymentInfo');
          }
        }

        // Add our custom handler
        paymentBtn.addEventListener('click', handlePayment);

        console.log('[shipping.js] Payment button handler attached');
      } else {
        console.error('[shipping.js] Payment button not found');
        showStatus('Error: Payment button not found', true);
      }
    }

    // Function to place actual order with Lalamove API
    async function placeLalamoveOrder(formData, quotationData) {
      console.log('[shipping.js] Placing Lalamove order with data:', { formData, quotationData });

      try {
        // Validate required data
        if (!quotationData.data || !quotationData.data.stops) {
          throw new Error('Quotation data is missing required information');
        }

        if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
          throw new Error('Customer information is incomplete. Missing required fields.');
        }

        // Validate coordinates
        const stops = quotationData.data.stops;
        if (!stops || stops.length < 2) {
          throw new Error('Invalid quotation data: Missing stops information');
        }

        // Check if coordinates are valid and convert to numbers if needed
        const pickup = stops[0];
        const delivery = stops[1];

        if (!pickup.coordinates || !delivery.coordinates) {
          throw new Error('Invalid quotation data: Missing coordinates');
        }

        // Convert coordinates to numbers if they're strings
        pickup.coordinates.lat = Number(pickup.coordinates.lat);
        pickup.coordinates.lng = Number(pickup.coordinates.lng);
        delivery.coordinates.lat = Number(delivery.coordinates.lat);
        delivery.coordinates.lng = Number(delivery.coordinates.lng);

        // Validate that coordinates are valid numbers
        if (isNaN(pickup.coordinates.lat) || isNaN(pickup.coordinates.lng) ||
          isNaN(delivery.coordinates.lat) || isNaN(delivery.coordinates.lng)) {
          throw new Error('Invalid quotation data: Coordinates are not valid numbers');
        }

        // Get pickup and delivery addresses from stored data
        const pickupAddress = sessionStorage.getItem('pickupAddress') || "Viktoria's Bistro, Philippines";
        const deliveryAddress = sessionStorage.getItem('deliveryAddress') || formData.fullAddress;

        // Format phone number for Lalamove
        const formattedPhone = formatPhoneNumber(formData.phone);

        // Prepare order data for Lalamove API (correct format for /v3/orders endpoint)
        const orderData = {
          serviceType: quotationData.data.serviceType || 'MOTORCYCLE',
          specialRequests: [],
          language: 'en_PH',
          stops: [
            // Pickup stop (restaurant)
            {
              coordinates: {
                lat: quotationData.data.stops[0].coordinates.lat,
                lng: quotationData.data.stops[0].coordinates.lng
              },
              address: quotationData.data.stops[0].address,
              contact: {
                name: "Viktoria's Bistro",
                phone: "+639189876543"
              }
            },
            // Delivery stop (customer)
            {
              coordinates: {
                lat: quotationData.data.stops[1].coordinates.lat,
                lng: quotationData.data.stops[1].coordinates.lng
              },
              address: quotationData.data.stops[1].address,
              contact: {
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                phone: formattedPhone
              }
            }
          ],
          isRouteOptimized: false,
          item: {
            quantity: "1",
            weight: "LESS_THAN_3_KG",
            categories: ["FOOD_DELIVERY"],
            handlingInstructions: ["KEEP_UPRIGHT"]
          }
        };

        console.log('[shipping.js] Calling Lalamove Place Order API with data:', JSON.stringify(orderData, null, 2));
        console.log('[shipping.js] Quotation data being used:', quotationData);

        // Call the server endpoint to place the order
        const response = await fetch('/api/place-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipping.js] Lalamove API Error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Lalamove order failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[shipping.js] ✅ Lalamove order placed successfully:', result);

        // Extract order ID from response
        const lalamoveOrderId = result.data ? result.data.orderRef : result.orderRef;

        if (!lalamoveOrderId) {
          throw new Error('No order ID returned from Lalamove API');
        }

        console.log('[shipping.js] Lalamove Order ID:', lalamoveOrderId);
        return lalamoveOrderId;

      } catch (error) {
        console.error('[shipping.js] ❌ Lalamove order placement failed:', error);
        throw error;
      }
    }

    // Main payment button handler
    async function handlePayment(event) {
      event.preventDefault();

      try {
        // Strict validation: MUST have payment info with both reference and receipt
        const selectedPaymentMethod = getSelectedPaymentMethod();
        const paymentInfo = sessionStorage.getItem('paymentInfo');

        // Check if payment method is selected
        if (!selectedPaymentMethod || (selectedPaymentMethod !== 'gcash' && selectedPaymentMethod !== 'bank_transfer')) {
          alert('Please select a payment method (GCash or Bank Transfer) first.');
          return;
        }

        // Payment info is absolutely required - no exceptions
        if (!paymentInfo) {
          alert('You must complete the payment process first. Please click on your selected payment method to open the payment modal and provide your reference code and receipt screenshot.');
          return;
        }

        // Validate payment data completeness
        let payment;
        try {
          payment = JSON.parse(paymentInfo);
        } catch (error) {
          alert('Invalid payment information. Please complete the payment process again.');
          sessionStorage.removeItem('paymentInfo');
          return;
        }

        // Both reference code and receipt are absolutely required
        if (!payment.reference || payment.reference.trim().length < 5) {
          alert('Payment reference code is required (minimum 5 characters). Please complete the payment modal first.');
          sessionStorage.removeItem('paymentInfo');
          return;
        }

        if (!payment.receiptData && !payment.receiptUrl) {
          alert('Payment receipt screenshot is required. Please complete the payment modal first.');
          sessionStorage.removeItem('paymentInfo');
          return;
        }

        // Show loading status
        showStatus('Creating your order...', false);

        // Get all required data for order creation
        const formData = JSON.parse(sessionStorage.getItem('orderFormData') || sessionStorage.getItem('formData') || '{}');
        const cartData = JSON.parse(sessionStorage.getItem('cartData') || '{}');
        const quotationData = JSON.parse(sessionStorage.getItem('quotationData') || sessionStorage.getItem('quotationResponse') || '{}');

        // Validate required data
        const customerName = formData.name || (formData.firstName && formData.lastName ? `${formData.firstName} ${formData.lastName}` : '');
        if (!customerName || !formData.email) {
          alert('Customer information is missing. Please go back to the details page and fill in your information.');
          return;
        }

        if (Object.keys(cartData).length === 0) {
          alert('No items in cart. Please add items before placing order.');
          return;
        }

        // Check if Lalamove delivery is selected
        const lalamoveRadio = document.getElementById('lalamove-radio');
        const isLalamoveDelivery = lalamoveRadio && lalamoveRadio.checked;

        let lalamoveOrderId = null;

        if (isLalamoveDelivery) {
          // Place order with Lalamove API
          try {
            showStatus('Placing Lalamove delivery order...', false);
            lalamoveOrderId = await placeLalamoveOrder(formData, quotationData);
            console.log('[shipping.js] Lalamove order placed successfully:', lalamoveOrderId);
            showStatus('Lalamove delivery order created successfully!', false);
          } catch (lalamoveError) {
            console.error('[shipping.js] Lalamove order failed:', lalamoveError);
            showStatus('Warning: Lalamove order failed, but internal order will still be created.', true);
            // Continue with internal order creation even if Lalamove fails
          }
        }

        // Try to create Firebase order (internal order tracking)
        let orderId = null;
        try {
          // Add Lalamove order ID to the order data if available
          const orderData = {
            ...quotationData,
            lalamoveOrderId: lalamoveOrderId,
            deliveryMethod: isLalamoveDelivery ? 'lalamove' : 'pickup'
          };
          orderId = await createFirebaseOrder(formData, cartData, orderData, payment, selectedPaymentMethod);
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

          // Store order ID and Lalamove order ID for confirmation page
          sessionStorage.setItem('orderId', orderId);
          if (lalamoveOrderId) {
            sessionStorage.setItem('lalamoveOrderId', lalamoveOrderId);
          }

          const successMessage = lalamoveOrderId ?
            'Order placed successfully! Lalamove delivery has been arranged. Admin will be notified for approval.' :
            'Order placed successfully! Admin will be notified for approval.';

          showStatus(successMessage, false);

          // Show order confirmation modal instead of navigating to payment.html
          setTimeout(() => {
            const orderConfirmationData = {
              orderId: orderId,
              lalamoveOrderId: lalamoveOrderId,
              paymentMethod: payment.type,
              deliveryMethod: lalamoveRadio && lalamoveRadio.checked ? 'delivery' : 'pickup',
              totalAmount: document.getElementById('total-amount').textContent.replace('₱', '')
            };
            showOrderConfirmationModal(orderConfirmationData);
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
      const bankTransferPayment = document.getElementById('bank-transfer-payment');

      if (gcashPayment && gcashPayment.checked) {
        return 'gcash';
      } else if (bankTransferPayment && bankTransferPayment.checked) {
        return 'bank_transfer';
      }

      return 'gcash'; // default
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
      customerName: orderData.customerInfo.fullName,
      customerEmail: orderData.customerInfo.email,
      orderTotal: orderData.total,
      paymentMethod: orderData.paymentMethod,
      paymentReference: orderData.paymentInfo.reference,
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
        firstName: formData.name ? formData.name.split(' ')[0] : '',
        lastName: formData.name ? formData.name.split(' ').slice(1).join(' ') : '',
        fullName: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || ''
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