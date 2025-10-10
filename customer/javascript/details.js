document.addEventListener('DOMContentLoaded', function () {

  // Utility function to display order summary notification
  function showOrderSummary(orderData, callback) {
    // Remove existing notification if any
    const existingNotif = document.getElementById('order-summary-modal');
    if (existingNotif) existingNotif.remove();

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'order-summary-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    // Create notification card
    const card = document.createElement('div');
    card.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      text-align: left;
      font-family: 'Poppins', sans-serif;
    `;

    // Create content
    card.innerHTML = `
      <h2 style="color: #8b1d1d; font-size: 24px; font-weight: 700; margin-bottom: 20px; text-align: center;">ORDER SUMMARY</h2>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #333;">Customer Name:</strong>
        <span style="color: #666; margin-left: 10px;">${orderData.customerName}</span>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #333;">Contact Number:</strong>
        <span style="color: #666; margin-left: 10px;">${orderData.contactNumber}</span>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #333;">Delivery Address:</strong>
        <div style="color: #666; margin-top: 5px;">${orderData.address}</div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="color: #333;">Delivery Fee:</strong>
        <span style="color: #666; margin-left: 10px;">${orderData.fee}</span>
      </div>
      
      <div style="margin-bottom: 25px;">
        <strong style="color: #333;">Service:</strong>
        <span style="color: #666; margin-left: 10px;">${orderData.service}</span>
      </div>
      
      <p style="color: #8b1d1d; font-weight: 600; margin-bottom: 25px; text-align: center;">
        Would you like to proceed to Payment and Shipping Options?
      </p>
      
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="order-cancel-btn" style="
          padding: 12px 25px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
        ">Cancel</button>
        <button id="order-continue-btn" style="
          padding: 12px 25px;
          background: #00c853;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
        ">Continue</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById('order-continue-btn').addEventListener('click', () => {
      overlay.remove();
      if (callback) callback(true);
    });

    document.getElementById('order-cancel-btn').addEventListener('click', () => {
      overlay.remove();
      if (callback) callback(false);
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        if (callback) callback(false);
      }
    });
  }

  // Simple status function for other notifications
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
        border-radius: 8px;
        background: white;
        color: #333;
        font-weight: 500;
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid ${isError ? '#e74c3c' : '#00c853'};
      `;
      document.body.appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.style.borderLeftColor = isError ? '#e74c3c' : '#00c853';
    statusEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (statusEl) statusEl.style.display = 'none';
    }, 5000);
  }

  // Lalamove configuration (from test.js)
  const hostname = 'rest.sandbox.lalamove.com';
  const apikey = 'pk_test_5e6d8d33b32952622d173377b443ca5f';
  const secret = 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
  const market = 'PH';

  // Geocoding function (from test.js)
  async function geocodeAddress(address) {
    console.log('[details.js] Geocoding address:', address);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn('[details.js] Server geocoding failed:', error);

        // Try to provide more helpful error messages
        if (error.status === 'ZERO_RESULTS') {
          throw new Error('Address not found. Please check if your address is complete and correct.');
        } else if (error.status === 'OVER_DAILY_LIMIT' || error.status === 'OVER_QUERY_LIMIT') {
          throw new Error('Geocoding service is temporarily unavailable. Please try again later.');
        } else if (error.status === 'REQUEST_DENIED') {
          throw new Error('Geocoding service is not available. Please contact support.');
        } else {
          throw new Error(error.error || 'Unable to verify address location. Please check your address details.');
        }
      }

      const result = await response.json();
      console.log('[details.js] Geocode result:', result);
      return result;
    } catch (error) {
      console.error('[details.js] Geocoding error:', error);
      throw error;
    }
  }

  // Function to log detailed quotation summary for debugging
  function logQuotationSummary(quotationData, label = 'Quotation Analysis') {
    console.log('='.repeat(60));
    console.log(`🔍 fetchQuotationData: ${label} = {object {...}}`);
    console.log('='.repeat(60));
    
    try {
      if (!quotationData) {
        console.log('❌ fetchQuotationData: No quotation data provided');
        return;
      }

      console.log('📊 fetchQuotationData: Full quotation object {');
      console.log('  "data": {');
      
      if (quotationData.data) {
        const data = quotationData.data;
        
        // Log quotationId
        if (data.quotationId) {
          console.log(`    "quotationId": "${data.quotationId}",`);
        }
        
        // Log scheduledAt
        if (data.scheduledAt) {
          console.log(`    "scheduledAt": "${data.scheduledAt}",`);
        }
        
        // Log expiresAt
        if (data.expiresAt) {
          console.log(`    "expiresAt": "${data.expiresAt}",`);
        }
        
        // Log serviceType
        if (data.serviceType) {
          console.log(`    "serviceType": "${data.serviceType}",`);
        }
        
        // Log language
        if (data.language) {
          console.log(`    "language": "${data.language}",`);
        }
        
        // Log stops array
        if (data.stops && Array.isArray(data.stops)) {
          console.log('    "stops": [');
          data.stops.forEach((stop, index) => {
            console.log('      {');
            if (stop.stopId) console.log(`        "stopId": "${stop.stopId}",`);
            if (stop.coordinates) {
              console.log('        "coordinates": {');
              console.log(`          "lat": "${stop.coordinates.lat}",`);
              console.log(`          "lng": "${stop.coordinates.lng}"`);
              console.log('        },');
            }
            if (stop.address) console.log(`        "address": "${stop.address}"`);
            console.log('      }' + (index < data.stops.length - 1 ? ',' : ''));
          });
          console.log('    ],');
        }
        
        // Log isRouteOptimized
        if (typeof data.isRouteOptimized !== 'undefined') {
          console.log(`    "isRouteOptimized": ${data.isRouteOptimized},`);
        }
        
        // Log priceBreakdown
        if (data.priceBreakdown) {
          console.log('    "priceBreakdown": {');
          if (data.priceBreakdown.base) console.log(`      "base": "${data.priceBreakdown.base}",`);
          if (data.priceBreakdown.totalExcludingPriorityFee) console.log(`      "totalExcludingPriorityFee": "${data.priceBreakdown.totalExcludingPriorityFee}",`);
          if (data.priceBreakdown.totalIncludingPriorityFee) console.log(`      "totalIncludingPriorityFee": "${data.priceBreakdown.totalIncludingPriorityFee}",`);
          if (data.priceBreakdown.total) console.log(`      "total": "${data.priceBreakdown.total}",`);
          if (data.priceBreakdown.currency) console.log(`      "currency": "${data.priceBreakdown.currency}"`);
          console.log('    },');
        }
        
        // Log distance
        if (data.distance) {
          console.log('    "distance": {');
          if (data.distance.value) console.log(`      "value": "${data.distance.value}",`);
          if (data.distance.unit) console.log(`      "unit": "${data.distance.unit}"`);
          console.log('    }');
        }
      }
      
      console.log('  }');
      console.log('}');
      
      // Additional validation checks
      console.log('\n🔍 Validation Checks:');
      console.log('  ✓ quotationId present:', !!(quotationData.data && quotationData.data.quotationId));
      console.log('  ✓ stops array present:', !!(quotationData.data && Array.isArray(quotationData.data.stops)));
      console.log('  ✓ stops count:', quotationData.data && quotationData.data.stops ? quotationData.data.stops.length : 0);
      
      if (quotationData.data && quotationData.data.stops) {
        quotationData.data.stops.forEach((stop, index) => {
          console.log(`  ✓ stop[${index}] stopId:`, !!stop.stopId);
          console.log(`  ✓ stop[${index}] coordinates:`, !!(stop.coordinates && stop.coordinates.lat && stop.coordinates.lng));
        });
      }
      
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('❌ Error in logQuotationSummary:', error);
    }
  }

  // Get quotation with addresses - REAL API ONLY
  async function getQuotationWithAddresses(pickupAddress, deliveryAddress) {
    console.log('[details.js] Getting quotation for:', { pickup: pickupAddress, delivery: deliveryAddress });

    try {
      // Geocode both addresses
      console.log('[details.js] Geocoding addresses...');
      const [pickupResult, deliveryResult] = await Promise.all([
        geocodeAddress(pickupAddress),
        geocodeAddress(deliveryAddress)
      ]);

      console.log('[details.js] Geocoding successful:', { pickup: pickupResult, delivery: deliveryResult });

      // Prepare request body for Lalamove API
      const bodyObj = {
        data: {
          serviceType: 'MOTORCYCLE',
          specialRequests: [],
          language: 'en_PH',
          stops: [
            {
              coordinates: pickupResult.coordinates,
              address: pickupResult.address
            },
            {
              coordinates: deliveryResult.coordinates,
              address: deliveryResult.address
            }
          ],
          isRouteOptimized: false,
          item: {
            quantity: "1",
            weight: "LESS_THAN_3_KG",
            categories: ["FOOD_DELIVERY"],
            handlingInstructions: ["KEEP_UPRIGHT"]
          }
        }
      };

      // Call Lalamove quotation API
      console.log('[details.js] Calling Lalamove quotation API...');
      console.log('[details.js] ====== QUOTATION REQUEST PAYLOAD ======');
      console.log('Request URL: /api/quotation');
      console.log('Request Method: POST');
      console.log('Request Body:', JSON.stringify(bodyObj, null, 2));
      console.log('[details.js] ====== SENDING REQUEST ======');
      
      const response = await fetch('/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Quotation API failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[details.js] ✅ Lalamove quotation received:', data);
      
      // Log detailed quotation structure
      console.log('[details.js] ====== QUOTATION RESPONSE ANALYSIS ======');
      logQuotationSummary(data, 'Fresh Lalamove API Response');
      
      return data;

    } catch (error) {
      console.error('[details.js] ❌ Quotation failed:', error);
      
      // Log detailed error information
      console.error('[details.js] ====== QUOTATION ERROR ANALYSIS ======');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      throw error;
    }
  }

  // Collect form data
  function collectFormData() {
    const formData = {
      email: document.getElementById('email')?.value?.trim() || '',
      phone: document.getElementById('phone')?.value?.trim() || '',
      firstName: document.getElementById('firstName')?.value?.trim() || '',
      lastName: document.getElementById('lastName')?.value?.trim() || '',
      address: document.getElementById('address')?.value?.trim() || '',
      barangay: document.getElementById('barangay')?.value?.trim() || '',
      postalCode: document.getElementById('postalCode')?.value?.trim() || '',
      city: document.getElementById('city')?.value?.trim() || '',
      province: document.getElementById('province')?.value?.trim() || ''
    };

    // Construct full delivery address
    const addressParts = [
      formData.address,
      formData.barangay,
      formData.city,
      formData.province,
      formData.postalCode
    ].filter(part => part.length > 0);

    formData.fullAddress = addressParts.join(', ');

    return formData;
  }

  // Validate required fields
  function validateForm(formData) {
    const requiredFields = ['email', 'phone', 'firstName', 'lastName', 'address', 'city', 'province'];
    const missing = requiredFields.filter(field => !formData[field]);

    if (missing.length > 0) {
      throw new Error(`Please fill in required fields: ${missing.join(', ')}`);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      throw new Error('Please enter a valid email address');
    }

    // Basic phone validation (simple check for numbers)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      throw new Error('Please enter a valid phone number');
    }

    return true;
  }

  // Main continue button handler
  async function handleContinue(event) {
    event.preventDefault();

    try {
      showStatus('Processing your order...', false);

      // Collect and validate form data
      const formData = collectFormData();
      validateForm(formData);

      console.log('[details.js] Form data collected:', formData);

      // Default pickup address (restaurant/store location)
      const pickupAddress = "Viktoria's Bistro, Philippines"; // Updated to actual restaurant location
      const deliveryAddress = formData.fullAddress;

      if (!deliveryAddress) {
        throw new Error('Please provide a complete delivery address');
      }

      console.log('[details.js] Attempting to get quotation for delivery from:', pickupAddress, 'to:', deliveryAddress);

      // Try to get quotation from real API
      let quotationResult = null;
      let useRealDelivery = true;

      try {
        console.log('[details.js] Getting quotation from Lalamove API...');
        quotationResult = await getQuotationWithAddresses(pickupAddress, deliveryAddress);
        showStatus('Quotation received successfully!', false);
        console.log('[details.js] Real API quotation successful:', quotationResult);
        
        // Log successful quotation for debugging
        console.log('[details.js] ====== SUCCESSFUL QUOTATION PROCESSING ======');
        logQuotationSummary(quotationResult, 'Successfully Processed Quotation');
      } catch (geocodingError) {
        console.warn('[details.js] Geocoding/quotation failed:', geocodingError.message);

        // Show error but offer fallback option
        const fallbackChoice = confirm(
          `⚠️ Address Verification Issue\n\n` +
          `${geocodingError.message}\n\n` +
          `Would you like to:\n` +
          `• Click "OK" to proceed with PICKUP ONLY (you'll collect your order from our store)\n` +
          `• Click "Cancel" to go back and edit your address\n\n` +
          `Note: You can still complete your order, but delivery service won't be available.`
        );

        if (!fallbackChoice) {
          // User chose to go back and fix address
          showStatus('Please check and correct your address details.', true);
          return;
        }

        // User chose to proceed with pickup only
        useRealDelivery = false;
        showStatus('Proceeding with pickup option only.', false);
        console.log('[details.js] Using pickup-only fallback due to geocoding failure');

        // Create a mock quotation for pickup only
        quotationResult = {
          success: true,
          data: {
            serviceType: 'PICKUP',
            priceBreakdown: {
              total: 0,
              currency: 'PHP'
            },
            distance: '0km',
            pickupOnly: true
          }
        };
        
        // Log mock quotation for debugging
        console.log('[details.js] ====== MOCK QUOTATION CREATED (PICKUP ONLY) ======');
        logQuotationSummary(quotationResult, 'Mock Pickup-Only Quotation');
      }

      // Store quotation data for next page
      sessionStorage.setItem('orderFormData', JSON.stringify(formData));
      sessionStorage.setItem('quotationData', JSON.stringify(quotationResult));
      sessionStorage.setItem('pickupAddress', pickupAddress);
      sessionStorage.setItem('deliveryAddress', deliveryAddress);
      sessionStorage.setItem('useRealDelivery', useRealDelivery.toString());

      // Log quotation being stored in sessionStorage
      console.log('[details.js] ====== STORING QUOTATION IN SESSION STORAGE ======');
      logQuotationSummary(quotationResult, 'Quotation Being Stored in SessionStorage');
      console.log('[details.js] SessionStorage keys set:', ['orderFormData', 'quotationData', 'pickupAddress', 'deliveryAddress', 'useRealDelivery']);

      // Store cart data for shipping page
      const existingCartData = sessionStorage.getItem('cartData');
      if (existingCartData) {
        console.log('[details.js] Cart data already exists in sessionStorage:', existingCartData);
      } else {
        console.log('[details.js] No cart data found in sessionStorage');
      }

      console.log('[details.js] Data stored in session:', {
        formData,
        quotationResult,
        pickupAddress,
        deliveryAddress,
        useRealDelivery
      });

      // Show quotation summary before proceeding
      const price = quotationResult.data.priceBreakdown.total;
      const currency = quotationResult.data.priceBreakdown.currency || 'PHP';

      // Show modern order summary modal
      const orderData = {
        customerName: `${formData.firstName} ${formData.lastName}`,
        contactNumber: formData.phone,
        address: useRealDelivery ? deliveryAddress : 'Pickup at Store',
        fee: useRealDelivery ? `${currency} ${price}` : 'FREE (Pickup)',
        service: quotationResult.data.serviceType
      };

      showOrderSummary(orderData, (proceed) => {
        if (proceed) {
          // Navigate to next page
          window.location.href = 'shipping.html';
        }
      });

    } catch (error) {
      console.error('[details.js] Continue process failed:', error);

      // Provide more helpful error messages
      let errorMessage = 'Error: ';
      if (error.message.includes('fetch')) {
        errorMessage += 'Connection problem. Please check your internet connection and try again.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error. Please try again in a moment.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Request timed out. Please try again.';
      } else {
        errorMessage += error.message;
      }

      showStatus(errorMessage, true);
    }
  }

  // Initialize the page
  function init() {
    console.log('[details.js] Initializing details page');

    // Find and modify the continue button
    const continueBtn = document.querySelector('.continue-btn');
    if (continueBtn) {
      // Remove the onclick attribute
      continueBtn.removeAttribute('onclick');

      // Add our custom handler
      continueBtn.addEventListener('click', handleContinue);

      console.log('[details.js] Continue button handler attached');

      // Add visual feedback for button state
      continueBtn.style.position = 'relative';
      continueBtn.style.overflow = 'hidden';

    } else {
      console.error('[details.js] Continue button not found');
      // Create error message if button not found
      showStatus('Error: Continue button not found in page', true);
    }

    // Test button for debugging (remove in production)
    if (window.location.search.includes('debug=true')) {
      const testBtn = document.createElement('button');
      testBtn.textContent = 'Test Quotation (Debug)';
      testBtn.style.cssText = 'position: fixed; top: 100px; right: 20px; z-index: 9999; padding: 10px; background: #3498db; color: white; border: none; border-radius: 5px;';
      testBtn.addEventListener('click', function () {
        console.log('[details.js] Debug test button clicked');
        const testData = {
          email: 'test@example.com',
          phone: '+639123456789',
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Test Street',
          barangay: 'Test Barangay',
          city: 'Manila',
          province: 'Metro Manila',
          postalCode: '1000'
        };

        // Fill form with test data
        Object.keys(testData).forEach(key => {
          const element = document.getElementById(key);
          if (element) element.value = testData[key];
        });

        showStatus('Test data filled in form', false);
      });
      document.body.appendChild(testBtn);
    }

    // Add input validation helpers
    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.addEventListener('blur', function () {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.value && !emailRegex.test(this.value)) {
          this.style.borderColor = '#e74c3c';
          showStatus('Please enter a valid email address', true);
        } else {
          this.style.borderColor = '';
        }
      });
    }

    // Auto-fill from session storage if returning to this page
    const savedData = sessionStorage.getItem('orderFormData');
    if (savedData) {
      try {
        const formData = JSON.parse(savedData);
        console.log('[details.js] Restoring form data:', formData);

        if (document.getElementById('email')) document.getElementById('email').value = formData.email || '';
        if (document.getElementById('phone')) document.getElementById('phone').value = formData.phone || '';
        if (document.getElementById('firstName')) document.getElementById('firstName').value = formData.firstName || '';
        if (document.getElementById('lastName')) document.getElementById('lastName').value = formData.lastName || '';
        if (document.getElementById('address')) document.getElementById('address').value = formData.address || '';
        if (document.getElementById('barangay')) document.getElementById('barangay').value = formData.barangay || '';
        if (document.getElementById('postalCode')) document.getElementById('postalCode').value = formData.postalCode || '';
        if (document.getElementById('city')) document.getElementById('city').value = formData.city || '';
        if (document.getElementById('province')) document.getElementById('province').value = formData.province || '';

      } catch (error) {
        console.error('[details.js] Error restoring form data:', error);
      }
    }
  }

  // Initialize when DOM is ready
  init();
});