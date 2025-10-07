/**
 * Firebase Order Summary Display
 * 
 * This file provides comprehensive order summary functionality
 * that integrates with Firebase to display order details,
 * customer information, and cart data.
 */

class FirebaseOrderSummary {
  constructor() {
    this.firebaseManager = null;
    this.currentOrder = null;
    this.init();
  }

  async init() {
    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase();
      this.firebaseManager = new FirebaseOrderManager();
      console.log('[FirebaseOrderSummary] Initialized successfully');
    } catch (error) {
      console.error('[FirebaseOrderSummary] Initialization failed:', error);
    }
  }

  waitForFirebase() {
    return new Promise((resolve, reject) => {
      const checkFirebase = () => {
        if (typeof firebase !== 'undefined' && 
            firebase.apps && 
            firebase.apps.length > 0 && 
            firebase.firestore) {
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
      
      setTimeout(() => {
        reject(new Error('Firebase initialization timeout'));
      }, 10000);
    });
  }

  // Load order from Firebase by ID
  async loadOrderFromFirebase(orderId) {
    if (!this.firebaseManager) {
      throw new Error('Firebase manager not initialized');
    }

    try {
      this.currentOrder = await this.firebaseManager.getOrder(orderId);
      console.log('[FirebaseOrderSummary] Order loaded:', this.currentOrder);
      return this.currentOrder;
    } catch (error) {
      console.error('[FirebaseOrderSummary] Error loading order:', error);
      throw error;
    }
  }

  // Create comprehensive order summary HTML
  createOrderSummaryHTML(orderData) {
    const order = orderData || this.currentOrder;
    if (!order) {
      return '<div class="error">No order data available</div>';
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatCurrency = (amount) => {
      return `₱${parseFloat(amount).toFixed(2)}`;
    };

    return `
      <div class="firebase-order-summary">
        <!-- Order Header -->
        <div class="order-header">
          <h2>Order Summary</h2>
          <div class="order-id">Order ID: ${order.orderId}</div>
          <div class="order-status status-${order.status}">${order.status.toUpperCase()}</div>
        </div>

        <!-- Customer Information -->
        <div class="summary-section">
          <h3>Customer Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Name:</label>
              <span>${order.customerInfo.fullName}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>${order.customerInfo.email}</span>
            </div>
            <div class="info-item">
              <label>Phone:</label>
              <span>${order.customerInfo.phone}</span>
            </div>
          </div>
        </div>

        <!-- Shipping Information -->
        <div class="summary-section">
          <h3>Shipping Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Method:</label>
              <span>${order.shippingInfo.method}</span>
            </div>
            <div class="info-item">
              <label>Address:</label>
              <span>${order.shippingInfo.address}</span>
            </div>
            <div class="info-item">
              <label>City:</label>
              <span>${order.shippingInfo.city}, ${order.shippingInfo.province}</span>
            </div>
            <div class="info-item">
              <label>Postal Code:</label>
              <span>${order.shippingInfo.postalCode}</span>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="summary-section">
          <h3>Order Items</h3>
          <div class="items-list">
            ${order.items.map(item => `
              <div class="order-item">
                <div class="item-details">
                  <span class="item-name">${item.name}</span>
                  <span class="item-quantity">Qty: ${item.quantity}</span>
                </div>
                <div class="item-price">
                  ${formatCurrency(item.totalPrice)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Order Totals -->
        <div class="summary-section">
          <h3>Order Totals</h3>
          <div class="totals-grid">
            <div class="total-item">
              <label>Subtotal:</label>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            <div class="total-item">
              <label>Shipping:</label>
              <span>${formatCurrency(order.shippingCost)}</span>
            </div>
            <div class="total-item total-final">
              <label>Total:</label>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Payment Information -->
        <div class="summary-section">
          <h3>Payment Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Method:</label>
              <span>${this.formatPaymentMethod(order.paymentMethod)}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="payment-status status-${order.paymentStatus}">${order.paymentStatus.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <!-- Order Timeline -->
        <div class="summary-section">
          <h3>Order Timeline</h3>
          <div class="timeline">
            <div class="timeline-item">
              <label>Order Placed:</label>
              <span>${formatDate(order.createdAt)}</span>
            </div>
            ${order.estimatedDeliveryTime ? `
              <div class="timeline-item">
                <label>Estimated ${order.shippingInfo.method === 'Pick Up in Store' ? 'Pickup' : 'Delivery'}:</label>
                <span>${formatDate(order.estimatedDeliveryTime)}</span>
              </div>
            ` : ''}
            <div class="timeline-item">
              <label>Last Updated:</label>
              <span>${formatDate(order.updatedAt)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${order.notes ? `
          <div class="summary-section">
            <h3>Notes</h3>
            <div class="notes">${order.notes}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Format payment method for display
  formatPaymentMethod(method) {
    const methods = {
      'gcash': 'GCash',
      'card': 'Credit/Debit Card',
      'paypal': 'PayPal',
      'bank_transfer': 'Bank Transfer'
    };
    return methods[method] || method;
  }

  // Display order summary in a modal
  showOrderSummaryModal(orderData) {
    const order = orderData || this.currentOrder;
    if (!order) {
      console.error('[FirebaseOrderSummary] No order data to display');
      return;
    }

    // Remove existing modal if any
    const existingModal = document.getElementById('firebase-order-summary-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'firebase-order-summary-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      font-family: 'Poppins', sans-serif;
    `;

    // Add CSS styles
    const styles = document.createElement('style');
    styles.textContent = `
      .firebase-order-summary {
        color: #333;
      }
      
      .order-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #8b1d1d;
      }
      
      .order-header h2 {
        color: #8b1d1d;
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 10px 0;
      }
      
      .order-id {
        font-size: 16px;
        font-weight: 600;
        color: #666;
        margin-bottom: 10px;
      }
      
      .order-status {
        display: inline-block;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
      }
      
      .status-pending { background: #fff3cd; color: #856404; }
      .status-confirmed { background: #d4edda; color: #155724; }
      .status-processing { background: #cce5ff; color: #004085; }
      .status-shipped { background: #e2e3e5; color: #383d41; }
      .status-delivered { background: #d1ecf1; color: #0c5460; }
      .status-cancelled { background: #f8d7da; color: #721c24; }
      
      .summary-section {
        margin-bottom: 25px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #8b1d1d;
      }
      
      .summary-section h3 {
        color: #8b1d1d;
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 15px 0;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
      }
      
      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }
      
      .info-item label {
        font-weight: 600;
        color: #495057;
        min-width: 100px;
      }
      
      .info-item span {
        color: #212529;
        text-align: right;
      }
      
      .items-list {
        space-y: 10px;
      }
      
      .order-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: white;
        border-radius: 6px;
        margin-bottom: 10px;
        border: 1px solid #dee2e6;
      }
      
      .item-details {
        flex: 1;
      }
      
      .item-name {
        font-weight: 600;
        color: #212529;
        display: block;
        margin-bottom: 4px;
      }
      
      .item-quantity {
        font-size: 14px;
        color: #6c757d;
      }
      
      .item-price {
        font-weight: 600;
        color: #8b1d1d;
        font-size: 16px;
      }
      
      .totals-grid {
        space-y: 8px;
      }
      
      .total-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }
      
      .total-item label {
        font-weight: 600;
        color: #495057;
      }
      
      .total-item span {
        color: #212529;
        font-weight: 600;
      }
      
      .total-final {
        border-top: 2px solid #8b1d1d;
        border-bottom: none;
        padding-top: 12px;
        margin-top: 8px;
      }
      
      .total-final label,
      .total-final span {
        font-size: 18px;
        color: #8b1d1d;
      }
      
      .timeline {
        space-y: 8px;
      }
      
      .timeline-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }
      
      .timeline-item label {
        font-weight: 600;
        color: #495057;
      }
      
      .timeline-item span {
        color: #212529;
      }
      
      .notes {
        background: white;
        padding: 15px;
        border-radius: 6px;
        border: 1px solid #dee2e6;
        font-style: italic;
        color: #6c757d;
      }
      
      .payment-status {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .status-pending { background: #fff3cd; color: #856404; }
      .status-paid { background: #d4edda; color: #155724; }
      .status-failed { background: #f8d7da; color: #721c24; }
      
      .modal-close-btn {
        position: absolute;
        top: 15px;
        right: 15px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 50%;
        width: 35px;
        height: 35px;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .modal-close-btn:hover {
        background: #c82333;
      }
    `;

    // Add styles to head
    document.head.appendChild(styles);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => modal.remove();

    // Set content
    content.innerHTML = this.createOrderSummaryHTML(order);
    content.appendChild(closeBtn);

    // Add to modal
    modal.appendChild(content);

    // Add to page
    document.body.appendChild(modal);

    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };

    console.log('[FirebaseOrderSummary] Order summary modal displayed');
  }

  // Display order summary in a specific container
  displayOrderSummary(containerId, orderData) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[FirebaseOrderSummary] Container not found:', containerId);
      return;
    }

    const order = orderData || this.currentOrder;
    if (!order) {
      container.innerHTML = '<div class="error">No order data available</div>';
      return;
    }

    container.innerHTML = this.createOrderSummaryHTML(order);
    console.log('[FirebaseOrderSummary] Order summary displayed in container:', containerId);
  }

  // Get order summary data for external use
  getOrderSummaryData(orderData) {
    const order = orderData || this.currentOrder;
    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      status: order.status,
      customerName: order.customerInfo.fullName,
      customerEmail: order.customerInfo.email,
      customerPhone: order.customerInfo.phone,
      shippingMethod: order.shippingInfo.method,
      shippingAddress: order.shippingInfo.address,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      itemCount: order.items.length,
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      notes: order.notes
    };
  }
}

// Global Firebase Order Summary instance
let firebaseOrderSummary = null;

// Initialize Firebase Order Summary
function initializeFirebaseOrderSummary() {
  if (!firebaseOrderSummary) {
    firebaseOrderSummary = new FirebaseOrderSummary();
  }
  return firebaseOrderSummary;
}

// Global functions for backward compatibility
window.showFirebaseOrderSummary = function(orderData) {
  const summary = initializeFirebaseOrderSummary();
  summary.showOrderSummaryModal(orderData);
};

window.displayFirebaseOrderSummary = function(containerId, orderData) {
  const summary = initializeFirebaseOrderSummary();
  summary.displayOrderSummary(containerId, orderData);
};

window.loadFirebaseOrder = async function(orderId) {
  const summary = initializeFirebaseOrderSummary();
  return await summary.loadOrderFromFirebase(orderId);
};

window.getFirebaseOrderSummaryData = function(orderData) {
  const summary = initializeFirebaseOrderSummary();
  return summary.getOrderSummaryData(orderData);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('[firebase-order-summary.js] DOM loaded, initializing Firebase Order Summary...');
  initializeFirebaseOrderSummary();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FirebaseOrderSummary, initializeFirebaseOrderSummary };
}
