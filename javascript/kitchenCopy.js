// kitchen.js - revised version
// --- INVENTORY DEDUCTION HELPERS ---
// Convert to base unit (e.g., grams, ml, pcs)
function toBaseUnit(quantity, unit) {
  if (!unit || typeof quantity !== 'number') return quantity;
  const u = unit.toLowerCase();
  if (u === 'kg') return quantity * 1000;
  if (u === 'g') return quantity;
  if (u === 'l') return quantity * 1000;
  if (u === 'ml') return quantity;
  if (u === 'pcs' || u === 'pc' || u === 'piece' || u === 'pieces') return quantity;
  return quantity;
}

// Deduct inventory for a single ingredient (atomic, idempotent)
async function deductInventory(db, ingredientName, quantity, unit) {
  if (!ingredientName || !quantity) return;
  const baseQty = toBaseUnit(quantity, unit);
  const invQuery = await db.collection('inventory').where('name', '==', ingredientName).limit(1).get();
  if (invQuery.empty) return;
  const doc = invQuery.docs[0];
  const data = doc.data();
  const currentQty = toBaseUnit(data.quantity || 0, data.unit);
  const newQty = Math.max(currentQty - baseQty, 0);
  await db.collection('inventory').doc(doc.id).update({ quantity: newQty });
}

// Deduct all ingredients for a product (atomic)
async function deductIngredientsForProduct(db, product, productQty) {
  if (!product || !Array.isArray(product.ingredients)) return;
  for (const ingredient of product.ingredients) {
    const name = ingredient.name;
    const qty = (ingredient.quantity || 0) * (productQty || 1);
    const unit = ingredient.unit || '';
    await deductInventory(db, name, qty, unit);
  }
}

// Deduct all ingredients for an order (atomic, idempotent)
async function deductIngredientsForOrder(db, order) {
  if (!order || !Array.isArray(order.items)) return;
  for (const item of order.items) {
    // Only deduct for items just marked as ready (not already ready before)
    if (item.status === 'ready' && !item.inventoryDeducted) {
      const menuQuery = await db.collection('menu').where('name', '==', item.name).limit(1).get();
      if (!menuQuery.empty) {
        const product = menuQuery.docs[0].data();
        await deductIngredientsForProduct(db, product, item.quantity || 1);
        item.inventoryDeducted = true;
      }
    }
  }
}
// Shows multiple pending orders in a grid and updates each order individually

let currentOrders = []; // array of orders currently displayed

document.addEventListener('DOMContentLoaded', () => {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupOverlay();

  waitForFirebase().then(() => {
    firebase.auth().onAuthStateChanged(user => {
      if (!user) {
        console.log('User not authenticated - redirecting to login');
        window.location.href = '/index.html';
        return;
      }
      // start listening to orders after auth
      setupOrderListener();
    });
  });

  document.addEventListener('click', function(e) {
    if (e.target.classList && e.target.classList.contains('close-overlay-btn')) {
      hideOrderOverlay();
    }
  });
});

function waitForFirebase() {
  return new Promise(resolve => {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      resolve();
      return;
    }
    // poll until firebase is ready (main.js should initialize)
    const t = setInterval(() => {
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        clearInterval(t);
        resolve();
      }
    }, 150);
  });
}

function updateDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
  const el = document.getElementById('currentDateTime');
  if (el) el.textContent = `${timeString} ${dayString}`;
}

function setupOverlay() {
  const overlay = document.getElementById('orderOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideOrderOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideOrderOverlay();
  });
}

