// --- TOP PRODUCTS DASHBOARD-STYLE LOGIC ---
// Note: loadTopProductsData is now handled by scriptdash.js to avoid conflicts

function updateTopProductsDisplay(products) {
  const tbody = document.getElementById('topProductsBody');
  if (!tbody) {
    console.error('Top products table body not found');
    return;
  }
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-muted py-3">
          No product data available
        </td>
      </tr>
    `;
    return;
  }
  tbody.innerHTML = products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td class="text-end fw-medium">${product.count}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', function () {
  // ...existing code...
  // loadTopProductsData(); // Function removed - handled by updateTopProductsList instead
});
// PDF export dependencies (make sure jsPDF and html2canvas are loaded in your HTML)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

document.addEventListener('DOMContentLoaded', function () {
  const exportBtn = document.getElementById('exportPDFBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Export sales line chart
      const lineCanvas = document.getElementById('salesLineChart');
      if (lineCanvas) {
        const lineImg = await html2canvas(lineCanvas);
        const lineDataUrl = lineImg.toDataURL('image/png');
        pdf.text('Sales Over Time', 10, 10);
        pdf.addImage(lineDataUrl, 'PNG', 10, 15, 180, 60);
      }

      // Export sales bar chart
      const barCanvas = document.getElementById('salesBarChart');
      if (barCanvas) {
        const barImg = await html2canvas(barCanvas);
        const barDataUrl = barImg.toDataURL('image/png');
        pdf.text('Sales by Category', 10, 80);
        pdf.addImage(barDataUrl, 'PNG', 10, 85, 180, 60);
      }

      // Export payment method chart
      const paymentCanvas = document.getElementById('salesTimeChart');
      if (paymentCanvas) {
        const paymentImg = await html2canvas(paymentCanvas);
        const paymentDataUrl = paymentImg.toDataURL('image/png');
        pdf.text('Payment Methods', 10, 150);
        pdf.addImage(paymentDataUrl, 'PNG', 10, 155, 180, 60);
      }

      // Optionally add summary data (sales, payment breakdown)
      const summaryEl = document.getElementById('salesSummary');
      if (summaryEl) {
        pdf.addPage();
        pdf.text('Sales Summary', 10, 10);
        pdf.text(summaryEl.innerText, 10, 20);
      }

      pdf.save('SalesAnalytics.pdf');
    });
  }
});
// Update at the beginning of your DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM loaded, checking Chart.js...');

  if (typeof Chart === 'undefined') {
    console.error('Chart.js not found. Make sure to include Chart.js script');
    showError('Chart.js not loaded. Please check console for details.');
    return;
  }

  // initialize UI and listeners
  setupDateRangeListener();
  initializeChartsWithLoadingState();
  updateDateRangeDisplay(getDateRange('week').startDate, getDateRange('week').endDate);

  // Wait for Firebase auth to be ready. Only fetch data after user is signed in.
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        console.log('User signed in:', user.email || user.uid);
        // fetch initial data for currently selected range
        const dateRange = (document.getElementById('date-range') && document.getElementById('date-range').value) || 'week';
        const timeRange = (document.getElementById('time-range') && document.getElementById('time-range').value) || 'all';
        const { startDate, endDate } = getDateRange(dateRange);
        // start realtime listener (will update UI when DB changes)
        startRealtimeOrdersListener(startDate, endDate, timeRange);
      } else {
        console.warn('Firebase auth state: not signed in');
        // Optionally show empty state — do not call sample data
        updateChartsWithData([], 'all');
        updateSummaryCards([]);
        updateDataSourceIndicator('none');
      }
    });
  } else {
    console.warn('Firebase not available or auth missing');
    showError('Firebase not available. Cannot load analytics.');
  }
});

function showError(msg) {
  alert(msg); // Or display in a div
}
// Initialize charts with loading state
function initializeChartsWithLoadingState() {
  console.log('Initializing charts...');

  const lineCanvas = document.getElementById('salesLineChart');
  const barCanvas = document.getElementById('salesBarChart');
  const timeCanvas = document.getElementById('salesTimeChart');

  if (!lineCanvas) {
    console.error('Sales line chart canvas not found');
    return;
  }

  if (!barCanvas) {
    console.error('Sales bar chart canvas not found');
    return;
  }

  if (!timeCanvas) {
    console.error('Sales time chart canvas not found');
    return;
  }

  // Update the cleanup logic in initializeChartsWithLoadingState function (around line 45)

  // Clean up existing charts
  if (window.salesLineChart && typeof window.salesLineChart.destroy === 'function') {
    window.salesLineChart.destroy();
  }
  if (window.salesBarChart && typeof window.salesBarChart.destroy === 'function') {
    window.salesBarChart.destroy();
  }
  if (window.salesTimeChart && typeof window.salesTimeChart.destroy === 'function') {
    window.salesTimeChart.destroy();
  }

  // Set global chart defaults for better design
  Chart.defaults.global.defaultFontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  Chart.defaults.global.defaultFontSize = 12;
  Chart.defaults.global.defaultFontColor = '#666';

  try {
    // Setup main sales line chart
    window.salesLineChart = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5', 'Jan 6', 'Jan 7'],
        datasets: [{
          label: 'Daily Sales',
          data: [5000, 20000, 15741, 22000, 12000, 18000, 40000],
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderColor: 'rgb(255, 99, 132)',
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: 'rgb(255, 99, 132)',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFontColor: '#fff',
          bodyFontColor: '#fff',
          xPadding: 12,
          yPadding: 12,
          displayColors: false,
          cornerRadius: 8,
          callbacks: {
            title: function (tooltipItem, data) {
              return tooltipItem[0].xLabel;
            },
            label: function (tooltipItem, data) {
              return '₱ ' + parseInt(tooltipItem.value).toLocaleString('en-PH');
            },
            footer: function (tooltipItems, data) {
              return tooltipItems[0].index === 2 ? '3 payments' : '';
            }
          }
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true,
              callback: function (value) {
                return '₱ ' + parseInt(value).toLocaleString('en-PH');
              },
              padding: 10
            },
            gridLines: {
              color: '#e9ecef',
              drawTicks: false,
              zeroLineColor: '#e9ecef'
            }
          }],
          xAxes: [{
            gridLines: {
              display: false,
              drawBorder: false
            },
            ticks: {
              padding: 10
            }
          }]
        },
        layout: {
          padding: {
            top: 20,
            right: 20
          }
        }
      }
    });

    // Setup day of week bar chart
    window.salesBarChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        datasets: [{
          data: [6000, 15741, 8000, 12000, 20000, 40000, 18000],
          backgroundColor: 'rgb(255, 99, 132)',
          barPercentage: 0.7,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFontColor: '#fff',
          bodyFontColor: '#fff',
          xPadding: 12,
          yPadding: 12,
          displayColors: false,
          cornerRadius: 8,
          callbacks: {
            title: function (tooltipItem, data) {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return days[tooltipItem[0].index];
            },
            label: function (tooltipItem, data) {
              return '₱ ' + parseInt(tooltipItem.value).toLocaleString('en-PH');
            },
            footer: function (tooltipItems, data) {
              return tooltipItems[0].index === 1 ? '3 payments' : '';
            }
          }
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true,
              callback: function (value) {
                return '₱ ' + parseInt(value).toLocaleString('en-PH');
              }
            },
            gridLines: {
              color: '#e9ecef',
              drawTicks: false,
              zeroLineColor: '#e9ecef'
            }
          }],
          xAxes: [{
            gridLines: {
              display: false,
              drawBorder: false
            }
          }]
        }
      }
    });

    // Setup time of day line chart
    window.salesTimeChart = new Chart(timeCanvas, {
      type: 'line',
      data: {
        labels: ['12 am', '2', '4', '6', '8', '10', '12 pm', '2', '4', '6', '8', '10'],
        datasets: [{
          label: 'Sales by Hour',
          data: [0, 0, 0, 0, 2000, 5000, 10000, 22000, 15000, 25000, 18000, 5000],
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          borderColor: 'rgb(255, 99, 132)',
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: 'rgb(255, 99, 132)',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBorderWidth: 2,
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFontColor: '#fff',
          bodyFontColor: '#fff',
          xPadding: 12,
          yPadding: 12,
          displayColors: false,
          cornerRadius: 8,
          callbacks: {
            label: function (tooltipItem, data) {
              return '₱ ' + parseInt(tooltipItem.value).toLocaleString('en-PH');
            }
          }
        },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true,
              callback: function (value) {
                return '₱ ' + parseInt(value).toLocaleString('en-PH');
              }
            },
            gridLines: {
              color: '#e9ecef',
              drawTicks: false,
              zeroLineColor: '#e9ecef'
            }
          }],
          xAxes: [{
            gridLines: {
              display: false,
              drawBorder: false
            }
          }]
        }
      }
    });

    console.log('Charts initialized successfully');
  } catch (error) {
    console.error('Error initializing charts:', error);
    showError('Failed to initialize charts: ' + error.message);
  }

  // Update the date range display for initial load
  const { startDate, endDate } = getDateRange('week');
  updateDateRangeDisplay(startDate, endDate);

  // Fill summary cards with sample data
  // Initialize with placeholder data
  const placeholderOrders = [
    {
      id: 'placeholder',
      timestamp: new Date(),
      total: 0,
      items: [],
      payment: {
        method: 'cash',
        total: 0
      },
      discount: 0,
      tax: 0
    }
  ];
  updateSummaryCards(placeholderOrders);
}

// Lightweight implementations so realtime updates actually render
function updateDataSourceIndicator(source) {
  // optional UI indicator element with id="data-source"
  const el = document.getElementById('data-source');
  if (el) el.textContent = source === 'firebase' ? 'Realtime (Firebase)' : (source === 'none' ? 'No data' : source);
  console.log('[UI] Data source:', source);
}

function clearCachedChartData() {
  // no-op placeholder (keeps old interface)
  // If you used localStorage caching before, clear relevant keys here.
  // localStorage.removeItem('sales_analytics_cache');
}

// Update charts with an array of order objects
function updateChartsWithData(orders, timeRange) {
  // orders: [{ timestamp: Date, total: Number, items: [], payment: {...}, paxNumber: Number }, ...]
  // Build day-by-day series between current date range displayed
  try {
    // Filter orders by time range
    const filteredOrders = orders.filter(order => {
      if (timeRange === 'all') return true;

      const orderTime = new Date(order.timestamp);
      const hour = orderTime.getHours();

      switch (timeRange) {
        case 'morning':
          return hour >= 6 && hour < 12; // 6 AM to 12 PM
        case 'afternoon':
          return hour >= 12 && hour < 18; // 12 PM to 6 PM
        case 'evening':
          return hour >= 18 || hour < 6; // 6 PM to 6 AM
        default:
          return true;
      }
    });

    const dateRangeTextEl = document.getElementById('date-range-text');
    const range = (() => {
      // derive start/end from displayed text if available, else use last 7 days
      if (dateRangeTextEl && dateRangeTextEl.textContent) {
        // fallback - we don't parse here reliably; use last 7 days
      }
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - 6); start.setHours(0, 0, 0, 0);
      return { start, end };
    })();
    const msDay = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((range.end - range.start) / msDay) + 1);
    const labels = [];
    const dayTotals = new Array(days).fill(0);
    for (let i = 0; i < days; i++) {
      const d = new Date(range.start.getTime() + i * msDay);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    filteredOrders.forEach(o => {
      const ts = new Date(o.timestamp);
      const idx = Math.floor((ts - range.start) / msDay);
      // Use paid amount from payment.total if available, else fallback to order.total
      const paid = (o.payment && typeof o.payment.total !== 'undefined') ? Number(o.payment.total) : Number(o.total) || 0;
      if (idx >= 0 && idx < days) dayTotals[idx] += paid;
    });

    // Update main line chart (daily)
    if (window.salesLineChart) {
      window.salesLineChart.data.labels = labels;
      if (window.salesLineChart.data.datasets && window.salesLineChart.data.datasets[0]) {
        window.salesLineChart.data.datasets[0].data = dayTotals;
      } else {
        window.salesLineChart.data.datasets = [{ data: dayTotals }];
      }
      window.salesLineChart.update();
    }

    // Day of week bar chart: sum by weekday (S..S)
    const dowLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dowTotals = [0, 0, 0, 0, 0, 0, 0];
    filteredOrders.forEach(o => {
      const d = new Date(o.timestamp);
      const idx = d.getDay(); // 0..6
      const paid = (o.payment && typeof o.payment.total !== 'undefined') ? Number(o.payment.total) : Number(o.total) || 0;
      dowTotals[idx] += paid;
    });
    if (window.salesBarChart) {
      window.salesBarChart.data.labels = dowLabels;
      window.salesBarChart.data.datasets[0].data = dowTotals;
      window.salesBarChart.update();
    }

    // Time of day chart: map to 12 labels every 2 hours
    const hourBuckets = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    const hourTotals = new Array(hourBuckets.length).fill(0);
    filteredOrders.forEach(o => {
      const h = new Date(o.timestamp).getHours();
      const j = hourBuckets.findIndex(b => b === h || (h >= b && h < b + 2));
      const paid = (o.payment && typeof o.payment.total !== 'undefined') ? Number(o.payment.total) : Number(o.total) || 0;
      if (j >= 0) hourTotals[j] += paid;
    });
    if (window.salesTimeChart) {
      window.salesTimeChart.data.datasets[0].data = hourTotals;
      window.salesTimeChart.update();
    }

    // Update summary cards
    updateSummaryCards(orders);
  } catch (e) {
    console.error('updateChartsWithData error', e);
  }
}

// Set up date range listener
function setupDateRangeListener() {
  const dateRangeSelector = document.getElementById('date-range');
  const timeRangeSelector = document.getElementById('time-range');

  if (dateRangeSelector) {
    dateRangeSelector.addEventListener('change', function () {
      const { startDate, endDate } = getDateRange(this.value);
      updateDateRangeDisplay(startDate, endDate);
      fetchDataWithDateRange(startDate, endDate);
    });
  }

  if (timeRangeSelector) {
    timeRangeSelector.addEventListener('change', function () {
      const timeRange = this.value;
      const { startDate, endDate } = getDateRange(document.getElementById('date-range').value);

      fetchDataWithDateRange(startDate, endDate, timeRange);
    });
  }
}

// Get date range based on selection
function getDateRange(range) {
  const endDate = new Date();
  let startDate = new Date();

  switch (range) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'yesterday':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'week':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'month':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    default:
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

// Update date range display
function updateDateRangeDisplay(startDate, endDate) {
  const dateRangeText = document.getElementById('date-range-text');
  if (dateRangeText) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const startFormatted = startDate.toLocaleDateString('en-US', options);
    const endFormatted = endDate.toLocaleDateString('en-US', options);

    dateRangeText.textContent = `${startFormatted} - ${endFormatted}`;
  }
}

// Fetch data from Firestore and update charts
function fetchDataAndUpdateCharts() {
  console.log('Fetching data...');
  const dateRange = document.getElementById('date-range').value || 'week';
  const timeRange = document.getElementById('time-range').value || 'all';
  const { startDate, endDate } = getDateRange(dateRange);

  updateDateRangeDisplay(startDate, endDate);

  if (typeof firebase !== 'undefined' && firebase.firestore) {
    console.log('Firebase is available, fetching real data...');
    fetchRealDataFromFirebase(startDate, endDate, timeRange);
  } else {
    showError('Firebase not available. Cannot load analytics.');
  }
}

function fetchDataWithDateRange(startDate, endDate, timeRange) {
  updateDateRangeDisplay(startDate, endDate);

  if (typeof firebase !== 'undefined' && firebase.firestore) {
    fetchRealDataFromFirebase(startDate, endDate, timeRange);
  } else {
    showError('Firebase not available. Cannot load analytics.');
  }
}

// Fetch real data from Firebase
async function fetchRealDataFromFirebase(startDate, endDate, timeRange) {
  console.log('[Firestore] Fetching all orders for analytics...');
  try {
    const db = firebase.firestore();
    if (!firebase.auth().currentUser) {
      console.warn('[Firestore] Not authenticated, using empty state.');
      // show empty state instead of missing sample helper
      updateChartsWithData([], timeRange);
      updateSummaryCards([]);
      updateDataSourceIndicator('none');
      return;
    }

    const ordersRef = db.collection('orders');
    const rawSnapshot = await ordersRef.get();
    if (rawSnapshot.empty) {
      console.warn('[Firestore] Orders collection empty. Showing empty state.');
      updateChartsWithData([], timeRange);
      updateSummaryCards([]);
      updateDataSourceIndicator('firebase');
      return;
    }

    // Parse and filter orders by date range in JS
    const orders = [];
    rawSnapshot.forEach(doc => {
      const data = doc.data();
      let ts = null;
      if (data.timestamp && data.timestamp.toDate) ts = data.timestamp.toDate();
      else if (data.createdAt && data.createdAt.toDate) ts = data.createdAt.toDate();
      else if (data.createdAt) ts = new Date(data.createdAt);
      else if (data.dateCreated) ts = new Date(data.dateCreated);

      if (!ts) return; // skip if no timestamp

      // Filter by selected date range
      if (ts >= startDate && ts <= endDate) {
        // Aggregate fields as needed
        orders.push({
          id: doc.id,
          timestamp: ts,
          total: Number(data.total) || 0,
          items: Array.isArray(data.items) ? data.items : [],
          payment: data.payment || { method: data.paymentMethod || 'Unknown', total: Number(data.total) || 0 },
          discount: Number(data.discount || data.discountAmount || 0),
          tax: Number(data.tax || data.taxAmount || 0),
          paxNumber: Number(data.paxNumber) || 0
        });
      }
    });

    if (!orders.length) {
      console.warn('[Firestore] No orders in selected date range.');
      updateChartsWithData([], timeRange);
      updateSummaryCards([]);
      updateDataSourceIndicator('firebase');
      return;
    }

    orders.sort((a, b) => a.timestamp - b.timestamp);

    // Now update charts and summary cards with real orders
    updateChartsWithData(orders, timeRange);
    updateSummaryCards(orders);
    updateDataSourceIndicator('firebase');
    clearCachedChartData();

  } catch (err) {
    console.error('[Firestore] Error while fetching real data:', err);
    // show empty state instead of calling removed sample helper
    updateChartsWithData([], timeRange);
    updateSummaryCards([]);
    updateDataSourceIndicator('error');
  }
}

// Detect which timestamp field exists
function detectTimestampField(sample) {
  // Priority: createdAt > completedAt > lastUpdated > dateCreated (string) > sentToKitchen
  // Return { field, type: 'timestamp'|'string', queryable: boolean }
  if (sample.createdAt && sample.createdAt.toDate) return { field: 'createdAt', type: 'timestamp', queryable: true };
  if (sample.completedAt && sample.completedAt.toDate) return { field: 'completedAt', type: 'timestamp', queryable: true };
  if (sample.lastUpdated && sample.lastUpdated.toDate) return { field: 'lastUpdated', type: 'timestamp', queryable: true };
  if (typeof sample.dateCreated === 'string') return { field: 'dateCreated', type: 'string', queryable: false };
  if (sample.sentToKitchen && sample.sentToKitchen.toDate) return { field: 'sentToKitchen', type: 'timestamp', queryable: true };
  return null;
}

// Map a Firestore doc into our internal order object
function mapOrderDocument(id, data, tsFieldInfo) {
  let ts = new Date();
  try {
    if (tsFieldInfo) {
      if (tsFieldInfo.type === 'timestamp') {
        ts = data[tsFieldInfo.field].toDate();
      } else if (tsFieldInfo.type === 'string') {
        ts = new Date(data[tsFieldInfo.field]);
      }
    } else if (data.createdAt && data.createdAt.toDate) {
      ts = data.createdAt.toDate();
    } else if (data.completedAt && data.completedAt.toDate) {
      ts = data.completedAt.toDate();
    }
  } catch (e) {
    console.warn('[Map] Failed to parse timestamp for doc', id, e);
  }

  // Totals
  const total = numberOrZero(data.total ?? data.grandTotal);
  const subtotal = numberOrZero(data.subtotal);
  const discount = numberOrZero(data.discount || data.discountAmount);
  const tax = numberOrZero(data.tax || data.taxAmount);

  // Items value (sum lineTotal OR price*qty)
  let itemsValue = 0;
  if (Array.isArray(data.items)) {
    itemsValue = data.items.reduce((sum, it) => {
      const line = numberOrZero(it.lineTotal) ||
        (numberOrZero(it.unitPrice || it.price) * (numberOrZero(it.quantity) || 1));
      return sum + line;
    }, 0);
  } else {
    itemsValue = subtotal || (total ? total - tax + discount : 0);
  }

  // Payment method
  let pm = (data.payment && (data.payment.method || data.payment.type)) ||
    data.paymentMethod ||
    'Unknown';
  pm = normalizePaymentMethod(pm);

  const paymentTotal = numberOrZero(
    (data.payment && (data.payment.total || data.payment.amount)) ||
    total
  );

  return {
    id,
    timestamp: ts,
    total: total || (itemsValue + tax - discount),
    subtotal: subtotal || itemsValue,
    itemsValue,
    discount,
    tax,
    payment: {
      method: pm.display, // Keep display name (e.g. GCash)
      key: pm.key,        // Normalized (gcash, cash, card, other)
      total: paymentTotal
    }
  };
}

function numberOrZero(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function normalizePaymentMethod(raw) {
  const r = String(raw).trim();
  const lower = r.toLowerCase();
  if (lower.includes('gcash')) return { key: 'gcash', display: 'GCash' };
  if (lower.includes('cash')) return { key: 'cash', display: 'Cash' };
  if (lower.includes('card') || lower.includes('visa') || lower.includes('master') || lower.includes('credit'))
    return { key: 'card', display: 'Card' };
  return { key: 'other', display: r };
}

// REPLACE updateSummaryCards with corrected logic:

function updateSummaryCards(orders) {
  const salesCard = document.querySelectorAll('.analytics-summary-card')[0];
  const payCard = document.querySelectorAll('.analytics-summary-card')[1];
  const topProductsCard = document.querySelectorAll('.analytics-summary-card')[2];
  if (!salesCard || !payCard || !topProductsCard) return;

  // If no orders, show zeros
  if (!orders || !orders.length) {
    const salesList = salesCard.querySelector('.analytics-summary-list');
    const netSpan = salesCard.querySelector('.analytics-summary-total span');
    if (salesList) {
      salesList.innerHTML = `
        <li><span style="font-weight:600;color:#000;">Gross Sales</span><span style="font-weight:600;color:#000;">${fmt(0)}</span></li>
        <li><span style="margin-left:30px;">Dishes</span><span>0</span></li>
        <li><span style="margin-left:30px;">Discount</span><span>${fmt(0)}</span></li>
        <li><span style="margin-left:30px;">Tax</span><span>${fmt(0)}</span></li>
      `;
    }
    if (netSpan) netSpan.textContent = fmt(0);

    const payList = payCard.querySelector('.analytics-summary-list');
    if (payList) {
      payList.innerHTML = `
        <li><span style="font-weight:600;color:#000;">Total Collection</span><span style="font-weight:600;color:#000;">${fmt(0)}</span></li>
        <li><span style="margin-left:30px;">GCash</span><span>${fmt(0)}</span></li>
        <li><span style="margin-left:30px;">Cash</span><span>${fmt(0)}</span></li>
        <li><span style="margin-left:30px;">Card</span><span>${fmt(0)}</span></li>
      `;
    }
    const payTotalSpan = payCard.querySelector('.analytics-summary-total span');
    if (payTotalSpan) payTotalSpan.textContent = fmt(0);

    // Top Products: show empty
    const topProductsBody = document.getElementById('topProductsBody');
    if (topProductsBody) {
      topProductsBody.innerHTML = `
        <tr>
          <td colspan="2" class="text-center text-muted py-3">
            No product data available
          </td>
        </tr>
      `;
    }
    // --- Build global analytics object for Export (empty case) ---
    currentAnalyticsData = {
      orders: [],
      paymentMethods: { Cash: 0, GCash: 0, Card: 0 },
      summary: {
        grossSales: 0,
        discount: 0,
        tax: 0,
        netSales: 0,
        averageOrderValue: 0
      },
      dateRange: window.selectedDateRange || "All Time"
    };
    return;
  }

  // --- Top 5 Products ---
  updateTopProductsList(orders);

  // Aggregations
  let gross = 0;
  let dishesValue = 0;
  let discount = 0;
  let tax = 0;
  let totalGuests = 0;
  const payTotals = { gcash: 0, cash: 0, card: 0, other: 0 };

  orders.forEach(o => {
    // Use order.total if present and > 0, otherwise sum items
    let orderTotal = Number(o.total) || 0;
    if ((!orderTotal || orderTotal === 0) && Array.isArray(o.items)) {
      orderTotal = o.items.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return sum + price * qty;
      }, 0);
    }
    gross += orderTotal;
    // Dishes: sum item quantities if present
    if (Array.isArray(o.items)) {
      dishesValue += o.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }
    discount += Number(o.discount) || 0;
    tax += Number(o.tax) || 0;
    totalGuests += Number(o.paxNumber) || 0;

    const paymentTotal = Number((o.payment && (o.payment.total || o.payment.amount)) || orderTotal) || 0;
    // Prefer normalized key if present, otherwise examine method string
    let methodKey = '';
    if (o.payment && o.payment.key) methodKey = String(o.payment.key).toLowerCase();
    else if (o.payment && o.payment.method) methodKey = String(o.payment.method).toLowerCase();

    if (methodKey.includes('gcash')) payTotals.gcash += paymentTotal;
    else if (methodKey.includes('cash')) payTotals.cash += paymentTotal;
    else if (methodKey.includes('card') || methodKey.includes('visa') || methodKey.includes('master') || methodKey.includes('credit')) payTotals.card += paymentTotal;
    else {
      // Fallback: try to guess - if method contains digits/**** treat as card, otherwise treat as cash
      if (/\d{4}|(\*{4})/.test(methodKey)) payTotals.card += paymentTotal;
      else payTotals.cash += paymentTotal;
    }
  });

  // Net = gross - discount - tax
  const net = gross - discount - tax;

  // SALES LIST
  const salesList = salesCard.querySelector('.analytics-summary-list');
  salesList.innerHTML = `
    <li><span style="font-weight:600;color:#000;">Gross Sales</span><span style="font-weight:600;color:#000;">${fmt(gross)}</span></li>
    <li><span style="margin-left:30px;">Dishes</span><span>${dishesValue}</span></li>
    <li><span style="margin-left:30px;">Discount</span><span>${discount ? '-' + fmt(discount) : fmt(0)}</span></li>
    <li><span style="margin-left:30px;">Tax</span><span>${fmt(tax)}</span></li>
  `;
  const netSpan = salesCard.querySelector('.analytics-summary-total span');
  if (netSpan) netSpan.textContent = fmt(net);

  // PAYMENT METHODS
  const payList = payCard.querySelector('.analytics-summary-list');
  const totalCollection = payTotals.gcash + payTotals.cash + payTotals.card;
  let payRows = `<li><span style="font-weight:600;color:#000;">Total Collection</span><span style="font-weight:600;color:#000;">${fmt(totalCollection)}</span></li>`;
  payRows += `<li><span style="margin-left:30px;">GCash</span><span>${fmt(payTotals.gcash)}</span></li>`;
  payRows += `<li><span style="margin-left:30px;">Cash</span><span>${fmt(payTotals.cash)}</span></li>`;
  payRows += `<li><span style="margin-left:30px;">Card</span><span>${fmt(payTotals.card)}</span></li>`;
  payList.innerHTML = payRows;

  const payTotalSpan = payCard.querySelector('.analytics-summary-total span');
  if (payTotalSpan) payTotalSpan.textContent = fmt(totalCollection);

  // --- Build global analytics object for Export ---
  currentAnalyticsData = {
    orders: orders,
    paymentMethods: {
      Cash: payTotals.cash,
      GCash: payTotals.gcash,
      Card: payTotals.card
    },
    summary: {
      grossSales: gross,
      discount: discount,
      tax: tax,
      netSales: net,
      averageOrderValue: orders.length ? (gross / orders.length) : 0
    },
    dateRange: window.selectedDateRange || "All Time"
  };
}


function fmt(n) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

// Populate the Top 5 Products list
function updateTopProductsList(orders) {
  const topProductsBody = document.getElementById('topProductsBody');
  if (!topProductsBody) return;
  const productSales = {};
  orders.forEach(order => {
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (!item.name) return;
        const key = item.name;
        if (!productSales[key]) productSales[key] = { name: item.name, qty: 0, total: 0 };
        productSales[key].qty += Number(item.quantity) || 1;
        productSales[key].total += Number(item.price) * (Number(item.quantity) || 1) || 0;
      });
    }
  });
  // Convert to array and sort by qty sold, then by total sales
  const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, 5);
  if (sorted.length === 0) {
    topProductsBody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-muted py-3">
          No product data available
        </td>
      </tr>
    `;
    return;
  }
  topProductsBody.innerHTML = sorted.map(product => `
    <tr>
      <td>${product.name}</td>
      <td class="text-end fw-medium">${product.qty}</td>
    </tr>
  `).join('');
}

