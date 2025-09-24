const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');
const nodemailer = require('nodemailer');

require('dotenv').config(); // Load environment variables

const { spawn, exec } = require('child_process');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Configuration (use environment variables)
// IMPORTANT: Change to production when ready!
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.LALAMOVE_ENV === 'production';
const LALA_HOST = IS_PRODUCTION ? 'rest.lalamove.com' : 'rest.sandbox.lalamove.com';
const API_KEY = process.env.LALAMOVE_API_KEY || 'pk_test_5e6d8d33b32952622d173377b443ca5f';
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'sk_test_fuI4IrymoeaYxuPUbM07eq4uQAy17LT6EfkerSucJwfbzNWWu/uiVjG+ZroIx5nr';
const MARKET = process.env.LALAMOVE_MARKET || 'PH';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = process.env.BASE_URL || 'https://viktoriasbistro.restaurant';

// Space Mail SMTP Configuration for OTP
const smtpConfig = {
  host: 'mail.spacemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@viktoriasbistro.restaurant',
    pass: 'Vonnpogi@123',
  },
  tls: {
    rejectUnauthorized: false,
  },
};

// Create transporter for OTP emails
const transporter = nodemailer.createTransport(smtpConfig);

// helper to sign requests
function makeSignature(secret, timestamp, method, path, body) {
  const raw = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

/* ====== Geocoding API ====== */

// Geocode address to coordinates
app.post('/api/geocode', async (req, res) => {
  console.log('[geocode] Geocoding request received');
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    
    console.log(`[geocode] Geocoding address: ${address}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
      address: address,
      key: GOOGLE_MAPS_API_KEY,
      region: 'ph', // Bias results to Philippines
      components: 'country:PH' // Restrict to Philippines only
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.status !== 'OK') {
      console.error('[geocode] Geocoding failed:', data.status, data.error_message);
      return res.status(400).json({ 
        error: 'Geocoding failed', 
        status: data.status,
        message: data.error_message 
      });
    }
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'No results found for this address' });
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    const geocodeResult = {
      success: true,
      address: result.formatted_address,
      coordinates: {
        lat: location.lat.toString(), // Convert to string as required by Lalamove
        lng: location.lng.toString()
      },
      place_id: result.place_id,
      types: result.types
    };
    
    console.log('[geocode] Geocoding successful:', geocodeResult);
    res.json(geocodeResult);
    
  } catch (error) {
    console.error('[geocode] Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Reverse geocode coordinates to address
app.post('/api/reverse-geocode', async (req, res) => {
  console.log('[reverse-geocode] Reverse geocoding request received');
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' });
    }
    
    console.log(`[reverse-geocode] Reverse geocoding coordinates: ${lat}, ${lng}`);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const params = {
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      region: 'ph'
    };
    
    const response = await axios.get(url, { params });
    const data = response.data;
    
    if (data.status !== 'OK') {
      console.error('[reverse-geocode] Reverse geocoding failed:', data.status);
      return res.status(400).json({ 
        error: 'Reverse geocoding failed', 
        status: data.status 
      });
    }
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'No address found for these coordinates' });
    }
    
    const result = data.results[0];
    
    const reverseGeocodeResult = {
      success: true,
      address: result.formatted_address,
      coordinates: {
        lat: lat.toString(),
        lng: lng.toString()
      },
      place_id: result.place_id,
      types: result.types
    };
    
    console.log('[reverse-geocode] Reverse geocoding successful:', reverseGeocodeResult);
    res.json(reverseGeocodeResult);
    
  } catch (error) {
    console.error('[reverse-geocode] Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Test endpoint to verify routing
app.get('/api/test', (req, res) => {
  console.log('[test] Test endpoint called');
  res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

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
    // Send the body exactly as received from frontend (with data wrapper)
    // Lalamove API expects { data: { ... } } format
    let bodyObj = req.body;
    
    // Validate the nested data structure
    if (!bodyObj || !bodyObj.data || !Array.isArray(bodyObj.data.stops)) {
      console.error('[proxy] invalid payload: missing data.stops array');
      return res.status(400).json({ error: 'Invalid payload: data.stops array required' });
    }
    if (bodyObj.data.stops.length < 2) {
      console.error('[proxy] invalid payload: need at least 2 stops');
      return res.status(400).json({ error: 'Invalid payload: at least 2 stops required' });
    }

    // Ensure coordinates are strings and validate
    const normalizedStops = bodyObj.data.stops.map((s, idx) => {
      const coords = s.coordinates || s.location || {};
      const lat = coords.lat ? coords.lat.toString() : '';
      const lng = (coords.lng || coords.lon || coords.longitude) ? (coords.lng || coords.lon || coords.longitude).toString() : '';
      if (!lat || !lng) {
        throw new Error(`Invalid coordinates for stop ${idx}`);
      }
      return {
        coordinates: { lat, lng },
        address: s.address || s.name || ''
      };
    });

    // Update the body with normalized stops
    bodyObj.data.stops = normalizedStops;
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
        { coordinates: { lat: 14.4457549030656, lng: 120.92354136968974 }, address: "Viktoria's Bistro, Philippines" },
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
    // Keep the data wrapper for Lalamove API (same as quotation endpoint)
    let bodyObj = req.body;
    console.log('[proxy] Place order request body:', JSON.stringify(bodyObj, null, 2));
    
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

/* ====== Lalamove Webhook Route ====== */
app.post('/api/webhook/lalamove', (req, res) => {
  console.log('[webhook] Lalamove webhook received');
  console.log('[webhook] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[webhook] Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Webhook security validation
    const signature = req.headers['x-lalamove-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!validateWebhookSignature(req.body, signature, timestamp)) {
      console.warn('[webhook] Invalid webhook signature');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid webhook signature' 
      });
    }
    
    const webhookData = req.body;
    
    // Extract key information from webhook
    const orderId = webhookData?.data?.orderId;
    const orderState = webhookData?.data?.orderState;
    const driverId = webhookData?.data?.driverId;
    const driverInfo = webhookData?.data?.driver;
    const eventTime = webhookData?.eventTime || new Date().toISOString();
    
    console.log(`[webhook] Order ${orderId} status: ${orderState}`);
    
    // Handle different webhook events
    switch (orderState) {
      case 'ASSIGNING_DRIVER':
        console.log('[webhook] Driver assignment in progress...');
        handleDriverAssigning(orderId, webhookData);
        break;
        
      case 'ON_GOING':
        console.log(`[webhook] Order ${orderId} is ongoing with driver ${driverId}`);
        handleOrderOngoing(orderId, driverId, driverInfo, webhookData);
        break;
        
      case 'PICKED_UP':
        console.log(`[webhook] Order ${orderId} has been picked up`);
        handleOrderPickedUp(orderId, driverId, webhookData);
        break;
        
      case 'COMPLETED':
        console.log(`[webhook] Order ${orderId} has been completed`);
        handleOrderCompleted(orderId, webhookData);
        break;
        
      case 'CANCELED':
        console.log(`[webhook] Order ${orderId} has been canceled`);
        handleOrderCanceled(orderId, webhookData);
        break;
        
      default:
        console.log(`[webhook] Unknown order state: ${orderState}`);
        handleUnknownState(orderId, orderState, webhookData);
    }
    
    // Store webhook data for future reference
    storeWebhookEvent(webhookData);
    
    // Respond to Lalamove that webhook was received successfully
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully',
      orderId: orderId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error processing webhook',
      message: error.message 
    });
  }
});

// Webhook signature validation
function validateWebhookSignature(body, signature, timestamp) {
  try {
    // Skip validation in development mode
    if (!IS_PRODUCTION) {
      console.log('[webhook] Skipping signature validation in development mode');
      return true;
    }
    
    if (!signature || !timestamp) {
      console.log('[webhook] Missing signature or timestamp');
      return false;
    }
    
    // Check timestamp is within 5 minutes
    const now = Date.now();
    const webhookTime = parseInt(timestamp) * 1000;
    const timeDiff = Math.abs(now - webhookTime);
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      console.log('[webhook] Webhook timestamp too old');
      return false;
    }
    
    // Validate signature using Lalamove webhook secret
    const webhookSecret = process.env.LALAMOVE_WEBHOOK_SECRET || API_SECRET;
    const bodyString = JSON.stringify(body);
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(timestamp + bodyString)
      .digest('hex');
    
    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.log('[webhook] Signature mismatch - expected:', expectedSignature, 'received:', signature);
    }
    
    return isValid;
  } catch (error) {
    console.error('[webhook] Error validating signature:', error);
    return false;
  }
}

// Webhook event handlers with Firebase integration
async function handleDriverAssigning(orderId, webhookData) {
  console.log(`[webhook-handler] Processing driver assignment for order ${orderId}`);
  
  try {
    // Update order status in database/storage
    await updateOrderStatus(orderId, {
      status: 'DRIVER_ASSIGNING',
      updatedAt: new Date().toISOString(),
      message: 'Looking for a driver for your order...',
      webhookData: webhookData
    });
    
    // You can add customer notification here
    console.log(`[webhook-handler] Order ${orderId} status updated to DRIVER_ASSIGNING`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderOngoing(orderId, driverId, driverInfo, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} started with driver ${driverId}`);
  
  try {
    const updateData = {
      status: 'ON_GOING',
      driverId: driverId,
      driverInfo: driverInfo,
      updatedAt: new Date().toISOString(),
      message: 'Your order is on the way!',
      webhookData: webhookData
    };
    
    if (driverInfo) {
      console.log(`[webhook-handler] Driver details:`, driverInfo);
      updateData.driverName = driverInfo.name;
      updateData.driverPhone = driverInfo.phone;
      updateData.vehicleInfo = driverInfo.plateNumber;
    }
    
    await updateOrderStatus(orderId, updateData);
    
    // Notify customer
    await notifyCustomer(orderId, 'Your order is on the way!', {
      driverInfo: driverInfo,
      status: 'ON_GOING'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to ON_GOING`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderPickedUp(orderId, driverId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} picked up by driver ${driverId}`);
  
  try {
    await updateOrderStatus(orderId, {
      status: 'PICKED_UP',
      driverId: driverId,
      pickedUpAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: 'Your order has been picked up and is on the way to you!',
      webhookData: webhookData
    });
    
    // Notify customer
    await notifyCustomer(orderId, 'Your order has been picked up!', {
      status: 'PICKED_UP',
      estimatedDelivery: 'Expected delivery in 15-30 minutes'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to PICKED_UP`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderCompleted(orderId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} completed successfully`);
  
  try {
    await updateOrderStatus(orderId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      message: 'Your order has been delivered successfully! Thank you for choosing Viktoria\'s Bistro!',
      webhookData: webhookData
    });
    
    // Notify customer
    await notifyCustomer(orderId, 'Order delivered successfully!', {
      status: 'COMPLETED',
      thankYouMessage: 'Thank you for choosing Viktoria\'s Bistro!'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to COMPLETED`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

async function handleOrderCanceled(orderId, webhookData) {
  console.log(`[webhook-handler] Order ${orderId} was canceled`);
  const reason = webhookData?.data?.cancelReason || 'No reason provided';
  
  try {
    await updateOrderStatus(orderId, {
      status: 'CANCELED',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancelReason: reason,
      message: `Your order has been canceled. Reason: ${reason}`,
      webhookData: webhookData
    });
    
    // Notify customer about cancellation
    await notifyCustomer(orderId, 'Order canceled', {
      status: 'CANCELED',
      reason: reason,
      refundMessage: 'If you were charged, a refund will be processed within 3-5 business days.'
    });
    
    console.log(`[webhook-handler] Order ${orderId} status updated to CANCELED`);
  } catch (error) {
    console.error(`[webhook-handler] Error updating order ${orderId}:`, error);
  }
}

function handleUnknownState(orderId, orderState, webhookData) {
  console.log(`[webhook-handler] Unknown state ${orderState} for order ${orderId}`);
  // Log for debugging
  console.log('[webhook-handler] Full webhook data:', JSON.stringify(webhookData, null, 2));
  
  // Still try to update with unknown state for tracking
  updateOrderStatus(orderId, {
    status: orderState,
    updatedAt: new Date().toISOString(),
    message: `Order status: ${orderState}`,
    webhookData: webhookData
  }).catch(error => {
    console.error(`[webhook-handler] Error updating unknown state:`, error);
  });
}

// Store webhook events (you can modify this to use a database)
const webhookEvents = [];
const orderStatuses = new Map(); // In-memory order status storage

function storeWebhookEvent(webhookData) {
  const event = {
    id: Date.now().toString(),
    orderId: webhookData?.data?.orderId,
    orderState: webhookData?.data?.orderState,
    receivedAt: new Date().toISOString(),
    data: webhookData
  };
  
  webhookEvents.push(event);
  
  // Keep only last 100 events in memory
  if (webhookEvents.length > 100) {
    webhookEvents.shift();
  }
  
  console.log(`[webhook-storage] Stored webhook event ${event.id}`);
}

// Order status management functions
async function updateOrderStatus(orderId, statusData) {
  try {
    console.log(`[order-status] Updating order ${orderId}:`, statusData);
    
    // Store in memory (you can replace this with Firebase/database call)
    orderStatuses.set(orderId, {
      orderId: orderId,
      ...statusData,
      lastUpdated: new Date().toISOString()
    });
    
    // TODO: Integrate with Firebase Firestore
    // Example Firebase integration:
    /*
    const admin = require('firebase-admin');
    const db = admin.firestore();
    await db.collection('orders').doc(orderId).update({
      ...statusData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    */
    
    console.log(`[order-status] Successfully updated order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`[order-status] Error updating order ${orderId}:`, error);
    throw error;
  }
}

async function notifyCustomer(orderId, message, additionalData = {}) {
  try {
    console.log(`[customer-notification] Sending notification for order ${orderId}: ${message}`);
    
    // Get order details to find customer contact info
    const orderStatus = orderStatuses.get(orderId);
    
    // Store notification for retrieval by frontend
    const notification = {
      orderId: orderId,
      message: message,
      timestamp: new Date().toISOString(),
      data: additionalData,
      type: 'order_update'
    };
    
    // Store notification (in production, use proper notification service)
    if (!global.customerNotifications) {
      global.customerNotifications = [];
    }
    global.customerNotifications.push(notification);
    
    // TODO: Implement actual notification methods
    // Examples:
    // - Send SMS via Twilio
    // - Send email via SendGrid
    // - Push notification via Firebase Cloud Messaging
    // - WebSocket notification for real-time updates
    
    console.log(`[customer-notification] Notification stored for order ${orderId}`);
    return true;
  } catch (error) {
    console.error(`[customer-notification] Error sending notification for order ${orderId}:`, error);
    return false;
  }
}

// API to retrieve webhook events (for debugging)
app.get('/api/webhook/events', (req, res) => {
  res.json({
    total: webhookEvents.length,
    events: webhookEvents
  });
});

// API to get order status
app.get('/api/order/:orderId/status', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orderStatus = orderStatuses.get(orderId);
    
    if (!orderStatus) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        orderId: orderId
      });
    }
    
    res.json({
      success: true,
      orderId: orderId,
      status: orderStatus
    });
  } catch (error) {
    console.error('[order-status] Error retrieving order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order status',
      error: error.message
    });
  }
});

