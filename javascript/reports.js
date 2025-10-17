/**
 * Admin Support Tickets Management
 * Handles viewing, filtering, updating, and responding to customer support tickets
 */

let allTickets = [];
let filteredTickets = [];
let currentTicket = null;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Reports] Initializing support tickets dashboard...');

    try {
        // Wait for Firebase to initialize
        await waitForFirebase();

        // Check admin authentication
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log('[Reports] Admin authenticated:', user.email);
                initializeDashboard();
            } else {
                console.log('[Reports] No admin authenticated, redirecting to login...');
                window.location.href = 'login.html';
            }
        });

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('[Reports] Failed to initialize:', error);

        // Show error message
        const loadingIndicator = document.getElementById('loadingIndicator');
        const noTicketsMessage = document.getElementById('noTicketsMessage');

        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        if (noTicketsMessage) {
            noTicketsMessage.style.display = 'block';
            noTicketsMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #f44336; font-size: 3rem;"></i>
                <h3>Failed to Initialize</h3>
                <p>Firebase could not be loaded. Please check your internet connection and refresh the page.</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem; padding: 0.75rem 1.5rem;">Refresh Page</button>
            `;
        }
    }
});

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds (50 * 100ms)

        const checkFirebase = () => {
            attempts++;

            if (typeof firebase !== 'undefined' &&
                firebase.apps &&
                firebase.apps.length > 0 &&
                typeof firebase.firestore === 'function') {
                console.log('[Reports] Firebase initialized successfully after', attempts * 100, 'ms');
                resolve();
            } else if (typeof firebase !== 'undefined' &&
                firebase.auth &&
                firebase.firestore &&
                window.firebaseConfig) {
                // Firebase SDK is loaded but not initialized, initialize it
                console.log('[Reports] Firebase SDK loaded but not initialized, initializing...');
                try {
                    firebase.initializeApp(window.firebaseConfig);
                    console.log('[Reports] Firebase initialized successfully');
                    resolve();
                } catch (error) {
                    console.error('[Reports] Error initializing Firebase:', error);
                    if (attempts >= maxAttempts) {
                        reject(new Error('Firebase initialization failed: ' + error.message));
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                }
            } else if (attempts >= maxAttempts) {
                console.error('[Reports] Firebase initialization timeout after', attempts * 100, 'ms');
                console.error('[Reports] Firebase status:', {
                    firebaseLoaded: typeof firebase !== 'undefined',
                    hasAuth: typeof firebase !== 'undefined' && !!firebase.auth,
                    hasFirestore: typeof firebase !== 'undefined' && !!firebase.firestore,
                    hasConfig: typeof window.firebaseConfig !== 'undefined'
                });
                reject(new Error('Firebase initialization timeout'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('[Reports] Starting dashboard initialization...');

        // Show loading
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        // Load all tickets
        console.log('[Reports] Loading tickets from Firestore...');
        await loadTickets();

        // Hide loading
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        // Setup real-time listener
        console.log('[Reports] Setting up real-time listener...');
        setupRealtimeListener();

        console.log('[Reports] Dashboard initialized successfully');

    } catch (error) {
        console.error('[Reports] Error initializing dashboard:', error);
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }

        // Show error message in UI instead of alert
        const noTicketsMessage = document.getElementById('noTicketsMessage');
        if (noTicketsMessage) {
            noTicketsMessage.style.display = 'block';
            noTicketsMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #f44336;"></i>
                <h3>Error Loading Tickets</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Refresh Page</button>
            `;
        }
    }
}

// Load all tickets from Firestore
async function loadTickets() {
    try {
        const db = firebase.firestore();
        const ticketsSnapshot = await db.collection('supportTickets')
            .orderBy('createdAt', 'desc')
            .get();

        allTickets = [];

        ticketsSnapshot.forEach(doc => {
            allTickets.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`[Reports] Loaded ${allTickets.length} tickets`);

        // Update statistics
        updateStatistics();

        // Apply filters and display
        applyFilters();

    } catch (error) {
        console.error('[Reports] Error loading tickets:', error);
        throw error;
    }
}

// Setup real-time listener for ticket updates
function setupRealtimeListener() {
    const db = firebase.firestore();

    db.collection('supportTickets')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('[Reports] Real-time update received');

            snapshot.docChanges().forEach((change) => {
                const ticketData = { id: change.doc.id, ...change.doc.data() };

                if (change.type === 'added') {
                    // Check if ticket already exists
                    const existingIndex = allTickets.findIndex(t => t.id === ticketData.id);
                    if (existingIndex === -1) {
                        allTickets.unshift(ticketData);
                    }
                }

                if (change.type === 'modified') {
                    const index = allTickets.findIndex(t => t.id === ticketData.id);
                    if (index !== -1) {
                        allTickets[index] = ticketData;
                    }
                }

                if (change.type === 'removed') {
                    allTickets = allTickets.filter(t => t.id !== ticketData.id);
                }
            });

            // Update display
            updateStatistics();
            applyFilters();
        }, (error) => {
            console.error('[Reports] Real-time listener error:', error);
        });
}

