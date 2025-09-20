document.addEventListener('DOMContentLoaded', function() {
    console.log('Edit Product page loaded, initializing Firebase...');
    
   
    let currentProductId = null;
    let selectedIngredients = [];
    let currentIngredient = null;
    
   
    function waitForFirebase() {
        if (window.isFirebaseReady && window.isFirebaseReady()) {
            console.log('Firebase is ready from main.js!');
            initializeEditProduct();
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('Firebase is ready!');
            initializeEditProduct();
        } else {
            console.log('Firebase not ready yet, waiting...');
            setTimeout(waitForFirebase, 100);
        }
    }

    function initializeEditProduct() {
        console.log('Initializing edit product system...');
        
       
        const auth = firebase.auth();
        const db = firebase.firestore();
        
       
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User authenticated:', user.email);
                loadProductData();
                loadInventoryIngredients();
                setupEventListeners();
            } else {
                console.log('No user authenticated, redirecting to login...');
                window.location.href = '/index.html';
            }
        });
    }

    function loadProductData() {
       
        const urlParams = new URLSearchParams(window.location.search);
        currentProductId = urlParams.get('id');
        
        if (!currentProductId) {
            showMessage('No product ID provided. Redirecting to menu...', 'error');
            setTimeout(() => {
                window.location.href = '/html/menu.html';
            }, 2000);
            return;
        }

        console.log('Loading product data for ID:', currentProductId);
        
       
        const db = firebase.firestore();
        
        db.collection('menu').doc(currentProductId).get()
            .then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log('Product data loaded:', data);
                    
                   
                    document.getElementById('editProductName').value = data.name || '';
                    document.getElementById('editProductCategory').value = data.category || '';
                    document.getElementById('editProductPrice').value = data.price || '';
                    
                   
                    selectedIngredients = data.ingredients || [];
                    updateIngredientsTable();
                    
                } else {
                    showMessage('Product not found. Redirecting to menu...', 'error');
                    setTimeout(() => {
                        window.location.href = '/html/menu.html';
                    }, 2000);
                }
            })
            .catch((error) => {
                console.error('Error loading product:', error);
                showMessage('Error loading product data. Please try again.', 'error');
            });
    }

    function loadInventoryIngredients() {
        console.log('Loading inventory ingredients from Firebase...');
        const ingredientsTags = document.getElementById('ingredientTags');
        
        if (!ingredientsTags) {
            console.error('Ingredients tags container not found');
            return;
        }

       
        ingredientsTags.innerHTML = '<div class="text-center text-muted py-3"><i class="fas fa-spinner fa-spin"></i> Loading ingredients...</div>';

       
        const db = firebase.firestore();
        
        db.collection('inventory').get()
            .then((querySnapshot) => {
                console.log('Firebase inventory query completed, documents found:', querySnapshot.size);
                
                if (querySnapshot.empty) {
                    console.log('Inventory collection is empty');
                    ingredientsTags.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-box-open fa-2x mb-2"></i>
                            <p>No ingredients found in inventory</p>
                            <small>Add ingredients to inventory first</small>
                        </div>
                    `;
                    return;
                }

               
                // Collect all ingredients into an array
                let ingredientDocs = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    ingredientDocs.push({ docId: doc.id, data });
                });
                // Sort alphabetically by name
                ingredientDocs.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));

                ingredientsTags.innerHTML = '';
                ingredientDocs.forEach(({ docId, data }) => {
                    const ingredientTag = createIngredientTag(docId, data);
                    ingredientsTags.appendChild(ingredientTag);
                });

                console.log('Inventory ingredients loaded successfully!');
            })
            .catch((error) => {
                console.error('Error loading inventory ingredients:', error);
                ingredientsTags.innerHTML = '<div class="text-center text-danger py-3">Error loading ingredients. Please try again.</div>';
            });
    }

    function createIngredientTag(docId, data) {
        const button = document.createElement('button');
        button.className = 'ingredient-tag';
        button.setAttribute('data-ingredient', data.name);
        button.setAttribute('data-doc-id', docId);
        button.textContent = data.name;
        
        button.addEventListener('click', () => {
           
            document.querySelectorAll('.ingredient-tag').forEach(tag => tag.classList.remove('active'));
            button.classList.add('active');
            
           
            showIngredientDetail(data.name, data.unit || 'pieces', docId);
        });
        
        return button;
    }

    function showIngredientDetail(name, unit, docId) {
        currentIngredient = { name, unit, docId };
        
        document.getElementById('ingredientDetailTitle').textContent = name;
        document.querySelector('.unit-text').textContent = unit;
        document.getElementById('ingredientQuantity').value = '1';
        
        const detailCard = document.getElementById('ingredientDetailCard');
        detailCard.style.display = 'block';
    }

    function setupEventListeners() {
       
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveProductChanges);
        }

       
        const deleteBtn = document.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteProduct);
        }

       
        const btnCloseIngredient = document.getElementById('btnCloseIngredient');
        if (btnCloseIngredient) {
            btnCloseIngredient.addEventListener('click', closeIngredientDetail);
        }

       
        const addIngredientBtn = document.querySelector('.ingredient-detail-form .btn-success');
        if (addIngredientBtn) {
            addIngredientBtn.addEventListener('click', addIngredientToProduct);
        }

       
        const searchInput = document.querySelector('.ingredients-search input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const tags = document.querySelectorAll('.ingredient-tag');

                tags.forEach(tag => {
                    const ingredientName = tag.textContent.toLowerCase();
                    if (ingredientName.includes(searchTerm)) {
                        tag.style.display = '';
                    } else {
                        tag.style.display = 'none';
                    }
                });
            });
    }

       
    document.querySelectorAll('.unit-measure-dropdown .dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedUnit = e.target.textContent;
            e.target.closest('.unit-measure-dropdown').querySelector('.unit-text').textContent = selectedUnit;
        });
    });
    }

    function saveProductChanges() {
        if (!currentProductId) {
            showMessage('No product selected for editing.', 'error');
            return;
        }

        const name = document.getElementById('editProductName').value.trim();
        const category = document.getElementById('editProductCategory').value;
        const price = parseFloat(document.getElementById('editProductPrice').value);

       
        if (!name) {
            showMessage('Please enter a product name.', 'error');
            return;
        }
        if (!category) {
            showMessage('Please select a category.', 'error');
            return;
        }
        if (isNaN(price) || price < 0) {
            showMessage('Please enter a valid price.', 'error');
            return;
        }

       
        const saveBtn = document.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

       
        const db = firebase.firestore();
        
        const updateData = {
            name: name,
            category: category,
            price: price,
            ingredients: selectedIngredients,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('menu').doc(currentProductId).update(updateData)
            .then(() => {
                console.log('Product updated successfully in Firebase');
                showMessage('Product updated successfully! Redirecting to menu...', 'success');
                
               
                setTimeout(() => {
                    window.location.href = '/html/menu.html';
                }, 2000);
            })
            .catch((error) => {
                console.error('Error updating product:', error);
                showMessage('Error updating product. Please try again.', 'error');
                
               
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            });
    }

    function deleteProduct() {
        if (!currentProductId) {
            showMessage('No product selected for deletion.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }

       
        const deleteBtn = document.querySelector('.delete-btn');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'Deleting...';
        deleteBtn.disabled = true;

       
        const db = firebase.firestore();
        
        db.collection('menu').doc(currentProductId).delete()
            .then(() => {
                console.log('Product deleted successfully from Firebase');
                showMessage('Product deleted successfully! Redirecting to menu...', 'success');
                
               
                setTimeout(() => {
                    window.location.href = '/html/menu.html';
                }, 2000);
            })
            .catch((error) => {
                console.error('Error deleting product:', error);
                showMessage('Error deleting product. Please try again.', 'error');
                
               
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            });
    }

    function addIngredientToProduct() {
        if (!currentIngredient) {
            showMessage('No ingredient selected.', 'error');
                return;
            }
            
        const quantity = parseFloat(document.getElementById('ingredientQuantity').value);
        const unit = document.querySelector('.unit-text').textContent;

        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Please enter a valid quantity.', 'error');
                return;
            }

       
        const existingIndex = selectedIngredients.findIndex(ing => ing.name === currentIngredient.name);
        
        if (existingIndex !== -1) {
           
            selectedIngredients[existingIndex].quantity = quantity;
            selectedIngredients[existingIndex].unit = unit;
        } else {
           
            selectedIngredients.push({
                name: currentIngredient.name,
                quantity: quantity,
                unit: unit,
                docId: currentIngredient.docId
            });
        }

        updateIngredientsTable();
        closeIngredientDetail();
        showMessage('Ingredient added to product.', 'success');
    }

    function updateIngredientsTable() {
        const tbody = document.getElementById('ingredientsTableBody');
        
        if (!tbody) return;

       
        tbody.innerHTML = '';

        if (selectedIngredients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No ingredients added</td></tr>';
            return;
        }

       
        // Sort ingredients alphabetically by name
        const sortedIngredients = [...selectedIngredients].sort((a, b) => a.name.localeCompare(b.name));
        sortedIngredients.forEach((ingredient, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td>${ingredient.quantity}</td>
                <td>${ingredient.unit}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function closeIngredientDetail() {
        const detailCard = document.getElementById('ingredientDetailCard');
        if (detailCard) {
            detailCard.style.display = 'none';
        }
        currentIngredient = null;
        
       
        document.querySelectorAll('.ingredient-tag').forEach(tag => tag.classList.remove('active'));
    }

    function showMessage(message, type = 'info') {
       
        const existingMessage = document.querySelector('.editproduct-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
       
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} editproduct-message`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        messageDiv.innerHTML = `
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
       
        document.body.appendChild(messageDiv);
        
       
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

   
    waitForFirebase();

    // --- INGREDIENTS GRID UI ---
async function renderIngredientsGrid() {
    const db = firebase.firestore();
    const container = document.getElementById('ingredientsGrid');
    if (!container) return;
    container.innerHTML = '<div class="text-center text-muted">Loading ingredients...</div>';
    const snapshot = await db.collection('inventory').get();
    let html = '<div class="ingredients-grid">';
    snapshot.forEach(doc => {
        const data = doc.data();
        const isEmpty = (data.quantity === 0);
        html += `<div class="ingredient-card${isEmpty ? ' empty' : ''}">
            <div class="ingredient-name">${data.name || ''}</div>
            <div class="ingredient-qty">${data.quantity || 0} ${data.unitOfMeasure || ''}</div>
            <span class="ingredient-status ${isEmpty ? 'empty' : 'in-stock'}">${isEmpty ? 'EMPTY' : 'IN STOCK'}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}
// Call this on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(renderIngredientsGrid, 500);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(renderIngredientsGrid, 500);
    });
}
// --- CSS for grid ---
const style = document.createElement('style');
style.innerHTML = `
.ingredients-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 20px;
}
.ingredient-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 2px solid #e3eafc;
  transition: border 0.2s, box-shadow 0.2s;
}
.ingredient-card.empty {
  border: 2px solid #e3f7f3;
  background: #f8fffa;
}
.ingredient-name {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 6px;
}
.ingredient-qty {
  font-size: 1rem;
  color: #888;
  margin-bottom: 8px;
}
.ingredient-status {
  font-size: 0.95rem;
  font-weight: 600;
  padding: 3px 14px;
  border-radius: 8px;
  margin-top: 2px;
  background: #e3f7f3;
  color: #e53935;
  display: inline-block;
}
.ingredient-status.in-stock {
  background: #e3f7f3;
  color: #2ecc71;
}
.ingredient-status.empty {
  background: #ffeaea;
  color: #e53935;
}
`;
document.head.appendChild(style);

