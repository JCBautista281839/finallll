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
  const secret = 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu';
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
            { coordinates: { lat: '14.599512', lng: '120.984222' }, address: 'SM Mall of Asia, Pasay, Metro Manila' },
            { coordinates: { lat: '14.554729', lng: '121.024445' }, address: 'Bonifacio High Street, Taguig, Metro Manila' }
          ],
          isRouteOptimized: false,
          item: {
            quantity: '12',
            weight: 'LESS_THAN_3_KG',
            categories: ['FOOD_DELIVERY','OFFICE_ITEM'],
            handlingInstructions: ['KEEP_UPRIGHT']
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

    // STEP 1: Get Quotation first
    const quotationRes = await fetch('http://localhost:5000/api/quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceType: 'MOTORCYCLE',
        stops: [
          { coordinates: { lat: '14.599512', lng: '120.984222' }, address: 'SM Mall of Asia, Pasay, Metro Manila' },
          { coordinates: { lat: '14.554729', lng: '121.024445' }, address: 'Bonifacio High Street, Taguig, Metro Manila' }
        ],
        item: { quantity: '1', weight: 'LESS_THAN_3_KG', categories: ['FOOD_DELIVERY'] }
      })
    });
    const quotationData = await quotationRes.json();
    const quotationId = quotationData.data.quotationId;

    // STEP 2: Place order using quotationId
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


  // wire button to new function; if you want real request set {useMock:false}
  const btn = document.getElementById('btn-get-quotation');
  if (btn) {
    btn.addEventListener('click', function() {
      // toggle useMock via Ctrl key for quick testing:
      const useMock = !event.ctrlKey && true; // default true; hold Ctrl to attempt real proxy call
      getQuotation({ useMock: useMock }).catch(()=>{});
    });
  } else {
    console.warn('btn-get-quotation not found in DOM');
  }

  // Wire the place-order button (if present)
  const btnPlace = document.getElementById('btn-place-order');
  if (btnPlace) {
    btnPlace.addEventListener('click', function(event) {
      // default uses REAL proxy call; hold Ctrl to use mock if needed
      const useMock = event.ctrlKey;        // changed: ctrl -> mock, default = real
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
});
