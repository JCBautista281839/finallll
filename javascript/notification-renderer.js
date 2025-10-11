function renderNotification(notification) {
    // Create the basic notification structure
    const notificationRow = document.createElement('tr');
    notificationRow.id = `notification-${notification.id}`;
    notificationRow.className = 'notification-row' + (notification.seen ? '' : ' unread');

    // Create the notification content
    const contentCell = document.createElement('td');
    contentCell.className = 'notification-content';

    // Create main notification info
    const mainInfo = document.createElement('div');
    mainInfo.className = 'notification-main-info';
    mainInfo.innerHTML = `
        <strong>${notification.customerInfo.name}</strong>
        <p>${notification.message}</p>
        <div class="notification-meta">
            <span class="notification-time">${formatTimestamp(notification.timestamp)}</span>
            <span class="notification-status ${notification.status}">${notification.status}</span>
        </div>
    `;
    contentCell.appendChild(mainInfo);

    // Add order details if they exist
    if (notification.orderDetails && notification.orderDetails.items) {
        const orderDetailsHTML = createOrderDetailsHTML(notification.orderDetails);
        const orderDetailsDiv = document.createElement('div');
        orderDetailsDiv.innerHTML = orderDetailsHTML;
        contentCell.appendChild(orderDetailsDiv);
    }

    // Add actions cell
    const actionsCell = document.createElement('td');
    actionsCell.className = 'notification-actions';
    actionsCell.innerHTML = `
        <button class="btn btn-sm btn-primary approve-btn" onclick="handleApprove('${notification.id}')">
            <i class="fas fa-check"></i> Approve
        </button>
        <button class="btn btn-sm btn-danger reject-btn" onclick="handleReject('${notification.id}')">
            <i class="fas fa-times"></i> Reject
        </button>
    `;

    // Add cells to row
    notificationRow.appendChild(contentCell);
    notificationRow.appendChild(actionsCell);

    return notificationRow;
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(date);
}