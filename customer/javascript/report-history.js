/**
 * Report History JavaScript
 * Displays customer's support tickets in the account page
 */

let allCustomerTickets = []; // Store all tickets
let showingAllTickets = false; // Track if showing all or just one

// Load tickets when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth state
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                loadCustomerTickets(user.uid);
            }
        });
    }
});

// Navigate to submit report page - NOW OPENS MODAL
function goToSubmitReport() {
    openReportModal();
}

// Toggle between showing one ticket and all tickets
function toggleAllTickets() {
    const btn = document.getElementById('viewTicketsBtn');
    const ticketsList = document.getElementById('tickets-list');
    
    if (!ticketsList) return;
    
    showingAllTickets = !showingAllTickets;
    
    if (showingAllTickets) {
        // Show all tickets
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Show Less';
        displayTickets(allCustomerTickets);
    } else {
        // Show only most recent ticket
        btn.innerHTML = '<i class="fas fa-history"></i> View Past Tickets';
        displayTickets(allCustomerTickets.slice(0, 1));
    }
}

// Display tickets in the list
function displayTickets(tickets) {
    const ticketsList = document.getElementById('tickets-list');
    if (!ticketsList) return;
    
    ticketsList.innerHTML = '';
    tickets.forEach(({ id, data }) => {
        const ticketElement = createTicketElement(id, data);
        ticketsList.appendChild(ticketElement);
    });
}

