const burgerBtn = document.getElementById('burgerBtn');
const sidebar = document.getElementById('sidebar');
if (burgerBtn) {
  burgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('show');
  });
}

// ...existing code...

// Update time function
function updateTime() {
  const el = document.getElementById('timeNow');
  if (!el) return;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const weekday = now.toLocaleDateString([], { weekday: 'long' });
  el.textContent = `${time} ${weekday}`;
}

// Kitchen role access control
function setupKitchenAccess() {
  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) return;
    
    try {
      const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userRole = userData.role || 'user';
        
        if (userRole === 'kitchen') {
          console.log('🍳 Kitchen role detected - Redirecting to kitchen dashboard');
          window.location.href = '/html/kitchen.html';
          return;
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  });
}

// Google Charts initialization
google.charts.load('current', {'packages':['corechart']});

let ordersChartData = null;
let profitChartData = null;
let ordersChart = null;
let profitChart = null;
let isGoogleChartsLoaded = false;

// Initialize charts when Google Charts is loaded
google.charts.setOnLoadCallback(function() {
  console.log('Google Charts loaded');
  isGoogleChartsLoaded = true;
  // Wait a bit for Firebase to be ready then load charts
  setTimeout(initializeCharts, 1000);
});

function initializeCharts() {
  if (!isGoogleChartsLoaded) {
    console.log('Google Charts not ready yet, waiting...');
    setTimeout(initializeCharts, 500);
    return;
  }
  
  if (typeof firebase === 'undefined' || !firebase.firestore) {
    console.log('Firebase not ready yet, waiting...');
    setTimeout(initializeCharts, 500);
    return;
  }
  
  console.log('Initializing Orders and Profit Charts with real data...');
  loadChartsData();
}

// Load charts data from Firebase
async function loadChartsData() {
  // Prevent duplicate execution
  if (window.chartsLoaded) {
    console.log('Charts already loaded, skipping...');
    return;
  }
  
  try {
    console.log('Loading charts data...');
    window.chartsLoaded = true;
    
    // Set a timeout to show fallback data if Firebase is slow
    const timeoutId = setTimeout(() => {
      console.log('Firebase timeout, showing fallback charts data');
      showFallbackChartsData();
    }, 5000);
    
    const db = firebase.firestore();
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : currentYear;
    const selectedMonth = monthSelect ? monthSelect.value : 'all';
    
    // Initialize monthly data arrays
    const monthlyOrders = new Array(12).fill(0);
    const monthlyProfit = new Array(12).fill(0);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    // Get orders for the selected year
    const ordersSnapshot = await db.collection('orders').get();
    
    clearTimeout(timeoutId);
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      let orderDate = null;
      
      // Handle different timestamp formats
      if (order.timestamp && order.timestamp.toDate) {
        orderDate = order.timestamp.toDate();
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.dateCreated) {
        orderDate = new Date(order.dateCreated);
      }
      
      if (orderDate && orderDate.getFullYear() === selectedYear) {
        const month = orderDate.getMonth();
        // Always prefer root-level total, fallback to payment.total only if missing or zero
        let paidTotal = 0;
        if (typeof order.total === 'number' && order.total > 0) {
          paidTotal = order.total;
        } else if (typeof order.total === 'string' && parseFloat(order.total) > 0) {
          paidTotal = parseFloat(order.total);
        } else if (order.payment && typeof order.payment.total === 'number') {
          paidTotal = order.payment.total;
        } else if (order.payment && typeof order.payment.total === 'string') {
          paidTotal = parseFloat(order.payment.total) || 0;
        } else {
          paidTotal = 0;
        }
        // If specific month is selected, only count orders from that month
        if (selectedMonth === 'all' || parseInt(selectedMonth) === month) {
          monthlyOrders[month]++;
          monthlyProfit[month] += paidTotal;
        }
      }
    });
    
    // Create charts data based on selection
    if (selectedMonth === 'all') {
      // Show all 12 months
      createFullYearCharts(months, monthlyOrders, monthlyProfit);
    } else {
      // Show daily breakdown for selected month
      await createMonthlyDetailCharts(selectedYear, parseInt(selectedMonth), db);
    }
    
    console.log('Charts data loaded successfully');
    
  } catch (error) {
    console.error('Error loading charts data:', error);
    if (error.code === 'permission-denied') {
      console.warn('Permission denied for charts data - showing fallback data');
    } else if (error.code === 'unavailable') {
      console.warn('Firestore unavailable - showing fallback data');
    }
    showFallbackChartsData();
  }
}

