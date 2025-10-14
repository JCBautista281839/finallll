/**
 * Cart UI Integration
 * 
 * This file provides ready-to-use UI components and functions for integrating
 * the Firestore cart system into your existing HTML pages.
 */

// ========================================
// CART UI COMPONENTS
// ========================================

/**
 * Create cart item HTML element
 * @param {Object} item - Cart item data
 * @returns {string} HTML string for cart item
 */
function createCartItemHTML(item) {
  return `
    <div class="cart-item" data-cart-item-id="${item.id}">
      <div class="cart-item-image">
        <img src="${item.photoUrl ? (item.photoUrl + (item.photoUrl.includes('?') ? '&' : '?') + 'v=' + new Date().getTime()) : '../../src/IMG/default-food.jpg'}" 
             alt="${item.productName}" 
             onerror="this.src='../../src/IMG/default-food.jpg'">
      </div>
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.productName}</h4>
        <p class="cart-item-description">${item.description || ''}</p>
        <p class="cart-item-price">₱${item.price.toFixed(2)} each</p>
      </div>
      <div class="cart-item-controls">
        <div class="quantity-controls">
          <button class="quantity-btn decrease" onclick="decreaseCartQuantity('${item.id}')" 
                  title="Decrease quantity">−</button>
          <span class="quantity-display">${item.quantity}</span>
          <button class="quantity-btn increase" onclick="increaseCartQuantity('${item.id}')" 
                  title="Increase quantity">+</button>
        </div>
        <button class="remove-btn" onclick="removeCartItem('${item.id}')" 
                title="Remove item">×</button>
      </div>
      <div class="cart-item-total">
        ₱${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `;
}

/**
 * Create cart summary HTML
 * @param {Object} totals - Cart totals
 * @returns {string} HTML string for cart summary
 */
function createCartSummaryHTML(totals) {
  return `
    <div class="cart-summary">
      <div class="summary-row">
        <span>Subtotal (${totals.itemCount} items):</span>
        <span class="summary-value">₱${totals.subtotal.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Tax (12%):</span>
        <span class="summary-value">₱${totals.tax.toFixed(2)}</span>
      </div>
      <div class="summary-row total-row">
        <span><strong>Total:</strong></span>
        <span class="summary-value"><strong>₱${totals.total.toFixed(2)}</strong></span>
      </div>
    </div>
  `;
}

/**
 * Create empty cart HTML
 * @returns {string} HTML string for empty cart
 */
function createEmptyCartHTML() {
  return `
    <div class="empty-cart">
      <div class="empty-cart-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <p>Add some delicious items from our menu to get started!</p>
      <button class="btn btn-primary" onclick="window.location.href='menucustomer.html'">
        Browse Menu
      </button>
    </div>
  `;
}

// ========================================
// CART UI UPDATES
// ========================================

/**
 * Update cart display with items
 * @param {Array} cartItems - Array of cart items
 */
function updateCartDisplay(cartItems) {
  const cartContainer = document.getElementById('cart-items');
  if (!cartContainer) return;

  if (cartItems.length === 0) {
    cartContainer.innerHTML = createEmptyCartHTML();
    hideElement('cart-summary');
    showElement('empty-cart');
  } else {
    cartContainer.innerHTML = cartItems.map(createCartItemHTML).join('');
    showElement('cart-summary');
    hideElement('empty-cart');
  }
}

/**
 * Update cart summary with totals
 * @param {Array} cartItems - Array of cart items
 */
function updateCartSummary(cartItems) {
  const totals = window.firestoreCart.calculateCartTotal(cartItems);

  // Update individual elements if they exist
  updateElementText('cart-subtotal', `₱${totals.subtotal.toFixed(2)}`);
  updateElementText('cart-tax', `₱${totals.tax.toFixed(2)}`);
  updateElementText('cart-total', `₱${totals.total.toFixed(2)}`);
  updateElementText('cart-item-count', `${totals.itemCount} items`);

  // Update summary container if it exists
  const summaryContainer = document.getElementById('cart-summary');
  if (summaryContainer) {
    summaryContainer.innerHTML = createCartSummaryHTML(totals);
  }
}

/**
 * Update cart badge with item count
 * @param {Array} cartItems - Array of cart items
 */