// API to get customer notifications
app.get('/api/notifications/:orderId', (req, res) => {
  try {
    const orderId = req.params.orderId;
    const notifications = (global.customerNotifications || [])
      .filter(n => n.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      orderId: orderId,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('[notifications] Error retrieving notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications',
      error: error.message
    });
  }
});

// API to get all order statuses (for admin dashboard)
app.get('/api/orders/status', (req, res) => {
  try {
    const allOrders = Array.from(orderStatuses.entries()).map(([orderId, status]) => ({
      orderId,
      ...status
    }));
    
    res.json({
      success: true,
      orders: allOrders,
      count: allOrders.length
    });
  } catch (error) {
    console.error('[orders] Error retrieving all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders',
      error: error.message
    });
  }
});

// Test webhook endpoint (for development/testing)
app.post('/api/webhook/test', (req, res) => {
  console.log('[webhook-test] Simulating Lalamove webhook...');
  
  // Create a sample webhook payload
  const testWebhook = {
    eventTime: new Date().toISOString(),
    data: {
      orderId: req.body.orderId || 'TEST_ORDER_' + Date.now(),
      orderState: req.body.orderState || 'ON_GOING',
      driverId: req.body.driverId || 'TEST_DRIVER_123',
      driver: {
        name: 'Juan Test Driver',
        phone: '+639171234567',
        plateNumber: 'ABC-1234'
      },
      cancelReason: req.body.cancelReason || null
    }
  };
  
  console.log('[webhook-test] Sending test webhook:', JSON.stringify(testWebhook, null, 2));
  
  // Call our own webhook endpoint
  const axios = require('axios');
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://viktoriasbistro.restaurant' 
    : `http://localhost:${PORT}`;
  
  axios.post(`${baseUrl}/api/webhook/lalamove`, testWebhook)
    .then(response => {
      res.json({
        success: true,
        message: 'Test webhook sent successfully',
        testData: testWebhook,
        webhookResponse: response.data
      });
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        message: 'Error sending test webhook',
        error: error.message
      });
    });
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