function showFallbackChartsData() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  createFullYearCharts(months, sampleOrders, sampleProfit);
}

// Create charts for full year view
function createFullYearCharts(months, monthlyOrders, monthlyProfit) {
  // Create orders chart data
  ordersChartData = new google.visualization.DataTable();
  ordersChartData.addColumn('string', 'Month');
  ordersChartData.addColumn('number', 'Orders');
  
  for (let i = 0; i < 12; i++) {
    ordersChartData.addRow([months[i], monthlyOrders[i]]);
  }
  
  // Create profit chart data
  profitChartData = new google.visualization.DataTable();
  profitChartData.addColumn('string', 'Month');
  profitChartData.addColumn('number', 'Revenue');
  
  for (let i = 0; i < 12; i++) {
    profitChartData.addRow([months[i], monthlyProfit[i]]);
  }
  
  // Draw both charts
  drawOrdersChart();
  drawProfitChart();
}

// Create charts for specific month daily view
async function createMonthlyDetailCharts(year, month, db) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dailyOrders = new Array(daysInMonth).fill(0);
  const dailyProfit = new Array(daysInMonth).fill(0);
  
  // Get orders for the specific month
  const ordersSnapshot = await db.collection('orders').get();
  
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    let orderDate = null;
    
    // Handle different timestamp formats
    if (order.timestamp && order.timestamp.toDate) {
      orderDate = order.timestamp.toDate();
    } else if (order.createdAt) {
      orderDate = new Date(order.createdAt);
    } else if (order.dateCreated) {
      orderDate = new Date(order.dateCreated);
    }
    
    if (orderDate && orderDate.getFullYear() === year && orderDate.getMonth() === month) {
      const day = orderDate.getDate() - 1; // 0-indexed
      // Always prefer root-level total, fallback to payment.total only if missing or zero
      let paidTotal = 0;
      if (typeof order.total === 'number' && order.total > 0) {
        paidTotal = order.total;
      } else if (typeof order.total === 'string' && parseFloat(order.total) > 0) {
        paidTotal = parseFloat(order.total);
      } else if (order.payment && typeof order.payment.total === 'number') {
        paidTotal = order.payment.total;
      } else if (order.payment && typeof order.payment.total === 'string') {
        paidTotal = parseFloat(order.payment.total) || 0;
      } else {
        paidTotal = 0;
      }
      dailyOrders[day]++;
      dailyProfit[day] += paidTotal;
    }
  });
  
  // Create orders chart data for daily view
  ordersChartData = new google.visualization.DataTable();
  ordersChartData.addColumn('string', 'Day');
  ordersChartData.addColumn('number', 'Orders');
  
  for (let i = 0; i < daysInMonth; i++) {
    ordersChartData.addRow([`${i + 1}`, dailyOrders[i]]);
  }
  
  // Create profit chart data for daily view
  profitChartData = new google.visualization.DataTable();
  profitChartData.addColumn('string', 'Day');
  profitChartData.addColumn('number', 'Revenue');
  
  for (let i = 0; i < daysInMonth; i++) {
    profitChartData.addRow([`${i + 1}`, dailyProfit[i]]);
  }
  
  // Draw both charts
  drawOrdersChart();
  drawProfitChart();
}

function drawOrdersChart() {
  const chartDiv = document.getElementById('ordersChart');
  if (!chartDiv || !ordersChartData) return;
  
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : 'all';
  const isDaily = selectedMonth !== 'all';
  const options = {
    title: '',
    fontName: 'Poppins',
    titleTextStyle: { color: '#333333' },
    hAxis: {
      titleTextStyle: { color: '#666666', fontSize: 13, bold: true },
      textStyle: { color: '#666666', fontSize: 11 },
      gridlines: { color: '#e5e7eb', count: isDaily ? -1 : 12 },
      slantedText: isDaily && selectedMonth !== 'all'
    },
    vAxis: {
      titleTextStyle: { color: '#666666', fontSize: 13, bold: true },
      textStyle: { color: '#666666', fontSize: 11 },
      gridlines: { color: '#e5e7eb' },
      format: 'short',
      viewWindow: { min: 0 }
    },
    backgroundColor: '#ffffff',
    legend: { position: 'none' },
    colors: ['#c81f7b'],
    curveType: 'function',
    interpolateNulls: true,
    chartArea: { left: 30, top: 15, width: '90%', height: '80%' },
    lineWidth: 3,
    pointSize: 6,
    focusTarget: 'category',
    tooltip: { textStyle: { fontSize: 12 } }
  };
  ordersChart = new google.visualization.LineChart(chartDiv);
  ordersChart.draw(ordersChartData, options);
}