function showOrderOverlay() {
  const overlay = document.getElementById('orderOverlay');
  if (overlay) {
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function hideOrderOverlay() {
  const overlay = document.getElementById('orderOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function isOrderVisible(o) {
  // Only show orders with status 'Pending Payment' or 'In the Kitchen', and hide 'Cancelled'/'Canceled'
  // Debug: log every order checked for visibility
  console.log('[Kitchen][Debug][isOrderVisible] Checking order:', {
    id: o._docId || o.id,
    status: o.status,
    orderNumber: o.orderNumber,
    orderNumberFormatted: o.orderNumberFormatted
  });
  if (typeof o.status === 'string') {
    const status = o.status.toLowerCase();
    if (status === 'cancelled' || status === 'canceled') {
      console.log('[Kitchen][Filter] Excluded order', o, 'Reason: status is Cancelled');
      return false;
    }
    if (status === 'pending payment' || status === 'in the kitchen') {
      console.log('[Kitchen][Filter] Included order', o, 'Reason: status is', status);
      return true;
    }
    // Hide all other statuses (e.g., Completed)
    console.log('[Kitchen][Filter] Excluded order', o, 'Reason: status is', status);
    return false;
  }
  return false;
}

function getOrderTime(order) {
  if (!order) return 0;
  if (order.timestamp && typeof order.timestamp.toDate === 'function') return order.timestamp.toDate().getTime();
  if (order.timestamp && order.timestamp.seconds) return order.timestamp.seconds * 1000;
  if (order.createdAt) return new Date(order.createdAt).getTime();
  return 0;
}

function setupOrderListener() {
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    console.error('Firebase/firestore not available for listener');
    return;
  }
  const db = firebase.firestore();

  // Listen to orders with status = 'in the kitchen' or 'In the Kitchen' in real time
  db.collection('orders')
    .orderBy('timestamp', 'desc')
    .limit(100)
    .onSnapshot({
      next: (snapshot) => {
        console.log('[Kitchen] Firestore snapshot size:', snapshot.size);
        const orders = [];
        const allDocs = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          allDocs.push({ id: doc.id, status: data.status, orderType: data.orderType, orderNumber: data.orderNumber, orderNumberFormatted: data.orderNumberFormatted });
          // include doc id so we can update by doc id
          const full = { _docId: doc.id, ...data };
          if (isOrderVisible(full)) orders.push(full);
        });
        console.log('[Kitchen][Debug] All fetched orders:', allDocs);
        console.log('[Kitchen][Debug] Orders after isOrderVisible:', orders.map(o => ({ id: o._docId, status: o.status, orderType: o.orderType, orderNumber: o.orderNumber, orderNumberFormatted: o.orderNumberFormatted })));
        // Sort oldest -> newest so they stack in order created
        orders.sort((a, b) => getOrderTime(a) - getOrderTime(b));
        currentOrders = orders;
        displayAllKitchenOrders(orders);
      },
      error: (err) => {
        console.error('[Kitchen] Firestore query error:', err);
      }
    });
}

function updateItemsListGradients() {
  document.querySelectorAll('.items-list').forEach(list => {
    if (list.scrollHeight > list.clientHeight) {
      list.classList.add('overflow-gradient');
    } else {
      list.classList.remove('overflow-gradient');
    }
  });
}

function updateItemsListScroll() {
  document.querySelectorAll('.items-list').forEach(list => {
    if (list.children.length > 3) {
      list.classList.add('scrollable-items-list');
    } else {
      list.classList.remove('scrollable-items-list');
    }
  });
}

