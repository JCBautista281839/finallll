// kitchen.js - revised version
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
  const status = (o.status || '').toLowerCase();
  const kitchenStatus = (o.kitchenStatus || '').toLowerCase();
  if (['completed', 'cancelled', 'delivered', 'ready'].includes(status)) return false;
  if (['ready', 'completed'].includes(kitchenStatus)) return false;
  return true;
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

  // Simple approach: listen to latest 100 orders and filter client-side
  db.collection('orders').orderBy('timestamp', 'desc').limit(100).onSnapshot(snapshot => {
    const orders = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // include doc id so we can update by doc id
      const full = { _docId: doc.id, ...data };
      if (isOrderVisible(full)) orders.push(full);
    });

    // Sort oldest -> newest so they stack in order created
    orders.sort((a, b) => getOrderTime(a) - getOrderTime(b));

    currentOrders = orders;
    displayAllKitchenOrders(orders);
  }, (err) => {
    console.error('orders listener error', err);
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
      pendingItems = order.items.filter(i => !i.status || i.status === 'pending' || i.status === 'in the kitchen');
    } else if (order.cart && Array.isArray(order.cart)) {
      pendingItems = order.cart.filter(i => !i.status || i.status === 'pending' || i.status === 'in the kitchen');
    } else if (order.items && typeof order.items === 'object') {
      pendingItems = Object.entries(order.items)
        .filter(([name, qty]) => !qty.status || qty.status === 'pending' || qty.status === 'in the kitchen')
        .map(([name, qty]) => ({ name, quantity: qty.quantity || qty, status: qty.status }));
    }

    // If there are newItems (padagdag), only show those if they are pending
    let newPendingItems = [];
    if (Array.isArray(order.newItems)) {
      newPendingItems = order.newItems.filter(i => !i.status || i.status === 'pending' || i.status === 'in the kitchen');
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

    const orderIdLabel = order.orderNumber || order.orderNumberFormatted || order._docId || '0000';
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
            <span>${dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>${dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
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
        if (!order.items[i].status || order.items[i].status === 'pending' || order.items[i].status === 'in the kitchen') {
          order.items[i].status = 'ready';
          updated = true;
          break;
        }
      }
    }
    if (!updated && Array.isArray(order.newItems)) {
      for (let i = 0; i < order.newItems.length; i++) {
        if (!order.newItems[i].status || order.newItems[i].status === 'pending' || order.newItems[i].status === 'in the kitchen') {
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

    // If all items are now ready, set order status to Pending Payment, else keep as is
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
      status: allReady ? 'Pending Payment' : order.status,
      kitchenStatus: allReady ? 'ready' : order.kitchenStatus,
      completedAt: allReady ? firebase.firestore.FieldValue.serverTimestamp() : order.completedAt,
      updatedBy: 'kitchen'
    });

    showNotification('Item marked as ready', 'success');
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
        status: 'Pending Payment',
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

// Optional: developer helper to insert a test order (keeps the existing addTestOrder pattern)
async function addTestOrder() {
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    showNotification('Firebase not available', 'error');
    return;
  }
  const db = firebase.firestore();
  const docRef = db.collection('orders').doc();
  const test = {
    orderNumber: Math.floor(Math.random() * 9000) + 1000,
    orderNumberFormatted: String(Math.floor(Math.random() * 9000) + 1000),
    status: 'in the kitchen',
    kitchenStatus: 'in the kitchen',
    orderType: 'Take out',
    items: [{ name: 'Test Dish', quantity: 1 }],
    createdAt: new Date().toISOString(),
    timestamp: firebase.firestore.Timestamp.now(),
    createdBy: 'dev'
  };
  await docRef.set(test);
  showNotification('Test order added', 'success');
}

// expose helper for console testing
window.addTestOrder = addTestOrder;
window.markOrderReadyPOS = markOrderReadyPOS;
window.markOrderReadyFromOverlay = markOrderReadyFromOverlay;
window.showOrderOverlay = showOrderOverlay;
window.hideOrderOverlay = hideOrderOverlay;