function drawProfitChart() {
  const chartDiv = document.getElementById('profitChart');
  if (!chartDiv || !profitChartData) return;
  
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : 'all';
  const isDaily = selectedMonth !== 'all';
  const options = {
    title: '',
    fontName: 'Poppins',
    titleTextStyle: { color: '#333333' },
    hAxis: {
      titleTextStyle: { color: '#666666', fontSize: 13, bold: true },
      textStyle: { color: '#666666', fontSize: 11 },
      gridlines: { color: '#e5e7eb', count: isDaily ? -1 : 12 },
      slantedText: isDaily && selectedMonth !== 'all'
    },
    vAxis: {
      titleTextStyle: { color: '#666666', fontSize: 13, bold: true },
      textStyle: { color: '#666666', fontSize: 11 },
      gridlines: { color: '#e5e7eb' },
      format: '₱#,###',
      viewWindow: { min: 0 }
    },
    backgroundColor: '#ffffff',
    legend: { position: 'none' },
    colors: ['#926afa'],
    curveType: 'function',
    interpolateNulls: true,
    chartArea: { left: 40, top: 15, width: '90%', height: '80%' },
    lineWidth: 3,
    pointSize: 6,
    focusTarget: 'category',
    tooltip: { textStyle: { fontSize: 12 } }
  };
  profitChart = new google.visualization.LineChart(chartDiv);
  profitChart.draw(profitChartData, options);
}

// ...existing code...

// Update current month display
function updateCurrentMonthDisplay() {
  const currentMonthDisplay = document.getElementById('currentMonthDisplay');
  if (currentMonthDisplay) {
    const now = new Date();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    currentMonthDisplay.textContent = `Current Month: ${currentMonth} ${currentYear}`;
  }
}

// Set month dropdown to current month
function setCurrentMonth() {
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) {
    const currentMonth = new Date().getMonth();
    monthSelect.value = currentMonth.toString();
    updateCurrentMonthDisplay();
    updateChartLabels();
  }
}

// Year and Month selector event listeners
document.addEventListener('DOMContentLoaded', function() {
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  
  // Initialize current month display
  updateCurrentMonthDisplay();
  
  // Set current month as default selection
  setTimeout(setCurrentMonth, 100);
  
  if (yearSelect) {
    yearSelect.addEventListener('change', function() {
      console.log('Year changed to:', this.value);
      loadChartsData();
    });
  }
  
  if (monthSelect) {
    monthSelect.addEventListener('change', function() {
      console.log('Month changed to:', this.value);
      updateChartLabels();
      loadChartsData();
    });
  }
});

// Update chart labels based on month selection
function updateChartLabels() {
  const monthSelect = document.getElementById('monthSelect');
  const selectedMonth = monthSelect ? monthSelect.value : 'all';
  // Update chart section headers
  const ordersHeader = document.querySelector('.chart-section h6');
  const revenueHeader = document.querySelectorAll('.chart-section h6')[1];
  if (selectedMonth === 'all') {
    if (ordersHeader) ordersHeader.textContent = 'Monthly Orders';
    if (revenueHeader) revenueHeader.textContent = 'Monthly Revenue';
  } else {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = monthNames[parseInt(selectedMonth)];
    if (ordersHeader) ordersHeader.textContent = `Daily Orders - ${monthName}`;
    if (revenueHeader) revenueHeader.textContent = `Daily Revenue - ${monthName}`;
  }
  [ordersHeader, revenueHeader].forEach(header => {
    if (header) {
      header.style.setProperty('color', '#333', 'important');
      header.style.setProperty('margin-top', '10px', 'important');
    }
  });
}

