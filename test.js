document.addEventListener('DOMContentLoaded', function() {
  // Utility to display output
  function showOutput(data) {
    const el = document.getElementById('api-response');
    if (el) el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log('[showOutput]', data);
  }

  // Lalamove sandbox credentials (from environment.json)
  const hostname = 'rest.sandbox.lalamove.com';
  const apikey = 'pk_test_5e6d8d33b32952622d173377b443ca5f';
  const secret = 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
  const market = 'PH';

  // Helper: create HMAC-SHA256 hex signature
  async function makeSignature(secretKey, timestamp, method, path, body) {
    const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
    // Use CryptoJS if available (Postman/browser might include it)
    if (typeof CryptoJS !== 'undefined' && CryptoJS.HmacSHA256) {
      return CryptoJS.HmacSHA256(raw, secretKey).toString(CryptoJS.enc.Hex);
    }
    // Fallback to Web Crypto API
    const enc = new TextEncoder();
    const keyData = enc.encode(secretKey);
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(raw));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Geocoding functions
  async function geocodeAddress(address) {
    showOutput('Geocoding address...');
    try {
      console.log('[geocode] Geocoding address:', address);
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Geocoding failed');
      }

      const result = await response.json();
      console.log('[geocode] Result:', result);
      showOutput(result);
      return result;
    } catch (error) {
      console.error('[geocode] Error:', error);
      showOutput('Geocoding Error: ' + error.message);
      throw error;
    }
  }

  async function reverseGeocode(lat, lng) {
    showOutput('Reverse geocoding coordinates...');
    try {
      console.log('[reverse-geocode] Coordinates:', lat, lng);
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Reverse geocoding failed');
      }

      const result = await response.json();
      console.log('[reverse-geocode] Result:', result);
      showOutput(result);
      return result;
    } catch (error) {
      console.error('[reverse-geocode] Error:', error);
      showOutput('Reverse Geocoding Error: ' + error.message);
      throw error;
    }
  }

  // Enhanced getQuotation with geocoding option
  async function getQuotationWithAddresses(pickupAddress, deliveryAddress) {
    showOutput('Geocoding addresses and getting quotation...');
    try {
      // Geocode both addresses
      const [pickupResult, deliveryResult] = await Promise.all([
        geocodeAddress(pickupAddress),
        geocodeAddress(deliveryAddress)
      ]);

      // Use the geocoded coordinates for quotation
      const bodyObj = {
        data: {
          serviceType: 'MOTORCYCLE',
          specialRequests: ['CASH_ON_DELIVERY'],
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
            quantity: "12",
            weight: "LESS_THAN_3_KG",
            categories: ["FOOD_DELIVERY", "OFFICE_ITEM"],
            handlingInstructions: ["KEEP_UPRIGHT"]
          }
        }
      };

      // Call quotation API
      const proxyUrl = 'http://localhost:5000/api/quotation';
      console.log('[getQuotation] Request with geocoded addresses ->', proxyUrl, bodyObj);
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Proxy error ${res.status}: ${text}`);
      }
      const data = await res.json();
      console.log('[getQuotation] Response', data);
      showOutput(data);
      return data;
    } catch (err) {
      console.error('[getQuotation] Error', err);
      showOutput('Error: ' + (err.message || err));
      throw err;
    }
  }

  // getQuotation: if useMock=true returns the Postman sample instantly,
  // otherwise posts to local proxy at http://localhost:5000/api/quotation
  async function getQuotation({ useMock = true } = {}) {
    showOutput('Loading...');
    try {
      if (useMock) {
        // Sample response adjusted for Philippines (en_PH / PHP)
        const mock = {
          data: {
            quotationId: "3323503280117960914",
            scheduleAt: "2025-09-19T17:29:55.00Z",
            expiresAt: "2025-09-19T17:30:05.00Z",
            serviceType: "MOTORCYCLE",
            language: "en_PH",
            stops: [
              {
                stopId: "1",
                coordinates: { lat: "14.599512", lng: "120.984222" },
                address: "SM Mall of Asia, Pasay, Metro Manila"
              },
              {
                stopId: "2",
                coordinates: { lat: "14.554729", lng: "121.024445" },
                address: "Bonifacio High Street, Taguig, Metro Manila"
              }
            ],
            isRouteOptimized: false,
            priceBreakdown: {
              base: "500",
              totalBeforeOptimization: "500",
              totalExcludePriorityFee: "500",
              total: "500",
              currency: "PHP"
            },
            distance: { value: "6555", unit: "m" }
          }
        };
        console.log('[getQuotation] Mock Response', mock);
        showOutput(mock);
        return mock;
      }

      // Real request path (via local proxy to avoid CORS and hide secret)
      const bodyObj = {
        data: {
          serviceType: 'MOTORCYCLE',
          specialRequests: ['CASH_ON_DELIVERY'],
          language: 'en_PH',
          stops: [
            { 
              coordinates: { lat: "14.599512", lng: "120.984222" }, 
              address: 'SM Mall of Asia, Pasay, Metro Manila' 
            },
            { 
              coordinates: { lat: "14.554729", lng: "121.024445" }, 
              address: 'Bonifacio High Street, Taguig, Metro Manila' 
            }
          ],
          isRouteOptimized: false,
          item: {
            quantity: "12",
            weight: "LESS_THAN_3_KG",
            categories: ["FOOD_DELIVERY", "OFFICE_ITEM"],
            handlingInstructions: ["KEEP_UPRIGHT"]
          }
        }
      };

      // POST to local proxy (ensure your proxy is running)
      const proxyUrl = 'http://localhost:5000/api/quotation';
      console.log('[getQuotation] Request ->', proxyUrl, bodyObj);
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj)
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Proxy error ${res.status}: ${text}`);
      }
      const data = await res.json();
      console.log('[getQuotation] Response', data);
      showOutput(data);
      return data;
    } catch (err) {
      console.error('[getQuotation] Error', err);
      showOutput('Error: ' + (err.message || err));
      throw err;
    }
  }

  // Place Order
