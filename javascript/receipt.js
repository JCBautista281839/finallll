document.addEventListener('DOMContentLoaded', function () {
  updateTopDateTime();
  setInterval(updateTopDateTime, 1000);

  const backBtn = document.querySelector('.back-button');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.location.href = '/html/pos.html';
    });
  }

  async function renderReceipt() {
    try {
      const raw = sessionStorage.getItem('paymentReceipt');
      console.log('Receipt data from sessionStorage:', raw);
      if (!raw) {
        console.error('No paymentReceipt data found in sessionStorage');
        return;
      }
      const data = JSON.parse(raw);
      console.log('Parsed receipt data:', data);

      const itemsContainer = document.getElementById('receiptItems');
      console.log('Items container found:', !!itemsContainer);
      console.log('Data items:', data.items);
      if (itemsContainer && Array.isArray(data.items)) {
        console.log('Processing', data.items.length, 'items');
        itemsContainer.innerHTML = '';
        data.items.forEach((it, index) => {
          console.log(`Item ${index}:`, it);
          const row = document.createElement('div');
          row.className = 'item-row';
          row.innerHTML = `
            <span class="item-name">${it.name}</span>
            <span class="item-price">₱${Number(it.lineTotal || 0).toFixed(2)}</span>
          `;
          itemsContainer.appendChild(row);
        });
      } else {
        console.error('Items container not found or data.items is not an array');
      }

      const subtotalEl = document.getElementById('subtotal');
      const taxEl = document.getElementById('tax');
      const totalEl = document.getElementById('total');
      console.log('Financial elements found:', {
        subtotalEl: !!subtotalEl,
        taxEl: !!taxEl,
        totalEl: !!totalEl
      });

      // Recalculate subtotal from items if missing or zero
      let subtotal = Number(data.subtotal);
      console.log('Initial subtotal from data:', subtotal);
      if ((!subtotal || subtotal === 0) && Array.isArray(data.items)) {
        subtotal = data.items.reduce((sum, item) => {
          const price = typeof item.unitPrice !== 'undefined' ? Number(item.unitPrice) : (Number(item.price) || 0);
          const qty = Number(item.quantity) || 0;
          const lineTotal = price * qty;
          console.log(`Item calculation: ${item.name} - Price: ${price}, Qty: ${qty}, Line Total: ${lineTotal}`);
          return sum + lineTotal;
        }, 0);
        console.log('Recalculated subtotal from items:', subtotal);
      }
      // Declare discountAmount before using it in total calculation
      let discountAmount = Number(data.discountAmount || 0);
      console.log('Discount amount:', discountAmount);
      if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
      let serviceCharge = Number(data.tax || 0);
      console.log('Service Charge amount:', serviceCharge);
      if (taxEl) taxEl.textContent = `₱${serviceCharge.toFixed(2)}`;
      // Always recalculate total as subtotal + service charge - discount
      let total = subtotal + serviceCharge - discountAmount;
      console.log('Final total calculation:', subtotal, '+', serviceCharge, '-', discountAmount, '=', total);
      if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;

      // Handle collapsible discount row
      const discountRow = document.querySelector('.discount-row');
      const discountLabel = discountRow ? discountRow.querySelector('.item-name') : null;
      const discountEl = document.getElementById('discount');
      let discountPercent = Number(data.discountPercent || 0);
      if (discountRow && discountEl && discountLabel) {
        if (discountAmount > 0) {
          discountRow.style.display = '';
          discountEl.textContent = `₱${discountAmount.toFixed(2)}`;
          if (discountPercent > 0) {
            discountLabel.textContent = `Discount (${discountPercent}%)`;
          } else {
            discountLabel.textContent = 'Discount';
          }
          // Add discount type (Senior Citizen/PWD) as a new indented line below
          let discountTypeNote = document.getElementById('discountTypeNote');
          if (!discountTypeNote) {
            discountTypeNote = document.createElement('div');
            discountTypeNote.id = 'discountTypeNote';
            discountTypeNote.style.fontSize = '12px';
            discountTypeNote.style.color = '#555';
            discountTypeNote.style.marginLeft = '24px';
            discountTypeNote.style.marginTop = '-2px';
            discountTypeNote.style.marginBottom = '2px';
            discountRow.parentNode.insertBefore(discountTypeNote, discountRow.nextSibling);
          }
          if (data.discountType === 'PWD' || data.discountType === 'Senior Citizen') {
            discountTypeNote.textContent = `ID: ${data.discountType}`;
            discountTypeNote.style.display = '';
          } else {
            discountTypeNote.textContent = '';
            discountTypeNote.style.display = 'none';
          }
        } else {
          discountRow.style.display = 'none';
          let discountTypeNote = document.getElementById('discountTypeNote');
          if (discountTypeNote) discountTypeNote.style.display = 'none';
        }
      }

      const recvEl = document.getElementById('amountReceived');
      const chgEl = document.getElementById('changeAmount');
      const changeRow = document.querySelector('.change-row');
      let paymentMethod = (data.paymentMethod || data.method || '').toLowerCase();
      let showAmount = 0;
      // Prefer nested payment object if present
      if (data.payment && typeof data.payment === 'object') {
        if (paymentMethod === 'cash') {
          showAmount = Number(data.payment.amountReceived || data.amountReceived || 0);
        } else if (paymentMethod === 'gcash' || paymentMethod === 'card') {
          showAmount = Number(data.payment.amountReceived || data.total || 0);
        }
      } else {
        if (paymentMethod === 'cash') {
          showAmount = Number(data.amountReceived || 0);
        } else if (paymentMethod === 'gcash' || paymentMethod === 'card') {
          showAmount = Number(data.total || 0);
        }
      }
      if (paymentMethod === 'gcash' || paymentMethod === 'card') {
        // Show reference number instead of change
        if (changeRow && chgEl) {
          let ref = '';
          if (paymentMethod === 'gcash') ref = (data.payment && data.payment.referenceNumber) || data.gcashReference || '';
          if (paymentMethod === 'card') ref = (data.payment && data.payment.referenceNumber) || data.cardReference || '';
          let last4 = ref ? ref.toString().slice(-4) : '';
          changeRow.querySelector('.item-name').textContent = 'Reference Number:';
          chgEl.textContent = last4 ? last4 : 'N/A';
        }
      } else {
        if (chgEl) chgEl.textContent = `₱${Number((data.payment && data.payment.change) || data.change || 0).toFixed(2)}`;
        if (changeRow) changeRow.querySelector('.item-name').textContent = 'Change';
      }
      if (recvEl) recvEl.textContent = `₱${showAmount.toFixed(2)}`;

      const methodEl = document.getElementById('paymentMethod');
      if (methodEl) {
        // Prefer paymentMethod, fallback to method
        let method = data.paymentMethod || data.method || '';
        if (typeof method === 'string' && method.length > 0) {
          method = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
        } else {
          method = 'N/A';
        }
        methodEl.textContent = `Payment Method: ${method}`;
      }

      // Show order type if available
      const typeEl = document.getElementById('orderType');
      if (typeEl && data.orderType) {
        typeEl.textContent = `Order Type: ${data.orderType}`;
      }
      // Show pax and table number together under order number
      const orderMetaEl = document.getElementById('orderMeta');
      let metaText = '';
      if (data.orderType && data.orderType.toLowerCase() === 'dine in') {
        if (data.tableNumber) metaText += `Table: ${data.tableNumber}`;
        if (data.pax) metaText += (metaText ? ' | ' : '') + `Pax: ${data.pax}`;
      } else {
        if (data.pax) metaText += `Pax: ${data.pax}`;
      }
      if (orderMetaEl) orderMetaEl.textContent = metaText;

      // Auto-fill Name and ID Number for Senior Citizen/PWD discount
      const discountIDInfo = document.getElementById('discount-id-info');
      const discountOwnerName = document.getElementById('discountOwnerName');
      const discountOwnerID = document.getElementById('discountOwnerID');
      if ((data.discountType === 'PWD' || data.discountType === 'Senior Citizen') && (data.discountName || data.discountID)) {
        if (discountIDInfo) discountIDInfo.style.display = '';
        if (discountOwnerName) discountOwnerName.textContent = `Name: ${data.discountName || ''}`;
        if (discountOwnerID) discountOwnerID.textContent = `ID Number: ${data.discountID || ''}`;
      } else {
        if (discountIDInfo) discountIDInfo.style.display = 'none';
      }

      // Use the order's creation date from Firestore if possible
      let orderDate = null;
      let orderNumber = data.orderNumber || data.orderNumberFormatted;
      const dateEl = document.getElementById('receiptDate');
      const numEl = document.getElementById('receiptNumber');

      // Helper to set date in DOM
      function setDate(date) {
        if (dateEl) dateEl.textContent = `Date: ${date.toLocaleString()}`;
      }

      // Try to get from Firestore
      if (window.firebase && window.firebase.firestore && orderNumber) {
        try {
          // Ensure Firebase is initialized
          if (!window.firebase.apps || !window.firebase.apps.length) {
            if (window.initializeFirebase) window.initializeFirebase();
          }
          const db = window.firebase.firestore();
          // Try to find order by orderNumber or orderNumberFormatted
          let query = db.collection('orders').where('orderNumberFormatted', '==', orderNumber);
          let snapshot = await query.get();
          if (snapshot.empty && data.orderNumber) {
            // Try fallback to orderNumber field
            query = db.collection('orders').where('orderNumber', '==', data.orderNumber);
            snapshot = await query.get();
          }
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const orderData = doc.data();
            if (orderData.createdAt) {
              orderDate = new Date(orderData.createdAt);
            } else if (orderData.dateCreated) {
              orderDate = new Date(orderData.dateCreated);
            } else if (doc.createTime) {
              orderDate = new Date(doc.createTime.toDate ? doc.createTime.toDate() : doc.createTime);
            }
          }
        } catch (err) {
          console.error('Error fetching order date from Firestore:', err);
        }
      }

      // Fallbacks if Firestore fails
      if (!orderDate) {
        if (data.createdAt) {
          orderDate = new Date(data.createdAt);
        } else if (data.dateCreated) {
          orderDate = new Date(data.dateCreated);
        } else {
          orderDate = new Date();
        }
      }
      setDate(orderDate);
      if (numEl && data.orderNumber) {
        numEl.textContent = `Receipt #: ${data.orderNumber}`;
      }
    } catch (e) {
      console.error('Failed to load receipt data', e);
      // Show error message to user
      const itemsContainer = document.getElementById('receiptItems');
      if (itemsContainer) {
        itemsContainer.innerHTML = '<div class="text-center text-danger">Error loading receipt data</div>';
      }
    }
  }
  renderReceipt();
});

function printReceipt() {
  window.print();
  // After printing, clear sessionStorage and reload POS for new order number
  sessionStorage.removeItem('posOrder');
  sessionStorage.removeItem('pendingOrderId'); // Clear pending order ID for new order
  window.location.href = '/html/pos.html';
}

function updateTopDateTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dayString = now.toLocaleDateString('en-US', { weekday: 'long' });
  const el = document.getElementById('currentDateTime');
  if (el) {
    el.textContent = `${timeString} ${dayString}`;
  }
}


(function setupAfterPrintRedirect() {
  function goBackToMenu() {
    window.location.href = '/html/pos.html';
  }

  window.addEventListener('afterprint', goBackToMenu);

  const mediaQuery = window.matchMedia('print');
  if (mediaQuery && typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', (m) => { if (!m.matches) goBackToMenu(); });
  } else if (mediaQuery && typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener((m) => { if (!m.matches) goBackToMenu(); });
  }
})();