// Inventory status loader
function loadInventoryStatus() {
  // Prevent duplicate execution
  if (window.inventoryLoaded) {
    console.log('Inventory already loaded, skipping...');
    return;
  }
  
  console.log('Loading inventory status...');
  window.inventoryLoaded = true;
  
  function waitForFirebase() {
    console.log('Checking Firebase availability...');
    
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      console.log('Firebase is available, fetching inventory data...');
      fetchInventoryData();
    } else if (window.isFirebaseReady && window.isFirebaseReady()) {
      console.log('Firebase ready via main.js, fetching inventory data...');
      fetchInventoryData();
    } else {
      console.log('Firebase not ready, retrying in 500ms...');
      setTimeout(waitForFirebase, 500);
    }
  }

  function fetchInventoryData() {
    try {
      const db = firebase.firestore();
      const inventoryBody = document.getElementById('inventoryStatusBody');
      
      if (!inventoryBody) {
        console.error('Inventory status table body not found');
        return;
      }

      console.log('Fetching inventory data from Firebase...');
      
      // Set a timeout to show fallback data if Firebase is slow
      const timeoutId = setTimeout(() => {
        console.log('Firebase timeout, showing fallback inventory data');
        showFallbackInventoryData(inventoryBody);
      }, 5000);
      
      db.collection('inventory')
        .get()
        .then((querySnapshot) => {
          clearTimeout(timeoutId);
          console.log('Inventory query completed, documents found:', querySnapshot.size);
          inventoryBody.innerHTML = '';

          if (querySnapshot.empty) {
            console.log('No inventory items found');
            inventoryBody.innerHTML = `
              <tr>
                <td colspan="2" class="text-center text-muted">No inventory data available</td>
              </tr>
            `;
            return;
          }

          const items = [];
          querySnapshot.forEach(doc => items.push(doc.data()));

          items.sort((a,b) => {
            const qa = parseInt(a.quantity)||0;
            const qb = parseInt(b.quantity)||0;
            const rank = q => (q===0?0:(q<=5?1:2));
            return rank(qa) - rank(qb);
          });

          const MAX_VISIBLE = 8;
          const visible = items.slice(0, MAX_VISIBLE);
          const remaining = items.slice(MAX_VISIBLE);

          visible.forEach(item => inventoryBody.appendChild(createInventoryRow(item)));

          if (remaining.length) {
            const showMoreRow = document.createElement('tr');
            showMoreRow.id = 'showMoreInventoryRow';
            showMoreRow.innerHTML = `
              <td colspan="2" class="text-center">
                <button id="showMoreInventoryBtn" class="btn btn-sm btn-outline-secondary" type="button">
                  Show All (${remaining.length} more)
                </button>
              </td>`;
            inventoryBody.appendChild(showMoreRow);

            inventoryBody.addEventListener('click', function handleShowMore(e) {
              const btn = e.target.closest('#showMoreInventoryBtn');
              if (!btn) return;
              
              remaining.forEach(item => inventoryBody.insertBefore(createInventoryRow(item), showMoreRow));
              
              btn.textContent = 'Show Less';
              btn.id = 'showLessInventoryBtn';
              
              inventoryBody.addEventListener('click', function handleShowLess(ev){
                const lessBtn = ev.target.closest('#showLessInventoryBtn');
                if(!lessBtn) return;
                
                const rows = Array.from(inventoryBody.querySelectorAll('tr'));
                const dataRows = rows.filter(r => !r.id);
                dataRows.slice(MAX_VISIBLE).forEach(r => r.remove());
                lessBtn.textContent = `Show All (${remaining.length} more)`;
                lessBtn.id = 'showMoreInventoryBtn';
              }, { once: true });
            }, { once: true });
          }

          console.log('Inventory status loaded successfully');
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.error('Error loading inventory status:', error);
          if (error.code === 'permission-denied') {
            console.warn('Permission denied for inventory - showing fallback data');
          } else if (error.code === 'unavailable') {
            console.warn('Firestore unavailable - showing fallback data');
          }
          showFallbackInventoryData(inventoryBody);
        });
    } catch (error) {
      console.error('Error in fetchInventoryData:', error);
      const inventoryBody = document.getElementById('inventoryStatusBody');
      if (inventoryBody) {
        showFallbackInventoryData(inventoryBody);
      }
    }
  }

  function showFallbackInventoryData(inventoryBody) {
    const fallbackData = [
      { name: 'Rice', quantity: 15 },
      { name: 'Chicken', quantity: 8 },
      { name: 'Beef', quantity: 3 },
      { name: 'Vegetables', quantity: 12 },
      { name: 'Spices', quantity: 20 },
      { name: 'Oil', quantity: 5 }
    ];

    inventoryBody.innerHTML = '';
    fallbackData.forEach(item => {
      inventoryBody.appendChild(createInventoryRow(item));
    });
  }

  waitForFirebase();
}

