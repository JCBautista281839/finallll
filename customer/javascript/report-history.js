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
            <div style="display: flex; align-items: center; margin-bottom: 20px; gap: 70px;">
                <h2 style="margin: 0; color: #333; flex-grow: 1; white-space: nowrap;">
                    <i class="fas fa-ticket-alt" style="color: #933F32;"></i>
                    Ticket Details
                </h2>
                <button onclick="this.closest('.ticket-detail-modal').remove()" 
                    style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #933F32; padding: 0; flex-shrink: 0;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #933F32;">${ticket.ticketId || docId.substring(0, 10)}</strong>
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
                    <i class="${categoryIcon}" style="color: #933F32;"></i>
                    <strong>${formatCategory(ticket.category)}</strong>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 0.85rem; color: #999; margin-bottom: 5px;">
                        <i class="fas fa-hashtag"></i> Reference Number
                    </label>
                    <h3 style="margin: 0; color: #333; font-size: 1.1rem;">${ticket.subject}</h3>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 0.85rem; color: #999; margin-bottom: 5px;">
                        <i class="fas fa-align-left"></i> Description
                    </label>
                    <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
                </div>
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
                    <button class="view-photo-btn" onclick="togglePhotoCollapse(this)" 
                        style="background: #f5f5f5; border: 1px solid #ddd; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #333; width: 100%; text-align: left; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
                        <i class="fas fa-eye"></i> View Photo
                        <i class="fas fa-chevron-down" style="margin-left: auto;"></i>
                    </button>
                    <div class="ticket-photo-container" style="margin-top: 12px; display: none;">
                        <img src="${ticket.photoURL}" alt="Ticket attachment" 
                            style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    </div>
                </div>
            ` : ''}
            
            ${ticket.conversation && ticket.conversation.length > 0 ? (() => {
            // Separate admin responses from customer messages
            const adminResponses = ticket.conversation.filter(msg => msg.from === 'admin' || msg.isAdmin);
            const customerMessages = ticket.conversation.filter(msg => msg.from !== 'admin' && !msg.isAdmin);

            console.log('[Ticket Details] Full ticket object:', ticket);
            console.log('[Ticket Details] Conversation array:', ticket.conversation);
            console.log('[Ticket Details] Conversation length:', ticket.conversation.length);
            console.log('[Ticket Details] Admin responses:', adminResponses);
            console.log('[Ticket Details] Customer messages:', customerMessages);

            let html = '';

            // Show admin responses in dedicated section
            if (adminResponses.length > 0) {
                html += `
                        <div style="margin-top: 20px; padding: 16px; background: #f0f7ff; border-left: 4px solid #933F32; border-radius: 8px;">
                            <strong style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; color: #933F32; font-size: 1rem;">
                                <i class="fas fa-user-shield"></i> Support Team Responses (${adminResponses.length})
                            </strong>
                            ${adminResponses.map(msg => {
                    console.log('[Response Item] Processing message:', msg);
                    return `
                                <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid #933F32;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #933F32; display: flex; align-items: center; gap: 6px;">
                                        <i class="fas fa-shield-alt"></i> ${msg.authorName || 'Support Team'}
                                    </div>
                                    <div style="color: #333; line-height: 1.5;">${msg.message}</div>
                                    <div style="font-size: 0.8rem; color: #999; margin-top: 8px;">
                                        <i class="far fa-clock"></i> ${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            `;
                }).join('')}
                        </div>
                    `;
            } else {
                console.log('[Ticket Details] No admin responses found');
            }

            // Show customer messages if any
            if (customerMessages.length > 0) {
                html += `
                        <div style="margin-top: 20px; border-top: 2px solid #e0e0e0; padding-top: 20px;">
                            <strong style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; color: #333;">
                                <i class="fas fa-comments"></i> Your Messages (${customerMessages.length})
                            </strong>
                            ${customerMessages.map(msg => `
                                <div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                                    <div style="font-weight: 600; margin-bottom: 5px; color: #666;">
                                        You
                                    </div>
                                    <div style="color: #333;">${msg.message}</div>
                                    <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                                        ${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
            }

            return html;
        })() : `<div style="margin-top: 20px; padding: 16px; background: #f9f9f9; border-radius: 8px; text-align: center; color: #999;"><i class="fas fa-comment-slash"></i> No responses yet. The support team will reply to your ticket soon.</div>`}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <button onclick="this.closest('.ticket-detail-modal').remove()" 
                    style="width: 100%; padding: 12px; background: #933F32; 
                    color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; 
                    font-family: 'PoppinsMedium', Arial, sans-serif;">
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

// Toggle photo collapse/expand
function togglePhotoCollapse(button) {
    const photoContainer = button.nextElementSibling;
    const isHidden = photoContainer.style.display === 'none';

    if (isHidden) {
        photoContainer.style.display = 'block';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Photo <i class="fas fa-chevron-up" style="margin-left: auto;"></i>';
    } else {
        photoContainer.style.display = 'none';
        button.innerHTML = '<i class="fas fa-eye"></i> View Photo <i class="fas fa-chevron-down" style="margin-left: auto;"></i>';
    }
}
