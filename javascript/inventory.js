// Update the status cell in an inventory row
function updateRowStatus(row) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) return;

    const itemName = (cells[0].textContent || '').trim();
    const stockText = (cells[1].textContent || '').trim();
    const stockValue = parseFloat(stockText);
    const stock = isNaN(stockValue) ? 0 : stockValue;

    let statusClass = '';
    let statusLabel = '';
    let notifyType = '';
    let notifyMsg = '';

    if (stock === 0) {
        statusClass = 'empty';
        statusLabel = 'Empty';
        notifyType = 'empty';
        notifyMsg = `${itemName} is out of stock!`;
    } else if (stock >= 1 && stock <= 5) {
        statusClass = 'restock';
        statusLabel = 'Need Restocking';
        notifyType = 'restock';
        notifyMsg = `Low stock: ${itemName}`;
    } else if (stock >= 6) {
        statusClass = 'steady';
        statusLabel = 'Steady';
    }

    // Only update the status cell
    if (!statusClass) {
        cells[3].innerHTML = '';
        return;
    }

    cells[3].innerHTML = '<div class="status-item">' +
        '<span class="status-indicator ' + statusClass + '"></span>' +
        '<span class="status-text">' + statusLabel + '</span>' +
        '</div>';
}
// Convert for display: always show in user-friendly unit
function getDisplayStock(quantity, baseUnit) {
    // baseUnit: 'g', 'ml', 'pcs'
    if (baseUnit === 'g') {
        if (quantity >= 1000) return { value: +(quantity / 1000).toFixed(2), unit: 'kg' };
        return { value: quantity, unit: 'g' };
    }
    if (baseUnit === 'ml') {
        if (quantity >= 1000) return { value: +(quantity / 1000).toFixed(2), unit: 'L' };
        return { value: quantity, unit: 'ml' };
    }
    if (baseUnit === 'pcs') {
        return { value: quantity, unit: 'pcs' };
    }
    return { value: quantity, unit: baseUnit };
}
// Create a table row for an inventory item
function createInventoryRow(docId, data) {
    const row = document.createElement('tr');
    row.setAttribute('data-doc-id', docId);
    row.setAttribute('data-restock-threshold', data.minQuantity || 10);
    // Always display in user-friendly units
    let display = { value: data.quantity || 0, unit: data.unitOfMeasure || '' };
    if (data.quantity != null && data.unitOfMeasure) {
        display = getDisplayStock(data.quantity, data.unitOfMeasure);
    }
    row.innerHTML = `
        <td>${data.name || 'N/A'}</td>
        <td>${display.value}</td>
        <td>${display.unit || 'N/A'}</td>
        <td></td>
    `;
    updateRowStatus(row);
    return row;
}
// Convert to base unit (g, ml, pcs)
function toBaseUnit(value, unit, piecesPerBox) {
    unit = unit.toLowerCase();
    if (unit === 'kg') return value * 1000;
    if (unit === 'g') return value;
    if (unit === 'l') return value * 1000;
    if (unit === 'ml') return value;
    if (unit === 'pcs' || unit === 'piece' || unit === 'pieces') return value;
    if (unit === 'box') {
        if (!piecesPerBox) throw new Error('piecesPerBox required for box conversion');
        return value * piecesPerBox;
    }
    throw new Error('Unsupported unit: ' + unit);
}

// Convert from base unit to display unit
function fromBaseUnit(value, baseUnit, piecesPerBox) {
    if (baseUnit === 'g') {
        if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'kg' };
        return { value, unit: 'g' };
    }
    if (baseUnit === 'ml') {
        if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'L' };
        return { value, unit: 'ml' };
    }
    if (baseUnit === 'pcs') {
        if (piecesPerBox && value >= piecesPerBox) {
            return { value: +(value / piecesPerBox).toFixed(2), unit: 'box' };
        }
        return { value, unit: 'pcs' };
    }
    return { value, unit: baseUnit };
}

