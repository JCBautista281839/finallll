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

document.addEventListener('DOMContentLoaded', function() {
  
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
    if (cartData) {
      return JSON.parse(cartData);
    }
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
    const orderItemsContainer = document.querySelector('.order-item');
    const totalElement = document.querySelector('.total .price');
    
    if (!orderItemsContainer || !totalElement) return;
    
    const cartItems = Object.values(cartData);
    let totalPrice = 0;
    
    // Clear existing items
    orderItemsContainer.innerHTML = '';
    
    if (cartItems.length === 0) {
      orderItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <span>No items in cart</span>
        </div>
      `;
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
      itemDiv.innerHTML = `
        <div style="flex: 1;">
          <span style="font-weight: 600;">${item.name}</span>
          <br>
          <small style="color: #666;">Qty: ${item.quantity} × ${item.price}</small>
        </div>
        <div style="text-align: right;">
          <span class="price" style="font-weight: 600; color: #8b1d1d;">Php ${itemTotal.toFixed(0)}</span>
        </div>
      `;
      itemsContainer.appendChild(itemDiv);
    });
    
    orderItemsContainer.appendChild(itemsContainer);
    
    // Update total
    totalElement.textContent = `Php ${totalPrice.toFixed(0)}`;
    
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
    const totalElement = document.querySelector('.total .price');
    
    if (totalElement && savedData.quotationData) {
      const basePrice = 500; // Base order price (should be dynamic in real app)
      let shippingCost = 0;
      
      if (isLalamoveSelected) {
        shippingCost = parseInt(savedData.quotationData.data.priceBreakdown.total);
      }
      
      const newTotal = basePrice + shippingCost;
      totalElement.textContent = `Php ${newTotal}`;
    }
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
    const codPayment = document.getElementById('cod-payment');
    const gcashPayment = document.getElementById('gcash-payment');
    const cardPayment = document.getElementById('card-payment');
    
    if (codPayment && codPayment.checked) {
      return 'cash_on_delivery';
    } else if (gcashPayment && gcashPayment.checked) {
      return 'gcash';
    } else if (cardPayment && cardPayment.checked) {
      return 'card';
    }
    
    return 'cash_on_delivery'; // default
  }

  // Main payment button handler
  async function handlePayment(event) {
    event.preventDefault();
    
    try {
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
    document.getElementById('modal-continue').onclick = function() {
      modal.style.display = 'none';
      window.location.href = 'payment.html';
    };
    
    document.getElementById('modal-cancel').onclick = function() {
      modal.style.display = 'none';
      showStatus('Order saved. You can complete payment later.', false);
    };
    
    // Handle summary button
    document.getElementById('modal-summary').onclick = async function() {
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
    modal.onclick = function(e) {
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
      radio.addEventListener('change', function() {
        // Update visual selection
        document.querySelectorAll('.shipping-option').forEach(option => {
          option.classList.remove('selected');
        });
        
        if (this.checked) {
          this.closest('.shipping-option').classList.add('selected');
          
          // Update total cost
          if (savedData) {
            updateOrderTotal(savedData);
          }
        }
      });
    });

    // Set initial selection (pickup by default)
    const pickupOption = document.getElementById('pickup-option');
    const pickupRadio = document.getElementById('pickup-radio');
    if (pickupOption && pickupRadio) {
      pickupOption.classList.add('selected');
      pickupRadio.checked = true;
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

    // Initialize shipping options
    initShippingOptions();
    
    // Find and modify the payment button
    const paymentBtn = document.querySelector('.continue-btn');
    if (paymentBtn) {
      // Remove the onclick attribute
      paymentBtn.removeAttribute('onclick');
      
      // Update button text if needed
      if (paymentBtn.textContent.trim() === 'Payment') {
        paymentBtn.textContent = 'Place Order';
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
      debugBtn.addEventListener('click', function() {
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