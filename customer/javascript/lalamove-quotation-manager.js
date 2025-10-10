// lalamove-quotation-manager.js
// Handles storing and managing Lalamove quotations in Firestore

class LalamoveQuotationManager {
  constructor() {
    this.db = firebase.firestore();
  }

  async storeQuotation(quotationData, orderData) {
    try {
      const quotationRef = this.db.collection('lalamove_quotations').doc();
      
      await quotationRef.set({
        quotationId: quotationData.data.quotationId,
        orderId: orderData.orderId,
        customerInfo: {
          name: orderData.customerInfo.fullName,
          email: orderData.customerInfo.email,
          phone: orderData.customerInfo.phone,
          address: orderData.shippingInfo.address
        },
        quotationData: {
          serviceType: quotationData.data.serviceType,
          price: quotationData.data.priceBreakdown.total,
          currency: quotationData.data.priceBreakdown.currency,
          expiresAt: quotationData.data.expiresAt
        },
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('[LalamoveQuotationManager] Quotation stored successfully:', quotationRef.id);
      return quotationRef.id;
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error storing quotation:', error);
      throw error;
    }
  }

  async updateQuotationStatus(quotationId, status) {
    try {
      const quotationRef = this.db.collection('lalamove_quotations').doc(quotationId);
      await quotationRef.update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log('[LalamoveQuotationManager] Quotation status updated:', status);
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error updating quotation status:', error);
      throw error;
    }
  }

  async getQuotation(quotationId) {
    try {
      const doc = await this.db.collection('lalamove_quotations').doc(quotationId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('[LalamoveQuotationManager] Error getting quotation:', error);
      throw error;
    }
  }
}