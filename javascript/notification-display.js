// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

// Function to create order details HTML
function createOrderDetailsHTML(orderDetails) {
    if (!orderDetails || !orderDetails.items || orderDetails.items.length === 0) {
        return '';
    }

    const orderTypeDisplay = orderDetails.orderType.charAt(0).toUpperCase() + orderDetails.orderType.slice(1);

    return `
        <div class="notification-order-details">
            <div class="order-type-badge">${orderTypeDisplay}</div>
            <h4>Order Details</h4>
            <table class="order-items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderDetails.items.map(item => `
                        <tr>
                            <td>
                                ${item.name}
                                ${item.specialInstructions ? 
                                    `<br><small class="text-muted">${item.specialInstructions}</small>` 
                                    : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.price)}</td>
                            <td>${formatCurrency(item.subtotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="order-summary">
                <div class="order-summary-row">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(orderDetails.subtotal)}</span>
                </div>
                ${orderDetails.deliveryFee > 0 ? `
                    <div class="order-summary-row">
                        <span>Delivery Fee:</span>
                        <span>${formatCurrency(orderDetails.deliveryFee)}</span>
                    </div>
                ` : ''}
                <div class="order-summary-row order-total">
                    <span>Total:</span>
                    <span>${formatCurrency(orderDetails.totalAmount)}</span>
                </div>
            </div>
        </div>
    `;
}

// Function to update the notification display
function updateNotificationDisplay(notification, element) {
    // Add order details section after the existing notification content
    const orderDetailsSection = createOrderDetailsHTML(notification.orderDetails);
    if (orderDetailsSection) {
        const contentDiv = element.querySelector('.notification-content');
        if (contentDiv) {
            contentDiv.insertAdjacentHTML('beforeend', orderDetailsSection);
        }
    }
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        createOrderDetailsHTML,
        updateNotificationDisplay
    };
}