/* ====== OTP Email Service ====== */

// Health check endpoint for OTP service
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Viktoria\'s Bistro OTP Service is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      sendOTP: '/api/send-otp',
      testSMTP: '/api/test-smtp'
    }
  });
});

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, otpCode, userName } = req.body;

    // Validate input
    if (!email || !otpCode || !userName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, otpCode, userName'
      });
    }

    // Email content
    const mailOptions = {
      from: 'support@viktoriasbistro.restaurant',
      to: email,
      subject: 'Your OTP Verification Code - Viktoria\'s Bistro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2em;">Viktoria's Bistro</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">OTP Verification Code</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up with Viktoria's Bistro! 
              To complete your account verification, please use the following OTP code:
            </p>
            
            <div style="background: white; border: 2px dashed #007bff; 
                border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
              <div style="color: #666; font-size: 14px; margin-bottom: 10px;">
                Your OTP Code:
              </div>
              <div style="font-size: 3em; font-weight: bold; color: #007bff; 
                  letter-spacing: 10px; font-family: 'Courier New', monospace;">
                ${otpCode}
              </div>
              <div style="color: #666; font-size: 12px; margin-top: 10px;">
                Expires in 10 minutes
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>Important:</strong> This code will expire in 10 minutes 
              for security reasons. If you didn't request this code, 
              please ignore this email.
            </p>
            
            <div style="margin-top: 30px; padding: 20px; background: #e9ecef; 
                border-radius: 5px;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This email was sent from Viktoria's Bistro. 
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Viktoria's Bistro - OTP Verification Code
        
        Hello ${userName}!
        
        Thank you for signing up with Viktoria's Bistro! 
        To complete your account verification, please use the following OTP code:
        
        OTP Code: ${otpCode}
        Expires in: 10 minutes
        
        Important: This code will expire in 10 minutes for security reasons. 
        If you didn't request this code, please ignore this email.
        
        This email was sent from Viktoria's Bistro. 
        Please do not reply to this email.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    console.log('📧 To:', email);
    console.log('🔐 OTP:', otpCode);

    res.json({
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully',
      email: email,
      otpCode: otpCode
    });

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to send OTP email',
    });
  }
});

