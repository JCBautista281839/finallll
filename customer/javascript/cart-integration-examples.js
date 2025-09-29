/**
 * Cart Integration Examples
 * 
 * This file demonstrates how to use the FirestoreCartManager in your application.
 * It provides practical examples for common cart operations and UI integration.
 */

// ========================================
// BASIC CART OPERATIONS EXAMPLES
// ========================================

/**
 * Example 1: Adding items to cart
 */
async function addItemToCartExample() {
  try {
    const customerId = 'customer_123'; // Replace with actual customer ID
    const item = {
      productId: 'kare_kare_001',
      productName: 'Kare Kare',
      price: 250.00,
      quantity: 1,
      description: 'Traditional Filipino oxtail stew with vegetables',
      photoUrl: 'https://example.com/kare-kare.jpg'
    };

    const result = await window.firestoreCart.addToCart(customerId, item);
    console.log('Item added to cart:', result);
    
    // Show success message to user
    showNotification('Kare Kare added to cart!', 'success');
  } catch (error) {
    console.error('Failed to add item to cart:', error);
    showNotification('Failed to add item to cart', 'error');
  }
}

/**
 * Example 2: Updating item quantity
 */
async function updateItemQuantityExample() {
  try {
    const customerId = 'customer_123';
    const cartItemId = 'cart_item_456'; // This would come from the cart UI
    const newQuantity = 3;

    const result = await window.firestoreCart.updateCartItemQuantity(customerId, cartItemId, newQuantity);
    console.log('Quantity updated:', result);
    
    showNotification(`Quantity updated to ${newQuantity}`, 'success');
  } catch (error) {
    console.error('Failed to update quantity:', error);
    showNotification('Failed to update quantity', 'error');
  }
}

/**
 * Example 3: Removing item from cart
 */
async function removeItemFromCartExample() {
  try {
    const customerId = 'customer_123';
    const cartItemId = 'cart_item_456';

    await window.firestoreCart.removeFromCart(customerId, cartItemId);
    console.log('Item removed from cart');
    
    showNotification('Item removed from cart', 'success');
  } catch (error) {
    console.error('Failed to remove item:', error);
    showNotification('Failed to remove item', 'error');
  }
}

/**
 * Example 4: Getting all cart items
 */
async function getCartItemsExample() {
  try {
    const customerId = 'customer_123';
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    
    console.log('Cart items:', cartItems);
    
    // Update UI with cart items
    updateCartUI(cartItems);
    
    return cartItems;
  } catch (error) {
    console.error('Failed to get cart items:', error);
    return [];
  }
}

// ========================================
// UI INTEGRATION EXAMPLES
// ========================================

/**
 * Example 5: Cart UI with real-time updates
 */
function setupRealtimeCartUI(customerId) {
  // Set up real-time listener for cart changes
  const unsubscribe = window.firestoreCart.onCartItemsChange(customerId, (cartItems) => {
    updateCartDisplay(cartItems);
    updateCartSummary(cartItems);
    updateCartBadge(cartItems);
  });

  // Return unsubscribe function to clean up when needed
  return unsubscribe;
}

/**
 * Example 6: Update cart display in UI
 */
