// --- PATCH: Add stubs for missing functions ---
if (typeof updateChangeWithTotal !== 'function') {
  function updateChangeWithTotal(total) {
    // No-op: implement as needed for Payment page
  }
}
if (typeof initializeQuantityControls !== 'function') {
  function initializeQuantityControls() {
    // No-op: implement as needed for Payment page
  }
}

// Note: Order ID generation is now handled by POS system
// Payment page uses existing order IDs from sessionStorage
// --- PATCH: Real updateDateTime function (copied from kitchen.js) ---
function updateDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
  const datetimeDisplay = document.getElementById('currentDateTime');
  if (datetimeDisplay) {
    datetimeDisplay.textContent = `${timeString} ${dayString}`;
  }
}
// Initialize Back button logic (matches .back-button in payment.html)
// Back button now acts as "Cancel Order" - clears POS and refreshes as new order
function initializeBackButton() {
  const backBtn = document.querySelector('.back-button');
  if (backBtn) {
    backBtn.addEventListener('click', async function () {
      // Get the current order data from sessionStorage
      const orderRaw = sessionStorage.getItem('posOrder');
      if (orderRaw) {
        try {
          const order = JSON.parse(orderRaw);

          // Restore inventory for cancelled order
          if (order.items && order.items.length > 0 && typeof restoreInventoryForOrder === 'function') {
            await restoreInventoryForOrder(order.items);
            console.log('Inventory restored for cancelled order');
          }

          // Delete order from database if it exists
          if (order.orderNumber || order.orderNumberFormatted) {
            try {
              const db = firebase.firestore();
              const orderNumber = order.orderNumberFormatted || order.orderNumber;

              // Delete the order completely from database
              await db.collection('orders').doc(String(orderNumber)).delete();

              console.log('Order completely removed from database:', orderNumber);
            } catch (dbError) {
              console.warn('Failed to delete order from database:', dbError);
              // Continue with cancellation process even if database deletion fails
            }
          }

          console.log('Back button: Order cancelled - clearing POS for new order');
        } catch (e) {
          console.warn('Failed to process order data for cancellation:', e);
        }
      }

      // Clear ALL session storage data related to the current order
      sessionStorage.removeItem('posOrder');
      sessionStorage.removeItem('pendingOrderId');
      sessionStorage.removeItem('shouldRestoreOrder');
      sessionStorage.removeItem('pendingOrder');
      sessionStorage.removeItem('isEditMode');
      sessionStorage.removeItem('editingOrder');
      sessionStorage.removeItem('originalOrderId');
      sessionStorage.removeItem('laterOrder');
      sessionStorage.removeItem('hasProceeded');
      sessionStorage.removeItem('activeOrderDiscount');
      // Set flag to start a completely new order
      sessionStorage.setItem('startNewOrder', 'true');

      // Navigate back to POS - it will detect startNewOrder flag and clear everything
      window.location.href = '/html/pos.html';
    });
  }
}