// Update statistics cards
function updateStatistics() {
    const pending = allTickets.filter(t => t.status === 'pending').length;
    const inProgress = allTickets.filter(t => t.status === 'in-progress').length;
    const resolved = allTickets.filter(t => t.status === 'resolved').length;
    const total = allTickets.length;

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statInProgress').textContent = inProgress;
    document.getElementById('statResolved').textContent = resolved;
    document.getElementById('statTotal').textContent = total;
}

// Setup event listeners
function setupEventListeners() {
    // Filter change listeners
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('filterCategory').addEventListener('change', applyFilters);

    // Search input listener
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });
}

// Apply filters to tickets
function applyFilters() {
    const statusFilter = document.getElementById('filterStatus').value;
    const categoryFilter = document.getElementById('filterCategory').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    filteredTickets = allTickets.filter(ticket => {
        // Status filter
        if (statusFilter !== 'all' && ticket.status !== statusFilter) {
            return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && ticket.category !== categoryFilter) {
            return false;
        }

        // Search filter
        if (searchQuery) {
            const searchableText = `
                ${ticket.ticketId || ''}
                ${ticket.customerName || ''}
                ${ticket.customerEmail || ''}
                ${ticket.subject || ''}
                ${ticket.description || ''}
            `.toLowerCase();

            if (!searchableText.includes(searchQuery)) {
                return false;
            }
        }

        return true;
    });

    console.log(`[Reports] Filtered: ${filteredTickets.length} / ${allTickets.length} tickets`);

    // Sort tickets by status when "All" is selected
    if (statusFilter === 'all') {
        const statusOrder = ['pending', 'in-progress', 'resolved', 'closed'];
        filteredTickets.sort((a, b) => {
            const aIndex = statusOrder.indexOf(a.status);
            const bIndex = statusOrder.indexOf(b.status);
            return aIndex - bIndex;
        });
    }

    // Display filtered tickets
    displayTickets();
}