function createInventoryRow(item) {
  const tr = document.createElement('tr');
  const quantity = parseInt(item.quantity) || 0;
  const itemName = item.name || 'Unknown Item';
  
  let statusClass = '';
  let statusLabel = '';
  
  if (quantity === 0) {
    statusClass = 'empty';
    statusLabel = 'Empty';
  } else if (quantity >= 1 && quantity <= 5) {
    statusClass = 'restock';
    statusLabel = 'Need Restocking';
  } else if (quantity >= 6) {
    statusClass = 'steady';
    statusLabel = 'Steady';
  }
  
  tr.innerHTML = `
    <td>${itemName}</td>
    <td class="text-end">
      <div class="status-item">
        <span class="status-indicator ${statusClass}"></span>
        <span class="status-text">${statusLabel}</span>
      </div>
    </td>
  `;
  
  return tr;
}

// Firebase authentication and user data loading
function initializeFirebaseAuth() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        await loadUserName(user.uid);
        loadDashboardData();
      } else {
        console.log("No user signed in");
        // Uncomment to redirect to login
        // window.location.href = '/index.html';
      }
    });
  } else {
    console.log('Firebase not available, waiting...');
    setTimeout(initializeFirebaseAuth, 1000);
  }
}

// Load user name from Firestore
async function loadUserName(userId) {
  try {
    const userDoc = await firebase.firestore().collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      updateWelcomeMessage(userData);
    } else {
      console.log("No user document found");
      const user = firebase.auth().currentUser;
      updateWelcomeMessage({ 
        firstName: user.email.split('@')[0],
        role: 'User'
      });
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    updateWelcomeMessage({ firstName: 'User', role: 'User' });
  }
}

// Update welcome message with user data
function updateWelcomeMessage(userData) {
  const welcomeElement = document.getElementById('welcomeMessage');
  
  if (welcomeElement) {
    let displayName = 'User';
    
    if (userData.firstName && userData.lastName) {
      displayName = `${userData.firstName} ${userData.lastName}`;
    } else if (userData.firstName) {
      displayName = userData.firstName;
    } else if (userData.displayName) {
      displayName = userData.displayName;
    }
    
    welcomeElement.textContent = `Welcome, ${displayName}!`;
    welcomeElement.style.setProperty('color', '#96392d', 'important');
    console.log(`✅ Welcome message updated: ${displayName}`);
  }
}

// Load dashboard data
function loadDashboardData() {
  updateTime();
  loadInventoryStatus();
  loadSalesData();
}