// Remove Cancel button logic: only Later and Proceed buttons should be present
function initializeOrderControls() {
  // Add Later button logic
  const laterBtn = document.querySelector('.later-btn');
  if (laterBtn) {
    laterBtn.addEventListener('click', async function () {
      // Get order data from sessionStorage
      const orderData = JSON.parse(sessionStorage.getItem('posOrder'));
      if (!orderData) {
        alert('Order data not found');
        return;
      }

      // Get the existing order ID from sessionStorage (created by POS)
      const pendingOrderId = sessionStorage.getItem('pendingOrderId');
      if (!pendingOrderId) {
        alert('Order ID not found. Please return to POS and try again.');
        return;
      }

      // Recalculate subtotal, tax, discount, and total before saving
      let subtotal = 0;
      if (Array.isArray(orderData.items)) {
        subtotal = orderData.items.reduce((sum, item) => {
          const price = parseFloat(item.unitPrice || item.price) || 0;
          const qty = parseInt(item.quantity) || 1;
          return sum + price * qty;
        }, 0);
      }
      orderData.subtotal = subtotal;

      // Calculate tax as fixed amount (₱5.00) - same as POS system
      const tax = 5.00;
      orderData.tax = tax;

      // Calculate discount
      let discount = 0;
      if (typeof orderData.discountAmount !== 'undefined') {
        discount = parseFloat(orderData.discountAmount) || 0;
      } else if (typeof orderData.discount !== 'undefined') {
        discount = parseFloat(orderData.discount) || 0;
      }
      orderData.discount = discount;

      // Calculate total with tax
      orderData.total = subtotal + tax - discount;

      // Set status to 'Pending Payment' for Later
      orderData.status = 'Pending Payment';

      // Add customer information if discount requires it
      if (orderData.discountType === 'PWD' || orderData.discountType === 'Senior Citizen') {
        const customerName = document.getElementById('discount-name-input').value.trim();
        const customerId = document.getElementById('discount-id-input').value.trim();

        if (customerName) {
          orderData.customerName = customerName;
          orderData.discountName = customerName; // Also save to discountName for consistency
        }
        if (customerId) {
          orderData.customerId = customerId;
          orderData.discountID = customerId; // Also save to discountID for consistency
        }
      }

      // Save to Firestore and redirect
      try {
        const db = firebase.firestore();

        // Use the same Firestore document reference created by POS
        const orderRef = db.collection('orders').doc(String(pendingOrderId));

        // Check if document exists, if not create it, otherwise update it
        const docSnapshot = await orderRef.get();
        if (docSnapshot.exists) {
          // Document exists, update it
          await orderRef.update({
            ...orderData,
            status: 'Pending Payment',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: new Date().toISOString()
          });
          console.log('Later button - Updated existing order document:', pendingOrderId);
        } else {
          // Document doesn't exist, create it
          await orderRef.set({
            ...orderData,
            status: 'Pending Payment',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
          });
          console.log('Later button - Created new order document:', pendingOrderId);
        }

        // Debug log to verify total calculation
        console.log('Later button - Updated existing order document:', {
          orderId: pendingOrderId,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          discount: orderData.discount,
          total: orderData.total,
          status: 'Pending Payment'
        });

        // Persist pending identifiers so POS can reuse the same order ID when editing later
        try {
          sessionStorage.setItem('posOrder', JSON.stringify(orderData));
          sessionStorage.setItem('savedPendingOrderId', String(pendingOrderId));
          // Keep pendingOrderId in sessionStorage to allow continuing edits in the same session
          sessionStorage.setItem('pendingOrderId', String(pendingOrderId));
          // Mark that this order was saved as 'Later'
          sessionStorage.setItem('laterOrder', 'true');
        } catch (e) {
          console.warn('Failed to persist pending order identifiers to sessionStorage', e);
        }

        window.location.href = '/html/Order.html';
      } catch (error) {
        console.error('Error updating order for Later:', error);
        alert('There was an error sending the order. Please try again.');
      }
    });
  }
}
document.addEventListener('DOMContentLoaded', function () {
  // Initialize date/time display
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Load order data from POS
  loadOrderFromPOS();
  // Order number display is handled by loadOrderFromPOS() function

  // Initialize all components
  initializePaymentMethods();
  initializeQuantityControls();
  initializeOrderControls();
  initializeBackButton();
  initializeProceedButton();
  initializeSearch();

  // Initialize reference number input validation
  const gcashReference = document.getElementById('gcashReference');
  const cardReference = document.getElementById('cardReference');

  // GCash reference validation (numbers only)
  if (gcashReference) {
    gcashReference.addEventListener('input', function (e) {
      // Allow only numbers
      this.value = this.value.replace(/[^0-9]/g, '');
      // Limit to 13 digits (typical GCash reference number length)
      if (this.value.length > 13) {
        this.value = this.value.slice(0, 13);
      }
    });
  }

  // Card reference validation (numbers only)
  if (cardReference) {
    cardReference.addEventListener('input', function (e) {
      // Allow only numbers
      this.value = this.value.replace(/[^0-9]/g, '');
      // Limit to 15 digits (typical card reference number length)
      if (this.value.length > 15) {
        this.value = this.value.slice(0, 15);
      }
    });
  }
  initializeSearch();
  // END DOMContentLoaded
});


