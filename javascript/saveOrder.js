async function saveOrderToFirebase(orderData) {
    try {
        const db = firebase.firestore();
        
        // Format the order number to be 4 digits (e.g., 0001)
        const orderNumberFormatted = orderData.orderNumber.toString();
        
        // Always recalculate total before saving
        const subtotal = parseFloat(orderData.subtotal) || 0;
        const tax = parseFloat(orderData.tax) || 0;
        const discount = parseFloat(orderData.discount) || 0;
        const total = subtotal + tax - discount;
        // Add additional fields for the order
        const orderToSave = {
            ...orderData,
            total: total,
            orderNumberFormatted,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'completed'  // or 'processing' based on your workflow
        };

        // Save to Firestore
        await db.collection('orders').add(orderToSave);
        console.log('Order saved successfully:', orderNumberFormatted);
        
    } catch (error) {
        console.error('Error saving order:', error);
        throw error;  // Re-throw to handle in the calling function
    }
}