// NEW: start realtime listener function using onSnapshot
let ordersUnsubscribe = null;

function startRealtimeOrdersListener(startDate, endDate, timeRange) {
  console.log('[Firestore] Starting realtime listener for orders...', startDate, endDate);

  // Prevent duplicate listeners
  if (window.analyticsListenerActive) {
    console.log('[Firestore] Listener already active, skipping duplicate call');
    return;
  }

  // unsubscribe previous listener if any
  if (ordersUnsubscribe) {
    try { ordersUnsubscribe(); } catch (e) {/*ignore*/ }
    ordersUnsubscribe = null;
  }

  window.analyticsListenerActive = true;

  // Set a timeout to fall back to sample data if Firebase is slow
  const fallbackTimeout = setTimeout(() => {
    console.warn('[Analytics] Firebase timeout - loading fallback data');
    loadFallbackAnalyticsData(timeRange);
  }, 5000); // 5 second timeout

  const db = firebase.firestore();
  const ordersRef = db.collection('orders');

  // Use onSnapshot for realtime updates, but fetch all and filter in JS
  ordersUnsubscribe = ordersRef.onSnapshot(snapshot => {
    try {
      if (snapshot.empty) {
        console.warn('[Firestore] Orders collection empty.');
        updateChartsWithData([], timeRange);
        updateSummaryCards([]);
        updateDataSourceIndicator('firebase');
        return;
      }

      const orders = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // parse timestamp robustly
        let ts = null;
        if (data.completedAt && data.completedAt.toDate) ts = data.completedAt.toDate();
        else if (data.createdAt && data.createdAt.toDate) ts = data.createdAt.toDate();
        else if (data.timestamp && data.timestamp.toDate) ts = data.timestamp.toDate();
        else if (typeof data.dateCreated === 'string') ts = new Date(data.dateCreated);

        if (!ts) return; // skip if no usable timestamp

        // filter by provided date range (inclusive)
        if (ts >= startDate && ts <= endDate) {
          orders.push({
            id: doc.id,
            timestamp: ts,
            total: Number(data.total) || 0,
            items: Array.isArray(data.items) ? data.items : [],
            payment: data.payment || { method: data.paymentMethod || 'Unknown', total: Number(data.total) || 0 },
            discount: Number(data.discount || data.discountAmount || 0),
            tax: Number(data.tax || data.taxAmount || 0),
            paxNumber: Number(data.paxNumber) || 0
          });
        }
      });

      // sort and update UI
      orders.sort((a, b) => a.timestamp - b.timestamp);
      console.log(`[Firestore] Realtime snapshot processed, ${orders.length} orders in range.`);

      // Clear the fallback timeout since we got data
      clearTimeout(fallbackTimeout);

      updateChartsWithData(orders, timeRange);
      updateSummaryCards(orders);
      updateDataSourceIndicator('firebase');

    } catch (err) {
      console.error('[Firestore] Error processing snapshot:', err);
      showError('Error processing orders snapshot.');
      // Reset flag on error
      window.analyticsListenerActive = false;
    }
  }, err => {
    console.error('[Firestore] realtime listener error:', err);

    // Handle specific error types
    if (err.code === 'permission-denied') {
      console.warn('[Firestore] Permission denied - using fallback data');
      showError('Permission denied. Using sample data for demonstration.');
      // Load fallback data
      loadFallbackAnalyticsData(timeRange);
    } else if (err.code === 'unavailable') {
      console.warn('[Firestore] Service unavailable - using fallback data');
      showError('Firestore unavailable. Using sample data for demonstration.');
      loadFallbackAnalyticsData(timeRange);
    } else {
      showError('Realtime listener error: ' + (err && err.message));
    }

    // Reset flag on error
    window.analyticsListenerActive = false;
  });
}

