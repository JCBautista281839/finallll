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
    const formData = JSON.parse(sessionStorage.getItem('formData') || '{}');
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

    // Add to notifications collection
    console.log('💾 Adding notification to Firestore...');
    const docRef = await db.collection('notifications').add(notificationData);
    console.log('✅ Payment verification notification sent successfully! Document ID:', docRef.id);

    // Show success message to user (non-blocking)
    console.log('Payment verification request sent to admin successfully!');
    return true;

  } catch (error) {
    console.warn('Could not send payment verification notification:', error.message);
    // Don't show error alert to user - just log it
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
          initializeFirebase().catch(error => {
            console.warn('Firebase initialization warning:', error.message);
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

    // Update order form with cart data
    function updateOrderForm(cartData) {
      console.log('[shipping.js] updateOrderForm called with cartData:', cartData);

      const orderItemsContainer = document.querySelector('.order-item');
      const totalElement = document.querySelector('.total .price');

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
        orderItemsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;"><span>No items in cart</span></div>';
        totalElement.textContent = 'Php 0';
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
        itemPrice.innerHTML = '<span class="price" style="font-weight: 600; color: #8b1d1d;">Php ' + itemTotal.toFixed(0) + '</span>';
        
        itemDiv.appendChild(itemName);
        itemDiv.appendChild(itemPrice);
        itemsContainer.appendChild(itemDiv);
      });

      orderItemsContainer.appendChild(itemsContainer);

      // Update total
      totalElement.textContent = 'Php ' + totalPrice.toFixed(0);

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
            throw new Error('Cloudinary upload function not available. Please check if cloud.js is loaded.');
          }

          // Upload receipt to Cloudinary
          console.log('Uploading receipt to Cloudinary...');
          const cloudinaryResult = await window.uploadImageToCloudinary(uploadedFile);
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
          sendPaymentVerificationNotification(paymentInfo);

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
              sendPaymentVerificationNotification(paymentInfo);

              console.log('Payment confirmation saved with base64 fallback:', { type: currentPaymentType, reference: refCode });

              // Reset button state
              paymentConfirm.disabled = false;
              paymentConfirm.textContent = 'Confirm Payment';
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

      // Load and display cart data
      const cartData = loadCartData();
      updateOrderForm(cartData);

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

    // Main payment button handler
    async function handlePayment(event) {
      event.preventDefault();

      try {
        // Strict validation: MUST have payment info with both reference and receipt
        const selectedPaymentMethod = getSelectedPaymentMethod();
        const paymentInfo = sessionStorage.getItem('paymentInfo');

        // Check if payment method is selected
        if (!selectedPaymentMethod || (selectedPaymentMethod !== 'gcash' && selectedPaymentMethod !== 'card')) {
          alert('Please select a payment method (GCash or Card) first.');
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

        if (!payment.receiptData) {
          alert('Payment receipt screenshot is required. Please complete the payment modal first.');
          sessionStorage.removeItem('paymentInfo');
          return;
        }

        // Verify payment method matches
        if (payment.type !== selectedPaymentMethod) {
          alert('Payment method mismatch. Please complete the payment process for the selected method.');
          sessionStorage.removeItem('paymentInfo');
          return;
        }

        showStatus('Order placed successfully! Payment verification in progress.', false);

        // Navigate to confirmation page
        window.location.href = 'payment.html';

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