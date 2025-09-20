// Restore inventory for cancelled order
async function restoreInventoryForOrder(orderItems) {
    const db = firebase.firestore();
    const batch = db.batch();
    try {
        for (const item of orderItems) {
            let productData = null;
            if (typeof menuItemsData !== 'undefined' && menuItemsData[item.name]) {
                productData = menuItemsData[item.name];
            } else {
                try {
                    const productQuery = await db.collection('menu')
                        .where('name', '==', item.name)
                        .limit(1)
                        .get();
                    if (!productQuery.empty) {
                        productData = productQuery.docs[0].data();
                    }
                } catch (queryError) {
                    continue;
                }
            }
            if (!productData || !productData.ingredients) continue;
            for (const ingredient of productData.ingredients) {
                const docId = ingredient.docId || ingredient.id || ingredient.name;
                const totalIngredientQuantity = (ingredient.quantity || 0) * (item.quantity || 0);
                if (!docId || totalIngredientQuantity === 0) continue;
                const inventoryDoc = db.collection('inventory').doc(docId);
                try {
                    const docSnapshot = await inventoryDoc.get();
                    if (docSnapshot.exists) {
                        const currentData = docSnapshot.data();
                        const currentQuantity = currentData.quantity || 0;
                        const newQuantity = currentQuantity + totalIngredientQuantity;
                        batch.update(inventoryDoc, {
                            quantity: newQuantity,
                            lastUpdated: firebase.firestore.Timestamp.now()
                        });
                    }
                } catch (docError) {
                    continue;
                }
            }
        }
        await batch.commit();
        console.log('Inventory restored for cancelled order');
    } catch (error) {
        console.error('Error restoring inventory:', error);
    }
}
