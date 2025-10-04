import { db, collection, getDocs, updateDoc, doc } from './firebase-config.js';

// Function to format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Function to format price
function formatPrice(price) {
    return `₱${parseFloat(price).toFixed(2)}`;
}

// Function to display orders
async function displayOrders() {
    try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const ordersTableBody = document.getElementById('ordersTableBody');
        
        // Clear existing orders
        ordersTableBody.innerHTML = '';
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const row = document.createElement('tr');
            
            // Create table row with order data
            row.innerHTML = `
                <td>${order.orderNumber}</td>
                <td>
                    ${order.items.map(item => 
                        `${item.name} (${item.quantity}x)`
                    ).join('<br>')}
                </td>
                <td>${formatPrice(order.total)}</td>
                <td>
                    <span class="badge bg-${getStatusColor(order.status)}">${order.status}</span>
                </td>
                <td>${formatTime(order.timestamp)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-success" onclick="updateOrderStatus('${doc.id}', 'Completed')">
                            Complete
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="updateOrderStatus('${doc.id}', 'Cancelled')">
                            Cancel
                        </button>
                    </div>
                </td>
            `;
            
            ordersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

// Function to get status color for badge
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'warning';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'danger';
        default:
            return 'secondary';
    }
}

// Function to update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: newStatus
        });
        
        // Refresh the orders display
        await displayOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Error updating order status. Please try again.');
    }
}

// Add event listener to load orders when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Skip auto-refresh if this is an OMR page
    if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
        return;
    }
    
    displayOrders();
});

// Make functions available globally
window.updateOrderStatus = updateOrderStatus;

// Set up real-time updates (refresh every 30 seconds)
// Skip auto-refresh if this is an OMR page
if (!window.location.pathname.includes('OMR') && !window.location.pathname.includes('omr')) {
    setInterval(displayOrders, 30000);
}
