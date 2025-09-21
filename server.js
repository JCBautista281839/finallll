const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const { spawn, exec } = require('child_process');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Configuration (use real sandbox keys in env)
const LALA_HOST = 'rest.sandbox.lalamove.com';
const API_KEY = process.env.LALAMOVE_API_KEY || 'pk_test_5e6d8d33b32952622d173377b443ca5f';
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
const MARKET = process.env.LALAMOVE_MARKET || 'PH';

// helper to sign requests
function makeSignature(secret, timestamp, method, path, body) {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

/* ====== Proxy endpoints ====== */

app.post('/api/quotation', async (req, res) => {
  // Extra logging for stops
  if (!req.body || !req.body.data || !Array.isArray(req.body.data.stops)) {
    console.error('[proxy] ERROR: No stops array found in request body!');
  } else {
    console.log('[proxy] Stops array received:', JSON.stringify(req.body.data.stops, null, 2));
    if (req.body.data.stops.length < 2) {
      console.error('[proxy] ERROR: Less than 2 stops provided!');
    }
  }
  console.log('[proxy] /api/quotation incoming');
  console.log('[proxy] Request body received from frontend:', JSON.stringify(req.body, null, 2));
  try {
    // If frontend wrapped payload in { data: { ... } }, Lalamove expects the fields at the top-level.
    let bodyObj = req.body;
    if (bodyObj && bodyObj.data) {
      // unwrap to avoid double-wrapping (sending { data: { ... } } to Lalamove causes bad request)
      bodyObj = bodyObj.data;
      console.log('[proxy] Unwrapped payload.data for Lalamove:', JSON.stringify(bodyObj, null, 2));
    }

    // Basic validation & normalization
    if (!bodyObj || !Array.isArray(bodyObj.stops)) {
      console.error('[proxy] invalid payload: missing stops array');
      return res.status(400).json({ error: 'Invalid payload: stops array required' });
    }
    if (bodyObj.stops.length < 2) {
      console.error('[proxy] invalid payload: need at least 2 stops');
      return res.status(400).json({ error: 'Invalid payload: at least 2 stops required' });
    }

    // Ensure numeric coordinates and addresses
    const normalizedStops = bodyObj.stops.map((s, idx) => {
      const coords = s.coordinates || s.location || {};
      const lat = Number(coords.lat);
      const lng = Number(coords.lng || coords.lon || coords.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new Error(`Invalid coordinates for stop ${idx}`);
      }
      return {
        coordinates: { lat, lng },
        address: s.address || s.name || ''
      };
    });

    bodyObj.stops = normalizedStops;
    const body = JSON.stringify(bodyObj);
    console.log('[proxy] Body sent to Lalamove:', body);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/quotations', body);

    const url = `https://${LALA_HOST}/v3/quotations`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };

    console.log('[proxy] forwarding to Lalamove /v3/quotations', { url, headers, bodyObj });
    const response = await axios.post(url, body, { headers });
    console.log('[proxy] lalamove response status', response.status);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] quotation error', err?.response?.data || err.message);
    // If validation error thrown above, respond 400
    if (err.message && err.message.startsWith('Invalid coordinates')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// Helper test route: call Lalamove from server-side with provided JSON (or example)
app.post('/api/quote-test', async (req, res) => {
  console.log('[proxy] /api/quote-test incoming');
  try {
    // use provided body or fallback example
    let payload = req.body && Object.keys(req.body).length ? req.body : {
      serviceType: 'MOTORCYCLE',
      language: 'en_PH',
      isRouteOptimized: false,
      stops: [
        { coordinates: { lat: 14.599512, lng: 120.984222 }, address: 'SM Mall of Asia, Pasay' },
        { coordinates: { lat: 14.554729, lng: 121.024445 }, address: 'Bonifacio High Street, Taguig' }
      ]
    };

    // validate similar to quotation endpoint
    if (!Array.isArray(payload.stops) || payload.stops.length < 2) {
      return res.status(400).json({ error: 'Invalid test payload: at least 2 stops required' });
    }

    payload.stops = payload.stops.map(s => ({ coordinates: { lat: Number(s.coordinates.lat), lng: Number(s.coordinates.lng) }, address: s.address || '' }));
    const body = JSON.stringify(payload);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/quotations', body);
    const url = `https://${LALA_HOST}/v3/quotations`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };
    console.log('[proxy] quote-test forwarding to Lalamove', { url, headers, body });
    const response = await axios.post(url, body, { headers });
    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] quote-test error', err?.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

app.post('/api/place-order', async (req, res) => {
  console.log('[proxy] /api/place-order incoming');
  try {
    // Allow frontend to send { data: { ... } } and unwrap for Lalamove
    let bodyObj = req.body;
    if (bodyObj && bodyObj.data) {
      bodyObj = bodyObj.data;
      console.log('[proxy] Unwrapped place-order payload.data for Lalamove:', JSON.stringify(bodyObj, null, 2));
    }
    const body = JSON.stringify(bodyObj);
    const ts = Date.now().toString();
    const signature = makeSignature(API_SECRET, ts, 'POST', '/v3/orders', body);

    const url = `https://${LALA_HOST}/v3/orders`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `hmac ${API_KEY}:${ts}:${signature}`,
      'Market': MARKET
    };

    console.log('[proxy] forwarding to Lalamove /v3/orders', { url, headers, bodyObj });
    const response = await axios.post(url, body, { headers });
    console.log('[proxy] lalamove order response status', response.status);
    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('[proxy] place-order error', err?.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

/* ====== Local app routes (static pages) ====== */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/pos', (req, res) => res.sendFile(path.join(__dirname, 'html', 'pos.html')));
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'html', 'payment.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Dashboard.html')));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'html', 'menu.html')));
app.get('/inventory', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Inventory.html')));
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'html', 'Order.html')));

/* ====== Simple in-memory orders API (keeps existing behavior) ====== */
let orders = [];
let orderCounter = 1;

app.get('/api/orders', (req, res) => res.json(orders));

app.post('/api/orders', (req, res) => {
  const { items, total, orderType } = req.body;
  const newOrder = {
    id: orderCounter++,
    items,
    total,
    orderType: orderType || 'Dine in',
    status: 'pending',
    createdAt: new Date().toISOString(),
    orderNumber: `ORD-${String(orderCounter - 1).padStart(4, '0')}`
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = orders.find(o => o.id === parseInt(id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  res.json(order);
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const idx = orders.findIndex(o => o.id === parseInt(id));
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders.splice(idx, 1);
  res.status(204).send();
});

app.post('/api/payment', (req, res) => {
  const { orderId, paymentMethod, amount } = req.body;
  const order = orders.find(o => o.id === parseInt(orderId));
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const payment = { id: Date.now(), orderId: parseInt(orderId), amount, paymentMethod, status: 'completed', processedAt: new Date().toISOString() };
  order.status = 'paid';
  order.payment = payment;
  res.json({ success: true, payment, order });
});

/* ====== Error handlers & 404 ====== */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

/* ====== Start server (single listen) ====== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Proxy/server listening on http://localhost:${PORT}`);
  console.log(`POS: http://localhost:${PORT}/pos`);
  console.log(`Menu: http://localhost:${PORT}/menu`);
});
