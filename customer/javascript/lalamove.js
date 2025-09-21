// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// === CONFIG ===
// Change to "https://rest.lalamove.com/v3" when you go live
const LALA_BASE = 'https://rest.sandbox.lalamove.com/v3';
const API_KEY = process.env.LALAMOVE_API_KEY || 'pk_test_5e6d8d33b32952622d173377b443ca5f';
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
const MARKET = process.env.MARKET || 'PH'; // Philippines

// === Helper: generate HMAC signature ===
function makeSignature(secret, timestamp, method, path, body) {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

// === QUOTATION ===
app.post('/api/quotation', async (req, res) => {
  const { pickup, dropoff } = req.body;

  const body = JSON.stringify({
    data: {
      serviceType: "MOTORCYCLE",
      stops: [
        { coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) }, address: pickup.address },
        { coordinates: { lat: String(dropoff.lat), lng: String(dropoff.lng) }, address: dropoff.address }
      ]
    }
  });

  const path = '/v3/quotations';
  const timestamp = Date.now().toString();
  const signature = makeSignature(API_SECRET, timestamp, 'POST', path, body);

  try {
    const resp = await axios.post(`${LALA_BASE}${path}`, body, {
      headers: {
        Authorization: `hmac ${API_KEY}:${timestamp}:${signature}`,
        Market,
        'Request-ID': uuidv4(),
        'Content-Type': 'application/json'
      }
    });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// === ORDER ===
app.post('/api/order', async (req, res) => {
  const { quotation, customer } = req.body;

  const body = JSON.stringify({
    data: {
      quotationId: quotation.data.quotationId,
      sender: {
        stopId: quotation.data.stops[0].stopId,
        name: "Restaurant",
        phone: "09123456789"
      },
      recipients: [
        {
          stopId: quotation.data.stops[1].stopId,
          name: customer.name,
          phone: customer.phone
        }
      ],
      metadata: { orderRef: "MY_ORDER_123" }
    }
  });

  const path = '/v3/orders';
  const timestamp = Date.now().toString();
  const signature = makeSignature(API_SECRET, timestamp, 'POST', path, body);

  try {
    const resp = await axios.post(`${LALA_BASE}${path}`, body, {
      headers: {
        Authorization: `hmac ${API_KEY}:${timestamp}:${signature}`,
        Market,
        'Request-ID': uuidv4(),
        'Content-Type': 'application/json'
      }
    });
    res.json(resp.data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// === WEBHOOK (Lalamove calls this) ===
app.post('/webhook/lalamove', (req, res) => {
  console.log("Webhook received:", req.body);
  res.status(200).send("OK");
});

// === START SERVER ===
app.listen(3000, () => console.log("Backend running on http://localhost:3000"));
