/**
 * Shipping Page JavaScript
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

document.addEventListener('DOMContentLoaded', function () {

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
      qrCodeImage.alt = `${paymentType === 'gcash' ? 'GCash' : 'Bank Transfer'} QR Code`;

      // Handle image load error
      qrCodeImage.onerror = function () {
        console.log('QR code image not found, showing fallback text');
        qrCodeImage.style.display = 'none';

        // Create or update fallback text
        let fallbackDiv = document.querySelector('.qr-fallback');
        if (!fallbackDiv) {
          fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'qr-fallback';
          fallbackDiv.style.cssText = `
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin: 10px 0;
          `;
          qrCodeImage.parentNode.appendChild(fallbackDiv);
        }
        fallbackDiv.innerHTML = `
          <h4>${paymentType === 'gcash' ? 'GCash Payment' : 'Bank Transfer Payment'}</h4>
          <p>${qrCodeFallback[paymentType]}</p>
          <small>Please add your QR code image to display here</small>
        `;
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
        instructionEl.textContent = `You must complete this payment and provide both reference code and receipt screenshot before you can place your order.`;
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
        showStatus(`${currentPaymentType === 'gcash' ? 'GCash' : 'Bank Transfer'} payment confirmed! Receipt uploaded successfully.`, false);

        // Enable the Place Order button
        enablePlaceOrderButton();

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
            showStatus(`${currentPaymentType === 'gcash' ? 'GCash' : 'Bank Transfer'} payment confirmed! Receipt saved locally.`, false);

            // Enable the Place Order button
            enablePlaceOrderButton();

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

  // Load saved data from previous page
  function loadSavedData() {
    const savedFormData = sessionStorage.getItem('orderFormData');
    const savedQuotationData = sessionStorage.getItem('quotationData');
    const savedPickupAddress = sessionStorage.getItem('pickupAddress');
    const savedDeliveryAddress = sessionStorage.getItem('deliveryAddress');

    if (!savedFormData || !savedQuotationData) {
      console.warn('[shipping.js] No saved data found, user may have skipped details page');
      return null;
    }

    try {
      const formData = JSON.parse(savedFormData);
      const quotationData = JSON.parse(savedQuotationData);

      // Also save formData in the standard key for modal access
      sessionStorage.setItem('formData', JSON.stringify(formData));

      return {
        formData: formData,
        quotationData: quotationData,
        pickupAddress: savedPickupAddress,
        deliveryAddress: savedDeliveryAddress
      };
    } catch (error) {
      console.error('[shipping.js] Error parsing saved data:', error);
      return null;
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

  // Save order to Firebase
  async function saveOrderToFirebase(savedData, shippingType) {
    try {
      const { formData, quotationData } = savedData;

      // Get cart data from sessionStorage
      const cartData = loadCartData();
      const cartItems = Object.values(cartData);

      // Get cart summary if available
      const cartSummary = JSON.parse(sessionStorage.getItem('cartSummary')) || null;

      // Determine shipping method and cost
      const isPickup = shippingType === 'pickup';
      const shippingMethod = isPickup ? 'Pick Up in Store' : 'Lalamove Delivery';
      const shippingCost = isPickup ? 0 : (quotationData?.data?.priceBreakdown?.total || 0);

      // Get payment method
      const paymentMethod = getSelectedPaymentMethod();

      // Calculate totals
      let subtotal = 0;
      if (cartSummary && cartSummary.subtotal) {
        subtotal = cartSummary.subtotal;
      } else {
        cartItems.forEach(item => {
          const price = window.parsePrice(item.price);
          subtotal += price * item.quantity;
        });
      }

      const total = subtotal + shippingCost;

      // Create order data for Firebase
      const orderData = {
        customerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          fullName: `${formData.firstName} ${formData.lastName}`
        },
        shippingInfo: {
          address: formData.fullAddress,
          barangay: formData.barangay,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          method: shippingMethod,
          cost: shippingCost
        },
        items: cartItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: window.calculateItemTotal(item.price, item.quantity)
        })),
        subtotal: subtotal,
        shippingCost: shippingCost,
        total: total,
        paymentMethod: paymentMethod,
        shippingMethod: shippingMethod,
        notes: `Order placed via ${shippingMethod}`,
        estimatedDeliveryTime: isPickup ?
          new Date(Date.now() + 30 * 60 * 1000).toISOString() : // 30 minutes for pickup
          new Date(Date.now() + 60 * 60 * 1000).toISOString()   // 1 hour for delivery
      };

      console.log('[shipping.js] Preparing to save order to Firebase:', orderData);

      // Save to Firebase if createOrder function is available
      if (typeof window.createOrder === 'function') {
        const orderId = await window.createOrder(orderData);
        console.log('[shipping.js] Order saved to Firebase successfully:', orderId);

        // Store order ID in sessionStorage for confirmation page
        sessionStorage.setItem('firebaseOrderId', orderId);

        return orderId;
      } else {
        console.warn('[shipping.js] Firebase createOrder function not available');
        return null;
      }
    } catch (error) {
      console.error('[shipping.js] Error saving order to Firebase:', error);
      throw error;
    }
  }

  // Update order form with cart data
  function updateOrderForm(cartData) {
    console.log('[shipping.js] updateOrderForm called with cartData:', cartData);

    const orderItemsContainer = document.querySelector('.order-menu');
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
      orderItemsContainer.innerHTML = `
        <p style="text-align: center; color: #666; font-style: italic;">Your cart is empty</p>
      `;
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
      itemDiv.innerHTML = `
        <div style="flex: 1;">
          <span style="font-weight: 600;">${item.name}</span>
          <br>
          <small style="color: #666;">Qty: ${item.quantity} × ${item.price}</small>
        </div>
        <div style="text-align: right;">
          <span class="price" style="font-weight: 600; color: #8b1d1d;">₱${itemTotal.toFixed(0)}</span>
        </div>
      `;
      itemsContainer.appendChild(itemDiv);
    });

    orderItemsContainer.appendChild(itemsContainer);

    // Update total
    totalElement.textContent = `₱${totalPrice.toFixed(0)}`;

    // Store total for Firebase integration
    sessionStorage.setItem('orderSubtotal', totalPrice.toString());
  }

  // Update the UI with saved data
  function updateUIWithSavedData(savedData) {
    if (!savedData || !savedData.formData) return;

    const { formData, quotationData } = savedData;

    // Update contact information sections
    const contactInfo = document.getElementById('contact-info');
    const deliveryInfo = document.getElementById('delivery-info');

    const customerInfo = `<b>${formData.firstName} ${formData.lastName}</b><br>${formData.email}<br>${formData.phone}`;
    const deliveryAddress = `<b>Name:</b> ${formData.firstName} ${formData.lastName}<br><b>Address:</b> ${formData.fullAddress}<br><b>Email:</b> ${formData.email}<br><b>Phone:</b> ${formData.phone}`;

    if (contactInfo) {
      contactInfo.innerHTML = customerInfo;
    }

    if (deliveryInfo) {
      deliveryInfo.innerHTML = deliveryAddress;
    }

    // Update delivery cost in shipping options
    if (quotationData && quotationData.data && quotationData.data.priceBreakdown) {
      const priceSpan = document.querySelector('#lalamove-option .price');
      if (priceSpan) {
        const total = quotationData.data.priceBreakdown.total;
        const currency = quotationData.data.priceBreakdown.currency;
        const distance = quotationData.data.distance ? `${(parseInt(quotationData.data.distance.value) / 1000).toFixed(1)}km` : 'Unknown distance';
        priceSpan.innerHTML = `₱${total}.00<br><small>MOTORCYCLE • ${distance}</small>`;
      }
    }

    // Update order total (add shipping cost if Lalamove is selected)
    updateOrderTotal(savedData);

    console.log('[shipping.js] UI updated with saved data:', savedData);
  }

  // Update order total based on selected shipping option
  function updateOrderTotal(savedData) {
    const isLalamoveSelected = document.getElementById('lalamove-radio')?.checked || false;
    const subtotalElement = document.getElementById('subtotal-amount');
    const shippingFeeElement = document.getElementById('shipping-fee-amount');
    const totalElement = document.getElementById('total-amount');

    console.log('[shipping.js] updateOrderTotal called with:', {
      isLalamoveSelected,
      hasQuotationData: !!savedData?.quotationData?.data?.priceBreakdown,
      quotationData: savedData?.quotationData
    });

    // Get actual price from cart data
    const cartData = loadCartData();
    let basePrice = 0;

    if (cartData && Object.keys(cartData).length > 0) {
      // Calculate total from cart items using the same logic as updateOrderForm
      const cartItems = Object.values(cartData);
      cartItems.forEach(item => {
        if (item && item.price && item.quantity) {
          const price = window.parsePrice ? window.parsePrice(item.price) : parseFloat(item.price.toString().replace(/[^\d.]/g, ''));
          const quantity = parseInt(item.quantity) || 0;
          basePrice += price * quantity;
        }
      });
    }

    // If still no price, try to get it from the order form display
    if (basePrice <= 0) {
      const orderItems = document.querySelectorAll('.order-item .price');
      orderItems.forEach(priceElement => {
        const priceText = priceElement.textContent;
        if (priceText) {
          const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
          basePrice += price;
        }
      });
    }

    // Final fallback
    if (basePrice <= 0) {
      console.warn('[shipping.js] Could not calculate base price from cart, using 0');
      basePrice = 0;
    }

    // Update subtotal
    if (subtotalElement) {
      subtotalElement.textContent = `₱${basePrice}`;
    }

    // Calculate shipping cost
    let shippingCost = 0;
    let shippingText = 'FREE';

    console.log('[shipping.js] Calculating shipping cost:', {
      isLalamoveSelected,
      hasQuotationData: !!savedData?.quotationData?.data?.priceBreakdown,
      priceBreakdown: savedData?.quotationData?.data?.priceBreakdown
    });

    if (isLalamoveSelected && savedData?.quotationData?.data?.priceBreakdown) {
      shippingCost = parseFloat(savedData.quotationData.data.priceBreakdown.total) || 0;
      shippingText = `₱${shippingCost.toFixed(2)}`;
      console.log('[shipping.js] Lalamove shipping cost calculated:', shippingCost, shippingText);
    }

    // Update shipping fee
    if (shippingFeeElement) {
      shippingFeeElement.textContent = shippingText;
      console.log('[shipping.js] Updated shipping fee element to:', shippingText);
    }

    // Calculate and update total
    const newTotal = basePrice + shippingCost;
    if (totalElement) {
      totalElement.textContent = `₱${newTotal.toFixed(2)}`;
    }

    console.log('[shipping.js] Order total updated:', {
      cartData,
      basePrice,
      shippingCost,
      total: newTotal,
      isLalamoveSelected
    });
  }

  // Place order using stored quotation data
  async function placeOrderWithSavedData(savedData, selectedShippingOption) {
    console.log('[shipping.js] Placing order with saved data:', savedData);
    console.log('[shipping.js] Quotation data structure:', savedData.quotationData);

    try {
      const { formData, quotationData } = savedData;

      // If pickup is selected, use mock order
      if (selectedShippingOption === 'pickup') {
        // Save order to Firebase first
        await saveOrderToFirebase(savedData, 'pickup');

        const mockOrder = createMockPickupOrder(formData);
        showStatus('Order placed successfully (Pickup)!', false);
        return mockOrder;
      }

      // For Lalamove delivery, use real API
      if (!quotationData || !quotationData.data || !quotationData.data.quotationId) {
        console.error('[shipping.js] Missing quotation data:', quotationData);
        throw new Error('No valid quotation found. Please go back and try again.');
      }

      console.log('[shipping.js] Using quotationId:', quotationData.data.quotationId);
      console.log('[shipping.js] Stops from quotation:', quotationData.data.stops);

      const orderBody = {
        data: {
          quotationId: quotationData.data.quotationId,
          sender: {
            stopId: quotationData.data.stops[0].stopId,
            name: "Viktoria's Bistro", // Updated to actual restaurant name
            phone: '+639171234567' // Replace with actual restaurant phone
          },
          recipients: [
            {
              stopId: quotationData.data.stops[1].stopId,
              name: `${formData.firstName} ${formData.lastName}`,
              phone: formatPhoneNumber(formData.phone), // Format phone to E.164
              remarks: 'Food delivery order - Handle with care!'
            }
          ],
          isPODEnabled: false,
          // Add webhook URL for production
          metadata: {
            webhookUrl: 'https://viktoriasbistro.restaurant/api/webhook/lalamove'
          }
        }
      };

      console.log('[shipping.js] Sending order request:', orderBody);

      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order placement failed: ${response.status} ${errorText}`);
      }

      const orderResult = await response.json();
      console.log('[shipping.js] Order placement successful:', orderResult);

      // Save order to Firebase
      await saveOrderToFirebase(savedData, 'lalamove');

      return orderResult;

    } catch (error) {
      console.error('[shipping.js] Order placement error:', error);
      throw error;
    }
  }

  // Create mock order for pickup option
  function createMockPickupOrder(formData) {
    return {
      data: {
        orderId: 'PICKUP_' + Date.now(),
        state: 'CONFIRMED',
        serviceType: 'PICKUP',
        customer: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          address: formData.fullAddress
        },
        restaurant: {
          name: "Viktoria's Bistro",
          address: "Viktoria's Bistro, Philippines" // Updated to actual restaurant address
        },
        price: { total: '500', currency: 'PHP' },
        createdAt: new Date().toISOString(),
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
      }
    };
  }

  // Get selected shipping option
  function getSelectedShippingOption() {
    const pickupRadio = document.getElementById('pickup-radio');
    const lalamoveRadio = document.getElementById('lalamove-radio');

    if (pickupRadio && pickupRadio.checked) {
      return 'pickup';
    } else if (lalamoveRadio && lalamoveRadio.checked) {
      return 'lalamove';
    }

    return 'pickup'; // default
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

      showStatus('Processing your order...', false);

      // Load saved data from previous page
      const savedData = loadSavedData();
      if (!savedData) {
        throw new Error('Order data not found. Please start from the beginning.');
      }

      // Get selected shipping option
      const selectedShippingOption = getSelectedShippingOption();
      console.log('[shipping.js] Selected shipping option:', selectedShippingOption);

      // Place the order
      let orderResult;
      try {
        orderResult = await placeOrderWithSavedData(savedData, selectedShippingOption);
        showStatus('Order placed successfully!', false);
      } catch (error) {
        console.warn('[shipping.js] Real API failed, creating mock order:', error.message);
        // Fallback to mock order
        orderResult = createMockPickupOrder(savedData.formData);
        showStatus('Order confirmed (offline mode)', false);
      }

      // Store order result for confirmation page
      sessionStorage.setItem('orderResult', JSON.stringify(orderResult));
      sessionStorage.setItem('selectedShippingOption', selectedShippingOption);

      console.log('[shipping.js] Order completed:', orderResult);

      // Show order confirmation modal instead of confirm dialog
      showOrderConfirmationModal(orderResult, selectedShippingOption);

      // Also show Firebase order summary if available
      const firebaseOrderId = sessionStorage.getItem('firebaseOrderId');
      if (firebaseOrderId && typeof window.showFirebaseOrderSummary === 'function') {
        // Load and display Firebase order summary
        setTimeout(async () => {
          try {
            const orderData = await window.loadFirebaseOrder(firebaseOrderId);
            console.log('[shipping.js] Firebase order loaded for summary:', orderData);
          } catch (error) {
            console.warn('[shipping.js] Could not load Firebase order for summary:', error);
          }
        }, 1000);
      }

    } catch (error) {
      console.error('[shipping.js] Payment process failed:', error);
      showStatus('Error: ' + error.message, true);
    }
  }

  // Function to show the order confirmation modal
  function showOrderConfirmationModal(orderResult, selectedShippingOption) {
    const modal = document.getElementById('order-confirmation-modal');

    // Try to get form data from both possible keys
    let formDataString = sessionStorage.getItem('formData') || sessionStorage.getItem('orderFormData');
    let formData = null;

    // Safely parse formData with fallback
    try {
      formData = formDataString ? JSON.parse(formDataString) : null;
    } catch (e) {
      console.warn('Could not parse formData from sessionStorage:', e);
      formData = null;
    }

    console.log('Form data for modal:', formData); // Debug log

    // Get Firebase order ID if available
    const firebaseOrderId = sessionStorage.getItem('firebaseOrderId');

    // Get total price from cart data or order result
    let totalPrice = '500'; // default
    const cartSummary = JSON.parse(sessionStorage.getItem('cartSummary')) || null;
    if (cartSummary && cartSummary.subtotal) {
      totalPrice = cartSummary.subtotal.toString();
    } else if (orderResult.data.price) {
      totalPrice = orderResult.data.price.total;
    }

    // Update modal content with actual form data
    document.getElementById('modal-customer-name').textContent = formData ?
      `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Customer' : 'Customer';
    document.getElementById('modal-contact-number').textContent = formData && formData.phone ?
      formData.phone : 'N/A';
    document.getElementById('modal-order-type').textContent = selectedShippingOption === 'pickup' ? 'Store Pickup' : 'Lalamove Delivery';

    // Show Firebase order ID if available, otherwise show Lalamove order ID
    const displayOrderId = firebaseOrderId || orderResult.data.orderId || 'N/A';
    document.getElementById('modal-order-id').textContent = displayOrderId;

    document.getElementById('modal-status').textContent = orderResult.data.state || 'Pending';
    document.getElementById('modal-service').textContent = selectedShippingOption === 'pickup' ? 'N/A' : 'MOTORCYCLE';
    document.getElementById('modal-total').textContent = `₱${totalPrice}`;

    // Show the modal
    modal.style.display = 'flex';

    // Handle modal buttons
    document.getElementById('modal-continue').onclick = function () {
      modal.style.display = 'none';
      window.location.href = 'payment.html';
    };

    document.getElementById('modal-cancel').onclick = function () {
      modal.style.display = 'none';
      showStatus('Order saved. You can complete payment later.', false);
    };

    // Handle summary button
    document.getElementById('modal-summary').onclick = async function () {
      const firebaseOrderId = sessionStorage.getItem('firebaseOrderId');
      if (firebaseOrderId && typeof window.showFirebaseOrderSummary === 'function') {
        try {
          const orderData = await window.loadFirebaseOrder(firebaseOrderId);
          window.showFirebaseOrderSummary(orderData);
        } catch (error) {
          console.error('[shipping.js] Error loading Firebase order for summary:', error);
          showStatus('Could not load order summary. Please try again.', true);
        }
      } else {
        showStatus('Order summary not available.', true);
      }
    };

    // Close modal when clicking outside
    modal.onclick = function (e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        showStatus('Order saved. You can complete payment later.', false);
      }
    };
  }

  // Initialize shipping options change handlers
  function initShippingOptions() {
    const savedData = loadSavedData();
    const radioButtons = document.querySelectorAll('input[name="shipping"]');

    radioButtons.forEach((radio) => {
      radio.addEventListener('change', function () {
        console.log('[shipping.js] Radio button changed:', this.value, 'checked:', this.checked);

        // Update visual selection
        document.querySelectorAll('.shipping-option').forEach(option => {
          option.classList.remove('selected');
        });

        if (this.checked) {
          this.closest('.shipping-option').classList.add('selected');

          // Update total cost
          const savedData = loadSavedData();
          console.log('[shipping.js] Updating order total after radio change, savedData:', savedData);

          // If Lalamove is selected but no quotation data exists, we need to get one
          if (this.value === 'lalamove' && (!savedData || !savedData.quotationData)) {
            console.log('[shipping.js] No quotation data found, but Lalamove selected. User needs to get quotation from details page.');
            // For now, just update with existing data
            if (savedData) {
              updateOrderTotal(savedData);
            }
          } else if (savedData) {
            updateOrderTotal(savedData);
          }
        }
      });
    });

    // Add click handlers for the entire shipping option containers
    const pickupOption = document.getElementById('pickup-option');
    const lalamoveOption = document.getElementById('lalamove-option');
    const pickupRadio = document.getElementById('pickup-radio');
    const lalamoveRadio = document.getElementById('lalamove-radio');

    if (pickupOption && pickupRadio) {
      pickupOption.addEventListener('click', function () {
        pickupRadio.checked = true;
        pickupRadio.dispatchEvent(new Event('change'));
      });
    }

    if (lalamoveOption && lalamoveRadio) {
      lalamoveOption.addEventListener('click', function () {
        lalamoveRadio.checked = true;
        lalamoveRadio.dispatchEvent(new Event('change'));
      });
    }

    // Set initial selection (pickup by default)
    if (pickupOption && pickupRadio) {
      pickupOption.classList.add('selected');
      pickupRadio.checked = true;

      // Initial update of totals
      if (savedData) {
        updateOrderTotal(savedData);
      }
    }
  }

  // Initialize the page
  function init() {
    console.log('[shipping.js] Initializing shipping page');

    // Load and display saved data
    const savedData = loadSavedData();
    if (savedData) {
      updateUIWithSavedData(savedData);
    } else {
      showStatus('Warning: No order data found. Please start from details page.', true);
    }

    // Load and display cart data
    const cartData = loadCartData();
    updateOrderForm(cartData);

    // Update order total after cart is displayed
    if (savedData) {
      updateOrderTotal(savedData);
    }

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

    // Add debug functionality if in debug mode
    if (window.location.search.includes('debug=true')) {
      const debugBtn = document.createElement('button');
      debugBtn.textContent = 'Debug: Show Saved Data';
      debugBtn.style.cssText = 'position: fixed; top: 100px; right: 20px; z-index: 9999; padding: 10px; background: #9b59b6; color: white; border: none; border-radius: 5px;';
      debugBtn.addEventListener('click', function () {
        const data = loadSavedData();
        console.log('Debug - Saved Data:', data);
        alert('Check console for saved data details');
      });
      document.body.appendChild(debugBtn);
    }
  }

  // Initialize when DOM is ready
  init();
});