// Display tickets in table
function displayTickets() {
    const tbody = document.getElementById('ticketsTableBody');
    const table = document.getElementById('ticketsTable');
    const noTicketsMessage = document.getElementById('noTicketsMessage');

    if (filteredTickets.length === 0) {
        table.style.display = 'none';
        noTicketsMessage.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    noTicketsMessage.style.display = 'none';
    tbody.innerHTML = '';

    filteredTickets.forEach(ticket => {
        const row = createTicketRow(ticket);
        tbody.appendChild(row);
    });
}

// Create a table row for a ticket
function createTicketRow(ticket) {
    const tr = document.createElement('tr');

    // Format date
    const date = ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleDateString() : 'N/A';

    // Create status badge
    const statusClass = `status-${ticket.status}`;

    // Get category icon
    const categoryIcon = getCategoryIcon(ticket.category);

    tr.innerHTML = `
        <td><strong>${ticket.ticketId || 'N/A'}</strong></td>
        <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <strong>${ticket.customerName || 'Unknown'}</strong>
                <small style="color: #666;">${ticket.customerEmail || ''}</small>
            </div>
        </td>
        <td>
            <span class="category-badge">
                <i class="fas ${categoryIcon}"></i>
                ${formatCategory(ticket.category)}
            </span>
        </td>
        <td>${ticket.subject || 'No subject'}</td>
        <td><span class="status-badge ${statusClass}">${formatStatus(ticket.status)}</span></td>
        <td>${date}</td>
        <td>
            <button class="action-btn" onclick="viewTicketDetails('${ticket.id}')">
                <i class="fas fa-eye"></i> View
            </button>
        </td>
    `;

    return tr;
}

// View ticket details
async function viewTicketDetails(ticketId) {
    try {
        const ticket = allTickets.find(t => t.id === ticketId);
        if (!ticket) {
            alert('Ticket not found');
            return;
        }

        currentTicket = ticket;

        // Build modal content
        const modalBody = document.getElementById('ticketModalBody');
        modalBody.innerHTML = buildTicketDetailHTML(ticket);

        // Show modal
        document.getElementById('ticketModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';

    } catch (error) {
        console.error('[Reports] Error viewing ticket:', error);
        alert('Error loading ticket details');
    }
}

// Build ticket detail HTML
function buildTicketDetailHTML(ticket) {
    const date = ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleString() : 'N/A';
    const updatedDate = ticket.updatedAt ? new Date(ticket.updatedAt.toDate()).toLocaleString() : 'N/A';
    const categoryIcon = getCategoryIcon(ticket.category);

    let html = `
        <div class="ticket-detail-header">
            <h3>${ticket.subject || 'No Subject'}</h3>
            <div class="ticket-meta">
                <div class="meta-item">
                    <span class="meta-label">Ticket ID</span>
                    <span class="meta-value"><strong>${ticket.ticketId}</strong></span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Customer</span>
                    <span class="meta-value">${ticket.customerName || 'Unknown'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Email</span>
                    <span class="meta-value">${ticket.customerEmail || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Phone</span>
                    <span class="meta-value">${ticket.customerPhone || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Category</span>
                    <span class="meta-value">
                        <i class="fas ${categoryIcon}" style="color: #933F32;"></i>
                        ${formatCategory(ticket.category)}
                    </span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Status</span>
                    <span class="meta-value">
                        <span class="status-badge status-${ticket.status}">${formatStatus(ticket.status)}</span>
                    </span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Created</span>
                    <span class="meta-value">${date}</span>
                </div>
            </div>
        </div>

        <div class="ticket-description">
            <h4><i class="fas fa-align-left"></i> Description</h4>
            <p>${ticket.description || 'No description provided'}</p>
        </div>
    `;

    // Add photo if exists
    if (ticket.photoURL) {
        html += `
            <div class="ticket-photo">
                <h4><i class="fas fa-image"></i> Attached Photo</h4>
                <img src="${ticket.photoURL}" alt="Ticket Photo" style="max-width: 100%; border-radius: 8px;">
            </div>
        `;
    }

    // Admin Actions
    html += `
        <div class="admin-actions">
            <h4><i class="fas fa-user-shield"></i> Admin Actions</h4>
            
            <div class="action-form-group">
                <label for="statusUpdate">Update Status</label>
                <select id="statusUpdate">
                    <option value="pending" ${ticket.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in-progress" ${ticket.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="resolved" ${ticket.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
            </div>
            
            <div class="action-form-group">
                <label for="adminResponse">Add Response/Note</label>
                <textarea id="adminResponse" placeholder="Type your response or internal note here..."></textarea>
            </div>
            
            <div class="action-buttons">
                <button class="btn-primary" onclick="updateTicket()">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                <button class="btn-secondary" onclick="closeTicketModal()">
                    Cancel
                </button>
            </div>
        </div>
    `;

    // Conversation Thread
    if (ticket.conversation && ticket.conversation.length > 0) {
        html += `
            <div class="conversation-thread">
                <h4><i class="fas fa-comments"></i> Conversation History (${ticket.conversation.length})</h4>
        `;

        ticket.conversation.forEach(msg => {
            const msgDate = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'N/A';
            const isAdmin = msg.from === 'admin';

            html += `
                <div class="conversation-message ${isAdmin ? 'admin-message' : ''}">
                    <div class="message-header">
                        <span class="message-author">
                            ${msg.authorName || (isAdmin ? 'Admin' : 'Customer')}
                            ${isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
                        </span>
                        <span class="message-time">${msgDate}</span>
                    </div>
                    <div class="message-content">${msg.message}</div>
                </div>
            `;
        });

        html += `</div>`;
    }

    return html;
}

// Update ticket (status and add response)
async function updateTicket() {
    if (!currentTicket) {
        alert('No ticket selected');
        return;
    }

    try {
        const newStatus = document.getElementById('statusUpdate').value;
        const response = document.getElementById('adminResponse').value.trim();

        const db = firebase.firestore();
        const updateData = {
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Add response to conversation if provided
        if (response) {
            const adminUser = firebase.auth().currentUser;
            const conversationEntry = {
                from: 'admin',
                authorName: adminUser.displayName || adminUser.email || 'Admin',
                message: response,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            updateData.conversation = firebase.firestore.FieldValue.arrayUnion(conversationEntry);
        }

        // Update in Firestore
        await db.collection('supportTickets').doc(currentTicket.id).update(updateData);

        console.log('[Reports] Ticket updated successfully');
        alert('Ticket updated successfully!');

        // Close modal
        closeTicketModal();

        // Reload tickets
        await loadTickets();

    } catch (error) {
        console.error('[Reports] Error updating ticket:', error);
        alert('Error updating ticket. Please try again.');
    }
}

// Close ticket modal
function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
    document.body.style.overflow = '';
    currentTicket = null;
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        'delivery-issue': 'fa-truck',
        'food-quality': 'fa-utensils',
        'wrong-order': 'fa-exchange-alt',
        'missing-items': 'fa-box-open',
        'payment-issue': 'fa-credit-card',
        'other': 'fa-question-circle'
    };
    return icons[category] || 'fa-tag';
}

// Format category for display
function formatCategory(category) {
    const labels = {
        'delivery-issue': 'Delivery Issue',
        'food-quality': 'Food Quality',
        'wrong-order': 'Wrong Order',
        'missing-items': 'Missing Items',
        'payment-issue': 'Payment Issue',
        'other': 'Other'
    };
    return labels[category] || category;
}

// Format status for display
function formatStatus(status) {
    const labels = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed'
    };
    return labels[status] || status;
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('ticketModal');
        if (modal && modal.style.display === 'flex') {
            closeTicketModal();
        }
    }
});

// Close modal on overlay click
document.getElementById('ticketModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'ticketModal') {
        closeTicketModal();
    }
});

console.log('[Reports] Script loaded');