function updateCartBadge(cartItems) {
  const totalItems = cartItems.reduce((count, item) => count + item.quantity, 0);

  // Update cart badge
  const badgeElement = document.getElementById('cart-badge');
  if (badgeElement) {
    badgeElement.textContent = totalItems;
    badgeElement.style.display = totalItems > 0 ? 'block' : 'none';
  }

  // Update cart icon text
  const cartIconText = document.getElementById('cart-icon-text');
  if (cartIconText) {
    cartIconText.textContent = totalItems > 0 ? `Cart (${totalItems})` : 'Cart';
  }
}

/**
 * Update menu item cart status
 * @param {string} productId - Product ID
 * @param {boolean} isInCart - Whether product is in cart
 * @param {number} quantity - Quantity in cart
 */
function updateMenuItemCartStatus(productId, isInCart, quantity = 0) {
  const menuItem = document.querySelector(`[data-product-id="${productId}"]`);
  if (!menuItem) return;

  const cartButton = menuItem.querySelector('.add-to-cart-btn');
  if (!cartButton) return;

  if (isInCart) {
    cartButton.textContent = `✓ In Cart (${quantity})`;
    cartButton.classList.add('in-cart');
    cartButton.disabled = false;
  } else {
    cartButton.textContent = '+ Add to Cart';
    cartButton.classList.remove('in-cart');
    cartButton.disabled = false;
  }
}

// ========================================
// CART CONTROL FUNCTIONS
// ========================================

/**
 * Add item to cart from menu
 * @param {Object} menuItem - Menu item data
 */
async function addMenuItemToCart(menuItem) {
  try {
    const customerId = getCurrentCustomerId();

    const cartItem = {
      productId: menuItem.id || menuItem.productId,
      productName: menuItem.name || menuItem.productName,
      price: parseFloat(menuItem.price),
      quantity: 1,
      description: menuItem.description || '',
      photoUrl: menuItem.photoUrl || menuItem.image || ''
    };

    await window.firestoreCart.addToCart(customerId, cartItem);

    // Show success feedback
    showAddToCartSuccess(cartItem.productName);

    // Update menu item status
    updateMenuItemCartStatus(cartItem.productId, true, 1);

  } catch (error) {
    console.error('Failed to add item to cart:', error);
    showNotification('Failed to add item to cart', 'error');
  }
}

/**
 * Increase cart item quantity
 * @param {string} cartItemId - Cart item ID
 */
async function increaseCartQuantity(cartItemId) {
  try {
    const customerId = getCurrentCustomerId();
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    const currentItem = cartItems.find(item => item.id === cartItemId);

    if (currentItem) {
      await window.firestoreCart.updateCartItemQuantity(customerId, cartItemId, currentItem.quantity + 1);

      // Update menu item status if applicable
      updateMenuItemCartStatus(currentItem.productId, true, currentItem.quantity + 1);
    }
  } catch (error) {
    console.error('Failed to increase quantity:', error);
    showNotification('Failed to update quantity', 'error');
  }
}

/**
 * Decrease cart item quantity
 * @param {string} cartItemId - Cart item ID
 */
async function decreaseCartQuantity(cartItemId) {
  try {
    const customerId = getCurrentCustomerId();
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    const currentItem = cartItems.find(item => item.id === cartItemId);

    if (currentItem) {
      const newQuantity = currentItem.quantity - 1;

      if (newQuantity <= 0) {
        // Remove item if quantity becomes 0
        await window.firestoreCart.removeFromCart(customerId, cartItemId);
        updateMenuItemCartStatus(currentItem.productId, false, 0);
      } else {
        // Update quantity
        await window.firestoreCart.updateCartItemQuantity(customerId, cartItemId, newQuantity);
        updateMenuItemCartStatus(currentItem.productId, true, newQuantity);
      }
    }
  } catch (error) {
    console.error('Failed to decrease quantity:', error);
    showNotification('Failed to update quantity', 'error');
  }
}

/**
 * Remove cart item completely
 * @param {string} cartItemId - Cart item ID
 */
async function removeCartItem(cartItemId) {
  try {
    const customerId = getCurrentCustomerId();
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    const itemToRemove = cartItems.find(item => item.id === cartItemId);

    if (confirm(`Are you sure you want to remove "${itemToRemove?.productName}" from your cart?`)) {
      await window.firestoreCart.removeFromCart(customerId, cartItemId);

      // Update menu item status
      if (itemToRemove) {
        updateMenuItemCartStatus(itemToRemove.productId, false, 0);
      }

      showNotification('Item removed from cart', 'success');
    }
  } catch (error) {
    console.error('Failed to remove item:', error);
    showNotification('Failed to remove item', 'error');
  }
}

/**
 * Clear entire cart
 */