function updateCartDisplay(cartItems) {
  const cartContainer = document.getElementById('cart-items');
  if (!cartContainer) return;

  if (cartItems.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty</p>
        <button onclick="window.location.href='menucustomer.html'">Browse Menu</button>
      </div>
    `;
    return;
  }

  cartContainer.innerHTML = cartItems.map(item => `
    <div class="cart-item" data-cart-item-id="${item.id}">
      <div class="item-image">
        <img src="${item.photoUrl}" alt="${item.productName}" onerror="this.src='../../src/IMG/default-food.jpg'">
      </div>
      <div class="item-details">
        <h4>${item.productName}</h4>
        <p class="item-description">${item.description}</p>
        <p class="item-price">₱${item.price.toFixed(2)} each</p>
      </div>
      <div class="item-controls">
        <button class="quantity-btn" onclick="decreaseQuantity('${item.id}')">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn" onclick="increaseQuantity('${item.id}')">+</button>
        <button class="remove-btn" onclick="removeCartItem('${item.id}')">×</button>
      </div>
      <div class="item-total">
        ₱${(item.price * item.quantity).toFixed(2)}
      </div>
    </div>
  `).join('');
}

/**
 * Example 7: Update cart summary (totals)
 */
function updateCartSummary(cartItems) {
  const totals = window.firestoreCart.calculateCartTotal(cartItems);
  
  const subtotalElement = document.getElementById('cart-subtotal');
  const taxElement = document.getElementById('cart-tax');
  const totalElement = document.getElementById('cart-total');
  
  if (subtotalElement) subtotalElement.textContent = `₱${totals.subtotal.toFixed(2)}`;
  if (taxElement) taxElement.textContent = `₱${totals.tax.toFixed(2)}`;
  if (totalElement) totalElement.textContent = `₱${totals.total.toFixed(2)}`;
}

/**
 * Example 8: Update cart badge (item count)
 */
function updateCartBadge(cartItems) {
  const totalItems = cartItems.reduce((count, item) => count + item.quantity, 0);
  const badgeElement = document.getElementById('cart-badge');
  
  if (badgeElement) {
    badgeElement.textContent = totalItems;
    badgeElement.style.display = totalItems > 0 ? 'block' : 'none';
  }
}

// ========================================
// MENU INTEGRATION EXAMPLES
// ========================================

/**
 * Example 9: Add to cart from menu item
 */
async function addToCartFromMenu(menuItem, customerId) {
  try {
    const item = {
      productId: menuItem.id,
      productName: menuItem.name,
      price: parseFloat(menuItem.price),
      quantity: 1,
      description: menuItem.description || '',
      photoUrl: menuItem.photoUrl || ''
    };

    await window.firestoreCart.addToCart(customerId, item);
    
    // Show success feedback
    showAddToCartSuccess(menuItem.name);
    
    // Update cart badge
    const summary = await window.firestoreCart.getCartSummary(customerId);
    updateCartBadgeFromSummary(summary);
    
  } catch (error) {
    console.error('Failed to add item to cart:', error);
    showNotification('Failed to add item to cart', 'error');
  }
}

/**
 * Example 10: Check if product is in cart (for menu display)
 */
async function updateMenuCartIndicators(customerId) {
  try {
    const menuItems = document.querySelectorAll('.menu-item');
    
    for (const menuItem of menuItems) {
      const productId = menuItem.dataset.productId;
      if (productId) {
        const isInCart = await window.firestoreCart.isProductInCart(customerId, productId);
        const cartButton = menuItem.querySelector('.add-to-cart-btn');
        
        if (isInCart) {
          cartButton.textContent = '✓ In Cart';
          cartButton.classList.add('in-cart');
        } else {
          cartButton.textContent = '+ Add to Cart';
          cartButton.classList.remove('in-cart');
        }
      }
    }
  } catch (error) {
    console.error('Failed to update menu cart indicators:', error);
  }
}

// ========================================
// CART CONTROL FUNCTIONS
// ========================================

/**
 * Increase item quantity (called from UI)
 */
async function increaseQuantity(cartItemId) {
  try {
    const customerId = getCurrentCustomerId(); // Implement this function
    const currentItem = await getCartItemById(customerId, cartItemId);
    
    if (currentItem) {
      await window.firestoreCart.updateCartItemQuantity(customerId, cartItemId, currentItem.quantity + 1);
    }
  } catch (error) {
    console.error('Failed to increase quantity:', error);
    showNotification('Failed to update quantity', 'error');
  }
}

/**
 * Decrease item quantity (called from UI)
 */
async function decreaseQuantity(cartItemId) {
  try {
    const customerId = getCurrentCustomerId();
    const currentItem = await getCartItemById(customerId, cartItemId);
    
    if (currentItem && currentItem.quantity > 1) {
      await window.firestoreCart.updateCartItemQuantity(customerId, cartItemId, currentItem.quantity - 1);
    }
  } catch (error) {
    console.error('Failed to decrease quantity:', error);
    showNotification('Failed to update quantity', 'error');
  }
}

/**
 * Remove cart item (called from UI)
 */
async function removeCartItem(cartItemId) {
  try {
    const customerId = getCurrentCustomerId();
    
    if (confirm('Are you sure you want to remove this item from your cart?')) {
      await window.firestoreCart.removeFromCart(customerId, cartItemId);
      showNotification('Item removed from cart', 'success');
    }
  } catch (error) {
    console.error('Failed to remove item:', error);
    showNotification('Failed to remove item', 'error');
  }
}

/**
 * Clear entire cart (called from UI)
 */
async function clearCart() {
  try {
    const customerId = getCurrentCustomerId();
    
    if (confirm('Are you sure you want to clear your entire cart?')) {
      await window.firestoreCart.clearCart(customerId);
      showNotification('Cart cleared', 'success');
    }
  } catch (error) {
    console.error('Failed to clear cart:', error);
    showNotification('Failed to clear cart', 'error');
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get current customer ID (implement based on your auth system)
 */
function getCurrentCustomerId() {
  // Option 1: From Firebase Auth
  if (firebase.auth().currentUser) {
    return firebase.auth().currentUser.uid;
  }
  
  // Option 2: From session storage
  const customerData = sessionStorage.getItem('currentCustomer');
  if (customerData) {
    return JSON.parse(customerData).id;
  }
  
  // Option 3: Generate temporary ID for guest users
  let guestId = sessionStorage.getItem('guestCustomerId');
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('guestCustomerId', guestId);
  }
  
  return guestId;
}

/**
 * Get cart item by ID (helper function)
 */
async function getCartItemById(customerId, cartItemId) {
  const cartItems = await window.firestoreCart.getCartItems(customerId);
  return cartItems.find(item => item.id === cartItemId);
}

/**
 * Show notification (implement based on your UI framework)
 */
function showNotification(message, type = 'info') {
  // Simple notification implementation
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Show add to cart success animation
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
    successMsg.remove();
  }, 2000);
}

/**
 * Update cart badge from summary
 */
function updateCartBadgeFromSummary(summary) {
  const badgeElement = document.getElementById('cart-badge');
  if (badgeElement) {
    badgeElement.textContent = summary.itemCount;
    badgeElement.style.display = summary.itemCount > 0 ? 'block' : 'none';
  }
}

// ========================================
// INITIALIZATION EXAMPLE
// ========================================

/**
 * Initialize cart system when page loads
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Wait for Firebase to be ready
    await window.firestoreCart.waitForFirebase();
    
    const customerId = getCurrentCustomerId();
    
    // Set up real-time cart updates
    const unsubscribe = setupRealtimeCartUI(customerId);
    
    // Load initial cart data
    const cartItems = await window.firestoreCart.getCartItems(customerId);
    updateCartDisplay(cartItems);
    updateCartSummary(cartItems);
    updateCartBadge(cartItems);
    
    // Update menu cart indicators
    updateMenuCartIndicators(customerId);
    
    // Store unsubscribe function for cleanup
    window.cartUnsubscribe = unsubscribe;
    
    console.log('Cart system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize cart system:', error);
  }
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  if (window.cartUnsubscribe) {
    window.cartUnsubscribe();
  }
});
