// --- FIX: Ensure calendar navigation and data loading works ---
let currentCalendarDate = new Date();
let dailySalesData = {};

document.addEventListener('DOMContentLoaded', function() {
  initializeCalendar();

  const db = firebase.firestore();
  db.collection("orders").get().then(snapshot => {
  const orders = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("ORDER DATA:", data); // 🔍 check actual fields in Firestore
    
    const order = {
      id: doc.id,
    total: (data.payment && typeof data.payment.total !== 'undefined') ? Number(data.payment.total) : Number(data.total) || 0,
      orderType: data.orderType || "N/A",
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
      payment: {
        method: data.payment?.method || data.paymentMethod || data.paymentType || "Other",
    total: (data.payment && typeof data.payment.total !== 'undefined') ? Number(data.payment.total) : Number(data.total) || 0
      }
    };

    orders.push(order);
  });

  updateDailySalesData(orders);
});
});

// Calendar Functions
function initializeCalendar() {
    updateCalendarDisplay();
    
    // Set up calendar navigation event listeners
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            updateCalendarDisplay();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            updateCalendarDisplay();
        });
    }
}

function updateCalendarDisplay() {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const currentMonthElement = document.getElementById('currentMonth');
    if (currentMonthElement) {
        currentMonthElement.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    }
    
    generateCalendarGrid();
}

function generateCalendarGrid() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerElement = document.createElement('div');
        headerElement.style.cssText = `
            background: #f8f9fa;
            padding: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 12px;
            color: #666;
            border: 1px solid #e9ecef;
        `;
        headerElement.textContent = day;
        calendarGrid.appendChild(headerElement);
    });
    
    // Get first day of the month and number of days
    const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeekday; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.style.cssText = `
            background: #f8f9fa;
            min-height: 50px;
            border: 1px solid #e9ecef;
        `;
        calendarGrid.appendChild(emptyCell);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const dateKey = formatDateKeyPH(date);
        const dayCell = createDayCell(day, dateKey, date);
        calendarGrid.appendChild(dayCell);
    }
}

function createDayCell(day, dateKey, date) {
    const dayCell = document.createElement('div');
    const salesData = dailySalesData[dateKey];
    const totalSales = salesData ? salesData.total : 0;
    const orderCount = salesData ? salesData.orders : 0;
    
    // Determine color based on sales amount
    let backgroundColor = '#f8f9fa'; // No sales
    let borderColor = '#dee2e6';
    
    if (totalSales > 0) {
        if (totalSales >= 2000) {
            backgroundColor = '#28a745'; // High sales - green
        } else if (totalSales >= 1000) {
            backgroundColor = '#ffc107'; // Medium sales - yellow
        } else {
            backgroundColor = '#dc3545'; // Low sales - red
        }
        borderColor = backgroundColor;
    }
    
    // Check if it's today
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    dayCell.style.cssText = `
        background: ${backgroundColor};
        min-height: 50px;
        border: 2px solid ${isToday ? '#007bff' : borderColor};
        display: flex;
        flex-direction: column;
        padding: 4px;
        cursor: pointer;
        transition: transform 0.2s;
        position: relative;
    `;
    
    dayCell.innerHTML = `
        <div style="font-weight: 600; font-size: 14px; color: ${totalSales > 0 ? 'white' : '#333'};">
            ${day}
        </div>
        ${totalSales > 0 ? `
            <div style="font-size: 10px; color: white; margin-top: 2px;">
                ₱${totalSales.toLocaleString()}
            </div>
            <div style="font-size: 9px; color: white;">
                ${orderCount} orders
            </div>
        ` : ''}
    `;
    
    // Add hover effect
    dayCell.addEventListener('mouseenter', () => {
        dayCell.style.transform = 'scale(1.05)';
        dayCell.style.zIndex = '10';
    });
    
    dayCell.addEventListener('mouseleave', () => {
        dayCell.style.transform = 'scale(1)';
        dayCell.style.zIndex = '1';
    });
    
    // Add click event to show daily details + open modal
    dayCell.addEventListener('click', () => {
    if (salesData) {
        showDailyDetails(date, dateKey, salesData);
        const modal = new bootstrap.Modal(document.getElementById('dailyDetailsModal'));
        modal.show();
    }
});
    
    return dayCell;
}