// Load customer's support tickets
async function loadCustomerTickets(userId) {
    const ticketsLoading = document.getElementById('tickets-loading');
    const noTickets = document.getElementById('no-tickets');
    const ticketsList = document.getElementById('tickets-list');
    
    // Show loading
    if (ticketsLoading) ticketsLoading.style.display = 'block';
    if (noTickets) noTickets.style.display = 'none';
    if (ticketsList) ticketsList.innerHTML = '';
    
    try {
        const db = firebase.firestore();
        
        // Query tickets for this customer
        // Removed orderBy to avoid index requirement - will sort in JavaScript instead
        const ticketsSnapshot = await db.collection('supportTickets')
            .where('customerId', '==', userId)
            .get();
        
        // Hide loading
        if (ticketsLoading) ticketsLoading.style.display = 'none';
        
        if (ticketsSnapshot.empty) {
            if (noTickets) noTickets.style.display = 'block';
        } else {
            // Get all tickets and sort them
            allCustomerTickets = [];
            ticketsSnapshot.forEach(doc => {
                allCustomerTickets.push({ id: doc.id, data: doc.data() });
            });
            
            // Sort by createdAt descending
            allCustomerTickets.sort((a, b) => {
                if (!a.data.createdAt || !b.data.createdAt) return 0;
                return b.data.createdAt.toMillis() - a.data.createdAt.toMillis();
            });
            
            // Display only the most recent ticket by default
            displayTickets(allCustomerTickets.slice(0, 1));
            
            // Show/hide the "View Past Tickets" button
            const viewTicketsBtn = document.getElementById('viewTicketsBtn');
            if (viewTicketsBtn) {
                if (allCustomerTickets.length > 1) {
                    viewTicketsBtn.style.display = 'inline-flex';
                } else {
                    viewTicketsBtn.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('[Report History] Error loading tickets:', error);
        if (ticketsLoading) ticketsLoading.style.display = 'none';
        if (noTickets) {
            noTickets.style.display = 'block';
            noTickets.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading tickets</p>
                <small>Please try again later</small>
            `;
        }
    }
}

// Create ticket element
function createTicketElement(docId, ticket) {
    const ticketCard = document.createElement('div');
    ticketCard.className = 'ticket-card';
    
    // Get status badge class
    const statusClass = getStatusClass(ticket.status);
    const statusText = formatStatus(ticket.status);
    
    // Get category icon
    const categoryIcon = getCategoryIcon(ticket.category);
    
    // Format date
    const dateStr = ticket.createdAt ? 
        new Date(ticket.createdAt.toDate()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'Unknown date';
    
    ticketCard.innerHTML = `
        <div class="ticket-header">
            <div class="ticket-id">
                <i class="fas fa-ticket-alt"></i>
                <strong>${ticket.ticketId || docId.substring(0, 10)}</strong>
            </div>
            <span class="ticket-status ${statusClass}">${statusText}</span>
        </div>
        <div class="ticket-content">
            <div class="ticket-category">
                <i class="${categoryIcon}"></i>
                <span>${formatCategory(ticket.category)}</span>
            </div>
            <h4 class="ticket-subject">${ticket.subject}</h4>
            <p class="ticket-description">${truncateText(ticket.description, 100)}</p>
        </div>
        <div class="ticket-footer">
            <span class="ticket-date">
                <i class="far fa-calendar"></i> ${dateStr}
            </span>
            ${ticket.orderId ? `
                <span class="ticket-order">
                    <i class="fas fa-receipt"></i> Order: ${ticket.orderId.substring(0, 8)}
                </span>
            ` : ''}
        </div>
    `;
    
    // Add click to expand/view details
    ticketCard.addEventListener('click', () => showTicketDetails(docId, ticket));
    
    return ticketCard;
}

// Get status badge class
function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'in-progress': 'status-in-progress',
        'resolved': 'status-resolved',
        'closed': 'status-closed'
    };
    return statusMap[status] || 'status-pending';
}

// Format status text
function formatStatus(status) {
    const statusMap = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed'
    };
    return statusMap[status] || status;
}

// Get category icon
function getCategoryIcon(category) {
    const iconMap = {
        'delivery-issue': 'fas fa-truck',
        'food-quality': 'fas fa-utensils',
        'wrong-order': 'fas fa-exchange-alt',
        'missing-items': 'fas fa-box-open',
        'payment-issue': 'fas fa-credit-card',
        'other': 'fas fa-question-circle'
    };
    return iconMap[category] || 'fas fa-question-circle';
}

// Format category text
function formatCategory(category) {
    const categoryMap = {
        'delivery-issue': 'Delivery Issue',
        'food-quality': 'Food Quality',
        'wrong-order': 'Wrong Order',
        'missing-items': 'Missing Items',
        'payment-issue': 'Payment Issue',
        'other': 'Other'
    };
    return categoryMap[category] || category;
}

// Truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Show ticket details modal
function showTicketDetails(docId, ticket) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'ticket-detail-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
    `;
    
    const statusClass = getStatusClass(ticket.status);
    const statusText = formatStatus(ticket.status);
    const categoryIcon = getCategoryIcon(ticket.category);
    
    const dateStr = ticket.createdAt ? 
        new Date(ticket.createdAt.toDate()).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }) : 'Unknown date';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #333;">
                    <i class="fas fa-ticket-alt" style="color: #667eea;"></i>
                    Ticket Details
                </h2>
                <button onclick="this.closest('.ticket-detail-modal').remove()" 
                    style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #667eea;">${ticket.ticketId || docId.substring(0, 10)}</strong>
                    <span class="ticket-status ${statusClass}" style="padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                        ${statusText}
                    </span>
                </div>
                <div style="font-size: 0.9rem; color: #666;">
                    <i class="far fa-calendar"></i> Submitted: ${dateStr}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <i class="${categoryIcon}" style="color: #667eea;"></i>
                    <strong>${formatCategory(ticket.category)}</strong>
                </div>
                <h3 style="margin: 10px 0; color: #333;">${ticket.subject}</h3>
                <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
            </div>
            
            ${ticket.orderId ? `
                <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                    <strong style="color: #856404;">
                        <i class="fas fa-receipt"></i> Related Order:
                    </strong>
                    <span style="color: #856404;">${ticket.orderId}</span>
                </div>
            ` : ''}
            
            ${ticket.photoURL ? `
                <div style="margin-bottom: 20px;">
                    <strong style="display: block; margin-bottom: 10px; color: #333;">
                        <i class="fas fa-image"></i> Attachment:
                    </strong>
                    <img src="${ticket.photoURL}" alt="Ticket attachment" 
                        style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
            ` : ''}
            
            ${ticket.conversation && ticket.conversation.length > 0 ? `
                <div style="margin-top: 20px; border-top: 2px solid #e0e0e0; padding-top: 20px;">
                    <strong style="display: block; margin-bottom: 15px; color: #333;">
                        <i class="fas fa-comments"></i> Conversation:
                    </strong>
                    ${ticket.conversation.map(msg => `
                        <div style="background: ${msg.isAdmin ? '#e3f2fd' : '#f5f5f5'}; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                            <div style="font-weight: 600; margin-bottom: 5px; color: ${msg.isAdmin ? '#1976d2' : '#666'};">
                                ${msg.isAdmin ? 'Support Team' : 'You'}
                            </div>
                            <div style="color: #333;">${msg.message}</div>
                            <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                                ${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <button onclick="this.closest('.ticket-detail-modal').remove()" 
                    style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