// Restore order from sessionStorage and update UI
function loadOrderFromPOS() {
  const orderRaw = sessionStorage.getItem('posOrder');
  if (!orderRaw) {
    console.warn('No order found in sessionStorage');
    // Still try to update the order-type span to show missing info
    const orderTypeEl = document.querySelector('.order-type span');
    if (orderTypeEl) orderTypeEl.textContent = 'Order type not set';
    return;
  }
  let order;
  try {
    order = JSON.parse(orderRaw);
  } catch (e) {
    console.error('Failed to parse order from sessionStorage', e);
    const orderTypeEl = document.querySelector('.order-type span');
    if (orderTypeEl) orderTypeEl.textContent = 'Order type not set';
    return;
  }

  // Populate order items in the UI (support both 'unitPrice' and 'price', and 'lineTotal')
  const itemsContainer = document.querySelector('.order-items');
  if (itemsContainer && order.items && Array.isArray(order.items)) {
    itemsContainer.innerHTML = '';
    order.items.forEach(item => {
      const price = (typeof item.unitPrice !== 'undefined') ? item.unitPrice : (item.price || 0);
      const quantity = item.quantity || 0;
      const lineTotal = (item.lineTotal !== undefined) ? item.lineTotal : (price * quantity);
      // Render as: [qty] [name] [line total], aligned like a receipt
      const row = document.createElement('div');
      row.className = 'order-item-row';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '32px 1fr 90px';
      row.style.alignItems = 'center';
      row.style.width = '100%';
      row.style.margin = '0';
      row.style.padding = '2px 0';
      row.innerHTML = `
        <span class="item-qty" style="color:#a94442;font-family:'PoppinsSemiBold';font-size: 18px;text-align:left;">${quantity}</span>
        <span class="item-name" style="font-family:'PoppinsRegular'; text-transform:capitalize; padding-left:10px;">${item.name}</span>
        <span class="item-price" style="color:#a94442;font-family:'PoppinsSemiBold';font-size:18px;text-align:right;display:block;">₱${parseFloat(lineTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      `;
      itemsContainer.appendChild(row);
    });
  }

  // Populate order info fields (order number, type, table, pax)
  const orderNumberEl = document.getElementById('orderNumber');
  if (orderNumberEl) {
    // Prioritize order ID from the order data itself (most reliable)
    let displayOrderId = '';

    if (order && order.orderNumberFormatted) {
      displayOrderId = order.orderNumberFormatted;
    } else if (order && order.orderNumber) {
      displayOrderId = String(order.orderNumber);
    } else if (order && order.orderId) {
      displayOrderId = String(order.orderId);
    } else {
      // Fallback to pendingOrderId from sessionStorage
      const pendingOrderId = sessionStorage.getItem('pendingOrderId');
      if (pendingOrderId) {
        displayOrderId = String(pendingOrderId);
      }
    }

    orderNumberEl.textContent = displayOrderId || '—';

    // Ensure sessionStorage consistency - update pendingOrderId to match order data
    if (displayOrderId && displayOrderId !== '—') {
      sessionStorage.setItem('pendingOrderId', displayOrderId);

      // Also update the order data to ensure consistency
      if (order) {
        order.orderId = displayOrderId;
        order.orderNumber = displayOrderId;
        order.orderNumberFormatted = displayOrderId;
        // Update sessionStorage with corrected order data
        sessionStorage.setItem('posOrder', JSON.stringify(order));

        console.log('Payment Page - Order ID consistency ensured:', {
          displayOrderId: displayOrderId,
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          orderNumberFormatted: order.orderNumberFormatted
        });
      }
    }
  }
  // Show 'Dine in | Table: X | Pax: Y' beside order type, robust and always formatted
  const orderTypeEl = document.querySelector('.order-type span');
  if (orderTypeEl) {
    let info = '';
    if (order.orderType) {
      let type = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1).toLowerCase();
      info += type;
      if (order.tableNumber !== undefined && order.tableNumber !== null && order.tableNumber !== '') {
        info += ` | Table: ${order.tableNumber}`;
      }
      // Only show 'N/A' if pax is truly undefined or null
      if (order.pax !== undefined && order.pax !== null) {
        info += ` | Pax: ${order.pax}`;
      } else {
        info += ' | Pax: N/A';
      }
    } else {
      info = 'Order type not set';
    }
    orderTypeEl.textContent = info;
  }
  // Retain Table Number and Pax input values if present
  const tableNumberInput = document.getElementById('tableNumberInput');
  if (tableNumberInput && order && order.tableNumber !== undefined) {
    tableNumberInput.value = order.tableNumber;
  }
  const paxInput = document.getElementById('paxInput');
  if (paxInput && order && order.pax !== undefined) {
    paxInput.value = order.pax;
  }
  // Retain Discount input value if present
  const discountInput = document.getElementById('discountInput');
  if (discountInput && order && order.discount !== undefined) {
    discountInput.value = order.discount;
  }
  // Hide Table Number and Pax input for Take Out
  if (order && order.orderType && order.orderType.toLowerCase() === 'take out') {
    if (tableNumberInput) tableNumberInput.style.display = 'none';
    if (paxInput) paxInput.style.display = 'none';
  } else {
    if (tableNumberInput) tableNumberInput.style.display = '';
    if (paxInput) paxInput.style.display = '';
  }

  // Update summary
  if (typeof updateOrderSummary === 'function') {
    updateOrderSummary();
  }

  // Also update summary after a short delay to ensure DOM is ready
  setTimeout(() => {
    if (typeof updateOrderSummary === 'function') {
      updateOrderSummary();
    }
  }, 100);
  // Defensive: forcibly update order-type span again after a short delay in case DOM was not ready
  setTimeout(() => {
    const orderTypeEl2 = document.querySelector('.order-type span');
    if (orderTypeEl2) {
      let info2 = '';
      if (order.orderType) {
        let type2 = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1).toLowerCase();
        info2 += type2;
        if (order.tableNumber !== undefined && order.tableNumber !== null && order.tableNumber !== '') {
          info2 += ` | Table: ${order.tableNumber}`;
        }
        if (order.pax !== undefined && order.pax !== null && order.pax !== '') {
          info2 += ` | Pax: ${order.pax}`;
        } else {
          info2 += ' | Pax: N/A';
        }
      } else {
        info2 = 'Order type not set';
      }
      orderTypeEl2.textContent = info2;
    }
  }, 200);
}