// Deduct inventory and return new values
function deductInventory({ inventoryQty, inventoryUnit, orderQty, orderUnit, baseUnit, piecesPerBox }) {
    const invBase = toBaseUnit(inventoryQty, inventoryUnit, piecesPerBox);
    const orderBase = toBaseUnit(orderQty, orderUnit, piecesPerBox);
    let newBase = invBase - orderBase;
    if (newBase < 0) newBase = 0;
    const display = fromBaseUnit(newBase, baseUnit, piecesPerBox);
    return {
        stockBase: newBase,
        stockDisplay: `${display.value} ${display.unit}`,
        value: display.value,
        unit: display.unit
    };
}
// Ensure notifications.js is loaded so sendInventoryNotification is available
if (typeof sendInventoryNotification === 'undefined') {
    var script = document.createElement('script');
    script.src = '/javascript/notifications.js';
    document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Inventory page loaded, initializing Firebase...');

    // Always call setupEventListeners at the end to ensure all static buttons are wired up
    document.addEventListener('readystatechange', function () {
        if (document.readyState === 'complete') {
            setupEventListeners();
        }
    });

    function waitForFirebase() {
        if (window.isFirebaseReady && window.isFirebaseReady()) {
            console.log('Firebase is ready from main.js!');
            initializeInventory();
        } else if (typeof firebase !== 'undefined' && firebase.firestore) {
            console.log('Firebase is ready!');
            initializeInventory();
        } else {
            console.log('Firebase not ready yet, waiting...');
            setTimeout(waitForFirebase, 100);
        }
    }

    function initializeInventory() {
        console.log('Initializing inventory system...');


        const auth = firebase.auth();
        const db = firebase.firestore();


        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User authenticated:', user.email);

                // Get user role from Firestore
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    const userData = userDoc.data();
                    const userRole = userData.role || 'user';

                    console.log('User role:', userRole);

                    // Set up role-based access
                    setupRoleBasedAccess(userRole);

                    loadInventoryFromFirebase();
                    setupEventListeners();
                } catch (error) {
                    console.error('Error getting user role:', error);
                    // Default to basic access if role fetch fails
                    setupRoleBasedAccess('user');
                    loadInventoryFromFirebase();
                    setupEventListeners();
                }

                const userEmailEl = document.getElementById('userEmail');
                const signOutBtn = document.getElementById('signOutBtn');
                if (userEmailEl) userEmailEl.textContent = user.email;
                if (signOutBtn) {
                    signOutBtn.style.display = '';

                    signOutBtn.replaceWith(signOutBtn.cloneNode(true));
                    const newSignOut = document.getElementById('signOutBtn');
                    newSignOut.addEventListener('click', function () {
                        firebase.auth().signOut().then(() => {
                            console.log('User signed out');

                            window.location.href = '/index.html';
                        }).catch(err => console.error('Sign out error:', err));
                    });
                }
            } else {
                console.log('No user authenticated, redirecting to login...');
                window.location.href = '/index.html';
            }
        });
    }

    // Setup role-based access control
    function setupRoleBasedAccess(userRole) {
        console.log('Setting up role-based access for:', userRole);

        // Get key UI elements
        const addButton = document.getElementById('inventoryAddAction');
        const editButtons = document.querySelectorAll('.edit-btn, .btn-edit');
        const deleteButtons = document.querySelectorAll('.delete-btn, .btn-delete');
        const settingsNavLink = document.querySelector('a[href*="Settings.html"]');
        const userManagementLink = document.querySelector('a[href*="user.html"]');
        const reportsNavLink = document.querySelector('a[href*="analytics.html"]');
        const dashboardNavLink = document.querySelector('a[href*="Dashboard.html"]');
        const posNavLink = document.querySelector('a[href*="pos.html"]');
        const menuNavLink = document.querySelector('a[href*="menu.html"]');
        const homeNavLink = document.querySelector('a[href*="Dashboard.html"]');

        if (userRole === 'kitchen') {
            console.log('🍳 Kitchen role detected - Setting up limited access');

            // Kitchen staff can view inventory but have limited editing capabilities
            // They can only update quantities for existing items, not add/delete

            // Hide add new item button
            if (addButton) {
                addButton.style.display = 'none';
            }

            // Hide delete buttons
            deleteButtons.forEach(btn => {
                btn.style.display = 'none';
            });

            // Redirect home link to kitchen dashboard for kitchen staff
            if (homeNavLink) {
                homeNavLink.href = '/html/kitchen.html';
                homeNavLink.title = 'Kitchen Dashboard';
            }

            // Hide navigation items that kitchen staff shouldn't access
            if (settingsNavLink) {
                settingsNavLink.style.display = 'none';
            }
            if (userManagementLink) {
                userManagementLink.style.display = 'none';
            }
            if (reportsNavLink) {
                reportsNavLink.style.display = 'none';
            }
            if (dashboardNavLink && dashboardNavLink !== homeNavLink) {
                dashboardNavLink.style.display = 'none';
            }
            if (posNavLink) {
                posNavLink.style.display = 'none';
            }
            if (menuNavLink) {
                menuNavLink.style.display = 'none';
            }

        } else if (userRole === 'admin' || userRole === 'manager') {
            console.log('👑 Admin/Manager role - Full access granted');
            // Admin and managers have full access - no restrictions

        } else {
            console.log('👤 Regular user role - Standard access');
            // Regular users have standard access
            // May want to restrict some advanced features if needed
        }

        // Store user role globally for other functions to use
        window.currentUserRole = userRole;
    }

    function loadInventoryFromFirebase() {
        console.log('Loading inventory from Firebase...');
        const tbody = document.getElementById('inventoryStatus');
        if (!tbody) {
            console.error('Inventory table body not found');
            return;
        }
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading inventory from Firebase...</td></tr>';
        const db = firebase.firestore();
        console.log('Checking Firebase Firestore connection:', db);
        db.collection('inventory').get()
            .then((querySnapshot) => {
                console.log('Firebase query completed, documents found:', querySnapshot.size);
                if (querySnapshot.empty) {
                    console.log('Collection is empty, showing no data message');
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center text-muted py-4">
                                <div class="empty-state">
                                    <i class="fas fa-box-open fa-3x mb-3 text-muted"></i>
                                    <h5 class="text-muted">No Inventory Items Found</h5>
                                    <p class="text-muted mb-3">Your inventory is currently empty.</p>
                                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('inventoryAddAction').click()">
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
                let loadedRows = 0;
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Store original stock as data attribute for threshold logic
                    const row = createInventoryRow(doc.id, data);
                    row.setAttribute('data-original-stock', data.quantity || 0);
                    tbody.appendChild(row);
                    loadedRows++;
                });
                sortInventoryByStatus();
                updateRegisteredItemsCount(querySnapshot.size);
                addRowClickHandlers();
                console.log('Inventory loaded successfully! Rows loaded:', loadedRows);
                if (loadedRows === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-warning">No inventory items found after loading.</td></tr>';
                }
            })
            .catch((error) => {
                console.error('Error loading inventory:', error);
                alert('Error loading inventory: ' + error.message);
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading inventory. Please try again.</td></tr>';
            });
        const row = document.createElement('tr');
        row.setAttribute('data-doc-id', docId);
        row.setAttribute('data-restock-threshold', data.minQuantity || 10);

        // Always display in kg/L/pcs (never g/ml/piece)
        let displayUom = data.unitOfMeasure;
        let displayQty = data.quantity || 0;
        if (displayUom) {
            displayUom = displayUom.toLowerCase();
            if (displayUom === 'kg') {
                displayUom = 'kg';
            } else if (displayUom === 'l') {
                displayUom = 'L';
            } else if (displayUom === 'pcs' || displayUom === 'piece') {
                displayUom = 'pcs';
            }
        }
        // Format quantity to 2 decimals for kg/L
        if ((displayUom === 'kg' || displayUom === 'L') && typeof displayQty === 'number') {
            displayQty = displayQty % 1 === 0 ? displayQty : displayQty.toFixed(2).replace(/\.00$/, '');
        }
        row.innerHTML = `
            <td>${data.name || 'N/A'}</td>
            <td>${displayQty}</td>
            <td>${displayUom || 'N/A'}</td>
            <td></td>
        `;


        updateRowStatus(row);
        return row;
    }

    // Track notified items to prevent duplicate notifications
    // Track notified items to prevent duplicate notifications
    const notifiedInventoryStatus = {};

    function updateRowStatus(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;

        const itemName = (cells[0].textContent || '').trim();
        const stockText = (cells[1].textContent || '').trim();
        const stockValue = parseFloat(stockText);
        const stock = isNaN(stockValue) ? 0 : stockValue;

        let statusClass = '';
        let statusLabel = '';
        let notifyType = '';
        let notifyMsg = '';

        if (stock === 0) {
            statusClass = 'empty';
            statusLabel = 'Empty';
            notifyType = 'empty';
            notifyMsg = `${itemName} is out of stock!`;
        } else if (stock >= 1 && stock <= 5) {
            statusClass = 'restock';
            statusLabel = 'Need Restocking';
            notifyType = 'restock';
            notifyMsg = `Low stock: ${itemName}`;
        } else if (stock >= 6) {
            statusClass = 'steady';
            statusLabel = 'Steady';
        }

        // Persist previous status for each item in localStorage
        let prevStatus = localStorage.getItem('inventory_prevStatus_' + itemName);

        // Only notify if status changes from steady to low/no stock, or from low to empty, or from steady to empty
        let shouldNotify = false;
        if ((notifyType === 'empty' || notifyType === 'restock') && prevStatus !== statusLabel) {
            shouldNotify = true;
        }

        // Reset notification history for this item if restocked
        if (statusLabel === 'Steady' && prevStatus && prevStatus !== 'Steady') {
            ['empty', 'restock'].forEach(function (type) {
                localStorage.removeItem('inventory_notified_' + itemName + '_' + type);
            });
        }

        // Only notify once per item per status change
        if (shouldNotify && typeof sendInventoryNotification === 'function') {
            const key = 'inventory_notified_' + itemName + '_' + notifyType;
            if (!localStorage.getItem(key)) {
                console.log('[Inventory] Sending notification:', { type: notifyType, msg: notifyMsg, item: itemName });
                sendInventoryNotification(notifyType, notifyMsg, itemName);
                localStorage.setItem(key, 'true');
            }
        }
        // Update previous status in localStorage
        localStorage.setItem('inventory_prevStatus_' + itemName, statusLabel);

        if (!statusClass) {
            cells[3].innerHTML = '';
            return;
        }

        cells[3].innerHTML = '<div class="status-item">' +
            '<span class="status-indicator ' + statusClass + '"></span>' +
            '<span class="status-text">' + statusLabel + '</span>' +
            '</div>';
    }

    function updateRegisteredItemsCount(count) {
        const subtitle = document.querySelector('.inventory-subtitle');
        if (subtitle) {
            subtitle.textContent = count + ' registered items';
        }
    }

    function addRowClickHandlers() {

        console.log('Row click handlers disabled - use Edit Selected mode instead');
    }

    function openEditModal(row) {
        const cells = row.querySelectorAll('td');
        const docId = row.getAttribute('data-doc-id');


        let nameText = cells[0].textContent;
        if (nameText.includes('Edit')) {

            nameText = nameText.replace(/Edit/g, '').trim();
        }


        document.getElementById('ingredientName').value = nameText;
        document.getElementById('ingredientUom').value = (cells[2].textContent || '').trim();
        document.getElementById('ingredientQty').value = (cells[1].textContent || '').trim();

        // Apply role-based field restrictions
        if (window.currentUserRole === 'kitchen') {
            // Kitchen staff can only edit quantity
            document.getElementById('ingredientName').disabled = true;
            document.getElementById('ingredientUom').disabled = true;
            document.getElementById('ingredientQty').disabled = false;

            // Add visual indicator
            document.getElementById('ingredientName').classList.add('bg-light');
            document.getElementById('ingredientUom').classList.add('bg-light');

            // Hide delete button for kitchen staff
            const deleteBtn = document.getElementById('ingredientDeleteBtn');
            if (deleteBtn) deleteBtn.style.display = 'none';
        } else {
            // Full access for admin/manager
            document.getElementById('ingredientName').disabled = false;
            document.getElementById('ingredientUom').disabled = false;
            document.getElementById('ingredientQty').disabled = false;

            // Remove disabled styling
            document.getElementById('ingredientName').classList.remove('bg-light');
            document.getElementById('ingredientUom').classList.remove('bg-light');

            // Show delete button
            const deleteBtn = document.getElementById('ingredientDeleteBtn');
            if (deleteBtn) deleteBtn.style.display = '';
        }


        document.getElementById('ingredientModal').setAttribute('data-current-doc-id', docId);


        removeEditButtons();


        document.getElementById('ingredientModal').style.display = 'flex';
    }

    function setupEventListeners() {

        const addAction = document.getElementById('inventoryAddAction');
        if (addAction) {
            addAction.addEventListener('click', function (e) {
                e.preventDefault();
                openAddModal();
            });
        }


        const editAction = document.getElementById('inventoryEditAction');
        if (editAction) {
            editAction.addEventListener('click', function (e) {
                e.preventDefault();
                enableEditMode();
            });
        }


        // Report generation buttons
        const generalReportBtn = document.getElementById('generateGeneralReport');
        if (generalReportBtn) {
            generalReportBtn.addEventListener('click', generateGeneralReport);
        }

        const restockReportBtn = document.getElementById('generateRestockReport');
        if (restockReportBtn) {
            restockReportBtn.addEventListener('click', generateRestockReport);
        }

        // Upload restock functionality
        const uploadRestockBtn = document.getElementById('uploadRestockBtn');
        if (uploadRestockBtn) {
            uploadRestockBtn.addEventListener('click', openUploadModal);
        }

        // Upload modal event listeners
        const uploadModalClose = document.getElementById('uploadModalClose');
        if (uploadModalClose) {
            uploadModalClose.addEventListener('click', closeUploadModal);
        }

        const selectFileBtn = document.getElementById('selectFileBtn');
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', () => {
                document.getElementById('excelFileInput').click();
            });
        }

        const excelFileInput = document.getElementById('excelFileInput');
        if (excelFileInput) {
            excelFileInput.addEventListener('change', handleFileSelect);
        }

        const uploadProcessBtn = document.getElementById('uploadProcessBtn');
        if (uploadProcessBtn) {
            uploadProcessBtn.addEventListener('click', processUploadedFile);
        }

        const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', downloadRestockTemplate);
        }

        // Drag and drop functionality
        const uploadDropzone = document.getElementById('uploadDropzone');
        if (uploadDropzone) {
            uploadDropzone.addEventListener('dragover', handleDragOver);
            uploadDropzone.addEventListener('drop', handleFileDrop);
            uploadDropzone.addEventListener('dragleave', handleDragLeave);
        }


        const filterBtn = document.querySelector('.btn-outline-info.action-btn');
        if (filterBtn) {
            // Remove prompt filter, use dropdown instead
            const statusDropdown = document.getElementById('inventoryStatusDropdown');
            if (statusDropdown) {
                statusDropdown.addEventListener('change', function () {
                    const status = statusDropdown.value;
                    filterInventory(status);
                });
            }
        }


        const modalClose = document.querySelector('.ingredient-modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }


        const modalOverlay = document.getElementById('ingredientModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }


        const saveBtn = document.getElementById('ingredientSaveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveInventoryItem);
        }


        const deleteBtn = document.getElementById('ingredientDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteInventoryItem);
        }


        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function (e) {
                const searchTerm = e.target.value.toLowerCase();
                filterInventoryTable(searchTerm);
            });
        }

        // Inventory status filter dropdown
        const statusDropdown = document.getElementById('inventoryStatusDropdown');
        if (statusDropdown) {
            statusDropdown.addEventListener('change', function () {
                filterInventory(this.value);
            });
        }
    }

    // Filter inventory rows by status
    function filterInventory(status) {
        const rows = document.querySelectorAll('#inventoryStatus tr[data-doc-id]');
        rows.forEach(row => {
            const statusCell = row.querySelector('.status-text');
            if (!statusCell) {
                row.style.display = '';
                return;
            }
            const label = statusCell.textContent.trim().toLowerCase();
            if (status === 'all') {
                row.style.display = '';
            } else if (status === 'steady' && label === 'steady') {
                row.style.display = '';
            } else if (status === 'restock' && label === 'need restocking') {
                row.style.display = '';
            } else if (status === 'empty' && label === 'empty') {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        sortInventoryByStatus();
    }

    // Sort inventory rows by status priority
    function sortInventoryByStatus() {
        const tbody = document.getElementById('inventoryStatus');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr[data-doc-id]'));
        // Assign priority: Empty=1, Restock=2, Steady=3
        function getPriority(row) {
            const statusCell = row.querySelector('.status-text');
            if (!statusCell) return 4;
            const label = statusCell.textContent.trim().toLowerCase();
            if (label === 'empty') return 1;
            if (label === 'need restocking') return 2;
            if (label === 'steady') return 3;
            return 4;
        }
        rows.sort((a, b) => {
            const pa = getPriority(a);
            const pb = getPriority(b);
            if (pa !== pb) return pa - pb;
            // If same priority, sort by name
            const nameA = (a.cells[0].textContent || '').toLowerCase();
            const nameB = (b.cells[0].textContent || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
    }

    function enableEditMode() {
        console.log('Enabling edit mode...');


        removeEditButtons();


        const rows = document.querySelectorAll('#inventoryStatus tr[data-doc-id]');
        rows.forEach(row => {
            addEditButtonToRow(row);
        });


        const tbody = document.getElementById('inventoryStatus');
        if (tbody && rows.length > 0) {
            const messageRow = document.createElement('tr');
            messageRow.innerHTML = '<td colspan="4" class="text-center text-info">Click the Edit button on any row to modify items</td>';
            tbody.appendChild(messageRow);
        }
    }

    function addEditButtonToRow(row) {

        if (row.querySelector('.edit-row-btn')) return;

        const nameCell = row.querySelector('td:first-child');
        if (!nameCell) return;

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-outline-primary edit-row-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.style.marginRight = '5px';


        nameCell.insertBefore(editBtn, nameCell.firstChild);


        editBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            openEditModal(row);
        });
    }

    function removeEditButtons() {
        const editButtons = document.querySelectorAll('.edit-row-btn');
        editButtons.forEach(btn => btn.remove());


        const messageRows = document.querySelectorAll('#inventoryStatus tr');
        messageRows.forEach(row => {
            if (row.cells.length === 1 && row.cells[0].textContent.includes('Click the Edit button')) {
                row.remove();
            }
        });
    }

    function openAddModal() {
        // Check user role before allowing addition of new items
        if (window.currentUserRole === 'kitchen') {
            showMessage('Kitchen staff cannot add new inventory items.', 'error');
            return;
        }


        document.getElementById('ingredientName').value = '';
        document.getElementById('ingredientUom').value = '';
        document.getElementById('ingredientQty').value = '';


        document.getElementById('ingredientModal').removeAttribute('data-current-doc-id');


        const deleteBtn = document.getElementById('ingredientDeleteBtn');
        if (deleteBtn) deleteBtn.style.display = 'none';


        document.getElementById('ingredientModal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('ingredientModal').style.display = 'none';


        removeEditButtons();
    }

    // Save inventory item (add or update) - always store in base units (g, ml, pcs)
    function saveInventoryItem() {
        const name = document.getElementById('ingredientName').value.trim();
        const uom = document.getElementById('ingredientUom').value.trim().toLowerCase();
        const qtyText = document.getElementById('ingredientQty').value.trim();
        const qty = parseFloat(qtyText);
        if (!name || isNaN(qty)) {
            showMessage('Please enter a valid name and quantity.', 'error');
            return;
        }
        // Normalize to base unit
        let baseUnit, baseQty;
        if (uom === 'kg') {
            baseUnit = 'g';
            baseQty = qty * 1000;
        } else if (uom === 'g') {
            baseUnit = 'g';
            baseQty = qty;
        } else if (uom === 'l') {
            baseUnit = 'ml';
            baseQty = qty * 1000;
        } else if (uom === 'ml') {
            baseUnit = 'ml';
            baseQty = qty;
        } else if (['pcs', 'piece', 'pieces'].includes(uom)) {
            baseUnit = 'pcs';
            baseQty = qty;
        } else {
            showMessage('Unsupported unit of measure.', 'error');
            return;
        }
        const db = firebase.firestore();
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            showMessage('You must be signed in to save inventory items.', 'error');
            return;
        }
        const currentDocId = document.getElementById('ingredientModal').getAttribute('data-current-doc-id');
        const inventoryData = {
            name: name,
            quantity: baseQty, // always base
            unitOfMeasure: baseUnit, // always base
            lastUpdated: firebase.firestore.Timestamp.now()
        };
        if (currentDocId) {
            db.collection('inventory').doc(currentDocId).update(inventoryData)
                .then(() => {
                    closeModal();
                    showMessage('Item updated successfully!', 'success');
                    db.collection('inventory').doc(currentDocId).get()
                        .then((doc) => {
                            if (!doc.exists) {
                                loadInventoryFromFirebase();
                                return;
                            }
                            const data = doc.data();
                            const row = document.querySelector(`#inventoryStatus tr[data-doc-id="${currentDocId}"]`);
                            if (row) {
                                const cells = row.querySelectorAll('td');
                                cells[0].textContent = data.name || 'N/A';
                                // Convert for display
                                const display = getDisplayStock(data.quantity, data.unitOfMeasure);
                                cells[1].textContent = display.value;
                                cells[2].textContent = display.unit;
                                updateRowStatus(row);
                            } else {
                                const tbody = document.getElementById('inventoryStatus');
                                if (tbody) tbody.appendChild(createInventoryRow(doc.id, data));
                            }
                        })
                        .catch((err) => {
                            console.error('Error fetching updated doc:', err);
                        });
                })
                .catch((error) => {
                    showMessage('Error updating item. Please try again.', 'error');
                });
        } else {
            db.collection('inventory').add(inventoryData)
                .then((docRef) => {
                    closeModal();
                    showMessage('Item added successfully!', 'success');
                    db.collection('inventory').doc(docRef.id).get()
                        .then((savedDoc) => {
                            if (!savedDoc.exists) {
                                setTimeout(loadInventoryFromFirebase, 300);
                                return;
                            }
                            const savedData = savedDoc.data();
                            const tbody = document.getElementById('inventoryStatus');
                            if (tbody) {
                                const existing = document.querySelector(`#inventoryStatus tr[data-doc-id="${savedDoc.id}"]`);
                                if (existing) existing.remove();
                                const newRow = createInventoryRow(savedDoc.id, savedData);
                                tbody.appendChild(newRow);
                                const subtitle = document.querySelector('.inventory-subtitle');
                                if (subtitle) {
                                    const match = (subtitle.textContent || '').match(/(\d+)\s+registered items/);
                                    const current = match ? parseInt(match[1], 10) : null;
                                    if (!Number.isNaN(current) && current !== null) {
                                        updateRegisteredItemsCount(current + 1);
                                    }
                                }
                            }
                        })
                        .catch((err) => {
                            setTimeout(loadInventoryFromFirebase, 300);
                        });
                })
                .catch((error) => {
                    showMessage('Error adding item. Please try again.', 'error');
                });
        }
    }

    function deleteInventoryItem() {
        // Check user role before allowing deletion
        if (window.currentUserRole === 'kitchen') {
            showMessage('Kitchen staff cannot delete inventory items.', 'error');
            return;
        }

        const currentDocId = document.getElementById('ingredientModal').getAttribute('data-current-doc-id');

        if (!currentDocId) {
            showMessage('No item selected for deletion.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }


        showMessage('Deleting item...', 'info');

        const db = firebase.firestore();
        console.log('Attempting to delete document:', currentDocId);

        db.collection('inventory').doc(currentDocId).delete()
            .then(() => {
                console.log('✅ Item deleted successfully from Firebase');
                closeModal();


                showMessage('Item deleted successfully from Firebase!', 'success');


                setTimeout(() => {
                    loadInventoryFromFirebase();
                }, 1000);
            })
            .catch((error) => {
                console.error('❌ Error deleting item from Firebase:', error);

                let errorMessage = 'Error deleting item: ';
                switch (error.code) {
                    case 'permission-denied':
                        errorMessage += 'Permission denied. Check Firebase rules.';
                        break;
                    case 'not-found':
                        errorMessage += 'Item not found in database.';
                        break;
                    case 'unavailable':
                        errorMessage += 'Firebase is unavailable. Check connection.';
                        break;
                    default:
                        errorMessage += error.message;
                }

                showMessage(errorMessage, 'error');
            });
    }

    function generateGeneralReport() {
        const rows = document.querySelectorAll('#inventoryStatus tr[data-doc-id]');
        if (rows.length === 0) {
            alert('No inventory items to report.');
            return;
        }

        // Prepare data for Excel
        const data = [];

        // Add header row
        data.push(['VIKTORIAS BISTRO - GENERAL INVENTORY REPORT']);
        data.push([`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`]);
        data.push([]); // Empty row
        data.push(['Item Name', 'Restock Quantity']);

        // Add inventory data
        rows.forEach(row => {
            const name = row.cells[0].textContent.trim();
            const stock = parseFloat(row.cells[1].textContent.trim()) || 0;

            data.push([name, stock]);
        });

        // Add summary
        data.push([]); // Empty row
        data.push(['Summary']);
        data.push(['Total Items:', rows.length]);

        downloadExcelReport(data, 'General_Inventory_Report.xlsx', 'General Report');
    }

    function generateRestockReport() {
        const rows = document.querySelectorAll('#inventoryStatus tr[data-doc-id]');
        const restockItems = Array.from(rows).filter(row => {
            const statusCell = row.cells[3];
            const status = statusCell.textContent.trim();
            return status === 'Need Restocking' || status === 'Empty';
        });

        if (restockItems.length === 0) {
            alert('No items need restocking at this time.');
            return;
        }

        // Prepare data for Excel
        const data = [];



        data.push(['Item Name', 'Restock Quantity', 'Unit of Measure']);

        restockItems.forEach(row => {
            const name = row.cells[0].textContent.trim();
            const stock = parseFloat(row.cells[1].textContent.trim()) || 0;
            const unit = row.cells[2] ? row.cells[2].textContent.trim() : '';
            data.push([name, stock, unit]);
        });

        downloadExcelReport(data, 'Restock_Needed_Report.xlsx', 'Restock Report');
    }

    function downloadExcelReport(data, filename, sheetName) {
        try {
            const wb = XLSX.utils.book_new();

            const ws = XLSX.utils.aoa_to_sheet(data);


            const colWidths = [
                { wch: 25 }, // Item Name
                { wch: 15 }, // Stock/Data
                { wch: 15 }, // Unit/Info
                { wch: 20 }, // Status/Action
                { wch: 15 }  // Priority (if exists)
            ];
            ws['!cols'] = colWidths;

            // Style the header rows (make them bold)
            const headerStyle = {
                font: { bold: true, sz: 12 },
                fill: { fgColor: { rgb: "E8F4FD" } },
                alignment: { horizontal: "center" }
            };

            // Apply styles to specific cells (header and title rows)
            if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };
            if (ws['A2']) ws['A2'].s = { font: { sz: 10, italic: true } };

            // Find and style the data header row (Item Name, Stock, etc.)
            for (let i = 0; i < data.length; i++) {
                if (data[i][0] === 'Item Name' || data[i][0] === 'Summary') {
                    const rowNum = i + 1;
                    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                        const cellRef = col + rowNum;
                        if (ws[cellRef]) {
                            ws[cellRef].s = headerStyle;
                        }
                    });
                }
            }

            // Add the worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            // Generate Excel file and trigger download
            XLSX.writeFile(wb, filename);

            // Show success message
            alert(`${filename} has been downloaded successfully!`);

        } catch (error) {
            console.error('Error generating Excel report:', error);
            alert('Error generating Excel report. Please try again.');
        }
    }

    function downloadReport(content, filename) {
        // Keep this function for backward compatibility
        // But redirect to Excel generation
        console.log('Redirecting to Excel generation...');
        generateGeneralReport();
    }

    function generateInventoryReport() {
        // Keep this for backward compatibility, redirect to general report
        generateGeneralReport();
    }

    function toggleFilterOptions() {
        alert('Filter options feature coming soon!');
    }

    function filterInventoryTable(searchTerm) {
        const rows = document.querySelectorAll('#inventoryStatus tr[data-doc-id]');

        rows.forEach(row => {
            const nameCell = row.querySelector('td:first-child');
            const name = nameCell ? nameCell.textContent.toLowerCase() : '';

            if (name.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    function showMessage(message, type = 'info') {

        const existingMessage = document.querySelector('.inventory-message');
        if (existingMessage) {
            existingMessage.remove();
        }


        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} inventory-message`;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '9999';
        messageDiv.style.minWidth = '300px';
        messageDiv.innerHTML = `
            <strong>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</strong> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;


        document.body.appendChild(messageDiv);


        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 3000);
    }

    // Upload Modal Functions
    function openUploadModal() {
        document.getElementById('uploadRestockModal').style.display = 'flex';
    }

    function closeUploadModal() {
        document.getElementById('uploadRestockModal').style.display = 'none';
        resetUploadModal();
    }

    function resetUploadModal() {
        document.getElementById('excelFileInput').value = '';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadProcessBtn').disabled = true;
        document.getElementById('uploadProgress').style.display = 'none';
        document.querySelector('.progress-bar').style.width = '0%';
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            displaySelectedFile(file);
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }

    function handleDragLeave(event) {
        event.currentTarget.classList.remove('dragover');
    }

    function handleFileDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
                document.getElementById('excelFileInput').files = files;
                displaySelectedFile(file);
            } else {
                alert('Please select a valid Excel file (.xlsx)');
            }
        }
    }

    function displaySelectedFile(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('uploadProcessBtn').disabled = false;
    }

    async function processUploadedFile() {
        const fileInput = document.getElementById('excelFileInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file first.');
            return;
        }

        // Show progress
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.getElementById('progressText');

        progressDiv.style.display = 'block';
        progressBar.style.width = '10%';
        progressText.textContent = 'Reading Excel file...';

        try {
            const data = await readExcelFile(file);
            progressBar.style.width = '30%';
            progressText.textContent = 'Processing data...';

            const processedData = await processRestockData(data);
            progressBar.style.width = '60%';
            progressText.textContent = 'Updating inventory...';

            await updateInventoryWithRestock(processedData);
            progressBar.style.width = '100%';
            progressText.textContent = 'Complete!';

            setTimeout(() => {
                closeUploadModal();
                loadInventoryFromFirebase(); // Refresh the inventory display
                alert('Inventory has been successfully updated with restock data!');
            }, 1000);

        } catch (error) {
            console.error('Error processing upload:', error);
            alert('Error processing file: ' + error.message);
            progressDiv.style.display = 'none';
        }
    }

    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Failed to read Excel file: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    async function processRestockData(excelData) {
        const processedItems = [];
        const errors = [];

        // First, scan the data to determine the format and find the data rows
        let dataStartRow = 0;
        let headerRow = null;

        // Look for header row or data start
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            const keys = Object.keys(row);

            // Skip empty rows or header/title rows
            if (keys.length === 0) continue;

            // Check if this looks like a header row
            const hasItemName = keys.some(key =>
                key.toLowerCase().includes('item') ||
                key.toLowerCase().includes('name') ||
                key.toLowerCase() === 'product'
            );

            const hasQuantity = keys.some(key =>
                key.toLowerCase().includes('quantity') ||
                key.toLowerCase().includes('stock') ||
                key.toLowerCase().includes('qty') ||
                key.toLowerCase().includes('amount')
            );

            if (hasItemName && hasQuantity) {
                headerRow = row;
                dataStartRow = i;
                break;
            }
        }

        // If no clear header found, start from beginning
        if (headerRow === null && excelData.length > 0) {
            dataStartRow = 0;
        }

        for (let i = dataStartRow; i < excelData.length; i++) {
            const row = excelData[i];
            if (Object.keys(row).length === 0) continue;
            const itemName = row['Item Name'] || row['item name'] || row['Name'] || row['name'] ||
                row['Item'] || row['item'] || row['Product'] || row['product'] ||
                row['ITEM NAME'] || row['ITEM'] || row['PRODUCT'];
            let restockQty = row['Restock Quantity'] || row['restock quantity'] || row['Quantity'] ||
                row['quantity'] || row['Qty'] || row['qty'] || row['Amount'] || row['amount'] ||
                row['Current Stock'] || row['current stock'] || row['Stock'] || row['stock'] ||
                row['RESTOCK QUANTITY'] || row['QUANTITY'] || row['CURRENT STOCK'] || row['STOCK'];
            let unitOfMeasure = row['Unit of Measure'] || row['unit of measure'] || row['Unit'] || row['unit'] || row['UOM'] || row['uom'] || row['UNIT OF MEASURE'] || row['UNIT'];
            if (!itemName || itemName.toString().trim() === '') continue;
            const itemNameStr = itemName.toString().toLowerCase();
            if (itemNameStr.includes('summary') ||
                itemNameStr.includes('total') ||
                itemNameStr.includes('priority') ||
                itemNameStr.includes('action') ||
                itemNameStr.includes('report') ||
                itemNameStr.includes('generated')) continue;
            if (restockQty === undefined || restockQty === null || restockQty === '') {
                const currentStock = row['Current Stock'] || row['current stock'] || row['Stock'] || row['stock'];
                if (currentStock !== undefined && currentStock !== null && currentStock !== '') {
                    restockQty = currentStock;
                } else {
                    continue;
                }
            }
            const qty = parseFloat(restockQty);
            if (isNaN(qty) || qty < 0) {
                errors.push(`Row ${i + 1}: Invalid quantity "${restockQty}" for item "${itemName}"`);
                continue;
            }
            // --- ENFORCE BASE UNIT CONVERSION FOR UPLOAD ---
            let baseQty = qty;
            let baseUnit = '';
            if (unitOfMeasure) {
                let uom = unitOfMeasure.toString().trim().toLowerCase();
                if (uom === 'kg') {
                    baseUnit = 'g';
                    baseQty = qty * 1000;
                } else if (uom === 'g') {
                    baseUnit = 'g';
                    baseQty = qty;
                } else if (uom === 'l' || uom === 'liter' || uom === 'liters') {
                    baseUnit = 'ml';
                    baseQty = qty * 1000;
                } else if (uom === 'ml') {
                    baseUnit = 'ml';
                    baseQty = qty;
                } else if (['pcs', 'piece', 'pieces'].includes(uom)) {
                    baseUnit = 'pcs';
                    baseQty = qty;
                } else {
                    baseUnit = 'pcs';
                    baseQty = qty;
                }
            } else {
                baseUnit = 'pcs';
                baseQty = qty;
            }
            processedItems.push({
                itemName: itemName.toString().trim(),
                restockQuantity: baseQty,
                unitOfMeasure: baseUnit
            });
        }

        if (errors.length > 0) {
            console.warn('Data validation warnings:', errors);
            // Only throw error if there are critical issues
            if (processedItems.length === 0) {
                throw new Error('No valid restock data found. Please check your file format.\n\nErrors found:\n' + errors.slice(0, 10).join('\n'));
            }
        }

        if (processedItems.length === 0) {
            throw new Error('No valid restock data found in the Excel file. Please ensure your file contains:\n- Item Name column\n- Quantity/Stock column with numeric values');
        }

        return processedItems;
    }

    async function updateInventoryWithRestock(restockItems) {
        const db = firebase.firestore();
        const batch = db.batch();
        let updatedCount = 0;
        let addedCount = 0;
        const notFound = [];

        for (const item of restockItems) {
            try {
                // Normalize unit string and always store in base units (g, ml, pcs)
                let rawUnit = item.unitOfMeasure ? String(item.unitOfMeasure).trim().toLowerCase() : '';
                let baseQty = item.restockQuantity;
                let baseUnit = '';
                if (rawUnit === 'kg') {
                    baseUnit = 'g';
                    baseQty = item.restockQuantity * 1000;
                } else if (rawUnit === 'g') {
                    baseUnit = 'g';
                    baseQty = item.restockQuantity;
                } else if (rawUnit === 'l' || rawUnit === 'liter' || rawUnit === 'liters') {
                    baseUnit = 'ml';
                    baseQty = item.restockQuantity * 1000;
                } else if (rawUnit === 'ml') {
                    baseUnit = 'ml';
                    baseQty = item.restockQuantity;
                } else if (['pcs', 'piece', 'pieces'].includes(rawUnit)) {
                    baseUnit = 'pcs';
                    baseQty = item.restockQuantity;
                } else {
                    // fallback: treat as pieces
                    baseUnit = 'pcs';
                    baseQty = item.restockQuantity;
                }
                // Find the inventory item by name
                const querySnapshot = await db.collection('inventory')
                    .where('name', '==', item.itemName)
                    .get();

                if (querySnapshot.empty) {
                    // Add new ingredient if not found
                    await db.collection('inventory').add({
                        name: item.itemName,
                        quantity: baseQty,
                        unitOfMeasure: baseUnit,
                        lastUpdated: firebase.firestore.Timestamp.now()
                    });
                    addedCount++;
                    continue;
                }

                querySnapshot.forEach((doc) => {
                    const currentData = doc.data();
                    const newQuantity = (currentData.quantity || 0) + baseQty;
                    batch.update(doc.ref, {
                        quantity: newQuantity,
                        unitOfMeasure: baseUnit,
                        lastUpdated: firebase.firestore.Timestamp.now()
                    });
                    updatedCount++;
                });

            } catch (error) {
                console.error(`Error processing ${item.itemName}:`, error);
            }
        }

        if (updatedCount > 0) {
            await batch.commit();
        }

        let message = `Successfully updated ${updatedCount} items.`;
        if (addedCount > 0) {
            message += `\nAdded ${addedCount} new ingredients.`;
        }
        if (notFound.length > 0) {
            message += `\n\nItems not found in inventory:\n${notFound.join('\n')}`;
        }

        if (updatedCount > 0 || addedCount > 0 || notFound.length > 0) {
            alert(message);
        }
    }

    function downloadRestockTemplate() {
        const templateData = [
            ['VIKTORIAS BISTRO - RESTOCK TEMPLATE'],
            ['Use this template to upload restock quantities'],
            ['You can also use exported restock reports directly for upload'],
            [],
            ['OPTION 1: Restock Format'],
            ['Item Name', 'Restock Quantity', 'Unit of Measure', 'Notes'],
            ['Chicken Breast', 50, 'kg', 'Add 50 kg to current stock'],
            ['Rice', 25, 'kg', 'Add 25 kg to current stock'],
            ['Cooking Oil', 10, 'liters', 'Add 10 liters to current stock'],
            [],
            ['OPTION 2: Current Stock Format (from reports)'],
            ['Item Name', 'Current Stock', 'Unit of Measure'],
            ['can', 15, 'pcs'],
            ['egg', 20, 'pcs'],
            [],
            ['Instructions:'],
            ['- Use Item Name column (required)'],
            ['- Use Restock Quantity OR Current Stock column'],
            ['- Include Unit of Measure for clarity (required for upload)'],
            ['- System will automatically detect and process the format'],
            ['- You can upload exported restock reports directly']
        ];

        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(templateData);

            // Set column widths
            ws['!cols'] = [
                { wch: 25 }, // Item Name
                { wch: 18 }, // Restock Quantity/Current Stock
                { wch: 40 }  // Notes/Unit
            ];

            // Style headers
            const headerStyle = {
                font: { bold: true },
                fill: { fgColor: { rgb: "E8F4FD" } }
            };

            const sectionStyle = {
                font: { bold: true, sz: 12 },
                fill: { fgColor: { rgb: "F0F8FF" } }
            };

            if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };
            if (ws['A2']) ws['A2'].s = { font: { sz: 10, italic: true } };
            if (ws['A3']) ws['A3'].s = { font: { sz: 10, italic: true } };

            // Style section headers
            if (ws['A5']) ws['A5'].s = sectionStyle;
            if (ws['A11']) ws['A11'].s = sectionStyle;
            if (ws['A16']) ws['A16'].s = sectionStyle;

            // Style the data headers
            ['A6', 'B6', 'C6'].forEach(cell => {
                if (ws[cell]) ws[cell].s = headerStyle;
            });

            ['A12', 'B12', 'C12'].forEach(cell => {
                if (ws[cell]) ws[cell].s = headerStyle;
            });

            XLSX.utils.book_append_sheet(wb, ws, 'Restock Template');
            XLSX.writeFile(wb, 'Restock_Template.xlsx');

        } catch (error) {
            console.error('Error generating template:', error);
            alert('Error generating template. Please try again.');
        }
    }

    // --- AUTO UPDATE MENU AVAILABILITY BASED ON INVENTORY ---
    async function updateMenuAvailabilityBasedOnInventory() {
        const db = firebase.firestore();
        // Get all ingredients that are empty
        const emptyIngredients = [];
        const inventorySnapshot = await db.collection('inventory').where('quantity', '==', 0).get();
        inventorySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) emptyIngredients.push(data.name);
        });
        if (emptyIngredients.length === 0) return;
        // For each menu item, check if it uses any empty ingredient
        const menuSnapshot = await db.collection('menu').get();
        menuSnapshot.forEach(async menuDoc => {
            const menuData = menuDoc.data();
            // Assume menuData.ingredients is an array of ingredient names used by the product
            if (Array.isArray(menuData.ingredients)) {
                const usesEmpty = menuData.ingredients.some(ing => emptyIngredients.includes(ing));
                if (usesEmpty && menuData.available !== false) {
                    await db.collection('menu').doc(menuDoc.id).update({ available: false });
                    console.log(`Set menu item '${menuData.name}' as unavailable due to empty ingredient.`);
                }
            }
        });
    }
    // Call this after inventory updates
    window.updateMenuAvailabilityBasedOnInventory = updateMenuAvailabilityBasedOnInventory;


    waitForFirebase();

    // Deduct ingredients for a product (call from POS)
    window.deductIngredientsForProduct = async function (product) {
        if (!product || !product.ingredients || !Array.isArray(product.ingredients)) {
            alert('No ingredients to deduct for product: ' + (product?.name || 'Unknown'));
            return;
        }
        const db = (window.firebase && firebase.firestore) ? firebase.firestore() : null;
        if (!db) {
            alert('Inventory system not available.');
            return;
        }
        let deductionSummary = [];
        let errors = [];
        for (const ingredient of product.ingredients) {
            const { name, quantity, unit, docId } = ingredient;
            if (!name || !quantity) continue;
            try {
                let docRef = null;
                let docData = null;
                if (docId) {
                    docRef = db.collection('inventory').doc(docId);
                    const docSnap = await docRef.get();
                    if (docSnap.exists) docData = docSnap.data();
                } else {
                    const query = await db.collection('inventory').where('name', '==', name).limit(1).get();
                    if (!query.empty) {
                        docRef = db.collection('inventory').doc(query.docs[0].id);
                        docData = query.docs[0].data();
                    }
                }
                if (docRef && docData) {
                    // Always convert deduction to base unit
                    let baseDeduct = 0;
                    let orderUnit = unit ? unit.trim().toLowerCase() : '';
                    if (orderUnit === 'kg' && docData.unitOfMeasure === 'g') {
                        baseDeduct = quantity * 1000;
                    } else if (orderUnit === 'g' && docData.unitOfMeasure === 'g') {
                        baseDeduct = quantity;
                    } else if ((orderUnit === 'l' || orderUnit === 'liter' || orderUnit === 'liters') && docData.unitOfMeasure === 'ml') {
                        baseDeduct = quantity * 1000;
                    } else if (orderUnit === 'ml' && docData.unitOfMeasure === 'ml') {
                        baseDeduct = quantity;
                    } else if (['pcs', 'piece', 'pieces'].includes(orderUnit) && docData.unitOfMeasure === 'pcs') {
                        baseDeduct = quantity;
                    } else {
                        errors.push(`Unit mismatch for ${name}. Inventory unit: ${docData.unitOfMeasure}, deduction unit: ${unit}`);
                        continue;
                    }
                    const newQty = (docData.quantity || 0) - baseDeduct;
                    if (newQty < 0) {
                        errors.push(`Not enough stock for ${name}. Required: ${baseDeduct}, Available: ${docData.quantity}`);
                        continue;
                    }
                    await docRef.update({ quantity: newQty });
                    deductionSummary.push(`${name}: -${baseDeduct} (new: ${newQty})`);
                } else {
                    errors.push(`Ingredient not found in inventory: ${name}`);
                }
            } catch (err) {
                errors.push(`Error deducting ${name}: ${err.message}`);
            }
        }
        if (deductionSummary.length > 0) {
            alert('Ingredients deducted:\n' + deductionSummary.join('\n'));
        }
        if (errors.length > 0) {
            alert('Inventory deduction errors:\n' + errors.join('\n'));
        }
    };

    // Deduct stock for weight/volume/pieces units and return updated stock, display, and status
    function deductAndStatus({
        currentStock, orderQty, orderUnit, threshold, unitType = 'weight', baseUnit = null
    }) {
        // unitType: 'weight', 'volume', or 'pieces'
        // Supported units: Kg, g, L, mL, pcs
        // baseUnit: 'g', 'mL', or 'pcs' (optional, auto-detects if not provided)
        let baseStock, baseOrder, displayValue, displayUnit, status;
        let _baseUnit = baseUnit;

        // Determine base unit and convert order to base
        if (unitType === 'weight') {
            _baseUnit = 'g';
            if (orderUnit.toLowerCase() === 'kg') baseOrder = orderQty * 1000;
            else if (orderUnit.toLowerCase() === 'g') baseOrder = orderQty;
            else throw new Error('Unsupported weight unit');
            baseStock = currentStock; // currentStock should already be in grams
        } else if (unitType === 'volume') {
            _baseUnit = 'mL';
            if (orderUnit.toLowerCase() === 'l') baseOrder = orderQty * 1000;
            else if (orderUnit.toLowerCase() === 'ml') baseOrder = orderQty;
            else throw new Error('Unsupported volume unit');
            baseStock = currentStock; // currentStock should already be in mL
        } else if (unitType === 'pieces') {
            _baseUnit = 'pcs';
            if (orderUnit.toLowerCase() === 'pcs' || orderUnit.toLowerCase() === 'piece' || orderUnit.toLowerCase() === 'pieces') baseOrder = orderQty;
            else throw new Error('Unsupported pieces unit');
            baseStock = currentStock; // currentStock should already be in pcs
        } else {
            throw new Error('unitType must be weight, volume, or pieces');
        }

        // Deduct
        let updatedStock = baseStock - baseOrder;
        if (updatedStock < 0) updatedStock = 0;

        // Display logic
        if (unitType === 'weight') {
            if (updatedStock >= 1000) {
                displayValue = (updatedStock / 1000).toFixed(2).replace(/\.00$/, '');
                displayUnit = 'Kg';
            } else {
                displayValue = updatedStock;
                displayUnit = 'g';
            }
        } else if (unitType === 'volume') {
            if (updatedStock >= 1000) {
                displayValue = (updatedStock / 1000).toFixed(2).replace(/\.00$/, '');
                displayUnit = 'L';
            } else {
                displayValue = updatedStock;
                displayUnit = 'mL';
            }
        } else {
            displayValue = updatedStock;
            displayUnit = 'pcs';
        }

        // Status logic
        if (updatedStock <= 0) {
            status = 'Empty';
        } else if (updatedStock > 0 && updatedStock <= threshold) {
            status = 'Need Restocking';
        } else {
            status = 'Steady';
        }

        return {
            stockBase: updatedStock,
            stockDisplay: `${displayValue} ${displayUnit}`,
            status: status
        };
    }

    // Example usage:
    // let result = deductAndStatus({
    //   currentStock: 2000, orderQty: 250, orderUnit: 'g', threshold: 1000, unitType: 'weight'
    // });
    // result => { stockBase: 1750, stockDisplay: '1.75 Kg', status: 'Steady' }


    // --- UNIT CONVERSION MAP AND DEDUCTION LOGIC ---
    const UNIT_CONVERSIONS = {
        // weight
        'kg': { base: 'g', factor: 1000 },
        'g': { base: 'g', factor: 1 },
        // volume
        'l': { base: 'ml', factor: 1000 },
        'ml': { base: 'ml', factor: 1 },
        // pieces
        'pcs': { base: 'pcs', factor: 1 },
        'piece': { base: 'pcs', factor: 1 },
        'pieces': { base: 'pcs', factor: 1 },
        // box (must provide piecesPerBox in context)
        'box': { base: 'pcs', factor: null } // handled dynamically
    };

    function toBaseUnit(value, unit, piecesPerBox) {
        unit = unit.toLowerCase();
        if (unit === 'box') {
            if (!piecesPerBox) throw new Error('piecesPerBox required for box conversion');
            return value * piecesPerBox;
        }
        const conv = UNIT_CONVERSIONS[unit];
        if (!conv) throw new Error('Unsupported unit: ' + unit);
        return value * conv.factor;
    }

    function fromBaseUnit(value, baseUnit, piecesPerBox) {
        // Returns { value, unit } in user-friendly unit
        if (baseUnit === 'g') {
            if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'kg' };
            return { value, unit: 'g' };
        }
        if (baseUnit === 'ml') {
            if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'L' };
            return { value, unit: 'ml' };
        }
        if (baseUnit === 'pcs') {
            if (piecesPerBox && value >= piecesPerBox) {
                // Show as boxes if possible
                return { value: +(value / piecesPerBox).toFixed(2), unit: 'box' };
            }
            return { value, unit: 'pcs' };
        }
        return { value, unit: baseUnit };
    }

    function deductInventory({
        inventoryQty, inventoryUnit, orderQty, orderUnit, baseUnit, piecesPerBox
    }) {
        // Convert both inventory and order to base unit
        const invBase = toBaseUnit(inventoryQty, inventoryUnit, piecesPerBox);
        const orderBase = toBaseUnit(orderQty, orderUnit, piecesPerBox);
        let newBase = invBase - orderBase;
        if (newBase < 0) newBase = 0;
        // For display
        const display = fromBaseUnit(newBase, baseUnit, piecesPerBox);
        return {
            stockBase: newBase,
            stockDisplay: `${display.value} ${display.unit}`,
            value: display.value,
            unit: display.unit
        };
    }

    // --- DEDUCT INVENTORY WITH THRESHOLD AND STATUS ---
    function deductInventoryWithStatus({
        inventoryQty, inventoryUnit, orderQty, orderUnit, baseUnit, thresholdBase, piecesPerBox
    }) {
        // Convert both inventory and order to base unit
        const invBase = toBaseUnit(inventoryQty, inventoryUnit, piecesPerBox);
        const orderBase = toBaseUnit(orderQty, orderUnit, piecesPerBox);
        let newBase = invBase - orderBase;
        if (newBase < 0) newBase = 0;
        // Status logic (priority: Empty > Need Restocking > Steady)
        let status;
        if (newBase <= 0) {
            status = 'Empty';
        } else if (newBase > 0 && newBase <= thresholdBase) {
            status = 'Need Restocking';
        } else {
            status = 'Steady';
        }
        // For display
        const display = fromBaseUnit(newBase, baseUnit, piecesPerBox);
        return {
            stockBase: newBase,
            stockDisplay: `${display.value} ${display.unit}`,
            value: display.value,
            unit: display.unit,
            status: status
        };
    }


    // --- FIXED: DEDUCT INVENTORY WITH PROPER UNIT CONVERSION ---
    function deductInventoryWithConversion({
        inventoryQty, inventoryUnit, orderQty, orderUnit, baseUnit, piecesPerBox
    }) {
        // Convert both inventory and order to base unit using the conversion map
        const invBase = toBaseUnit(inventoryQty, inventoryUnit, piecesPerBox);
        const orderBase = toBaseUnit(orderQty, orderUnit, piecesPerBox);
        let newBase = invBase - orderBase;
        if (newBase < 0) newBase = 0;
        // For display
        const display = fromBaseUnit(newBase, baseUnit, piecesPerBox);
        // Always show 2 decimal places for kg/L/box, integer for g/ml/pcs
        let displayValue = display.value;
        if (['kg', 'L', 'box'].includes(display.unit)) {
            displayValue = (+display.value).toFixed(2).replace(/\.00$/, '');
        }
        return {
            stockBase: newBase,
            stockDisplay: `${displayValue} ${display.unit}`,
            value: +displayValue,
            unit: display.unit
        };
    }

    // --- FIXED: UNIVERSAL INVENTORY DEDUCTION LOGIC ---
    function convertToBase(value, unit) {
        unit = unit.toLowerCase();
        if (unit === 'kg') return value * 1000; // to grams
        if (unit === 'g') return value;
        if (unit === 'l') return value * 1000; // to milliliters
        if (unit === 'ml') return value;
        if (unit === 'pcs' || unit === 'piece' || unit === 'pieces') return value;
        throw new Error('Unsupported unit: ' + unit);
    }

    function convertFromBase(value, baseUnit) {
        if (baseUnit === 'g') {
            if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'kg' };
            return { value, unit: 'g' };
        }
        if (baseUnit === 'ml') {
            if (value >= 1000) return { value: +(value / 1000).toFixed(2), unit: 'L' };
            return { value, unit: 'ml' };
        }
        if (baseUnit === 'pcs') {
            return { value, unit: 'pcs' };
        }
        throw new Error('Unsupported base unit: ' + baseUnit);
    }

    function deductInventoryBase(item, deduction, deductionUnit) {
        // item: { quantity, unit } (unit must be base: g, ml, pcs)
        // deduction: number, deductionUnit: string (can be kg, g, L, ml, pcs)
        const deductionInBase = convertToBase(deduction, deductionUnit);
        let newStock = item.quantity - deductionInBase;
        if (newStock < 0) newStock = 0;
        item.quantity = newStock; // always store in base
        // item.unit should always be base (g, ml, pcs)
    }

    // Format stock for display
    function getDisplayStock(quantity, baseUnit) {

        return convertFromBase(quantity, baseUnit);
    }
}); // <-- Close DOMContentLoaded event listener
