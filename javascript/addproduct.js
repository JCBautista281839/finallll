document.addEventListener('DOMContentLoaded', function () {
    console.log('Add Product page loaded, initializing Firebase...');


    let selectedIngredients = [];
    let currentIngredient = null;


    function waitForFirebase() {

        if (window.isFirebaseReady && window.isFirebaseReady()) {
            console.log('Firebase is ready from main.js!');
            initializeAddProduct();
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('Firebase is ready!');
            initializeAddProduct();
        } else {
            console.log('Firebase not ready yet, waiting...');
            setTimeout(waitForFirebase, 100);
        }
    }

    function initializeAddProduct() {
        console.log('Initializing add product system...');


        const auth = firebase.auth();
        const db = firebase.firestore();


        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User authenticated:', user.email);
                loadInventoryIngredients();
                setupEventListeners();
                setupLogout();
            } else {
                console.log('No user authenticated, redirecting to login...');
                window.location.href = '/index.html';
            }
        });
    }

    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();

                firebase.auth().signOut().then(() => {
                    console.log('User signed out successfully');
                    window.location.href = '../index.html';
                }).catch((error) => {
                    console.error('Sign out error:', error);

                    window.location.href = '../index.html';
                });
            });
        }
    }

    function loadInventoryIngredients() {
        console.log('Loading inventory ingredients from Firebase...');
        const ingredientsTags = document.getElementById('ingredientsTags');

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

                // Enable search after tags are rendered
                setupIngredientSearch();

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


        const stock = data.quantity || 0;
        let statusClass = '';
        let statusText = '';

        if (stock === 0) {
            statusClass = 'empty';
            statusText = 'Empty';
        } else if (stock >= 1 && stock <= 5) {
            statusClass = 'restock';
            statusText = 'Low Stock';
        } else if (stock >= 6) {
            statusClass = 'steady';
            statusText = 'In Stock';
        }


        button.innerHTML = `
            <div class="ingredient-tag-content">
                <div class="ingredient-name">${data.name}</div>
                <div class="ingredient-stock">
                    <span class="stock-amount">${stock} ${data.unitOfMeasure || 'units'}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;


        button.addEventListener('click', function (e) {
            // Pass the clicked tag element so the detail card is positioned below it
            showIngredientDetail(docId, data, button);
        });

        return button;
    }

    function showIngredientDetail(docId, data, anchorElement) {
        const detailCard = document.getElementById('ingredientDetailCard');
        const detailTitle = document.getElementById('ingredientDetailTitle');
        const quantityInput = document.getElementById('ingredientQuantity');
        const unitText = document.querySelector('.unit-text');

        if (!detailCard || !detailTitle || !quantityInput || !unitText) {
            console.error('Ingredient detail elements not found');
            return;
        }


        currentIngredient = {
            docId: docId,
            name: data.name,
            unitOfMeasure: data.unitOfMeasure || 'pieces'
        };


        detailTitle.textContent = data.name;
        quantityInput.value = '1';
        unitText.textContent = data.unitOfMeasure || 'pieces';


        detailCard.style.display = 'block';

        // Position the detail card right after the clicked tag when possible
        try {
            const tagsContainer = document.getElementById('ingredientsTags');
            const ingredientsPanel = tagsContainer ? tagsContainer.closest('.ingredients-panel') : null;

            if (anchorElement) {
                // If the tags container is a grid, insert the card as a grid child so it can span the row
                const tagsContainer = document.getElementById('ingredientsTags');
                if (tagsContainer) {
                    // Determine the visible children (ignore no-match placeholder)
                    const children = Array.from(tagsContainer.children).filter(c => !c.classList || !c.classList.contains('no-ingredient-match'));
                    const idx = children.indexOf(anchorElement);
                    // Default to appending if index not found
                    let insertBefore = null;
                    const computedStyle = window.getComputedStyle(tagsContainer);
                    let columns = 1;
                    try {
                        const cols = computedStyle.getPropertyValue('grid-template-columns');
                        if (cols) columns = cols.split(' ').length || 1;
                    } catch (e) {
                        columns = 2; // fallback
                    }

                    const row = Math.floor(Math.max(0, idx) / columns);
                    const insertIndex = (row + 1) * columns; // position after the row
                    if (insertIndex < children.length) {
                        insertBefore = children[insertIndex];
                    }

                    // Ensure the detail card is a child of the tagsContainer and spans full width
                    detailCard.style.gridColumn = '1 / -1';
                    detailCard.style.width = 'auto';
                    detailCard.style.marginTop = '8px';

                    if (insertBefore) tagsContainer.insertBefore(detailCard, insertBefore);
                    else tagsContainer.appendChild(detailCard);

                    // Scroll the ingredients panel to make the card visible but avoid jumping to bottom
                    if (ingredientsPanel) {
                        const cardOffset = detailCard.offsetTop - ingredientsPanel.offsetTop;
                        const panelTop = ingredientsPanel.scrollTop;
                        const panelHeight = ingredientsPanel.clientHeight;
                        if (cardOffset > panelTop + panelHeight - 40) {
                            ingredientsPanel.scrollTo({ top: Math.max(0, cardOffset - 40), behavior: 'smooth' });
                        } else if (cardOffset < panelTop) {
                            ingredientsPanel.scrollTo({ top: Math.max(0, cardOffset - 12), behavior: 'smooth' });
                        }
                    } else {
                        detailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                } else if (anchorElement.insertAdjacentElement) {
                    // fallback: insert after anchor
                    anchorElement.insertAdjacentElement('afterend', detailCard);
                }
            } else if (tagsContainer && tagsContainer.parentNode) {
                // Fallback: place after tags container (older behavior)
                tagsContainer.parentNode.insertBefore(detailCard, tagsContainer.nextSibling);
                if (ingredientsPanel) {
                    const offset = detailCard.offsetTop - ingredientsPanel.offsetTop - 12;
                    ingredientsPanel.scrollTo({ top: offset, behavior: 'smooth' });
                }
            }
        } catch (e) {
            console.warn('Could not reposition or scroll ingredient detail card:', e);
        }

        document.querySelectorAll('.ingredient-tag').forEach(tag => {
            tag.classList.remove('active');
            if (tag.getAttribute('data-ingredient') === data.name) {
                tag.classList.add('active');
            }
        });
    }

    function setupEventListeners() {

        const addIngredientBtn = document.getElementById('addIngredientBtn');
        if (addIngredientBtn) {
            addIngredientBtn.addEventListener('click', addIngredientToProduct);
        }


        const saveProductBtn = document.getElementById('saveProductBtn');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', saveProductToFirebase);
        }


        const closeIngredientBtn = document.getElementById('btnCloseIngredient');
        if (closeIngredientBtn) {
            closeIngredientBtn.addEventListener('click', closeIngredientDetail);
        }


        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        }


        setupPhotoUpload();


        const testCloudinaryBtn = document.getElementById('testCloudinaryBtn');
        if (testCloudinaryBtn) {
            testCloudinaryBtn.addEventListener('click', function () {
                console.log('🧪 Testing Cloudinary connection...');
                if (window.cloudinaryWidget) {
                    console.log('✅ Cloudinary widget available');
                    showMessage('Cloudinary is ready! Click photo area to upload.', 'success');
                } else if (window.cloudinaryUtils) {
                    console.log('✅ Cloudinary utils available');
                    showMessage('Cloudinary is ready! Click photo area to upload.', 'success');
                } else {
                    console.log('❌ Cloudinary not available');
                    showMessage('Cloudinary not ready. Check console for details.', 'error');
                }
            });
        }
    }

    function setupPhotoUpload() {
        const photoPreview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const changePhotoBtn = document.getElementById('changePhotoBtn');

        if (photoPreview && previewImage && uploadPlaceholder && changePhotoBtn) {

            console.log('Photo upload setup complete - handled by cloud.js');
        }
    }

    function addIngredientToProduct() {
        if (!currentIngredient) {
            showMessage('Please select an ingredient first.', 'error');
            return;
        }

        const quantityInput = document.getElementById('ingredientQuantity');
        const unitText = document.querySelector('.unit-text');
        if (!quantityInput || !unitText) {
            console.error('Quantity input or unit text not found');
            return;
        }

        const quantity = parseFloat(quantityInput.value);
        let unit = unitText.textContent.trim().toLowerCase();
        // Normalize unit to short form for conversion logic
        const unitMap = {
            'kilograms': 'kg',
            'kg': 'kg',
            'grams': 'g',
            'g': 'g',
            'liters': 'l',
            'liter': 'l',
            'l': 'l',
            'milliliters': 'ml',
            'milliliter': 'ml',
            'ml': 'ml',
            'pieces': 'pcs',
            'piece': 'pcs',
            'pcs': 'pcs',
            // Add more mappings if you want to support cups, tbsp, tsp, etc.
        };
        unit = unitMap[unit] || unit;
        if (isNaN(quantity) || quantity <= 0) {
            showMessage('Please enter a valid quantity.', 'error');
            return;
        }

        // Always store both display and base unit/quantity for deduction
        let baseUnit = 'g';
        if (unit.toLowerCase().includes('g')) baseUnit = 'g';
        else if (unit.toLowerCase().includes('l')) baseUnit = 'ml';
        else if (unit.toLowerCase().includes('ml')) baseUnit = 'ml';
        else if (unit.toLowerCase().includes('pcs') || unit.toLowerCase().includes('piece')) baseUnit = 'pcs';
        let quantityBase = quantity;
        if (typeof window.convertToBase === 'function') {
            quantityBase = window.convertToBase(quantity, unit);
        }

        const existingIndex = selectedIngredients.findIndex(ing => ing.docId === currentIngredient.docId);
        if (existingIndex !== -1) {
            selectedIngredients[existingIndex].quantity = quantity;
            selectedIngredients[existingIndex].unit = unit;
            selectedIngredients[existingIndex].quantityBase = quantityBase;
            selectedIngredients[existingIndex].baseUnit = baseUnit;
            showMessage(`Updated ${currentIngredient.name} quantity to ${quantity} ${unit}`, 'info');
        } else {
            selectedIngredients.push({
                docId: currentIngredient.docId,
                name: currentIngredient.name,
                quantity: quantity,
                unit: unit,
                quantityBase: quantityBase,
                baseUnit: baseUnit
            });
            showMessage(`Added ${currentIngredient.name} to product`, 'success');
        }

        updateIngredientsTable();
        closeIngredientDetail();
        if (quantityInput) {
            quantityInput.value = '1';
        }
    }

    function updateIngredientsTable() {
        const tbody = document.getElementById('ingredientsTableBody');
        if (!tbody) {
            console.error('Ingredients table body not found');
            return;
        }
        tbody.innerHTML = '';
        if (selectedIngredients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No ingredients added yet</td></tr>';
            return;
        }
        // Sort ingredients alphabetically by name
        const sortedIngredients = [...selectedIngredients].sort((a, b) => a.name.localeCompare(b.name));
        sortedIngredients.forEach((ingredient, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td>${ingredient.quantity} ${ingredient.unit}</td>
                <td>${ingredient.quantityBase} ${ingredient.baseUnit}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeIngredient(${selectedIngredients.findIndex(i => i.docId === ingredient.docId)})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function removeIngredient(index) {
        if (index >= 0 && index < selectedIngredients.length) {
            const removed = selectedIngredients.splice(index, 1)[0];
            showMessage(`Removed ${removed.name} from product`, 'info');
            updateIngredientsTable();
        }
    }


    window.removeIngredient = removeIngredient;

    function closeIngredientDetail() {
        const detailCard = document.getElementById('ingredientDetailCard');
        if (detailCard) {
            detailCard.style.display = 'none';
        }


        document.querySelectorAll('.ingredient-tag').forEach(tag => {
            tag.classList.remove('active');
        });

        currentIngredient = null;
    }

    function saveProductToFirebase() {
        const name = document.getElementById('addProductName').value.trim();
        const category = document.getElementById('addProductCategory').value;
        const price = parseFloat(document.getElementById('addProductPrice').value);
        const description = document.getElementById('addProductDescription').value.trim();
        const photoPreview = document.getElementById('previewImage');


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
        if (selectedIngredients.length === 0) {
            showMessage('Please add at least one ingredient.', 'error');
            return;
        }


        const saveBtn = document.getElementById('saveProductBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const db = firebase.firestore();
        const batch = db.batch();


        const productData = {
            name: name,
            category: category,
            price: price,
            description: description || '',
            available: true,
            ingredients: selectedIngredients,
            photoUrl: window.cloudinaryUtils && window.cloudinaryUtils.getPhotoUrl ? window.cloudinaryUtils.getPhotoUrl() : (photoPreview && photoPreview.style.display !== 'none' ? photoPreview.src : null),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };


        const productRef = db.collection('menu').doc();
        batch.set(productRef, productData);



        // --- Use inventory.js conversion helpers to always deduct in base units ---
        // Assumes inventory.js is loaded globally (functions: convertToBase, deductInventoryBase)
        selectedIngredients.forEach(ingredient => {
            const inventoryRef = db.collection('inventory').doc(ingredient.docId);
            if (ingredient.docId) {
                // Find the inventory item in the DOM or cache (or fetch if needed)
                // For simplicity, assume ingredient.unit is the user-entered unit (could be kg, g, L, ml, pcs)
                // We need to convert to base unit for deduction
                // We'll store the deduction in base units (g, ml, pcs)
                let deductionInBase = ingredient.quantity;
                let baseUnit = 'g';
                if (ingredient.unit) {
                    // Determine base unit from unit
                    if (ingredient.unit.toLowerCase().includes('g')) baseUnit = 'g';
                    else if (ingredient.unit.toLowerCase().includes('l')) baseUnit = 'ml';
                    else if (ingredient.unit.toLowerCase().includes('ml')) baseUnit = 'ml';
                    else if (ingredient.unit.toLowerCase().includes('pcs') || ingredient.unit.toLowerCase().includes('piece')) baseUnit = 'pcs';
                }
                if (typeof window.convertToBase === 'function') {
                    deductionInBase = window.convertToBase(ingredient.quantity, ingredient.unit);
                }
                batch.update(inventoryRef, {
                    quantity: firebase.firestore.FieldValue.increment(-deductionInBase),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });


        batch.commit()
            .then(() => {
                console.log('Product saved successfully to Firebase');
                showMessage('Product saved successfully! Redirecting to menu...', 'success');


                resetForm();


                setTimeout(() => {
                    window.location.href = '/html/menu.html';
                }, 2000);
            })
            .catch((error) => {
                console.error('Error saving product:', error);
                showMessage('Error saving product. Please try again.', 'error');


                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            });
    }

    function resetForm() {

        document.getElementById('addProductName').value = '';
        document.getElementById('addProductCategory').value = '';
        document.getElementById('addProductPrice').value = '';
        document.getElementById('addProductDescription').value = '';


        const previewImage = document.getElementById('previewImage');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const changePhotoBtn = document.getElementById('changePhotoBtn');

        if (previewImage && uploadPlaceholder && changePhotoBtn) {
            previewImage.style.display = 'none';
            uploadPlaceholder.style.display = 'block';
            changePhotoBtn.style.display = 'none';
        }


        selectedIngredients = [];
        updateIngredientsTable();
        closeIngredientDetail();
    }

    function logout() {
        const auth = firebase.auth();
        auth.signOut()
            .then(() => {
                console.log('User logged out successfully');
                window.location.href = '/index.html';
            })
            .catch((error) => {
                console.error('Error logging out:', error);
                showMessage('Error logging out. Please try again.', 'error');
            });
    }

    function showMessage(message, type = 'info') {

        const existingMessage = document.querySelector('.addproduct-message');
        if (existingMessage) {
            existingMessage.remove();
        }


        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} addproduct-message`;
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


    window.removeIngredient = removeIngredient;


    function setupUnitSelection() {
        document.querySelectorAll('.unit-measure-dropdown .dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedUnit = e.target.textContent;
                e.target.closest('.unit-measure-dropdown').querySelector('.unit-text').textContent = selectedUnit;
            });
        });
    }


    setupUnitSelection();


    waitForFirebase();
});