// Cleanup function to stop listeners
function stopRealtimeListener() {
  if (ordersUnsubscribe) {
    try {
      ordersUnsubscribe();
      console.log('[Firestore] Realtime listener stopped');
    } catch (e) {
      console.warn('[Firestore] Error stopping listener:', e);
    }
    ordersUnsubscribe = null;
  }
  window.analyticsListenerActive = false;
}

// Cleanup on page unload
window.addEventListener('beforeunload', stopRealtimeListener);

// Fallback data function for when Firestore is unavailable
function loadFallbackAnalyticsData(timeRange) {
  console.log('[Analytics] Loading fallback data for demonstration');

  // Generate sample data
  const sampleOrders = [];
  const now = new Date();

  // Generate 30 days of sample data
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Generate 3-8 orders per day
    const orderCount = Math.floor(Math.random() * 6) + 3;
    for (let j = 0; j < orderCount; j++) {
      const orderTime = new Date(date);
      orderTime.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM to 8 PM
      orderTime.setMinutes(Math.floor(Math.random() * 60));

      const total = Math.random() * 2000 + 100; // $100 - $2100

      sampleOrders.push({
        id: `sample_${i}_${j}`,
        timestamp: orderTime,
        total: total,
        items: [
          { name: 'Adobo', quantity: Math.floor(Math.random() * 3) + 1 },
          { name: 'Sinigang', quantity: Math.floor(Math.random() * 2) + 1 }
        ],
        payment: {
          method: ['Cash', 'GCash', 'Card'][Math.floor(Math.random() * 3)],
          total: total
        },
        discount: Math.random() * 50,
        tax: total * 0.05,
        paxNumber: Math.floor(Math.random() * 4) + 1
      });
    }
  }

  // Update UI with sample data
  updateChartsWithData(sampleOrders, timeRange);
  updateSummaryCards(sampleOrders);
  updateDataSourceIndicator('sample');

  console.log('[Analytics] Fallback data loaded:', sampleOrders.length, 'orders');
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

  // Add click event to show daily details
  dayCell.addEventListener('click', () => {
    showDailyDetails(date, dateKey, salesData);
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
  modalTitle.textContent = `Daily Sales - ${date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
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
    const ordersHtml = orders.map(order => `
            <tr>
                <td>${order.orderNumber}</td>
                <td>${order.time}</td>
                <td>${order.orderType}</td>
                <td>${order.paymentMethod}</td>
                <td>₱${order.total.toLocaleString()}</td>
            </tr>
        `).join('');

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
    const dateKey = date.toISOString().split('T')[0];
    const dayCell = createDayCell(day, dateKey, date);
    calendarGrid.appendChild(dayCell);
  }
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

function updateDailySalesData(orders) {
  // Reset daily sales data
  dailySalesData = {};

  // Process each order to build daily sales data
  orders.forEach(order => {
    const date = parseOrderDate(order);
    const dateKey = date.toISOString().split('T')[0];

    if (!dailySalesData[dateKey]) {
      dailySalesData[dateKey] = {
        total: 0,
        orders: 0,
        paymentMethods: { Cash: 0, GCash: 0, Card: 0 },
        ordersList: []
      };
    }

    dailySalesData[dateKey].total += order.total || 0;
    dailySalesData[dateKey].orders++;

    if (order.paymentMethod && dailySalesData[dateKey].paymentMethods.hasOwnProperty(order.paymentMethod)) {
      dailySalesData[dateKey].paymentMethods[order.paymentMethod] += order.total || 0;
    }

    dailySalesData[dateKey].ordersList.push({
      orderNumber: order.orderNumber || 'N/A',
      time: date.toLocaleTimeString(),
      orderType: order.orderType || 'Dine in',
      paymentMethod: order.paymentMethod || 'Cash',
      total: order.total || 0
    });
  });

  // Update calendar display
  generateCalendarGrid();
}


// Function to generate combined Sales and Payment Methods Excel
function generateCombinedSalesPaymentExcel() {
  console.log("XLSX:", typeof XLSX);
  console.log("currentAnalyticsData:", currentAnalyticsData);
  console.log("getPeriodDescription:", typeof getPeriodDescription);
  console.log("showSuccessMessage:", typeof showSuccessMessage);
  try {
    console.log('Generating combined Sales & Payment Methods Excel...');

    const wb = XLSX.utils.book_new();

    // 1. EXECUTIVE SUMMARY SHEET - Formatted like the image
    const summaryData = [
      ['VICTORIA BISTRO - SALES & PAYMENT ANALYTICS', '', '', 'PAYMENT METHODS BREAKDOWN', ''],
      ['Period:', getPeriodDescription(), '', 'Cash Collections', `₱${(currentAnalyticsData.paymentMethods.Cash || 0).toFixed(2)}`],
      ['Date Range:', currentAnalyticsData.dateRange, '', 'GCash Collections', `₱${(currentAnalyticsData.paymentMethods.GCash || 0).toFixed(2)}`],
      ['Generated:', new Date().toLocaleString(), '', 'Card Collections', `₱${(currentAnalyticsData.paymentMethods.Card || 0).toFixed(2)}`],
      ['', '', '', 'Total Collections', `₱${Object.values(currentAnalyticsData.paymentMethods).reduce((a, b) => a + b, 0).toFixed(2)}`],
      ['EXECUTIVE SUMMARY', '', '', '', ''],
      ['Total Orders', currentAnalyticsData.orders.length, '', '', ''],
      ['Total Customers Served', currentAnalyticsData.orders.reduce((sum, order) => sum + (parseInt(order.paxNumber) || 1), 0), '', '', ''],
      ['', '', '', '', ''],
      ['SALES OVERVIEW', '', '', '', ''],
      ['Gross Sales', `₱${currentAnalyticsData.summary.grossSales.toFixed(2)}`, '', '', ''],
      ['Discount', `₱${currentAnalyticsData.summary.discount.toFixed(2)}`, '', '', ''],
      ['Tax', `₱${currentAnalyticsData.summary.tax.toFixed(2)}`, '', '', ''],
      ['Net Sales', `₱${(currentAnalyticsData.summary.grossSales - currentAnalyticsData.summary.discount + currentAnalyticsData.summary.tax).toFixed(2)}`, '', '', ''],
      ['Average Order Value', `₱${(currentAnalyticsData.summary.grossSales / currentAnalyticsData.orders.length).toFixed(2)}`, '', '', '']
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths for better formatting
    summaryWs['!cols'] = [
      { width: 25 }, // Column A - Labels
      { width: 15 }, // Column B - Values
      { width: 5 },  // Column C - Spacer
      { width: 25 }, // Column D - Payment Labels
      { width: 15 }  // Column E - Payment Values
    ];

    // Add some basic styling (if supported)
    if (summaryWs['A1']) summaryWs['A1'].s = { font: { bold: true } };
    if (summaryWs['D1']) summaryWs['D1'].s = { font: { bold: true } };
    if (summaryWs['A6']) summaryWs['A6'].s = { font: { bold: true } };
    if (summaryWs['A10']) summaryWs['A10'].s = { font: { bold: true } };

    XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive Summary');

    // 2. DAILY ANALYSIS SHEET - Clean table format
    const dailySales = {};
    const dailyPayments = {};

    currentAnalyticsData.orders.forEach(order => {
      const dateKey = order.date;
      const method = order.paymentMethod;

      // Sales data
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = { total: 0, count: 0, items: 0 };
      }
      dailySales[dateKey].total += order.total || 0;
      dailySales[dateKey].count += 1;
      dailySales[dateKey].items += order.items.length;

      // Payment data
      if (!dailyPayments[dateKey]) {
        dailyPayments[dateKey] = { Cash: 0, GCash: 0, Card: 0 };
      }
      dailyPayments[dateKey][method] = (dailyPayments[dateKey][method] || 0) + (order.total || 0);
    });

    const dailyAnalysisData = [
      ['DAILY SALES & PAYMENT ANALYSIS'],
      [''],
      ['Date', 'Total Sales', 'Orders', 'Items Sold', 'Cash', 'GCash', 'Card']
    ];

    Object.entries(dailySales).sort().forEach(([date, salesData]) => {
      const paymentData = dailyPayments[date] || { Cash: 0, GCash: 0, Card: 0 };

      dailyAnalysisData.push([
        date,
        `₱${salesData.total.toFixed(2)}`,
        salesData.count,
        salesData.items,
        `₱${paymentData.Cash.toFixed(2)}`,
        `₱${paymentData.GCash.toFixed(2)}`,
        `₱${paymentData.Card.toFixed(2)}`
      ]);
    });

    const dailyAnalysisWs = XLSX.utils.aoa_to_sheet(dailyAnalysisData);
    dailyAnalysisWs['!cols'] = [
      { width: 12 }, // Date
      { width: 15 }, // Total Sales
      { width: 10 }, // Orders
      { width: 12 }, // Items Sold
      { width: 12 }, // Cash
      { width: 12 }, // GCash
      { width: 12 }  // Card
    ];
    XLSX.utils.book_append_sheet(wb, dailyAnalysisWs, 'Daily Analysis');

    // 3. SALES DETAILS SHEET - Clean table
    const salesDetailsData = [
      ['SALES DETAILS'],
      [''],
      ['Order #', 'Date', 'Time', 'Type', 'Table', 'Pax', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total']
    ];

    currentAnalyticsData.orders.forEach(order => {
      salesDetailsData.push([
        order.orderNumber,
        order.date,
        order.time,
        order.orderType,
        order.tableNumber || 'N/A',
        order.paxNumber || 1,
        order.items.length,
        `₱${order.subtotal.toFixed(2)}`,
        `₱${order.discount.toFixed(2)}`,
        `₱${order.tax.toFixed(2)}`,
        `₱${order.total.toFixed(2)}`
      ]);
    });

    const salesDetailsWs = XLSX.utils.aoa_to_sheet(salesDetailsData);
    salesDetailsWs['!cols'] = [
      { width: 12 }, // Order #
      { width: 12 }, // Date
      { width: 10 }, // Time
      { width: 10 }, // Type
      { width: 8 },  // Table
      { width: 6 },  // Pax
      { width: 8 },  // Items
      { width: 12 }, // Subtotal
      { width: 10 }, // Discount
      { width: 10 }, // Tax
      { width: 12 }  // Total
    ];
    XLSX.utils.book_append_sheet(wb, salesDetailsWs, 'Sales Details');

    // 4. PAYMENT METHODS DETAILS SHEET - Clean table
    const paymentDetailsData = [
      ['PAYMENT METHODS DETAILS'],
      [''],
      ['Order #', 'Date', 'Time', 'Payment Method', 'Amount', 'Order Type']
    ];

    currentAnalyticsData.orders.forEach(order => {
      paymentDetailsData.push([
        order.orderNumber,
        order.date,
        order.time,
        order.paymentMethod,
        `₱${order.total.toFixed(2)}`,
        order.orderType
      ]);
    });

    const paymentDetailsWs = XLSX.utils.aoa_to_sheet(paymentDetailsData);
    paymentDetailsWs['!cols'] = [
      { width: 12 }, // Order #
      { width: 12 }, // Date
      { width: 10 }, // Time
      { width: 15 }, // Payment Method
      { width: 12 }, // Amount
      { width: 12 }  // Order Type
    ];
    XLSX.utils.book_append_sheet(wb, paymentDetailsWs, 'Payment Details');

    // 5. ITEM ANALYSIS SHEET - Clean table
    const itemsData = [
      ['ITEM ANALYSIS'],
      [''],
      ['Order #', 'Date', 'Item Name', 'Quantity', 'Item Total']
    ];

    currentAnalyticsData.orders.forEach(order => {
      order.items.forEach(item => {
        itemsData.push([
          order.orderNumber,
          order.date,
          item.name,
          item.quantity,
          `₱${((item.price || 0) * (item.quantity || 0)).toFixed(2)}`
        ]);
      });
    });

    const itemsWs = XLSX.utils.aoa_to_sheet(itemsData);
    itemsWs['!cols'] = [
      { width: 12 }, // Order #
      { width: 12 }, // Date
      { width: 25 }, // Item Name
      { width: 10 }, // Quantity
      { width: 12 }  // Item Total
    ];
    XLSX.utils.book_append_sheet(wb, itemsWs, 'Item Analysis');

    // Generate filename
    const now = new Date();
    const periodText = getPeriodDescription().replace(/\s+/g, '_');
    const filename = `Victoria_Bistro_Sales_Payment_Analytics_${periodText}_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;

    // Write and download the file
    XLSX.writeFile(wb, filename);

    console.log('Combined Excel file exported successfully:', filename);
    showSuccessMessage(`📊 Professional Sales & Payment Excel downloaded! 🎉<br>
            <small>📈 ${currentAnalyticsData.orders.length} orders analyzed in clean, formatted sheets</small>`);

  } catch (error) {
    console.error('Error generating combined Excel:', error);
    alert('Error creating combined Excel file. Please try again.');
  }
}