function displayAllKitchenOrders(orders) {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  if (!orders || orders.length === 0) {
    displayNoOrders();
    return;
  }

  // Build HTML for all cards
  let html = '<div class="kitchen-grid">';


  orders.forEach((order, idx) => {
    // Only show items that are not completed/ready
    let pendingItems = [];
    if (Array.isArray(order.items)) {
  pendingItems = order.items.filter(i => !i.status || i.status === 'pending' || i.status === 'In the Kitchen');
    } else if (order.cart && Array.isArray(order.cart)) {
  pendingItems = order.cart.filter(i => !i.status || i.status === 'pending' || i.status === 'In the Kitchen');
    } else if (order.items && typeof order.items === 'object') {
      pendingItems = Object.entries(order.items)
        .filter(([name, qty]) => !qty.status || qty.status === 'pending' || qty.status === 'In the Kitchen')
        .map(([name, qty]) => ({ name, quantity: qty.quantity || qty, status: qty.status }));
    }

    // If there are newItems (padagdag), only show those if they are pending
    let newPendingItems = [];
    if (Array.isArray(order.newItems)) {
  newPendingItems = order.newItems.filter(i => !i.status || i.status === 'pending' || i.status === 'In the Kitchen');
    }

    // Skip rendering if no pending items at all
    if (pendingItems.length === 0 && newPendingItems.length === 0) return;

    // Card header info
  let dateObj;
  if (order.completedAt) dateObj = new Date(order.completedAt);
  else if (order.timestamp && typeof order.timestamp.toDate === 'function') dateObj = order.timestamp.toDate();
  else if (order.timestamp && order.timestamp.seconds) dateObj = new Date(order.timestamp.seconds * 1000);
  else if (order.createdAt) dateObj = new Date(order.createdAt);
  else dateObj = new Date();
  // If dateObj is invalid, set to null
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) dateObj = null;

  // Always prefer formatted order number for display
    // Always prefer formatted order number for display, fallback to timestamp-based if present
    // Always match POS display: pad to 4 digits if numeric, else show as is
    let orderIdLabel = '';
    if (order.orderNumberFormatted) {
      orderIdLabel = order.orderNumberFormatted;
    } else if (order.orderNumber && /^\d+$/.test(String(order.orderNumber))) {
      orderIdLabel = String(order.orderNumber);
    } else if (order.orderNumber) {
      orderIdLabel = String(order.orderNumber);
    } else if (order._docId) {
      orderIdLabel = order._docId;
    } else {
      orderIdLabel = '0000';
    }
    const orderType = order.orderType || order.type || 'Dine in';

    // Items HTML
    let itemsHtml = '';
    if (pendingItems.length === 0) {
      itemsHtml = `<div class="item-row"><span class="item-name">No items</span><span class="item-quantity">-</span></div>`;
    } else {
      pendingItems.forEach(it => {
        itemsHtml += `<div class="item-row"><span class="item-name">${escapeHtml(it.name)}</span><span class="item-quantity">${escapeHtml(String(it.quantity))}</span></div>`;
      });
    }

    // New items HTML (padagdag)
    let newItemsHtml = '';
    if (newPendingItems.length > 0) {
      newItemsHtml += `<div class=\"items-header\" style=\"margin-top:0.5em;color:#19c37d;font-weight:700;\">Newly Added Items:</div>`;
      newPendingItems.forEach(it => {
        newItemsHtml += `<div class=\"item-row\"><span class=\"item-name\">${escapeHtml(it.name)}</span><span class=\"item-quantity\">${escapeHtml(String(it.quantity))}</span></div>`;
      });
    }

    // highlight first as priority
    const priorityClass = idx === 0 ? ' priority-order' : '';

    html += `
      <div class="order-card kitchen-card${priorityClass}" data-order-id="${order._docId}">
        <div class="order-card-header">
          <div class="order-card-header-title" style="font-size:18px;font-weight:600;color:#8B2D1B;">
            Order No. ${escapeHtml(String(orderIdLabel))} <span style="color:#444;font-weight:700;">|</span> <span style="color:#333;font-weight:600;">${escapeHtml(orderType)}</span> <span style="color:#444;font-weight:700;">|</span> <span style="color:#666;font-weight:600;">${escapeHtml(String(order.paxNumber || order.pax || '-'))}</span>
          </div>
          <div class="order-card-header-row" style="color:#aaa;font-size:13px;font-weight:500;">
            <span>${dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'No Date'}</span>
            <span>${dateObj ? dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</span>
          </div>
          <hr class="order-card-header-divider" />
        </div>
        <div class="order-items">
          <div class="items-header">
            <span>Items</span><span>Qty</span>
          </div>
          <div class="items-list">${itemsHtml}${newItemsHtml}</div>
        </div>
        <div class="order-actions">
          <button class="order-ready-btn btn" data-order-id="${order._docId}" onclick="markOrderReadyPOS('${order._docId}')">
            Order Ready
          </button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
  setTimeout(updateItemsListScroll, 0);
}

function displayNoOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="order-card">
      <div class="order-header">
        <div class="order-title">
          <h5 class="order-number">No Orders Available</h5>
          <div class="order-datetime">
            <span class="order-date">All caught up!</span>
            <span class="order-time">Waiting for new orders...</span>
          </div>
        </div>
      </div>
      <div class="order-items">
        <div class="items-header">
          <span>Items</span><span>Qty</span>
        </div>
        <div class="items-list">
          <div class="item-row">
            <span class="item-name text-muted">No orders pending preparation</span>
            <span class="item-quantity">-</span>
          </div>
        </div>
      </div>
      <div class="order-actions">
        <button class="btn btn-secondary order-ready-btn" disabled>No Orders</button>
      </div>
    </div>
  `;
}

async function markOrderReadyPOS(orderDocIdOrOrderNumber) {

  if (!orderDocIdOrOrderNumber) return;
  // disable the button immediately for that card
  const btn = document.querySelector(`button[data-order-id="${orderDocIdOrOrderNumber}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  if (typeof firebase === 'undefined' || !firebase.firestore) {
    showNotification('Firebase not available - cannot update order', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Order Ready'; }
    return;
  }

  const db = firebase.firestore();

  // Attempt 1: treat param as doc id
  try {
    // Get the order document
    const docRef = db.collection('orders').doc(orderDocIdOrOrderNumber);
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error('Order not found');
    const order = docSnap.data();

    // Find the first pending item (in items or newItems)
    let updated = false;
    if (Array.isArray(order.items)) {
      for (let i = 0; i < order.items.length; i++) {
  if (!order.items[i].status || order.items[i].status === 'pending' || order.items[i].status === 'In the Kitchen') {
          order.items[i].status = 'ready';
          updated = true;
          break;
        }
      }
    }
    if (!updated && Array.isArray(order.newItems)) {
      for (let i = 0; i < order.newItems.length; i++) {
  if (!order.newItems[i].status || order.newItems[i].status === 'pending' || order.newItems[i].status === 'In the Kitchen') {
          order.newItems[i].status = 'ready';
          updated = true;
          break;
        }
      }
    }
    if (!updated) {
      showNotification('No pending items to mark as ready', 'info');
      if (btn) { btn.disabled = false; btn.textContent = 'Order Ready'; }
      return;
    }

    // --- INVENTORY DEDUCTION: Only for items just marked as ready and not already deducted ---
  await deductIngredientsForOrder(db, order);
  showInventoryDeductedNotification();
// Show a small notification at the bottom right for inventory deduction
function showInventoryDeductedNotification() {
  const notif = document.createElement('div');
  notif.textContent = 'Inventory deducted';
  notif.style.position = 'fixed';
  notif.style.right = '30px';
  notif.style.background = '#28a745';
  notif.style.color = '#fff';
  notif.style.padding = '12px 24px';
  notif.style.borderRadius = '8px';
  notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
  notif.style.zIndex = '9999';
  notif.style.fontSize = '16px';
  notif.style.opacity = '0';
  notif.style.transition = 'opacity 0.3s';
  // Find the last notification (order ready) and position below it if present
  const lastNotif = Array.from(document.querySelectorAll('.notification.alert')).pop();
  if (lastNotif) {
    // Get its bounding rect and set this one just below
    const rect = lastNotif.getBoundingClientRect();
    notif.style.bottom = (window.innerHeight - rect.bottom + 20) + 'px';
  } else {
    notif.style.bottom = '30px';
  }
  document.body.appendChild(notif);
  setTimeout(() => { notif.style.opacity = '1'; }, 10);
  setTimeout(() => {
    notif.style.opacity = '0';
    setTimeout(() => { if (notif.parentNode) notif.parentNode.removeChild(notif); }, 300);
  }, 2500);
}

    // If all items are now ready, set order status to Completed, else keep as is
    let allReady = true;
    if (Array.isArray(order.items)) {
      allReady = order.items.every(i => i.status === 'ready');
    }
    if (Array.isArray(order.newItems) && order.newItems.length > 0) {
      allReady = allReady && order.newItems.every(i => i.status === 'ready');
    }

    await docRef.update({
      items: order.items,
      newItems: order.newItems,
      status: allReady ? 'Completed' : order.status,
      kitchenStatus: allReady ? 'ready' : order.kitchenStatus,
      completedAt: allReady ? firebase.firestore.FieldValue.serverTimestamp() : order.completedAt,
      updatedBy: 'kitchen'
    });

    showNotification('Item marked as ready and inventory deducted', 'success');
    // UI will update via Firestore listener
    return;
  } catch (err) {
    console.log('Update by docId failed, trying lookup by orderNumber/format', err);
  }

  // Attempt 2: search by orderNumber
  try {
    let q = await db.collection('orders').where('orderNumber', '==', orderDocIdOrOrderNumber).limit(1).get();
    if (q.empty) {
      // try orderNumberFormatted (string)
      q = await db.collection('orders').where('orderNumberFormatted', '==', String(orderDocIdOrOrderNumber)).limit(1).get();
    }
    if (!q.empty) {
      const doc = q.docs[0];
      await db.collection('orders').doc(doc.id).update({
  status: 'Completed',
        kitchenStatus: 'ready',
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'kitchen'
      });
      showNotification('Order marked as ready for payment', 'success');
      removeOrderCardFromUI(doc.id);
      return;
    }
  } catch (err2) {
    console.error('Error updating order by query', err2);
  }

  showNotification('Failed to update order in database', 'error');
  if (btn) { btn.disabled = false; btn.textContent = 'Order Ready'; }
}

// Remove the card element and schedule a reload to refresh the list
function removeOrderCardFromUI(docId) {
  const card = document.querySelector(`.order-card[data-order-id="${docId}"]`);
  if (card) {
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(-20px)';
    setTimeout(() => {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 420);
  }
  // reload UI: slight delay to let Firestore listeners pick up the DB change
  setTimeout(() => {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      // rely on real-time listener to refresh; if you want immediate reload, call setupOrderListener() again
    }
  }, 600);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification alert ${type === 'success' ? 'alert-success' : 'alert-info'}`;
  notification.style.cssText = `position:fixed;top:20px;right:20px;z-index:2000;min-width:220px;padding:0.8rem 1rem;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 300);
  }, 2500);
}


// small helper to escape text for HTML
function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/[&<>"']/g, function (m) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m];
  });
}

// keep overlay buttons working by using currentOrders[0] as selected order if needed
function markOrderReadyFromOverlay() {
  const orderId = (currentOrders && currentOrders[0] && currentOrders[0]._docId) ? currentOrders[0]._docId : null;
  if (orderId) {
    markOrderReadyPOS(orderId);
    hideOrderOverlay();
  } else {
    showNotification('No order selected', 'error');
  }
}

window.markOrderReadyPOS = markOrderReadyPOS;
window.markOrderReadyFromOverlay = markOrderReadyFromOverlay;
window.showOrderOverlay = showOrderOverlay;
window.hideOrderOverlay = hideOrderOverlay;