function initializePaymentMethods() {
  const paymentButtons = document.querySelectorAll('.payment-method-btn');

  // Get all the input rows and displays
  const cashRow = document.getElementById('cashInputRow');
  const gcashRow = document.getElementById('gcashInputRow');
  const cardRow = document.getElementById('cardInputRow');
  const changeDisplay = document.getElementById('changeDisplay');

  // Set cash as default payment method
  paymentButtons.forEach(button => {
    const paymentMethod = button.querySelector('span').textContent;
    if (paymentMethod === 'Cash') {
      button.classList.add('active');
      if (cashRow) cashRow.style.display = 'block';
      if (changeDisplay) changeDisplay.style.display = 'block';
    }
  });

  paymentButtons.forEach(button => {
    button.addEventListener('click', function () {
      // Remove active class from all buttons
      paymentButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');
      // Get the payment method
      const paymentMethod = this.querySelector('span').textContent;
      // Show/hide appropriate inputs based on payment method
      if (cashRow) cashRow.style.display = paymentMethod === 'Cash' ? 'block' : 'none';
      if (gcashRow) gcashRow.style.display = paymentMethod === 'GCash' ? 'block' : 'none';
      if (cardRow) cardRow.style.display = paymentMethod === 'Card' ? 'block' : 'none';
      if (changeDisplay) changeDisplay.style.display = paymentMethod === 'Cash' ? 'block' : 'none';
      // Reset inputs
      if (paymentMethod === 'GCash') {
        if (document.getElementById('cashReceived')) document.getElementById('cashReceived').value = '';
        if (document.getElementById('cardReference')) document.getElementById('cardReference').value = '';
        document.querySelector('.change-value').textContent = '₱0.00';
      } else if (paymentMethod === 'Card') {
        if (document.getElementById('cashReceived')) document.getElementById('cashReceived').value = '';
        if (document.getElementById('gcashReference')) document.getElementById('gcashReference').value = '';
        document.querySelector('.change-value').textContent = '₱0.00';
      } else if (paymentMethod === 'Cash') {
        if (document.getElementById('gcashReference')) document.getElementById('gcashReference').value = '';
        if (document.getElementById('cardReference')) document.getElementById('cardReference').value = '';
      }
      updateChange();
    });
  });
} // <-- FIX: close initializePaymentMethods

