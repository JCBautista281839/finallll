/**
 * Firestore Cart Management System
 * 
 * This module manages customer carts using Firebase Firestore subcollections.
 * Each customer document contains a 'cart' subcollection where cart items are stored as individual documents.
 * 
 * Structure:
 * customers/{customerId}/cart/{cartItemId}
 * 
 * Cart Item Document Fields:
 * - productId: string (unique product identifier)
 * - productName: string (product name)
 * - quantity: number (item quantity)
 * - price: number (unit price)
 * - description: string (product description)
 * - photoUrl: string (product image URL)
 * - addedAt: timestamp (when item was added)
 * - updatedAt: timestamp (when item was last updated)
 */

class FirestoreCartManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    
    // Initialize Firebase when available
    this.init();
  }

  /**
   * Initialize the Firestore cart manager
   */
  async init() {
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        this.db = firebase.firestore();
        this.isInitialized = true;
        console.log('[FirestoreCart] ✅ Initialized successfully');
      } else {
        console.warn('[FirestoreCart] ⚠️ Firebase not available');
      }
    } catch (error) {
      console.error('[FirestoreCart] ❌ Initialization failed:', error);
    }
  }

  /**
   * Wait for Firebase to be ready
   */
  async waitForFirebase() {
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!this.isInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.isInitialized) {
      throw new Error('Firebase initialization timeout');
    }
  }

  /**
   * Add item to customer's cart
   * @param {string} customerId - Customer's unique ID
   * @param {Object} item - Item to add to cart
   * @param {string} item.productId - Product ID
   * @param {string} item.productName - Product name
   * @param {number} item.price - Product price
   * @param {number} item.quantity - Quantity to add (default: 1)
   * @param {string} item.description - Product description
   * @param {string} item.photoUrl - Product image URL
   * @returns {Promise<Object>} Cart item document
   */
  async addToCart(customerId, item) {
    try {
      await this.waitForFirebase();
      
      const cartItemData = {
        productId: item.productId,
        productName: item.productName,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity) || 1,
        description: item.description || '',
        photoUrl: item.photoUrl || '',
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Check if item already exists in cart
      const existingItem = await this.findCartItemByProductId(customerId, item.productId);
      
      if (existingItem) {
        // Update quantity if item exists
        const newQuantity = existingItem.quantity + cartItemData.quantity;
        return await this.updateCartItemQuantity(customerId, existingItem.id, newQuantity);
      } else {
        // Add new item to cart
        const cartRef = this.db.collection('customers').doc(customerId).collection('cart');
        const docRef = await cartRef.add(cartItemData);
        
        console.log('[FirestoreCart] ✅ Item added to cart:', item.productName);
        return { id: docRef.id, ...cartItemData };
      }
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * @param {string} customerId - Customer's unique ID
   * @param {string} cartItemId - Cart item document ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated cart item
   */
  async updateCartItemQuantity(customerId, cartItemId, quantity) {
    try {
      await this.waitForFirebase();
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return await this.removeFromCart(customerId, cartItemId);
      }

      const cartItemRef = this.db.collection('customers')
        .doc(customerId)
        .collection('cart')
        .doc(cartItemId);

      const updateData = {
        quantity: parseInt(quantity),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await cartItemRef.update(updateData);
      
      // Get updated document
      const doc = await cartItemRef.get();
      const updatedItem = { id: doc.id, ...doc.data() };
      
      console.log('[FirestoreCart] ✅ Cart item quantity updated:', updatedItem.productName);
      return updatedItem;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to update cart item quantity:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {string} customerId - Customer's unique ID
   * @param {string} cartItemId - Cart item document ID
   * @returns {Promise<boolean>} Success status
   */
  async removeFromCart(customerId, cartItemId) {
    try {
      await this.waitForFirebase();
      
      const cartItemRef = this.db.collection('customers')
        .doc(customerId)
        .collection('cart')
        .doc(cartItemId);

      await cartItemRef.delete();
      
      console.log('[FirestoreCart] ✅ Item removed from cart');
      return true;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to remove item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   * @param {string} customerId - Customer's unique ID
   * @returns {Promise<boolean>} Success status
   */
  async clearCart(customerId) {
    try {
      await this.waitForFirebase();
      
      const cartRef = this.db.collection('customers').doc(customerId).collection('cart');
      const snapshot = await cartRef.get();
      
      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log('[FirestoreCart] ✅ Cart cleared');
      return true;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Get all items in customer's cart
   * @param {string} customerId - Customer's unique ID
   * @returns {Promise<Array>} Array of cart items
   */
  async getCartItems(customerId) {
    try {
      await this.waitForFirebase();
      
      const cartRef = this.db.collection('customers').doc(customerId).collection('cart');
      const snapshot = await cartRef.orderBy('addedAt', 'asc').get();
      
      const cartItems = [];
      snapshot.forEach(doc => {
        cartItems.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('[FirestoreCart] ✅ Retrieved cart items:', cartItems.length);
      return cartItems;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to get cart items:', error);
      return [];
    }
  }

  /**
   * Get real-time updates for cart items
   * @param {string} customerId - Customer's unique ID
   * @param {Function} callback - Callback function for cart updates
   * @returns {Function} Unsubscribe function
   */
  onCartItemsChange(customerId, callback) {
    try {
      if (!this.isInitialized) {
        console.warn('[FirestoreCart] ⚠️ Firebase not initialized, cannot set up real-time listener');
        return () => {};
      }

      const cartRef = this.db.collection('customers').doc(customerId).collection('cart');
      
      const unsubscribe = cartRef.orderBy('addedAt', 'asc').onSnapshot(snapshot => {
        const cartItems = [];
        snapshot.forEach(doc => {
          cartItems.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('[FirestoreCart] ✅ Real-time cart update:', cartItems.length, 'items');
        callback(cartItems);
      }, error => {
        console.error('[FirestoreCart] ❌ Real-time listener error:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to set up real-time listener:', error);
      return () => {};
    }
  }

  /**
   * Find cart item by product ID
   * @param {string} customerId - Customer's unique ID
   * @param {string} productId - Product ID to search for
   * @returns {Promise<Object|null>} Cart item or null if not found
   */
  async findCartItemByProductId(customerId, productId) {
    try {
      await this.waitForFirebase();
      
      const cartRef = this.db.collection('customers').doc(customerId).collection('cart');
      const snapshot = await cartRef.where('productId', '==', productId).limit(1).get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to find cart item by product ID:', error);
      return null;
    }
  }

  /**
   * Calculate cart total
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Cart totals
   */
  calculateCartTotal(cartItems) {
    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const tax = subtotal * 0.12; // 12% tax (adjust as needed)
    const total = subtotal + tax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      itemCount: cartItems.reduce((count, item) => count + item.quantity, 0)
    };
  }

  /**
   * Get cart summary (total items and total price)
   * @param {string} customerId - Customer's unique ID
   * @returns {Promise<Object>} Cart summary
   */
  async getCartSummary(customerId) {
    try {
      const cartItems = await this.getCartItems(customerId);
      return this.calculateCartTotal(cartItems);
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to get cart summary:', error);
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        itemCount: 0
      };
    }
  }

  /**
   * Check if product is in cart
   * @param {string} customerId - Customer's unique ID
   * @param {string} productId - Product ID to check
   * @returns {Promise<boolean>} True if product is in cart
   */
  async isProductInCart(customerId, productId) {
    try {
      const cartItem = await this.findCartItemByProductId(customerId, productId);
      return cartItem !== null;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to check if product is in cart:', error);
      return false;
    }
  }

  /**
   * Get quantity of specific product in cart
   * @param {string} customerId - Customer's unique ID
   * @param {string} productId - Product ID
   * @returns {Promise<number>} Quantity of product in cart
   */
  async getProductQuantity(customerId, productId) {
    try {
      const cartItem = await this.findCartItemByProductId(customerId, productId);
      return cartItem ? cartItem.quantity : 0;
    } catch (error) {
      console.error('[FirestoreCart] ❌ Failed to get product quantity:', error);
      return 0;
    }
  }
}

// Create global instance
window.firestoreCart = new FirestoreCartManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirestoreCartManager;
}