// Test SMTP connection endpoint
app.post('/api/test-smtp', async (req, res) => {
  try {
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Space Mail SMTP connection is working',
      smtp_host: 'mail.spacemail.com',
      smtp_username: 'support@viktoriasbistro.restaurant'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Space Mail SMTP connection failed'
    });
  }
});

/* ====== Error handlers & 404 ====== */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

/* ====== Start server (single listen) ====== */
const PORT = process.env.PORT || 5001; // Changed from 5000 to avoid conflicts

app.listen(PORT, '0.0.0.0', () => {
  const environment = IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT';
  console.log(`\n🚀 Viktoria's Bistro Server [${environment}]`);
  console.log(`   Server: http://localhost:${PORT}`);
  if (IS_PRODUCTION) {
    console.log(`   Public: ${BASE_URL}`);
    console.log(`   Webhook: ${BASE_URL}/api/webhook/lalamove`);
  }
  console.log(`   POS: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/pos`);
  console.log(`   Menu: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/menu`);
  console.log(`\n📡 Lalamove Integration:`);
  console.log(`   Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`   API Host: ${LALA_HOST}`);
  console.log(`   Market: ${MARKET}`);
  console.log(`\n📧 OTP Email Service:`);
  console.log(`   Health Check: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/api/health`);
  console.log(`   Send OTP: ${IS_PRODUCTION ? BASE_URL : `http://localhost:${PORT}`}/api/send-otp`);
  console.log(`   SMTP Host: mail.spacemail.com`);
  console.log(`   Email: support@viktoriasbistro.restaurant\n`);
});