async function clearCart() {
  try {
    const customerId = getCurrentCustomerId();
    const cartItems = await window.firestoreCart.getCartItems(customerId);

    if (cartItems.length === 0) {
      showNotification('Your cart is already empty', 'info');
      return;
    }

    if (confirm(`Are you sure you want to clear your entire cart? This will remove ${cartItems.length} item(s).`)) {
      await window.firestoreCart.clearCart(customerId);

      // Update all menu item statuses
      cartItems.forEach(item => {
        updateMenuItemCartStatus(item.productId, false, 0);
      });

      showNotification('Cart cleared successfully', 'success');
    }
  } catch (error) {
    console.error('Failed to clear cart:', error);
    showNotification('Failed to clear cart', 'error');
  }
}

// ========================================
// REAL-TIME CART UPDATES
// ========================================

/**
 * Set up real-time cart updates
 * @param {string} customerId - Customer ID
 * @returns {Function} Unsubscribe function
 */
function setupRealtimeCartUpdates(customerId) {
  const unsubscribe = window.firestoreCart.onCartItemsChange(customerId, (cartItems) => {
    // Update UI components
    updateCartDisplay(cartItems);
    updateCartSummary(cartItems);
    updateCartBadge(cartItems);

    // Update menu item statuses
    updateAllMenuCartStatuses(customerId, cartItems);
  });

  return unsubscribe;
}

/**
 * Update all menu item cart statuses
 * @param {string} customerId - Customer ID
 * @param {Array} cartItems - Current cart items
 */
async function updateAllMenuCartStatuses(customerId, cartItems) {
  try {
    // Create a map of product IDs to quantities
    const cartMap = new Map();
    cartItems.forEach(item => {
      cartMap.set(item.productId, item.quantity);
    });

    // Update all menu items
    const menuItems = document.querySelectorAll('[data-product-id]');
    menuItems.forEach(menuItem => {
      const productId = menuItem.dataset.productId;
      const quantity = cartMap.get(productId) || 0;
      const isInCart = quantity > 0;

      updateMenuItemCartStatus(productId, isInCart, quantity);
    });
  } catch (error) {
    console.error('Failed to update menu cart statuses:', error);
  }
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize cart UI system
 */
async function initializeCartUI() {
  try {
    // Wait for Firebase to be ready
    await window.firestoreCart.waitForFirebase();

    const customerId = getCurrentCustomerId();

    // Set up real-time updates
    const unsubscribe = setupRealtimeCartUpdates(customerId);

    // Load initial cart data
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    updateCartDisplay(cartItems);
    updateCartSummary(cartItems);
    updateCartBadge(cartItems);
    updateAllMenuCartStatuses(customerId, cartItems);

    // Store unsubscribe function for cleanup
    window.cartUIUnsubscribe = unsubscribe;

    console.log('[CartUI] ✅ Initialized successfully');
  } catch (error) {
    console.error('[CartUI] ❌ Initialization failed:', error);
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Show element
 * @param {string} elementId - Element ID
 */
function showElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'block';
}

/**
 * Hide element
 * @param {string} elementId - Element ID
 */
function hideElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) element.style.display = 'none';
}

/**
 * Update element text content
 * @param {string} elementId - Element ID
 * @param {string} text - Text content
 */
function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = text;
}

/**
 * Get current customer ID
 * @returns {string} Customer ID
 */
function getCurrentCustomerId() {
  // Try Firebase Auth first
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    return firebase.auth().currentUser.uid;
  }

  // Try session storage
  const customerData = sessionStorage.getItem('currentCustomer');
  if (customerData) {
    const customer = JSON.parse(customerData);
    return customer.id || customer.uid;
  }

  // Generate guest ID
  let guestId = sessionStorage.getItem('guestCustomerId');
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('guestCustomerId', guestId);
  }

  return guestId;
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${message}</span>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;

  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

/**
 * Show add to cart success animation
 * @param {string} itemName - Item name
 */
function showAddToCartSuccess(itemName) {
  const successMsg = document.createElement('div');
  successMsg.className = 'add-to-cart-success';
  successMsg.innerHTML = `
    <div class="success-icon">✓</div>
    <span>Added "${itemName}" to cart!</span>
  `;

  document.body.appendChild(successMsg);

  setTimeout(() => {
    if (successMsg.parentElement) {
      successMsg.remove();
    }
  }, 2000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeCartUI);

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  if (window.cartUIUnsubscribe) {
    window.cartUIUnsubscribe();
  }
});