// Load sales data
async function loadSalesData() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log('Loading sales data for date range:', startOfDay, 'to', endOfDay);
    
    // Get all orders and filter by date in JavaScript since we have mixed timestamp formats
    const ordersSnapshot = await firebase.firestore()
      .collection('orders')
      .get();
    
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalPax = 0; // Track total number of guests served
    let uniqueCustomers = new Set();
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      let orderDate = null;
      // Handle different timestamp formats
      if (order.timestamp && order.timestamp.toDate) {
        orderDate = order.timestamp.toDate();
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.dateCreated) {
        orderDate = new Date(order.dateCreated);
      }
      // Check if order is from today
      if (orderDate && orderDate >= startOfDay && orderDate < endOfDay) {
        // Use payment.total if present (from payment.html), else fallback to order.total
        let paidTotal = 0;
        if (order.payment && typeof order.payment.total === 'number') {
          paidTotal = order.payment.total;
        } else if (order.payment && typeof order.payment.total === 'string') {
          paidTotal = parseFloat(order.payment.total) || 0;
        } else if (order.total && typeof order.total === 'number') {
          paidTotal = order.total;
        } else if (order.total && typeof order.total === 'string') {
          paidTotal = parseFloat(order.total) || 0;
        } else {
          // Calculate from items if no total is available
          if (order.items && Array.isArray(order.items)) {
            paidTotal = order.items.reduce((sum, item) => {
              const price = parseFloat(item.unitPrice || item.price) || 0;
              const qty = parseInt(item.quantity) || 1;
              return sum + (price * qty);
            }, 0);
          }
        }
        totalRevenue += paidTotal;
        totalOrders++;
        
        // Log payment method and source
        const paymentMethod = order.payment?.method || 'Unknown';
        const paymentSource = order.payment ? 'Payment System' : 'POS System';
        console.log(`Order ${doc.id}: ₱${paidTotal} (${paymentMethod} - ${paymentSource}) on ${orderDate.toLocaleString()}`);
        
        // Add pax count from this order - only count if pax was actually entered
        if (order.paxNumber && parseInt(order.paxNumber) > 0) {
          const paxCount = parseInt(order.paxNumber);
          totalPax += paxCount;
          console.log(`  → Pax: ${paxCount}`);
        } else {
          console.log(`  → No pax entered`);
        }
        // Use order number or table number as unique customer identifier
        const customerId = order.customerId || order.orderNumberFormatted || order.tableNumber;
        if (customerId) {
          uniqueCustomers.add(customerId);
        }
      }
    });
    
    console.log(`Found ${totalOrders} orders with total revenue ${totalRevenue} serving ${totalPax} guests total (only counting orders with pax specified)`);
    
    updateSalesCard('revenue', totalRevenue);
    updateSalesCard('orders', totalOrders);
    updateSalesCard('customers', totalPax); // Show total pax - only actual entered values
    
  } catch (error) {
    console.error('Error loading sales data:', error);
    // Set default values on error
    updateSalesCard('revenue', 0);
    updateSalesCard('orders', 0);
    updateSalesCard('customers', 0);
  }
  
  // Ensure revenue is updated even if no orders found
  setTimeout(() => {
    const revenueElement = document.querySelector('.sales-card-top .fs-5');
    if (revenueElement && revenueElement.textContent === '₱2500.00') {
      console.log('Updating hardcoded revenue value...');
      updateSalesCard('revenue', 0);
    }
  }, 1000);
}

// Set up real-time listener for sales data updates
function setupSalesDataListener() {
  try {
    const db = firebase.firestore();
    
    // Listen for new orders (especially from payment system)
    db.collection('orders')
      .where('timestamp', '>=', new Date(new Date().setHours(0, 0, 0, 0)))
      .onSnapshot((snapshot) => {
        console.log('📊 Sales data updated - refreshing dashboard...');
        loadSalesData();
      }, (error) => {
        console.error('Error setting up sales data listener:', error);
      });
      
  } catch (error) {
    console.error('Error initializing sales data listener:', error);
  }
}