async function placeOrder({ useMock = false } = {}) {
  showOutput('Placing order...');
  try {
    if (useMock) {
      const mock = {
        data: {
          orderId: 'ORDER_PH_001',
          state: 'DRIVER_PENDING',
          serviceType: 'MOTORCYCLE',
          stops: [
            { stopId: 's1', address: 'SM Mall of Asia' },
            { stopId: 's2', address: 'BGC' }
          ],
          price: { total: '500', currency: 'PHP' },
          createdAt: new Date().toISOString()
        }
      };
      console.log('[placeOrder] Mock Response', mock);
      showOutput(mock);
      return mock;
    }
    // STEP 1: Reuse getQuotation so request shape is consistent
    const quotation = await getQuotation({ useMock: false });
    if (!quotation || !quotation.data || !quotation.data.quotationId) {
      throw new Error('Failed to fetch quotation');
    }
    const quotationData = quotation;
    const quotationId = quotationData.data.quotationId;

    // STEP 2: Place order using quotationId and stops from quotation
    const orderBody = {
      data: {
        quotationId,
        sender: {
          stopId: quotationData.data.stops[0].stopId,
          name: 'Juan Dela Cruz',
          phone: '+639171234567'
        },
        recipients: [
          {
            stopId: quotationData.data.stops[1].stopId,
            name: 'Maria Santos',
            phone: '+639189876543',
            remarks: 'Salamat po!'
          }
        ],
        isPODEnabled: false
      }
    };

    const proxyUrl = 'http://localhost:5000/api/place-order';
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderBody)
    });

    if (!res.ok) throw new Error(`Proxy error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    console.log('[placeOrder] Response', data);
    showOutput(data);
    return data;
  } catch (err) {
    console.error('[placeOrder] Error', err);
    showOutput('Error: ' + (err.message || err));
    throw err;
  }
}


  // wire button to new function; default to real API calls
  const btn = document.getElementById('btn-get-quotation');
  if (btn) {
    btn.addEventListener('click', function() {
      // default to real API call; hold Ctrl for mock response
      const useMock = event.ctrlKey; // default false; hold Ctrl to use mock
      getQuotation({ useMock: useMock }).catch(()=>{});
    });
  } else {
    console.warn('btn-get-quotation not found in DOM');
  }

  // Wire the place-order button (if present)
  const btnPlace = document.getElementById('btn-place-order');
  if (btnPlace) {
    btnPlace.addEventListener('click', function(event) {
      // default to real API call; hold Ctrl for mock response
      const useMock = event.ctrlKey; // default false; hold Ctrl to use mock
      placeOrder({ useMock }).catch(()=>{});
    });
  } else {
    console.warn('btn-place-order not found in DOM');
  }

  // Pattern for other buttons:
  const actions = [
    { id: 'btn-add-priority-fee', label: 'POST Add Priority Fee (PH)' },
    { id: 'btn-get-order-details', label: 'GET Get Order Details (PH)' },
    { id: 'btn-edit-order', label: 'PATCH Edit Order (PH)' },
    { id: 'btn-get-quotation-details', label: 'GET Get Quotation Details (PH)' },
    { id: 'btn-get-city-info', label: 'GET Get City Info (PH)' },
    { id: 'btn-get-driver-details', label: 'GET Get Driver Details (PH)' },
    { id: 'btn-cancel-order', label: 'DEL Cancel Order (PH)' },
    { id: 'btn-change-driver', label: 'DEL Change Driver (PH)' },
    { id: 'btn-webhook', label: 'PATCH Webhook' }
  ];
  actions.forEach(action => {
    const b = document.getElementById(action.id);
    if (!b) return;
    b.addEventListener('click', function() {
      showOutput(`Button clicked: ${action.label}\n(Implement API call as needed)`);
    });
  });

  // ====== NEW: Geocoding Event Listeners ======
  
  // Geocode address button
  const btnGeocode = document.getElementById('btn-geocode');
  if (btnGeocode) {
    btnGeocode.addEventListener('click', function() {
      const address = document.getElementById('geocode-address').value.trim();
      if (!address) {
        showOutput('Please enter an address to geocode');
        return;
      }
      geocodeAddress(address).catch(() => {});
    });
  }

  // Reverse geocode button
  const btnReverseGeocode = document.getElementById('btn-reverse-geocode');
  if (btnReverseGeocode) {
    btnReverseGeocode.addEventListener('click', function() {
      const lat = document.getElementById('reverse-lat').value.trim();
      const lng = document.getElementById('reverse-lng').value.trim();
      if (!lat || !lng) {
        showOutput('Please enter both latitude and longitude');
        return;
      }
      reverseGeocode(lat, lng).catch(() => {});
    });
  }

  // Smart quotation with addresses button
  const btnSmartQuotation = document.getElementById('btn-smart-quotation');
  if (btnSmartQuotation) {
    btnSmartQuotation.addEventListener('click', function() {
      const pickupAddress = document.getElementById('pickup-address').value.trim();
      const deliveryAddress = document.getElementById('delivery-address').value.trim();
      
      if (!pickupAddress || !deliveryAddress) {
        showOutput('Please enter both pickup and delivery addresses');
        return;
      }
      
      getQuotationWithAddresses(pickupAddress, deliveryAddress).catch(() => {});
    });
  }

});
