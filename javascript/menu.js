document.addEventListener('DOMContentLoaded', function () {
    // Category filter dropdown logic
    const filterBtn = document.getElementById('filterBtn');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const menuTableBody = document.getElementById('menuTableBody');
    if (filterBtn && categoryDropdown) {
        filterBtn.addEventListener('click', function (e) {
            e.preventDefault();
            categoryDropdown.style.display = categoryDropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', function (e) {
            if (!categoryDropdown.contains(e.target) && e.target !== filterBtn) {
                categoryDropdown.style.display = 'none';
            }
        });
        categoryDropdown.addEventListener('click', function (e) {
            if (e.target.classList.contains('dropdown-item')) {
                const selectedCategory = e.target.getAttribute('data-category');
                filterMenuByCategory(selectedCategory);
                categoryDropdown.style.display = 'none';
            }
        });
    }

    function filterMenuByCategory(category) {
        // Restore hidden rows if 'No products registered' message is present
        const noProductsRow = menuTableBody.querySelector('.no-products-row');
        if (noProductsRow) {
            noProductsRow.remove();
        }
        const rows = document.querySelectorAll('#menuTableBody tr[data-doc-id]');
        let found = false;
        const selected = category.toLowerCase();
        rows.forEach(row => {
            const categoryCell = row.querySelector('.category-badge');
            const cat = categoryCell ? categoryCell.textContent.toLowerCase() : '';
            if (selected === 'all' || cat === selected) {
                row.style.display = '';
                found = true;
            } else {
                row.style.display = 'none';
            }
        });
        // If no products found, show message
        if (!found) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan='4' class='text-center text-muted no-products-row'>No products registered</td>`;
            menuTableBody.appendChild(tr);
        }
    }
    console.log('Menu page loaded, initializing Firebase...');


    function waitForFirebase() {

        if (window.isFirebaseReady && window.isFirebaseReady()) {
            console.log('Firebase is ready from main.js!');
            initializeMenu();
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('Firebase is ready!');
            initializeMenu();
        } else {
            console.log('Firebase not ready yet, waiting...');
            setTimeout(waitForFirebase, 100);
        }
    }

    function initializeMenu() {
        console.log('Initializing menu system...');


        const auth = firebase.auth();
        const db = firebase.firestore();


        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('User authenticated:', user.email);
                loadMenuFromFirebase();
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

    function loadMenuFromFirebase() {
        console.log('Loading menu from Firebase...');
        const tbody = document.getElementById('menuTableBody');

        if (!tbody) {
            console.error('Menu table body not found');
            return;
        }


        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading menu from Firebase...</td></tr>';


        const db = firebase.firestore();


        db.collection('menu').orderBy('createdAt', 'desc').onSnapshot((querySnapshot) => {
            console.log('Firebase query completed, documents found:', querySnapshot.size);

            if (querySnapshot.empty) {
                console.log('Collection is empty');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted py-4">
                            <div class="empty-state">
                                <i class="fas fa-utensils fa-3x mb-3 text-muted"></i>
                                <h5 class="text-muted">No Menu Items Found</h5>
                                <p class="text-muted mb-3">Your menu is currently empty.</p>
                                <button class="btn btn-primary btn-sm" onclick="document.getElementById('editBtn').click()">
                                    <i class="fas fa-plus me-2"></i>Add Your First Item
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                updateRegisteredItemsCount(0);
                return;
            }


            tbody.innerHTML = '';

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Document data:', data);

                const row = createMenuRow(doc.id, data);
                tbody.appendChild(row);
            });

            updateRegisteredItemsCount(querySnapshot.size);
            console.log('Menu loaded successfully!');
        }, (error) => {
            console.error('Error loading menu:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading menu. Please try again.</td></tr>';
        });
    }

    function createMenuRow(docId, data) {
        const row = document.createElement('tr');
        row.setAttribute('data-doc-id', docId);


        let imageHtml = '';
        if (data.photoUrl) {
            imageHtml = `
                <div class="product-image-container">
                    <img src="${data.photoUrl}" alt="${data.name || 'Product'}" class="product-image" 
                         onerror="this.src='../src/Icons/menu.png'; this.classList.add('fallback-image');">
                </div>
            `;
        } else {
            imageHtml = `
                <div class="product-image-container">
                    <img src="../src/Icons/menu.png" alt="No image" class="product-image fallback-image">
                </div>
            `;
        }

        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    ${imageHtml}
                    <div class="product-info ms-3">
                        <div class="product-name">${data.name || 'N/A'}</div>
                        <div class="product-description text-muted small">${data.description || 'No description'}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="category-badge">${data.category || 'General'}</span>
            </td>
            <td>
                <span class="price" style="color: #418a09ff; margin-bottom: -1000px !important;">₱${data.price || '0.00'}</span>
            </td>
            <td>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" style="margin-top: 18px; margin-left: 10px;" ${data.available ? 'checked' : ''} disabled>
                </div>
            </td>
        `;

        return row;
    }

    function updateRegisteredItemsCount(count) {
        const subtitle = document.querySelector('.menu-subtitle');
        if (subtitle) {
            subtitle.textContent = count + ' registered items';
        }
    }

    function setupEventListeners() {

        const editBtn = document.getElementById('editBtn');
        if (editBtn) {
            editBtn.addEventListener('click', function (e) {
                e.preventDefault();
                toggleEditMode();
            });
        }


        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        }


        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function (e) {
                const searchTerm = e.target.value.toLowerCase();
                filterMenuTable(searchTerm);
            });
        }
    }

    function toggleEditMode() {
        const editBtn = document.getElementById('editBtn');
        const addProductSection = document.getElementById('addProductSection');

        if (editBtn.textContent.includes('Edit')) {
            // Enter edit mode
            editBtn.innerHTML = '<img src="../src/Icons/edit.png" alt="Done" class="edit-icon me-2">Done';
            editBtn.classList.remove('btn-outline-primary');
            editBtn.classList.add('btn-primary');

            if (addProductSection) {
                // Move the Add Product section to the top of the menu container so it's visible first
                const menuContainer = document.querySelector('.menu-container');
                const tableContainer = menuContainer ? menuContainer.querySelector('.menu-table-container') : null;
                try {
                    if (menuContainer) {
                        if (tableContainer) {
                            menuContainer.insertBefore(addProductSection, tableContainer);
                        } else {
                            menuContainer.insertBefore(addProductSection, menuContainer.firstChild);
                        }
                    }
                } catch (err) {
                    console.warn('Could not move Add Product section:', err);
                }

                // Ensure it's visible and focusable for accessibility, then scroll into view
                addProductSection.style.display = 'block';
                addProductSection.tabIndex = -1; // make focusable
                addProductSection.focus && addProductSection.focus();
                addProductSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            addEditButtonsToRows();

            enableAvailabilityEditing();
        } else {
            // Exit edit mode
            editBtn.innerHTML = '<img src="../src/Icons/edit.png" alt="Edit" class="edit-icon me-2">Edit';
            editBtn.classList.remove('btn-primary');
            editBtn.classList.add('btn-outline-primary');

            if (addProductSection) {
                // Hide the section and move it back to the bottom of the menu container to keep DOM stable
                addProductSection.style.display = 'none';
                const menuContainer = document.querySelector('.menu-container');
                try {
                    if (menuContainer) menuContainer.appendChild(addProductSection);
                } catch (err) {
                    console.warn('Could not restore Add Product section position:', err);
                }
            }

            removeEditButtonsFromRows();

            disableAvailabilityEditing();
        }
    }

    function enableAvailabilityEditing() {
        const rows = document.querySelectorAll('#menuTableBody tr[data-doc-id]');
        rows.forEach(row => {
            const checkbox = row.querySelector('.form-check-input');
            if (!checkbox) return;
            checkbox.disabled = false;
            checkbox.addEventListener('change', async function onChange() {
                const docId = row.getAttribute('data-doc-id');
                try {
                    await firebase.firestore().collection('menu').doc(docId).update({
                        available: checkbox.checked,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('Availability updated for', docId, '=>', checkbox.checked);
                } catch (err) {
                    console.error('Failed to update availability', err);

                    checkbox.checked = !checkbox.checked;
                }
            }, { once: false });
        });
    }

    function disableAvailabilityEditing() {
        const rows = document.querySelectorAll('#menuTableBody tr[data-doc-id]');
        rows.forEach(row => {
            const checkbox = row.querySelector('.form-check-input');
            if (!checkbox) return;
            checkbox.disabled = true;
        });
    }

    function addEditButtonsToRows() {
        const rows = document.querySelectorAll('#menuTableBody tr[data-doc-id]');
        rows.forEach(row => {
            if (!row.querySelector('.edit-row-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-success edit-row-btn me-2';
                editBtn.innerHTML = 'Edit';
                editBtn.title = 'Edit this item';


                const firstCell = row.querySelector('td:first-child');
                if (firstCell) {
                    const productContainer = firstCell.querySelector('.d-flex');
                    if (productContainer) {

                        productContainer.insertBefore(editBtn, productContainer.firstChild);
                    }
                }

                editBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    openEditModal(row);
                });
            }
        });
    }

    function removeEditButtonsFromRows() {
        const editButtons = document.querySelectorAll('.edit-row-btn');
        editButtons.forEach(btn => btn.remove());
    }

    function openEditModal(row) {
        const docId = row.getAttribute('data-doc-id');


        window.location.href = `/html/editproduct.html?id=${docId}`;
    }

    function showEditForm(name, description, category, price, available) {

        const overlay = document.createElement('div');
        overlay.className = 'edit-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        overlay.innerHTML = `
            <div class="edit-form bg-white p-4 rounded" style="min-width: 400px;">
                <h5 class="mb-3">Edit Menu Item</h5>
                <form id="editMenuForm">
                    <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" id="editName" value="${name}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="editDescription" rows="2">${description}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Category</label>
                        <select class="form-control" id="editCategory">
                            <option value="Appetizer" ${category === 'Appetizer' ? 'selected' : ''}>Appetizer</option>
                            <option value="Main Course" ${category === 'Main Course' ? 'selected' : ''}>Main Course</option>
                            <option value="Dessert" ${category === 'Dessert' ? 'selected' : ''}>Dessert</option>
                            <option value="Beverage" ${category === 'Beverage' ? 'selected' : ''}>Beverage</option>
                            <option value="General" ${category === 'General' ? 'selected' : ''}>General</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Price (₱)</label>
                        <input type="number" class="form-control" id="editPrice" value="${price}" step="0.01" min="0" required>
                    </div>
                    <div class="mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="editAvailable" ${available ? 'checked' : ''}>
                            <label class="form-check-label">Available</label>
                        </div>
                    </div>
                    <div class="d-flex gap-2 justify-content-end">
                        <button type="button" class="btn btn-secondary" onclick="closeEditForm()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-danger" onclick="deleteMenuItem()">Delete</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);


        document.getElementById('editMenuForm').addEventListener('submit', function (e) {
            e.preventDefault();
            saveMenuItemChanges();
        });
    }

    function closeEditForm() {
        const overlay = document.querySelector('.edit-overlay');
        if (overlay) {
            overlay.remove();
        }
        document.body.removeAttribute('data-current-doc-id');
    }

    function saveMenuItemChanges() {
        const docId = document.body.getAttribute('data-current-doc-id');
        if (!docId) {
            return;
        }

        const name = document.getElementById('editName').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const category = document.getElementById('editCategory').value;
        const price = parseFloat(document.getElementById('editPrice').value);
        const available = document.getElementById('editAvailable').checked;

        if (!name || isNaN(price) || price < 0) {
            return;
        }

        const db = firebase.firestore();
        const menuData = {
            name: name,
            description: description,
            category: category,
            price: price,
            available: available,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('menu').doc(docId).update(menuData)
            .then(() => {
                console.log('Menu item updated successfully');
                closeEditForm();
                setTimeout(() => {
                    loadMenuFromFirebase();
                }, 500);
            })
            .catch((error) => {
                console.error('Error updating menu item:', error);
            });
    }

    function deleteMenuItem() {
        const docId = document.body.getAttribute('data-current-doc-id');
        if (!docId) {
            return;
        }

        if (!confirm('Are you sure you want to delete this menu item?')) {
            return;
        }

        const db = firebase.firestore();
        db.collection('menu').doc(docId).delete()
            .then(() => {
                console.log('Menu item deleted successfully');
                closeEditForm();
                setTimeout(() => {
                    loadMenuFromFirebase();
                }, 500);
            })
            .catch((error) => {
                console.error('Error deleting menu item:', error);
            });
    }

    function openAddProductModal() {

        window.location.href = '/html/addproduct.html';
    }

    function filterMenuTable(searchTerm) {
        const rows = document.querySelectorAll('#menuTableBody tr[data-doc-id]');

        rows.forEach(row => {
            const nameCell = row.querySelector('.product-name');
            const categoryCell = row.querySelector('.category-badge');

            const name = nameCell ? nameCell.textContent.toLowerCase() : '';
            const category = categoryCell ? categoryCell.textContent.toLowerCase() : '';

            if (name.includes(searchTerm) || category.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
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
            });
    }

    // --- AUTO UNCHECK AVAILABILITY IF INGREDIENTS EMPTY ---
    async function autoUpdateMenuAvailability() {
        const db = firebase.firestore();
        // Get all ingredients that are empty
        const emptyIngredients = [];
        const inventorySnapshot = await db.collection('inventory').where('quantity', '==', 0).get();
        inventorySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) emptyIngredients.push(data.name);
        });
        // For each menu item, check if it uses any empty ingredient
        const menuSnapshot = await db.collection('menu').get();
        menuSnapshot.forEach(async menuDoc => {
            const menuData = menuDoc.data();
            // Assume menuData.ingredients is an array of ingredient names used by the product
            if (Array.isArray(menuData.ingredients)) {
                const usesEmpty = menuData.ingredients.some(ing => emptyIngredients.includes(ing));
                if (usesEmpty && menuData.available !== false) {
                    await db.collection('menu').doc(menuDoc.id).update({ available: false });
                    // Also update UI checkbox if present
                    const row = document.querySelector(`#menuTableBody tr[data-doc-id='${menuDoc.id}']`);
                    if (row) {
                        const checkbox = row.querySelector('.form-check-input');
                        if (checkbox) checkbox.checked = false;
                    }
                }
            }
        });
    }
    // Call this after inventory or menu updates
    window.autoUpdateMenuAvailability = autoUpdateMenuAvailability;




    waitForFirebase();
});