// Update sales cards
function updateSalesCard(type, value) {
  const cards = {
    revenue: '.sales-card-top .fs-5',
    orders: '.sales-card-middle .fs-5', 
    customers: '.sales-card-bottom .fs-5' // Now shows exact total pax entered (no defaults)
  };
  
  const element = document.querySelector(cards[type]);
  if (element) {
    if (type === 'revenue') {
      element.textContent = `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
    } else {
      element.textContent = value.toString();
    }
  }
}

// Load sales summary data
async function loadSalesSummaryData() {
  // Prevent duplicate execution
  if (window.salesSummaryLoaded) {
    console.log('Sales summary already loaded, skipping...');
    return;
  }
  
  try {
    console.log('Loading sales summary data...');
    window.salesSummaryLoaded = true;
    
    const db = firebase.firestore();
    const today = new Date();
    
    // Calculate date ranges
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get all orders
      db.collection('orders').onSnapshot(snapshot => {
        let totalSales = 0;
        let thisMonthSales = 0;
        let todaySales = 0;
        let lastMonthSales = 0;
        snapshot.forEach(doc => {
          const order = doc.data();
          // Always prefer root-level total, fallback to payment.total only if missing or zero
          let orderTotal = 0;
          if (typeof order.total === 'number' && order.total > 0) {
            orderTotal = order.total;
          } else if (typeof order.total === 'string' && parseFloat(order.total) > 0) {
            orderTotal = parseFloat(order.total);
          } else if (order.payment && typeof order.payment.total === 'number') {
            orderTotal = order.payment.total;
          } else if (order.payment && typeof order.payment.total === 'string') {
            orderTotal = parseFloat(order.payment.total) || 0;
          } else {
            orderTotal = 0;
          }
          if (orderTotal < 0) orderTotal = 0;
          let orderDate = null;
          // Handle different timestamp formats
          if (order.timestamp && order.timestamp.toDate) {
            orderDate = order.timestamp.toDate();
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          } else if (order.dateCreated) {
            orderDate = new Date(order.dateCreated);
          }
          // Skip orders with invalid or missing dates
          if (!orderDate || !(orderDate instanceof Date) || isNaN(orderDate.getTime())) {
            return;
          }
          // Total sales (all time)
          totalSales += orderTotal;
          // Today's sales
          if (orderDate >= startOfToday && orderDate < endOfToday) {
            todaySales += orderTotal;
          }
          // This month's sales
          if (orderDate >= startOfMonth && orderDate < endOfMonth) {
            thisMonthSales += orderTotal;
          }
          // Last month's sales (for growth calculation)
          if (orderDate >= startOfLastMonth && orderDate < endOfLastMonth) {
            lastMonthSales += orderTotal;
          }
        });
      
        // Calculate growth percentage
        const startOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        const endOfYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let yesterdaySales = 0;
        snapshot.forEach(doc => {
          const order = doc.data();
          let orderDate = null;
          if (order.timestamp && order.timestamp.toDate) {
            orderDate = order.timestamp.toDate();
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          } else if (order.dateCreated) {
            orderDate = new Date(order.dateCreated);
          }
          if (orderDate && orderDate >= startOfYesterday && orderDate < endOfYesterday) {
            // Always prefer root-level total, fallback to payment.total only if missing or zero
            let orderTotal = 0;
            if (typeof order.total === 'number' && order.total > 0) {
              orderTotal = order.total;
            } else if (typeof order.total === 'string' && parseFloat(order.total) > 0) {
              orderTotal = parseFloat(order.total);
            } else if (order.payment && typeof order.payment.total === 'number') {
              orderTotal = order.payment.total;
            } else if (order.payment && typeof order.payment.total === 'string') {
              orderTotal = parseFloat(order.payment.total) || 0;
            } else {
              orderTotal = 0;
            }
            yesterdaySales += orderTotal;
          }
        });
        let dayGrowth = 0;
        if (yesterdaySales > 0) {
          dayGrowth = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
        } else if (todaySales > 0) {
          dayGrowth = 100;
        }
        updateSalesSummary(totalSales, thisMonthSales, todaySales, dayGrowth);
        console.log(`Sales Summary - Total: ${totalSales}, This Month: ${thisMonthSales}, Today: ${todaySales}, Day Growth: ${dayGrowth.toFixed(1)}%`);
      });
    
  } catch (error) {
    console.error('Error loading sales summary data:', error);
    if (error.code === 'permission-denied') {
      console.warn('Permission denied for sales data - using default values');
    } else if (error.code === 'unavailable') {
      console.warn('Firestore unavailable - using default values');
    }
    // Set default values on error
    updateSalesSummary(0, 0, 0, 0);
  }
}

// Update sales summary display
function updateSalesSummary(total, thisMonth, today, growthPercentage) {
  // Update values
  const totalElement = document.getElementById('totalSalesValue');
  const thisMonthElement = document.getElementById('thisMonthSalesValue');
  const todayElement = document.getElementById('todaySalesValue');
  const growthElement = document.getElementById('salesGrowthPercentage');
  
  if (totalElement) totalElement.textContent = Math.round(total).toLocaleString();
  if (thisMonthElement) thisMonthElement.textContent = Math.round(thisMonth).toLocaleString();
  if (todayElement) todayElement.textContent = Math.round(today).toLocaleString();
  
  if (growthElement) {
    const icon = growthElement.previousElementSibling;
    growthElement.parentElement.className = 'd-flex align-items-center';
    // Set color based on card type
    let color = '#d7268a'; // default pink
    // Find which card this is in
    const parent = growthElement.closest('.mini-card');
    if (parent && parent.classList.contains('sales-card-top')) {
      color = '#ff6b9d'; // pink
    } else if (parent && parent.classList.contains('sales-card-middle')) {
      color = '#e4c9ffff'; // purple
    } else if (parent && parent.classList.contains('sales-card-bottom')) {
      color = '#6ba4ff'; // blue
    }
    growthElement.style.color = color;
    if (icon) {
      icon.style.color = color;
    }
    growthElement.textContent = `${Math.abs(growthPercentage).toFixed(1)}% from last day`;
  }

  // Update Sales Overview mini-cards (trend-revenue and trend-orders)
  const trendRevenue = document.querySelector('.trend-revenue');
  const trendOrders = document.querySelector('.trend-orders');
  if (trendRevenue) {
    trendRevenue.innerHTML = `<img src="/src/Icons/trend.png" alt="Trend Up"> <span style="color:#d7268a">${Math.abs(growthPercentage).toFixed(1)}% from last day</span>`;
  }
  if (trendOrders) {
    trendOrders.innerHTML = `<img src="/src/Icons/trend.png" alt="Trend Up"> <span style="color:#a259c6">${Math.abs(growthPercentage).toFixed(1)}% from last day</span>`;
  }
}

// Load top products data
async function loadTopProductsData() {
  // Prevent duplicate execution
  if (window.topProductsLoaded) {
    console.log('Top products already loaded, skipping...');
    return;
  }
  
  try {
    console.log('Loading top products data...');
    window.topProductsLoaded = true;
    
    // Set a timeout to show fallback data if Firebase is slow
    const timeoutId = setTimeout(() => {
      console.log('Firebase timeout, showing fallback top products data');
      showFallbackTopProductsData();
    }, 5000);
    
    const db = firebase.firestore();
    const ordersSnapshot = await db.collection('orders').get();
    
    clearTimeout(timeoutId);
    
    // Object to store product counts
    const productCounts = {};
    
    // Process each order
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      
      // Check if order has items array
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productName = item.name || item.productName || 'Unknown Product';
          const quantity = parseInt(item.quantity) || 1;
          
          if (productCounts[productName]) {
            productCounts[productName] += quantity;
          } else {
            productCounts[productName] = quantity;
          }
        });
      }
    });
    
    // Convert to array and sort by count
    const sortedProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Get top 6 products
    
    // Update the display
    updateTopProductsDisplay(sortedProducts);
    
    console.log('Top products loaded:', sortedProducts);
    
  } catch (error) {
    console.error('Error loading top products data:', error);
    if (error.code === 'permission-denied') {
      console.warn('Permission denied for top products - showing fallback data');
    } else if (error.code === 'unavailable') {
      console.warn('Firestore unavailable - showing fallback data');
    }
    showFallbackTopProductsData();
  }
}

function showFallbackTopProductsData() {
  const fallbackProducts = [
    { name: 'Adobo', count: 25 },
    { name: 'Sinigang', count: 18 },
    { name: 'Lechon Kawali', count: 15 },
    { name: 'Kare-Kare', count: 12 },
    { name: 'Crispy Pata', count: 10 },
    { name: 'Sisig', count: 8 }
  ];
  
  updateTopProductsDisplay(fallbackProducts);
}

// Update top products display
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

// DOM Content Loaded event listener
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Dashboard script loaded');
  
  // Skip auto-refresh if this is an OMR page
  if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
    return;
  }
  
  // Initialize time display
  updateTime();
  setInterval(updateTime, 1000 * 60);
  
  // Load dashboard data immediately
  loadDashboardData();
  
  // Initialize Firebase authentication
  initializeFirebaseAuth();
  
  // Setup kitchen role access control
  setupKitchenAccess();
  
  // Set up real-time updates for sales data
  setupSalesDataListener();
  
  // Load sales summary data
  loadSalesSummaryData();
  
  // Load top products data
  loadTopProductsData();
  
  // Load inventory status
  loadInventoryStatus();
  
  // Year selector for orders chart
  const yearSelect = document.getElementById('yearSelect');
  if (yearSelect) {
    yearSelect.addEventListener('change', function() {
      console.log('Year changed to:', this.value);
      loadOrdersChartData();
    });
  }
  
  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
          console.log('User signed out successfully');
          window.location.href = '../index.html';
        }).catch((error) => {
          console.error('Sign out error:', error);
          window.location.href = '../index.html';
        });
      } else {
        console.log('Firebase not available, redirecting to login');
        window.location.href = '../index.html';
      }
    });
  }
});