// --- SCAN FIREBASE FOR EMPTY INGREDIENTS ---
async function getEmptyIngredients() {
    const db = firebase.firestore();
    const emptyIngredients = [];
    const snapshot = await db.collection('inventory').where('quantity', '==', 0).get();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name) emptyIngredients.push(data.name);
    });
    return emptyIngredients;
}
// Example usage:
// getEmptyIngredients().then(list => console.log('Empty ingredients:', list));

// --- INGREDIENT SEARCH FUNCTIONALITY ---
function setupIngredientSearch() {
    const searchInput = document.querySelector('.ingredients-search input[type="text"]');
    const tagsContainer = document.getElementById('ingredientsTags');
    if (!searchInput || !tagsContainer) return;

    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.trim().toLowerCase();
        // Show/hide ingredient tags based on search
        tagsContainer.querySelectorAll('.ingredient-tag').forEach(tag => {
            const name = tag.getAttribute('data-ingredient') || '';
            if (name.toLowerCase().includes(searchTerm)) {
                tag.style.display = '';
            } else {
                tag.style.display = 'none';
            }
        });
        // Optionally show a message if nothing matches
        const anyVisible = Array.from(tagsContainer.querySelectorAll('.ingredient-tag')).some(tag => tag.style.display !== 'none');
        let noMatch = tagsContainer.querySelector('.no-ingredient-match');
        if (!anyVisible) {
            if (!noMatch) {
                noMatch = document.createElement('div');
                noMatch.className = 'text-center text-muted py-3 no-ingredient-match';
                noMatch.textContent = 'No matching ingredients found';
                tagsContainer.appendChild(noMatch);
            }
        } else if (noMatch) {
            noMatch.remove();
        }
    });
}

// Call after DOM and tags are loaded
// ...existing code...
setupIngredientSearch();
// After loadInventoryIngredients() in initializeAddProduct or after tags are rendered:
// setupIngredientSearch();