function initializeProceedButton() {
  const proceedBtn = document.querySelector('.proceed-btn');
  const cashInput = document.getElementById('cashReceived');
  const gcashInput = document.getElementById('gcashReference');
  const cardInput = document.getElementById('cardReference');

  if (proceedBtn) {
    // Disable button by default
    proceedBtn.disabled = true;
    proceedBtn.style.opacity = '0.5';
    proceedBtn.style.cursor = 'not-allowed';

    // Enable/disable button based on payment method
    const checkInput = () => {
      const activePaymentMethod = document.querySelector('.payment-method-btn.active span')?.textContent;
      // Check for discount type and required fields
      const orderData = JSON.parse(sessionStorage.getItem('posOrder')) || {};
      const discountType = orderData.discountType;
      const nameInput = document.getElementById('discount-name-input');
      const idInput = document.getElementById('discount-id-input');
      let requireNameId = false;
      if (discountType === 'PWD' || discountType === 'Senior Citizen') {
        requireNameId = true;
      }
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const idVal = idInput ? idInput.value.trim() : '';

      let paymentValid = false;
      if (activePaymentMethod === 'Cash') {
        paymentValid = cashInput && cashInput.value && parseFloat(cashInput.value) > 0;
      } else if (activePaymentMethod === 'GCash') {
        paymentValid = gcashInput && gcashInput.value && gcashInput.value.length >= 8;
      } else if (activePaymentMethod === 'Card') {
        paymentValid = cardInput && cardInput.value && cardInput.value.length >= 8;
      }

      // Disable Proceed if Name or ID is required and empty
      if (requireNameId && (!nameVal || !idVal)) {
        proceedBtn.disabled = true;
        proceedBtn.style.opacity = '0.5';
        proceedBtn.style.cursor = 'not-allowed';
        return;
      }

      if (paymentValid) {
        proceedBtn.disabled = false;
        proceedBtn.style.opacity = '1';
        proceedBtn.style.cursor = 'pointer';
      } else {
        proceedBtn.disabled = true;
        proceedBtn.style.opacity = '0.5';
        proceedBtn.style.cursor = 'not-allowed';
      }
    };

    // Check input on page load and whenever inputs change
    checkInput();
    if (cashInput) {
      cashInput.addEventListener('input', checkInput);
      cashInput.addEventListener('keyup', checkInput);
    }
    if (gcashInput) {
      gcashInput.addEventListener('input', checkInput);
      gcashInput.addEventListener('keyup', checkInput);
    }
    if (cardInput) {
      cardInput.addEventListener('input', checkInput);
      cardInput.addEventListener('keyup', checkInput);
    }

    // Also re-check when Name or ID changes (for PWD/Senior)
    const nameInput = document.getElementById('discount-name-input');
    const idInput = document.getElementById('discount-id-input');
    if (nameInput) {
      nameInput.addEventListener('input', checkInput);
      nameInput.addEventListener('keyup', checkInput);
    }
    if (idInput) {
      idInput.addEventListener('input', checkInput);
      idInput.addEventListener('keyup', checkInput);
    }

    // Update when payment method changes
    const paymentButtons = document.querySelectorAll('.payment-method-btn');
    paymentButtons.forEach(button => {
      button.addEventListener('click', checkInput);
    });

    proceedBtn.addEventListener('click', async function () {
      if (proceedBtn.disabled) return;
      // Get order data from sessionStorage
      let orderData = JSON.parse(sessionStorage.getItem('posOrder'));
      if (!orderData) {
        alert('Order data not found');
        return;
      }
      // Get the existing order ID from sessionStorage (created by POS)
      const pendingOrderId = sessionStorage.getItem('pendingOrderId');
      if (!pendingOrderId) {
        alert('Order ID not found. Please return to POS and try again.');
        return;
      }

      // Use the existing order ID from POS - do NOT generate new ones
      orderData.orderId = pendingOrderId;

      // Add customer information if discount requires it
      if (orderData.discountType === 'PWD' || orderData.discountType === 'Senior Citizen') {
        const customerName = document.getElementById('discount-name-input').value.trim();
        const customerId = document.getElementById('discount-id-input').value.trim();

        if (customerName) {
          orderData.customerName = customerName;
          orderData.discountName = customerName; // Also save to discountName for consistency
        }
        if (customerId) {
          orderData.customerId = customerId;
          orderData.discountID = customerId; // Also save to discountID for consistency
        }
      }
      orderData.orderNumber = pendingOrderId;
      orderData.orderNumberFormatted = String(pendingOrderId);
      // Always update orderType, tableNumber, pax from DOM if available
      const orderTypeEl = document.querySelector('.order-type span');
      if (orderTypeEl && orderTypeEl.textContent) {
        orderData.orderType = orderTypeEl.textContent.split('|')[0].trim();
        const tableMatch = /Table: ([^|]+)/.exec(orderTypeEl.textContent);
        if (tableMatch) orderData.tableNumber = tableMatch[1].trim();
        const paxMatch = /Pax: ([^|]+)/.exec(orderTypeEl.textContent);
        if (paxMatch) orderData.pax = paxMatch[1].trim();
      }
      // Update payment method and details
      const total = calculateTotal();
      const paymentMethod = document.querySelector('.payment-method-btn.active span')?.textContent;
      orderData.paymentMethod = paymentMethod;
      if (paymentMethod === 'Cash') {
        const cashReceived = parseFloat(cashInput.value) || 0;
        const change = cashReceived - total;
        orderData.payment = {
          method: 'Cash',
          amountReceived: cashReceived,
          change: change >= 0 ? change : 0,
          total: total
        };
      } else if (paymentMethod === 'GCash') {
        const referenceNumber = gcashInput.value;
        orderData.payment = {
          method: 'GCash',
          referenceNumber: referenceNumber,
          total: total
        };
      } else if (paymentMethod === 'Card') {
        const referenceNumber = cardInput.value;
        orderData.payment = {
          method: 'Card',
          referenceNumber: referenceNumber,
          total: total
        };
      }
      // Check if order was already sent to kitchen via "Later"
      const laterOrder = sessionStorage.getItem('laterOrder');

      // If this is a "Pending Payment" order (from Later button), change to In the Kitchen
      if (laterOrder === 'true') {
        orderData.status = 'In the Kitchen';
        orderData.sentToKitchen = firebase.firestore.FieldValue.serverTimestamp();
        orderData.sentToKitchenBy = 'payment';
      } else {
        // For new orders, set status to 'In the Kitchen'
        orderData.status = 'In the Kitchen'.trim();
        orderData.sentToKitchen = firebase.firestore.FieldValue.serverTimestamp();
      }
      // Always recalculate subtotal, tax, discount, and total before saving
      let subtotal = 0;
      if (Array.isArray(orderData.items)) {
        subtotal = orderData.items.reduce((sum, item) => {
          const price = parseFloat(item.unitPrice || item.price) || 0;
          const qty = parseInt(item.quantity) || 1;
          return sum + price * qty;
        }, 0);
      }
      orderData.subtotal = subtotal;
      // Calculate tax as fixed amount (₱5.00) - same as POS system
      const tax = 5.00;
      orderData.tax = tax;
      let discount = 0;
      if (typeof orderData.discountAmount !== 'undefined') {
        discount = parseFloat(orderData.discountAmount) || 0;
      } else if (typeof orderData.discount !== 'undefined') {
        discount = parseFloat(orderData.discount) || 0;
      }
      orderData.discount = discount;
      orderData.total = subtotal + tax - discount;
      // Remove discount fields if no discount is applied
      if (!discount || discount === 0) {
        delete orderData.discount;
        delete orderData.discountAmount;
        delete orderData.discountPercent;
        delete orderData.discountType;
        delete orderData.discountName;
        delete orderData.discountID;
      }
      // Update the existing order document in Firestore (no duplication)
      try {
        // Validate order data before saving
        if (!orderData.orderNumberFormatted) {
          throw new Error('Missing order number');
        }
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
          throw new Error('No items in order');
        }
        if (!orderData.total || orderData.total <= 0) {
          throw new Error('Invalid order total');
        }

        console.log('Attempting to update existing order in Firestore:', orderData);

        // Check Firebase connection
        if (!window.isFirebaseReady || !window.isFirebaseReady()) {
          throw new Error('Firebase not initialized');
        }

        const db = firebase.firestore();
        if (!db) {
          throw new Error('Firebase Firestore not available');
        }

        // Use the same Firestore document reference created by POS
        const orderRef = db.collection('orders').doc(String(pendingOrderId));

        // Check if document exists, if not create it, otherwise update it
        const docSnapshot = await orderRef.get();
        if (docSnapshot.exists) {
          // Document exists, update it
          await orderRef.update({
            ...orderData,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: new Date().toISOString()
          });
          console.log('Proceed button - Updated existing order document:', orderData.orderNumberFormatted, 'Status:', orderData.status);
        } else {
          // Document doesn't exist, create it
          await orderRef.set({
            ...orderData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
          });
          console.log('Proceed button - Created new order document:', orderData.orderNumberFormatted, 'Status:', orderData.status);
        }

        console.log('[Payment][Proceed] Order updated in Firestore successfully:', {
          orderId: orderData.orderNumberFormatted,
          status: orderData.status,
          total: orderData.total
        });

        // Remove pendingOrderId from sessionStorage on finalize
        sessionStorage.removeItem('pendingOrderId');

        sessionStorage.setItem('paymentReceipt', JSON.stringify(orderData));
        window.location.href = '/html/receipt.html';
      } catch (error) {
        console.error('Detailed error updating order:', error);
        console.error('Order data that failed:', orderData);

        // More specific error message
        let errorMessage = 'There was an error processing your order. ';
        if (error.message.includes('Missing order number')) {
          errorMessage += 'Order number is missing.';
        } else if (error.message.includes('No items in order')) {
          errorMessage += 'Order has no items.';
        } else if (error.message.includes('Invalid order total')) {
          errorMessage += 'Order total is invalid.';
        } else if (error.message.includes('Firebase not initialized')) {
          errorMessage += 'Database connection failed.';
        } else if (error.message.includes('permission')) {
          errorMessage += 'Permission denied. Please check your access rights.';
        } else if (error.message.includes('network')) {
          errorMessage += 'Network error. Please check your connection.';
        } else {
          errorMessage += 'Please try again.';
        }

        alert(errorMessage);
      }
    });

  }
}
function updateOrderSummary() {
  try {
    // Get the original order data from POS
    const raw = sessionStorage.getItem('posOrder');
    if (!raw) {
      console.error('No order data found');
      return;
    }
    const orderData = JSON.parse(raw);
    // Use the saved values from the order object, but recalculate subtotal if missing or zero
    let subtotal = parseFloat(orderData.subtotal);
    if (!subtotal && orderData.items && Array.isArray(orderData.items)) {
      subtotal = orderData.items.reduce((sum, item) => {
        const price = typeof item.unitPrice !== 'undefined' ? parseFloat(item.unitPrice) : (parseFloat(item.price) || 0);
        const qty = parseInt(item.quantity) || 0;
        return sum + (price * qty);
      }, 0);
    }
    // Calculate tax as fixed amount (₱5.00) - same as POS system
    const tax = 5.00;
    const discountAmount = parseFloat(orderData.discountAmount) || 0;
    // Always recalculate total as subtotal + tax - discountAmount
    const total = subtotal + tax - discountAmount;

    // Debug logging (can be removed in production)
    console.log('Payment updateOrderSummary - Order data:', orderData);
    console.log('Payment updateOrderSummary - Subtotal:', subtotal);
    console.log('Payment updateOrderSummary - Tax calculated (5%):', tax);
    const discountPercent = parseFloat(orderData.discountPercent) || 0;
    // Update summary fields by DOM position, not by summaryRows index
    // Subtotal
    const subtotalEl = document.querySelector('.order-summary .summary-row:nth-child(1) .summary-value');
    if (subtotalEl) {
      subtotalEl.textContent = '₱' + subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      subtotalEl.style.fontWeight = '400';
      subtotalEl.style.textAlign = 'right';
    }
    // Tax
    const taxEl = document.querySelector('.order-summary .summary-row:nth-child(2) .summary-value');
    if (taxEl) {
      const taxDisplay = '₱' + tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      taxEl.textContent = taxDisplay;
      taxEl.style.fontWeight = '400';
      taxEl.style.textAlign = 'right';
    }
    // Discount
    const discountEl = document.querySelector('.order-summary .summary-row:nth-child(3) .summary-value');
    let discountLabel = '';
    if (orderData.discountType === 'PWD') {
      discountLabel = 'PWD | ' + discountPercent + '%';
    } else if (orderData.discountType === 'Senior Citizen') {
      discountLabel = 'SC | ' + discountPercent + '%';
    } else if (orderData.discountType === 'Special Discount' || orderData.discountType === 'custom') {
      discountLabel = 'SD | ' + (discountPercent ? discountPercent + '%' : '');
    } else {
      discountLabel = 'None';
    }
    if (discountEl) {
      if (orderData.discountType === 'PWD' || orderData.discountType === 'Senior Citizen' || orderData.discountType === 'Special Discount' || orderData.discountType === 'custom') {
        discountEl.textContent = discountLabel + (discountAmount ? ' (-₱' + discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ')' : '');
      } else {
        discountEl.textContent = discountLabel;
      }
      discountEl.style.fontWeight = '400';
      discountEl.style.textAlign = 'right';
    }
    // Name/ID rows
    const nameRow = document.querySelector('.order-summary .discount-name-row');
    const idRow = document.querySelector('.order-summary .discount-id-row');
    const nameInput = document.getElementById('discount-name-input');
    const idInput = document.getElementById('discount-id-input');

    if (orderData.discountType === 'PWD' || orderData.discountType === 'Senior Citizen') {
      if (nameRow) nameRow.style.display = '';
      if (idRow) idRow.style.display = '';
      if (nameInput) {
        nameInput.value = orderData.discountName || '';
        nameInput.oninput = function () {
          this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
          orderData.discountName = this.value;
          sessionStorage.setItem('posOrder', JSON.stringify(orderData));
        };
      }
      if (idInput) {
        idInput.value = orderData.discountID || '';
        idInput.oninput = function () {
          this.value = this.value.replace(/[^0-9]/g, '');
          orderData.discountID = this.value;
          sessionStorage.setItem('posOrder', JSON.stringify(orderData));
        };
      }
    } else if (orderData.discountType === 'Special Discount' || orderData.discountType === 'custom') {
      if (nameRow) nameRow.style.display = 'none';
      if (idRow) idRow.style.display = 'none';
      if (nameInput) nameInput.value = '';
      if (idInput) idInput.value = '';
    } else {
      if (nameRow) nameRow.style.display = 'none';
      if (idRow) idRow.style.display = 'none';
      if (nameInput) nameInput.value = '';
      if (idInput) idInput.value = '';
    }
    // Total
    const totalEl = document.querySelector('.order-summary .total-row .summary-value');
    if (totalEl) {
      totalEl.textContent = '₱' + (subtotal + tax - discountAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      totalEl.style.fontWeight = '700';
      totalEl.style.textAlign = 'right';
    }

    // Update the main amount display with the exact total from POS
    const amountValue = document.querySelector('.amount-value');
    if (amountValue) {
      var formattedAmount = '₱' + total.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      amountValue.textContent = formattedAmount;
    }

    // Update change calculation using the POS total
    updateChangeWithTotal(total);
  } catch (error) {
    console.error('Error updating order summary:', error);
  }
}
function calculateSubtotal() {
  const orderItems = document.querySelectorAll('.order-item');
  let subtotal = 0;

  orderItems.forEach(item => {
    const priceText = item.querySelector('.item-price').textContent;
    const quantity = parseInt(item.querySelector('.quantity').textContent);
    const price = parseFloat(priceText.replace('₱', ''));

    subtotal += price * quantity;
  });

  return subtotal;
}

function calculateTotal() {
  // Try to get the total from the UI first
  const amountValue = document.querySelector('.amount-value');
  if (amountValue) {
    const text = amountValue.textContent.replace(/[^\d.]/g, '');
    const uiTotal = parseFloat(text);
    if (!isNaN(uiTotal) && uiTotal > 0) {
      return uiTotal;
    }
  }
  // Fallback to sessionStorage
  try {
    const raw = sessionStorage.getItem('posOrder');
    if (!raw) return 0;
    const orderData = JSON.parse(raw);
    return parseFloat(orderData.total) || 0;
  } catch (error) {
    console.error('Error calculating total:', error);
    return 0;
  }
}


function updateChange() {
  const total = calculateTotal();
  const cashInput = document.getElementById('cashReceived');
  const changeEl = document.querySelector('.change-value');
  const amountValue = document.querySelector('.amount-value');
  const amountReceivedValue = document.querySelector('.amount-received-value');
  const changeLabel = document.querySelector('.change-label');
  if (!changeEl) return;
  let received = 0;
  if (cashInput && cashInput.value !== '') {
    received = parseFloat(cashInput.value);
    if (isNaN(received)) received = 0;
  }
  // Debug log with types
  console.log(`Amount = ${total} (${typeof total}), Received = ${received} (${typeof received}), total - received = ${total - received}, received - total = ${received - total}`);
  // Do not update Amount Due here; it should be set only once when the order loads
  // Update Amount Received
  if (amountReceivedValue) amountReceivedValue.textContent = '₱' + received.toFixed(2);
  // Update Change or Balance Due
  if (received < total) {
    if (changeLabel) changeLabel.textContent = 'Balance Due:';
    changeEl.textContent = '₱' + (total - received).toFixed(2);
  } else {
    if (changeLabel) changeLabel.textContent = 'Change:';
    changeEl.textContent = '₱' + (received - total).toFixed(2);
  }
}

document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'cashReceived') {
    updateChange();
  }
});

// Missing function definitions
function initializeSearch() {
  // No-op for payment page
}



// Utility functions for displaying loading and error messages
function showLoading(message) {
  // Create loading element if it doesn't exist
  if (!document.getElementById('loading-message')) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-message';
    loadingDiv.className = 'alert alert-info text-center';
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '10px';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translateX(-50%)';
    loadingDiv.style.zIndex = '1000';
    loadingDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    document.body.appendChild(loadingDiv);
  }

  document.getElementById('loading-message').textContent = message;
  document.getElementById('loading-message').style.display = 'block';
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading-message');
  if (loadingDiv) {
    loadingDiv.style.display = 'none';
  }
}

function showError(message) {
  hideLoading();

  // Create error element if it doesn't exist
  if (!document.getElementById('error-message')) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'alert alert-danger text-center';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.zIndex = '1000';
    errorDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';

    // Add a close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.style.marginLeft = '10px';
    closeBtn.onclick = function () {
      errorDiv.style.display = 'none';
    };

    errorDiv.appendChild(document.createTextNode(message));
    errorDiv.appendChild(closeBtn);
    document.body.appendChild(errorDiv);
  } else {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-message').style.display = 'block';
  }
}