window.currentAnalyticsData = window.currentAnalyticsData || {
  orders: [],
  paymentMethods: { Cash: 0, GCash: 0, Card: 0 },
  summary: { grossSales: 0, discount: 0, tax: 0 },
  dateRange: "N/A"
};

// --- Global Export to Excel ---
document.addEventListener('DOMContentLoaded', function () {
  const exportExcelBtn = document.getElementById('exportExcel');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', function () {
      if (!window.currentAnalyticsData || !window.currentAnalyticsData.orders.length) {
        alert('No data available to export.');
        return;
      }

      try {
        const wb = XLSX.utils.book_new();

        // Get current date and time for report generation
        const now = new Date();
        const exportDateTime = now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        // 1. Summary Sheet with Enhanced Information
        const s = window.currentAnalyticsData.summary;
        const orders = window.currentAnalyticsData.orders || [];
        const totalOrders = orders.length;
        const payments = window.currentAnalyticsData.paymentMethods;
        
        // Calculate additional metrics
        const totalGrossSales = parseFloat(s.grossSales) || 0;
        const totalDiscount = parseFloat(s.discount) || 0;
        const totalTax = parseFloat(s.tax) || 0;
        const totalNetSales = parseFloat(s.netSales) || 0;
        const avgOrderValue = parseFloat(s.averageOrderValue) || 0;
        
        // Calculate payment method percentages
        const cashAmount = parseFloat(payments.Cash) || 0;
        const gcashAmount = parseFloat(payments.GCash) || 0;
        const cardAmount = parseFloat(payments.Card) || 0;
        const totalPayments = cashAmount + gcashAmount + cardAmount;
        
        const cashPercent = totalPayments > 0 ? ((cashAmount / totalPayments) * 100).toFixed(2) : 0;
        const gcashPercent = totalPayments > 0 ? ((gcashAmount / totalPayments) * 100).toFixed(2) : 0;
        const cardPercent = totalPayments > 0 ? ((cardAmount / totalPayments) * 100).toFixed(2) : 0;
        
        // Calculate highest and lowest order values
        const orderTotals = orders.map(o => parseFloat(o.total) || 0);
        const highestOrder = orderTotals.length > 0 ? Math.max(...orderTotals) : 0;
        const lowestOrder = orderTotals.length > 0 ? Math.min(...orderTotals) : 0;
        
        // Calculate discount rate
        const discountRate = totalGrossSales > 0 ? ((totalDiscount / totalGrossSales) * 100).toFixed(2) : 0;
        
        const summary = [
          ['═══════════════════════════════════════════════════════════════'],
          ['VIKTORIA\'S BISTRO'],
          ['COMPREHENSIVE SALES ANALYTICS REPORT'],
          ['═══════════════════════════════════════════════════════════════'],
          [''],
          ['REPORT INFORMATION'],
          ['Date Range:', window.currentAnalyticsData.dateRange],
          ['Report Generated:', exportDateTime],
          ['Total Orders Analyzed:', totalOrders],
          ['Report Period:', 'All Time / Custom Range'],
          [''],
          ['═══════════════════════════════════════════════════════════════'],
          ['SALES SUMMARY'],
          ['═══════════════════════════════════════════════════════════════'],
          ['Gross Sales:', `₱${totalGrossSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Total Discount:', `₱${totalDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${discountRate}%`],
          ['Tax Amount:', `₱${totalTax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Net Sales:', `₱${totalNetSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          [''],
          ['ORDER METRICS'],
          ['Total Number of Orders:', totalOrders],
          ['Average Order Value:', `₱${avgOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Highest Order:', `₱${highestOrder.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Lowest Order:', `₱${lowestOrder.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          [''],
          ['═══════════════════════════════════════════════════════════════'],
          ['PAYMENT METHODS BREAKDOWN'],
          ['═══════════════════════════════════════════════════════════════'],
          ['Payment Method', 'Amount', 'Percentage', 'Order Count'],
          ['Cash', `₱${cashAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${cashPercent}%`, orders.filter(o => o.payment?.method === 'Cash').length],
          ['GCash', `₱${gcashAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${gcashPercent}%`, orders.filter(o => o.payment?.method === 'GCash').length],
          ['Card', `₱${cardAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${cardPercent}%`, orders.filter(o => o.payment?.method === 'Card').length],
          ['Total:', `₱${totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '100.00%', totalOrders]
        ];
        
        const wsSummary = XLSX.utils.aoa_to_sheet(summary);
        
        // Set column widths for Summary sheet
        wsSummary['!cols'] = [
          { wch: 30 },  // Label column
          { wch: 25 },  // Value column
          { wch: 15 },  // Percentage column
          { wch: 15 }   // Count column
        ];
        
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // 2. Enhanced Orders Sheet
        const ordersHeader = [
          ['═══════════════════════════════════════════════════════════════════════════════'],
          ['DETAILED ORDER LISTING'],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          [''],
          ['Order ID', 'Date', 'Time', 'Order Type', 'Payment Method', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Total Amount']
        ];
        
        const ordersData = window.currentAnalyticsData.orders.map((o, index) => {
          const date = o.timestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          const time = o.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const itemsCount = o.items ? o.items.length : 0;
          const orderType = o.orderType || 'Dine-In';
          const subtotal = o.subtotal || parseFloat(o.total) || 0;
          const discount = o.discount || 0;
          const tax = o.tax || 0;
          const total = parseFloat(o.total) || 0;
          
          return [
            o.id || `ORD-${index + 1}`,
            date,
            time,
            orderType,
            o.payment?.method || 'Cash',
            itemsCount,
            `₱${subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `₱${discount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `₱${tax.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ];
        });
        
        const ordersFooter = [
          [''],
          ['═══════════════════════════════════════════════════════════════════════════════'],
          ['ORDERS SUMMARY'],
          ['Total Orders:', orders.length, '', '', '', '', '', '', '', `₱${totalNetSales.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['═══════════════════════════════════════════════════════════════════════════════']
        ];
        
        const wsOrders = XLSX.utils.aoa_to_sheet([
          ...ordersHeader,
          ...ordersData,
          ...ordersFooter
        ]);
        
        // Set column widths for Orders sheet
        wsOrders['!cols'] = [
          { wch: 15 },  // Order ID
          { wch: 15 },  // Date
          { wch: 12 },  // Time
          { wch: 12 },  // Order Type
          { wch: 15 },  // Payment Method
          { wch: 12 },  // Items Count
          { wch: 15 },  // Subtotal
          { wch: 12 },  // Discount
          { wch: 12 },  // Tax
          { wch: 15 }   // Total
        ];
        
        XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

        // Save file
        XLSX.writeFile(wb, `Viktoria's_Sales_Analytics_${Date.now()}.xlsx`);
      } catch (err) {
        console.error('Export error:', err);
        alert('Failed to export Excel. See console for details.');
      }
    });
  }
});