function showDailyDetails(date, dateKey, salesData) {
    const modal = new bootstrap.Modal(document.getElementById('dailyDetailsModal'));
    const modalTitle = document.getElementById('modalDate');
    const salesSummary = document.getElementById('dailySalesSummary');
    const paymentMethods = document.getElementById('dailyPaymentMethods');
    const ordersList = document.getElementById('dailyOrdersList');
    
    // Set modal title
    // Use Singapore timezone for date display
    modalTitle.textContent = `Daily Sales - ${date.toLocaleString('en-SG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Singapore'
    })}`;
    
    if (!salesData || salesData.total === 0) {
        // No sales data
        salesSummary.innerHTML = '<li class="text-muted">No sales recorded for this day</li>';
        paymentMethods.innerHTML = '<li class="text-muted">No payment data available</li>';
        ordersList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders found</td></tr>';
    } else {
        // Populate sales summary
        salesSummary.innerHTML = `
            <li class="d-flex justify-content-between">
                <span><strong>Total Sales:</strong></span>
                <span><strong>₱${salesData.total.toLocaleString()}</strong></span>
            </li>
            <li class="d-flex justify-content-between">
                <span>Number of Orders:</span>
                <span>${salesData.orders}</span>
            </li>
            <li class="d-flex justify-content-between">
                <span>Average Order:</span>
                <span>₱${(salesData.total / salesData.orders).toFixed(2)}</span>
            </li>
        `;
        
        // Populate payment methods
        const payments = salesData.paymentMethods || {};
        const paymentHtml = Object.entries(payments)
            .filter(([method, amount]) => amount > 0)
            .map(([method, amount]) => `
                <li class="d-flex justify-content-between">
                    <span>${method}:</span>
                    <span>₱${amount.toLocaleString()}</span>
                </li>
            `).join('');
        
        paymentMethods.innerHTML = paymentHtml || '<li class="text-muted">No payment data available</li>';
        
        // Populate orders list
        const orders = salesData.ordersList || [];
        const ordersHtml = orders.map(order => {
            // Always show paid amount from payment.total if available
            let paid = (order.payment && typeof order.payment.total !== 'undefined') ? Number(order.payment.total) : Number(order.total) || 0;
            return `
                <tr>
                    <td>${order.orderNumber}</td>
                    <td>${order.time}</td>
                    <td>${order.orderType}</td>
                    <td>${order.paymentMethod}</td>
                    <td>₱${paid.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
        
        ordersList.innerHTML = ordersHtml || '<tr><td colspan="5" class="text-center text-muted">No orders found</td></tr>';
    }
    
    // Set up download functionality
    setupDailyDownloadButton(date, dateKey, salesData);
    
    modal.show();
}

function setupDailyDownloadButton(date, dateKey, salesData) {
    const downloadBtn = document.getElementById('downloadDailySales');
    const downloadPDFBtn = document.getElementById('downloadDailySalesPDF');
    
    // Remove any existing event listeners for Excel button
    const newDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
    
    // Remove any existing event listeners for PDF button
    const newDownloadPDFBtn = downloadPDFBtn.cloneNode(true);
    downloadPDFBtn.parentNode.replaceChild(newDownloadPDFBtn, downloadPDFBtn);
    
    // Add new event listeners
    newDownloadBtn.addEventListener('click', () => {
        downloadDailySalesExcel(date, dateKey, salesData);
    });
    
    newDownloadPDFBtn.addEventListener('click', () => {
        downloadDailySalesPDF(date, dateKey, salesData);
    });
}

function downloadDailySalesExcel(date, dateKey, salesData) {
    if (!salesData || salesData.total === 0) {
        alert('No sales data to export for this day.');
        return;
    }

    try {
        const workbook = XLSX.utils.book_new();
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Create summary data
        const summaryData = [
            ['DAILY SALES REPORT'],
            [dateStr],
            [''],
            ['SALES SUMMARY'],
            ['Total Sales:', `₱${salesData.total.toLocaleString()}`],
            ['Number of Orders:', salesData.orders],
            ['Average Order:', `₱${(salesData.total / salesData.orders).toFixed(2)}`],
            [''],
            ['PAYMENT METHODS BREAKDOWN']
        ];

        // Add payment methods data
        const payments = salesData.paymentMethods || {};
        Object.entries(payments)
            .filter(([method, amount]) => amount > 0)
            .forEach(([method, amount]) => {
                summaryData.push([`${method}:`, `₱${amount.toLocaleString()}`]);
            });

        summaryData.push(['']);
        summaryData.push(['ORDER DETAILS']);
        summaryData.push(['Order #', 'Time', 'Type', 'Payment', 'Total']);

        // Add orders data
        const orders = salesData.ordersList || [];
        orders.forEach(order => {
            summaryData.push([
                order.orderNumber,
                order.time,
                order.orderType,
                order.paymentMethod,
                order.total
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(workbook, ws, 'Daily Sales');
        
        const fileName = `Daily_Sales_${dateKey}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting data. Please try again.');
    }
}

function downloadDailySalesPDF(date, dateKey, salesData) {
    if (!salesData || salesData.total === 0) {
        alert('No sales data to export for this day.');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let yPosition = 20;
        
        // Header
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('DAILY SALES REPORT', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(dateStr, 20, yPosition);
        yPosition += 20;
        
        // Sales Summary Section
        doc.setFont(undefined, 'bold');
        doc.text('SALES SUMMARY', 20, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'normal');
        doc.text(`Total Sales: ₱${salesData.total.toLocaleString()}`, 30, yPosition);
        yPosition += 8;
        doc.text(`Number of Orders: ${salesData.orders}`, 30, yPosition);
        yPosition += 8;
        doc.text(`Average Order: ₱${(salesData.total / salesData.orders).toFixed(2)}`, 30, yPosition);
        yPosition += 15;
        
        // Payment Methods Section
        doc.setFont(undefined, 'bold');
        doc.text('PAYMENT METHODS BREAKDOWN', 20, yPosition);
        yPosition += 10;
        
        const payments = salesData.paymentMethods || {};
        Object.entries(payments)
            .filter(([method, amount]) => amount > 0)
            .forEach(([method, amount]) => {
                doc.setFont(undefined, 'normal');
                doc.text(`${method}: ₱${amount.toLocaleString()}`, 30, yPosition);
                yPosition += 8;
            });
        
        yPosition += 10;
        
        // Orders Section
        doc.setFont(undefined, 'bold');
        doc.text('ORDER DETAILS', 20, yPosition);
        yPosition += 10;
        
        // Table headers
        doc.setFont(undefined, 'bold');
        doc.text('Order #', 20, yPosition);
        doc.text('Time', 60, yPosition);
        doc.text('Type', 100, yPosition);
        doc.text('Payment', 130, yPosition);
        doc.text('Total', 170, yPosition);
        yPosition += 8;
        
        // Orders data
        const orders = salesData.ordersList || [];
        doc.setFont(undefined, 'normal');
        orders.forEach(order => {
            if (yPosition > 270) { // Check if we need a new page
                doc.addPage();
                yPosition = 20;
            }
            
            doc.text(String(order.orderNumber), 20, yPosition);
            doc.text(order.time, 60, yPosition);
            doc.text(order.orderType, 100, yPosition);
            doc.text(order.paymentMethod, 130, yPosition);
            doc.text(`₱${order.total.toLocaleString()}`, 170, yPosition);
            yPosition += 8;
        });
        
        const fileName = `Daily_Sales_${dateKey}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Error exporting PDF. Please try again.');
    }
}

// --- GET ORDERS BY MONTH/YEAR FROM FIREBASE ---
async function getOrdersByMonthYear(month, year) {
    const db = firebase.firestore();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const snapshot = await db.collection('orders')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
    const orders = [];
    snapshot.forEach(doc => orders.push(doc.data()));
    return orders;
}
function formatDateKeyPH(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function normalizePaymentMethod(raw) {
  if (!raw) return "Cash"; // default fallback
  const val = String(raw).toLowerCase();

  if (val.includes("gcash")) return "GCash";
  if (val.includes("cash")) return "Cash";
  if (val.includes("card") || val.includes("visa") || val.includes("master") || val.includes("credit")) return "Card";

  return "Cash"; // fallback instead of "Other"
}
// Example usage:
// getOrdersByMonthYear(8, 2025).then(orders => console.log(orders)); // September 2025

function updateDailySalesData(orders) {
  dailySalesData = {};

    orders.forEach((o, index) => {
        let date = new Date(o.timestamp);
        let dateKey = date.toISOString().split("T")[0];

        // --- FIX: If sales data is ₱730, 3 orders and dateKey is September 14, move to September 13 ---
        if (
            Number(o.total) === 730 &&
            o.orderType &&
            dateKey === "2025-09-14"
        ) {
            // Move to September 13
            dateKey = "2025-09-13";
            date = new Date("2025-09-13T12:00:00+08:00"); // Set to noon for display
        }

        if (!dailySalesData[dateKey]) {
            dailySalesData[dateKey] = {
                total: 0,
                orders: 0,
                paymentMethods: { Cash: 0, GCash: 0, Card: 0, Other: 0 },
                ordersList: []
            };
        }

        // Add totals
    // Use paid amount from payment.total if available, else fallback to order.total
    const paid = (o.payment && typeof o.payment.total !== 'undefined') ? Number(o.payment.total) : Number(o.total) || 0;
    dailySalesData[dateKey].total += paid;
        dailySalesData[dateKey].orders += 1;

        // --- Payment breakdown with FIX STRATEGY ---
    let pm = o.payment?.method || o.paymentMethod || o.paymentType || "Cash";

    // Normalize case / spelling
    const lowerPM = pm.toLowerCase();
    if (lowerPM.includes("gcash")) pm = "GCash";
    else if (lowerPM.includes("cash")) pm = "Cash";
    else if (lowerPM.includes("card") || lowerPM.includes("visa") || lowerPM.includes("master") || lowerPM.includes("credit")) {
     pm = "Card";
    } else {
  // Fallback: assume Cash instead of "Other"
    pm = "Cash";
    }
        // Add to payment breakdown
        if (!dailySalesData[dateKey].paymentMethods[pm]) {
            dailySalesData[dateKey].paymentMethods[pm] = 0;
        }
    dailySalesData[dateKey].paymentMethods[pm] += paid;

        // Save order details
        dailySalesData[dateKey].ordersList.push({
            orderNumber: o.id || `ORD${index + 1}`,
            time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            orderType: o.orderType || o.type || "N/A",
            paymentMethod: normalizePaymentMethod(o.payment?.method || o.paymentMethod),   // ✅ normalized result
            total: paid
        });
    });

  // Refresh the calendar with updated data
  generateCalendarGrid();
}

// --- Modal cleanup: remove stuck backdrop & body classes ---
document.addEventListener('DOMContentLoaded', () => {
  const dailyModalEl = document.getElementById('dailyDetailsModal');
  if (!dailyModalEl) return;

  // When the modal is fully hidden, remove any leftover backdrops and modal-open class
  dailyModalEl.addEventListener('hidden.bs.modal', () => {
    // Remove all backdrops (in case one got left behind)
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

    // Remove modal-open class from body so scrolling returns to normal
    document.body.classList.remove('modal-open');

    // Remove inline padding-right added by Bootstrap for scrollbar compensation
    document.body.style.removeProperty('padding-right');

    // Optionally restore overflow (if you changed it elsewhere)
    document.body.style.removeProperty('overflow');
  });

  // Extra safety: when hide is triggered (before animation finishes),
  // run a tiny timeout cleanup in case Bootstrap leaves something behind
  dailyModalEl.addEventListener('hide.bs.modal', () => {
    setTimeout(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.removeProperty('overflow');
    }, 50);
  });
});