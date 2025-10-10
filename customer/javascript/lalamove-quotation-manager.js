// lalamove-quotation-manager.js
// Handles storing and managing Lalamove quotations in Firestore

class LalamoveQuotationManager {
  constructor() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase is not initialized');
    }
    this.db = firebase.firestore();
  }

  async storeQuotation(quotationData, orderData) {
    try {
      console.log('[LalamoveQuotationManager] Storing quotation:', { quotationData, orderData });
      
      // Get customer data from session storage
      let customerData;
      try {
        customerData = JSON.parse(sessionStorage.getItem('orderFormData')) || {};
      } catch (error) {
        console.warn('[LalamoveQuotationManager] Error parsing customer data:', error);
        customerData = {};
      }

      const quotationRef = this.db.collection('lalamove_quotations').doc();
      
      const dataToStore = {
        quotationId: quotationData?.data?.quotationId || null,
        orderId: orderData?.orderId || null,
        customerInfo: {
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          fullName: customerData.firstName && customerData.lastName ? 
            `${customerData.firstName} ${customerData.lastName}` : 'Unknown Customer',
          email: customerData.email || 'No email provided',
          phone: customerData.phone || 'Unknown Phone',
          address: customerData.fullAddress || customerData.address || 'No address provided'
        },
        quotationData: {
          serviceType: quotationData?.data?.serviceType || 'unknown',
          price: quotationData?.data?.priceBreakdown?.total || 0,
          currency: quotationData?.data?.priceBreakdown?.currency || 'PHP',
          expiresAt: quotationData?.data?.expiresAt || null,
          stops: quotationData?.data?.stops || []
        },
        deliveryDetails: {
          pickupAddress: sessionStorage.getItem('pickupAddress') || '',
          deliveryAddress: sessionStorage.getItem('deliveryAddress') || '',
          estimatedDeliveryTime: quotationData?.data?.estimatedDeliveryTime || null
        },
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      console.log('[LalamoveQuotationManager] Saving data:', dataToStore);
      
      await quotationRef.set(dataToStore);
      console.log('[LalamoveQuotationManager] Quotation stored successfully:', quotationRef.id);
      return quotationRef.id;
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error storing quotation:', error);
      throw error;
    }
  }

  async updateQuotationStatus(quotationId, newStatus) {
    try {
      if (!quotationId) {
        throw new Error('Quotation ID is required');
      }

      const quotationRef = this.db.collection('lalamove_quotations').doc(quotationId);
      
      await quotationRef.update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('[LalamoveQuotationManager] Status updated for quotation:', quotationId);
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error updating status:', error);
      throw error;
    }
  }

  async getQuotation(quotationId) {
    try {
      if (!quotationId) {
        throw new Error('Quotation ID is required');
      }

      const docRef = await this.db.collection('lalamove_quotations').doc(quotationId).get();
      
      if (!docRef.exists) {
        console.log('[LalamoveQuotationManager] No quotation found with ID:', quotationId);
        return null;
      }
      
      return docRef.data();
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error retrieving quotation:', error);
      throw error;
    }
  }
}

// Make the class available globally
window.LalamoveQuotationManager = LalamoveQuotationManager;