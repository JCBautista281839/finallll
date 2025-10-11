/**
 * Firebase Order Management Functions
 * 
 * This file contains all Firebase-related functions for managing orders,
 * including saving contact information, shipping addresses, and cart data.
 */

// Firebase Order Management Class
// Check if FirebaseOrderManager is already declared to prevent redeclaration errors
if (typeof FirebaseOrderManager === 'undefined') {
  class FirebaseOrderManager {
    constructor() {
      this.db = null;
      this.isInitialized = false;
      this.init();
    }

    // Initialize Firebase connection
    async init() {
      try {
        // Wait for Firebase to be ready
        await this.waitForFirebase();

        // Initialize Firestore
        this.db = firebase.firestore();
        this.isInitialized = true;

        console.log('[FirebaseOrderManager] Firebase initialized successfully');
      } catch (error) {
        console.error('[FirebaseOrderManager] Firebase initialization failed:', error);
        this.isInitialized = false;
      }
    }

    // Wait for Firebase to be ready
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

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Firebase initialization timeout'));
        }, 10000);
      });
    }

    // Generate unique order ID
    generateOrderId() {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      return `ORDER_${timestamp}_${random}`.toUpperCase();
    }

    // Save order to Firebase
    async createOrder(orderData) {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      try {
        const orderId = this.generateOrderId();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        // Prepare order document
        const orderDoc = {
          orderId: orderId,

          // User Information
          userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
          userEmail: firebase.auth().currentUser ? firebase.auth().currentUser.email : orderData.customerInfo.email,

          status: orderData.status || 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,

          // Customer Information
          customerInfo: {
            firstName: orderData.customerInfo.firstName,
            lastName: orderData.customerInfo.lastName,
            email: orderData.customerInfo.email,
            phone: orderData.customerInfo.phone,
            fullName: orderData.customerInfo.fullName
          },

          // Shipping Information
          shippingInfo: {
            address: orderData.shippingInfo.address,
            barangay: orderData.shippingInfo.barangay,
            city: orderData.shippingInfo.city,
            province: orderData.shippingInfo.province,
            postalCode: orderData.shippingInfo.postalCode,
            method: orderData.shippingInfo.method,
            cost: orderData.shippingInfo.cost
          },

          // Order Items
          items: orderData.items.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            totalPrice: parseFloat(item.price.replace(/[^\d.]/g, '')) * item.quantity
          })),

          // Order Totals
          subtotal: orderData.subtotal || 0,
          shippingCost: orderData.shippingCost || 0,
          total: orderData.total || 0,

          // Payment Information
          paymentMethod: orderData.paymentMethod || 'gcash',
          paymentStatus: 'pending',
          paymentInfo: orderData.paymentInfo || null,

          // Additional Information
          notes: orderData.notes || '',
          estimatedDeliveryTime: orderData.estimatedDeliveryTime || null,

          // System Information
          source: 'customer_web',
          version: '1.0'
        };

        // Save to Firestore
        await this.db.collection('orders').doc(orderId).set(orderDoc);

        console.log('[FirebaseOrderManager] Order saved successfully:', orderId);

        // Return order ID for reference
        return orderId;

      } catch (error) {
        console.error('[FirebaseOrderManager] Error saving order:', error);
        throw error;
      }
    }

    // Get order by ID
    async getOrder(orderId) {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      try {
        const doc = await this.db.collection('orders').doc(orderId).get();

        if (doc.exists) {
          return { id: doc.id, ...doc.data() };
        } else {
          throw new Error('Order not found');
        }
      } catch (error) {
        console.error('[FirebaseOrderManager] Error getting order:', error);
        throw error;
      }
    }

    // Update order status
    async updateOrderStatus(orderId, status, additionalData = {}) {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      try {
        const updateData = {
          status: status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          ...additionalData
        };

        await this.db.collection('orders').doc(orderId).update(updateData);

        console.log('[FirebaseOrderManager] Order status updated:', orderId, status);
        return true;
      } catch (error) {
        console.error('[FirebaseOrderManager] Error updating order status:', error);
        throw error;
      }
    }

    // Get orders by customer email
    async getOrdersByCustomer(email) {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      try {
        const snapshot = await this.db.collection('orders')
          .where('customerInfo.email', '==', email)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });

        return orders;
      } catch (error) {
        console.error('[FirebaseOrderManager] Error getting customer orders:', error);
        throw error;
      }
    }

    // Get recent orders (for admin dashboard)
    async getRecentOrders(limit = 20) {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      try {
        const snapshot = await this.db.collection('orders')
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();

        const orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });

        return orders;
      } catch (error) {
        console.error('[FirebaseOrderManager] Error getting recent orders:', error);
        throw error;
      }
    }

    // Calculate order totals
    calculateOrderTotals(cartItems, shippingCost = 0) {
      let subtotal = 0;

      cartItems.forEach(item => {
        const price = parseFloat(item.price.replace(/[^\d.]/g, ''));
        subtotal += price * item.quantity;
      });

      const total = subtotal + shippingCost;

      return {
        subtotal: subtotal,
        shippingCost: shippingCost,
        total: total
      };
    }

    // Format order data for display
    formatOrderForDisplay(orderData) {
      return {
        orderId: orderData.orderId,
        customerName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
        email: orderData.customerInfo.email,
        phone: orderData.customerInfo.phone,
        address: orderData.shippingInfo.address,
        shippingMethod: orderData.shippingInfo.method,
        paymentMethod: orderData.paymentMethod,
        status: orderData.status,
        total: orderData.total,
        items: orderData.items,
        createdAt: orderData.createdAt,
        estimatedDeliveryTime: orderData.estimatedDeliveryTime
      };
    }
  }

  // Global Firebase Order Manager instance
  let firebaseOrderManager = null;

  // Initialize Firebase Order Manager
  function initializeFirebaseOrderManager() {
    if (!firebaseOrderManager) {
      firebaseOrderManager = new FirebaseOrderManager();
    }
    return firebaseOrderManager;
  }

  // Global functions for backward compatibility
  window.createOrder = async function (orderData) {
    const manager = initializeFirebaseOrderManager();
    return await manager.createOrder(orderData);
  };

  window.getOrder = async function (orderId) {
    const manager = initializeFirebaseOrderManager();
    return await manager.getOrder(orderId);
  };

  window.updateOrderStatus = async function (orderId, status, additionalData) {
    const manager = initializeFirebaseOrderManager();
    return await manager.updateOrderStatus(orderId, status, additionalData);
  };

  window.getOrdersByCustomer = async function (email) {
    const manager = initializeFirebaseOrderManager();
    return await manager.getOrdersByCustomer(email);
  };

  window.getRecentOrders = async function (limit) {
    const manager = initializeFirebaseOrderManager();
    return await manager.getRecentOrders(limit);
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[firebase-orders.js] DOM loaded, initializing Firebase Order Manager...');
    initializeFirebaseOrderManager();
  });

  // Export for module usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseOrderManager, initializeFirebaseOrderManager };
  }

} // End of FirebaseOrderManager conditional block