// --- CONNECT INGREDIENTS TO INVENTORY ---
async function getInventoryIngredients() {
    const db = firebase.firestore();
    const snapshot = await db.collection('inventory').get();
    const ingredients = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        ingredients.push({
            id: doc.id,
            name: data.name,
            quantity: data.quantity,
            unitOfMeasure: data.unitOfMeasure
        });
    });
    return ingredients;
}
// Example usage:
// getInventoryIngredients().then(list => console.log(list));
// Use this to populate ingredient selectors or grids in editproduct.js

// --- RENDER INGREDIENTS SELECTOR LIKE ADDPRODUCT.HTML ---
async function renderIngredientsSelector() {
    const container = document.getElementById('ingredientsSelector');
    if (!container) return;
    container.innerHTML = '<div class="text-center text-muted">Loading ingredients...</div>';
    const ingredients = await getInventoryIngredients();
    let html = '<div class="ingredients-selector-list">';
    ingredients.forEach(ing => {
        html += `<label class="ingredient-select-item">
            <input type="checkbox" name="productIngredients" value="${ing.name}" ${ing.quantity === 0 ? 'disabled' : ''}>
            <span class="ingredient-name">${ing.name}</span>
            <span class="ingredient-qty">${ing.quantity} ${ing.unitOfMeasure || ''}</span>
            <span class="ingredient-status ${ing.quantity === 0 ? 'empty' : 'in-stock'}">${ing.quantity === 0 ? 'EMPTY' : 'IN STOCK'}</span>
        </label>`;
    });
    html += '</div>';
    container.innerHTML = html;
}
// Call this on page load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(renderIngredientsSelector, 500);
} else {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(renderIngredientsSelector, 500);
    });
}
// --- CSS for selector ---
const styleSelector = document.createElement('style');
styleSelector.innerHTML = `
.ingredients-selector-list {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 18px;
}
.ingredient-select-item {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 2px solid #e3eafc;
  min-width: 140px;
  position: relative;
}
.ingredient-select-item input[type='checkbox'] {
  margin-bottom: 8px;
}
.ingredient-select-item .ingredient-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}
.ingredient-select-item .ingredient-qty {
  font-size: 0.98rem;
  color: #888;
  margin-bottom: 6px;
}
.ingredient-select-item .ingredient-status {
  font-size: 0.92rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 8px;
  margin-top: 2px;
  background: #e3f7f3;
  color: #2ecc71;
  display: inline-block;
}
.ingredient-select-item .ingredient-status.empty {
  background: #ffeaea;
  color: #e53935;
}
.ingredient-select-item input[type='checkbox']:disabled + .ingredient-name {
  color: #bbb;
}
`;
document.head.appendChild(styleSelector);

// --- PREVENT ADDING PRODUCTS WITH EMPTY INGREDIENTS ---
async function validateIngredientsBeforeSave() {
    // Get selected ingredients from the selector
    const selected = Array.from(document.querySelectorAll('input[name="productIngredients"]:checked')).map(i => i.value);
    if (selected.length === 0) return true; // No ingredients selected, allow
    // Get empty ingredients from inventory
    const emptyIngredients = await getEmptyIngredients();
    // If any selected ingredient is empty, prevent save
    const hasEmpty = selected.some(ing => emptyIngredients.includes(ing));
    if (hasEmpty) {
        alert('Cannot add product: One or more selected ingredients are out of stock in inventory.');
        return false;
    }
    return true;
}
// Example usage: Call validateIngredientsBeforeSave() before saving product
});
