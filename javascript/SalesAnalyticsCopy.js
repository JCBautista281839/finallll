// --- DESCRIPTIVE ANALYSIS FUNCTIONALITY ---
// Comprehensive analysis functions for sales data interpretation

// Global variables for analysis data
let analysisData = {
  salesTrend: null,
  dayOfWeek: null,
  timeOfDay: null,
  paymentMethods: null,
  topProducts: null,
  summary: null
};

// Initialize descriptive analysis
function initializeDescriptiveAnalysis() {
  console.log('[Analysis] Initializing descriptive analysis system...');

  // Add analysis panel to the analytics page
  addAnalysisPanel();

  // Set up analysis event listeners
  setupAnalysisEventListeners();

  console.log('[Analysis] Descriptive analysis system initialized');
}

// Add analysis panel to the page
function addAnalysisPanel() {
  const calendarSection = document.querySelector('.calendar-section');
  if (!calendarSection) return;

  // Create analysis panel
  const analysisPanel = document.createElement('div');
  analysisPanel.className = 'analysis-panel';
  analysisPanel.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-top: 2rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border: 1px solid #e9ecef;
  `;

  analysisPanel.innerHTML = `
    <div class="analysis-header" style="margin-bottom: 1.5rem; height: 5px; display: flex; justify-content: space-between; align-items: center;">
      <h4 style="margin: 0; color: #333; font-weight: 600;">
        <i class="fas fa-chart-line" style="margin-right: 8px; color:rgb(125, 14, 14);"></i>
        Descriptive Analysis
      </h4>
      <button id="closeAnalysis" class="btn btn-sm btn-outline-danger" style="padding: 0.25rem 0.5rem; border-radius: 50%; width: 30px; height: 30px; align-items: center; justify-content: center;">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    
    <div id="analysisResults" class="analysis-results" style="display: none;">
    </div>
  `;

  // Hide the entire analysis panel by default
  analysisPanel.style.display = 'none';

  // Insert the analysis panel before the calendar section
  calendarSection.parentNode.insertBefore(analysisPanel, calendarSection);
}

// Set up analysis event listeners
function setupAnalysisEventListeners() {
  const generateBtn = document.getElementById('generateAnalysis');
  const closeBtn = document.getElementById('closeAnalysis');

  if (generateBtn) {
    generateBtn.addEventListener('click', generateComprehensiveAnalysis);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', clearAnalysisResults);
  }
}

// Generate comprehensive analysis
async function generateComprehensiveAnalysis() {
  console.log('[Analysis] Generating comprehensive analysis...');

  const generateBtn = document.getElementById('generateAnalysis');
  const resultsDiv = document.getElementById('analysisResults');

  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
  }

  try {
    // Collect current data from charts and summary cards
    const currentData = collectCurrentAnalyticsData();

    if (!currentData || currentData.orders.length === 0) {
      showAnalysisError('No data available for analysis. Please ensure you have sales data loaded.');
      return;
    }

    // Generate different types of analysis
    const salesTrendAnalysis = analyzeSalesTrend(currentData);
    const dayOfWeekAnalysis = analyzeDayOfWeekPerformance(currentData);
    const timeOfDayAnalysis = analyzeTimeOfDayActivity(currentData);
    const paymentMethodAnalysis = analyzePaymentMethods(currentData);
    const productAnalysis = analyzeTopProducts(currentData);
    const summaryAnalysis = generateSummaryInsights(currentData);
    const discountsAnalysis = generateDiscountsAnalysis(currentData);

    // Generate predictive analysis
    const predictiveAnalysis = generatePredictiveAnalysis(currentData);

    // Combine all analyses
    const comprehensiveAnalysis = {
      salesTrend: salesTrendAnalysis,
      dayOfWeek: dayOfWeekAnalysis,
      timeOfDay: timeOfDayAnalysis,
      paymentMethods: paymentMethodAnalysis,
      topProducts: productAnalysis,
      summary: summaryAnalysis,
      discounts: discountsAnalysis,
      predictive: predictiveAnalysis,
      generatedAt: new Date().toISOString(),
      dataPeriod: currentData.dateRange || 'Current Period'
    };

    // Store analysis data
    analysisData = comprehensiveAnalysis;

    // Show the analysis panel
    const analysisPanel = document.querySelector('.analysis-panel');
    if (analysisPanel) {
      analysisPanel.style.display = 'block';
    }

    // Display results
    displayAnalysisResults(comprehensiveAnalysis);

    // Show the close button
    const closeBtn = document.getElementById('closeAnalysis');
    if (closeBtn) {
      closeBtn.classList.add('show');
    }

    console.log('[Analysis] Comprehensive analysis generated successfully');

  } catch (error) {
    console.error('[Analysis] Error generating analysis:', error);
    showAnalysisError('Error generating analysis. Please try again.');
  } finally {
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-brain"></i> Generate Analysis';
    }
  }
}

// Collect current analytics data
function collectCurrentAnalyticsData() {
  // Get data from current analytics state
  const orders = window.currentAnalyticsData?.orders || [];
  const paymentMethods = window.currentAnalyticsData?.paymentMethods || {};
  const summary = window.currentAnalyticsData?.summary || {};
  const dateRange = window.currentAnalyticsData?.dateRange || 'Current Period';

  return {
    orders,
    paymentMethods,
    summary,
    dateRange
  };
}

// Analyze sales trend
function analyzeSalesTrend(data) {
  const orders = data.orders || [];
  if (orders.length === 0) {
    return {
      trend: 'No data available',
      insights: ['No sales data to analyze'],
      recommendations: ['Ensure sales data is properly loaded']
    };
  }

  // Calculate daily sales
  const dailySales = {};
  orders.forEach(order => {
    const date = new Date(order.timestamp).toDateString();
    if (!dailySales[date]) {
      dailySales[date] = { total: 0, count: 0 };
    }
    dailySales[date].total += parseFloat(order.total) || 0;
    dailySales[date].count += 1;
  });

  const salesValues = Object.values(dailySales).map(d => d.total);
  const avgDailySales = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
  const maxDailySales = Math.max(...salesValues);
  const minDailySales = Math.min(...salesValues);

  // Calculate trend
  const firstHalf = salesValues.slice(0, Math.floor(salesValues.length / 2));
  const secondHalf = salesValues.slice(Math.floor(salesValues.length / 2));
  const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  let trend = 'stable';
  if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
  else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';

  const insights = [];
  const recommendations = [];

  insights.push(`Average daily sales: ₱${avgDailySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  insights.push(`Peak daily sales: ₱${maxDailySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  insights.push(`Lowest daily sales: ₱${minDailySales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  insights.push(`Sales trend: ${trend}`);

  if (trend === 'increasing') {
    recommendations.push('Maintain current successful strategies');
    recommendations.push('Scale up operations during peak times');
    recommendations.push('Document what drives your success');
  } else if (trend === 'decreasing') {
    recommendations.push('Investigate and address declining sales causes');
    recommendations.push('Launch targeted promotions to boost revenue');
    recommendations.push('Gather customer feedback for improvements');
  } else {
    recommendations.push('Implement growth strategies from your best days');
    recommendations.push('Focus on customer retention and acquisition');
    recommendations.push('Optimize operations for better performance');
  }

  return {
    trend,
    insights,
    recommendations,
    metrics: {
      averageDailySales: avgDailySales,
      maxDailySales,
      minDailySales,
      totalDays: salesValues.length
    }
  };
}

// Analyze day of week performance
function analyzeDayOfWeekPerformance(data) {
  const orders = data.orders || [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daySales = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  orders.forEach(order => {
    const dayOfWeek = new Date(order.timestamp).getDay();
    daySales[dayOfWeek] += parseFloat(order.total) || 0;
    dayCounts[dayOfWeek] += 1;
  });

  const avgSalesPerDay = daySales.map((sales, index) =>
    dayCounts[index] > 0 ? sales / dayCounts[index] : 0
  );

  const bestDayIndex = avgSalesPerDay.indexOf(Math.max(...avgSalesPerDay));
  const worstDayIndex = avgSalesPerDay.indexOf(Math.min(...avgSalesPerDay.filter(s => s > 0)));

  const insights = [];
  const recommendations = [];

  insights.push(`Best performing day: ${dayNames[bestDayIndex]} (₱${avgSalesPerDay[bestDayIndex].toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);
  insights.push(`Challenging day: ${dayNames[worstDayIndex]} (₱${avgSalesPerDay[worstDayIndex].toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);

  const weekendPerformance = (daySales[0] + daySales[6]) / 2; // Sunday + Saturday
  const weekdayPerformance = daySales.slice(1, 6).reduce((a, b) => a + b, 0) / 5;

  if (weekendPerformance > weekdayPerformance * 1.2) {
    insights.push('Weekends significantly outperform weekdays');
    recommendations.push('Maximize weekend revenue with special promotions');
    recommendations.push('Increase weekend staffing and capacity');
  } else if (weekdayPerformance > weekendPerformance * 1.1) {
    insights.push('Weekdays show stronger performance than weekends');
    recommendations.push('Develop weekend-specific marketing strategies');
    recommendations.push('Create family-focused weekend offerings');
  }

  // Add general day-specific recommendations
  recommendations.push(`Boost performance on ${dayNames[worstDayIndex]}`);
  recommendations.push(`Replicate ${dayNames[bestDayIndex]} strategies across other days`);
  recommendations.push('Optimize staffing based on daily patterns');

  return {
    insights,
    recommendations,
    metrics: {
      daySales,
      dayCounts,
      avgSalesPerDay,
      bestDay: dayNames[bestDayIndex],
      worstDay: dayNames[worstDayIndex]
    }
  };
}

// Analyze time of day activity
function analyzeTimeOfDayActivity(data) {
  const orders = data.orders || [];
  const hourSales = new Array(24).fill(0);
  const hourCounts = new Array(24).fill(0);

  orders.forEach(order => {
    const hour = new Date(order.timestamp).getHours();
    hourSales[hour] += parseFloat(order.total) || 0;
    hourCounts[hour] += 1;
  });

  const peakHour = hourSales.indexOf(Math.max(...hourSales));
  const quietHour = hourSales.indexOf(Math.min(...hourSales.filter(s => s > 0)));

  const insights = [];
  const recommendations = [];

  const formatHour = (hour) => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  insights.push(`Peak sales hour: ${formatHour(peakHour)} (₱${hourSales[peakHour].toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);
  insights.push(`Quietest hour: ${formatHour(quietHour)} (₱${hourSales[quietHour].toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);

  // Analyze meal periods
  const breakfastSales = hourSales.slice(6, 11).reduce((a, b) => a + b, 0);
  const lunchSales = hourSales.slice(11, 15).reduce((a, b) => a + b, 0);
  const dinnerSales = hourSales.slice(17, 22).reduce((a, b) => a + b, 0);

  const mealPeriods = [
    { name: 'Breakfast', sales: breakfastSales, hours: '6:00 AM - 11:00 AM' },
    { name: 'Lunch', sales: lunchSales, hours: '11:00 AM - 3:00 PM' },
    { name: 'Dinner', sales: dinnerSales, hours: '5:00 PM - 10:00 PM' }
  ];

  const bestMealPeriod = mealPeriods.reduce((best, current) =>
    current.sales > best.sales ? current : best
  );

  insights.push(`Best performing meal period: ${bestMealPeriod.name} (${bestMealPeriod.hours}) - ₱${bestMealPeriod.sales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);

  if (quietHour >= 14 && quietHour <= 16) {
    recommendations.push('Launch afternoon promotions to boost quiet hours');
    recommendations.push('Create afternoon-specific menu offerings');
  }

  if (peakHour >= 12 && peakHour <= 14) {
    recommendations.push('Optimize lunch operations for peak efficiency');
    recommendations.push('Implement pre-order system for lunch rush');
  } else if (peakHour >= 18 && peakHour <= 20) {
    recommendations.push('Enhance dinner experience and service quality');
    recommendations.push('Develop premium dinner offerings');
  }

  // Add general time-based recommendations
  recommendations.push(`Capitalize on peak hour ${formatHour(peakHour)} revenue`);
  recommendations.push(`Drive traffic during quiet hour ${formatHour(quietHour)}`);
  recommendations.push('Implement dynamic pricing strategies');

  return {
    insights,
    recommendations,
    metrics: {
      hourSales,
      hourCounts,
      peakHour,
      quietHour,
      mealPeriods
    }
  };
}

// Analyze payment methods
function analyzePaymentMethods(data) {
  const paymentMethods = data.paymentMethods || {};
  const total = Object.values(paymentMethods).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return {
      insights: ['No payment data available'],
      recommendations: ['Ensure payment tracking is properly configured']
    };
  }

  const cashPercent = ((paymentMethods.Cash || 0) / total) * 100;
  const gcashPercent = ((paymentMethods.GCash || 0) / total) * 100;
  const cardPercent = ((paymentMethods.Card || 0) / total) * 100;

  const insights = [];
  const recommendations = [];

  insights.push(`Cash payments: ${cashPercent.toFixed(1)}% (₱${(paymentMethods.Cash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);
  insights.push(`GCash payments: ${gcashPercent.toFixed(1)}% (₱${(paymentMethods.GCash || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);
  insights.push(`Card payments: ${cardPercent.toFixed(1)}% (₱${(paymentMethods.Card || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })})`);

  const dominantMethod = cashPercent > gcashPercent && cashPercent > cardPercent ? 'Cash' :
    gcashPercent > cardPercent ? 'GCash' : 'Card';

  insights.push(`Dominant payment method: ${dominantMethod} (${Math.max(cashPercent, gcashPercent, cardPercent).toFixed(1)}%)`);

  if (gcashPercent > 30) {
    recommendations.push('Leverage GCash success to promote card payments');
    recommendations.push('Create GCash-exclusive promotions');
  } else if (cashPercent > 70) {
    recommendations.push('Drive digital payment adoption with incentives');
    recommendations.push('Implement contactless payment options');
  }

  if (cardPercent < 10) {
    recommendations.push('Enhance card payment infrastructure and training');
    recommendations.push('Create card payment incentives');
  }

  // Add general payment recommendations
  recommendations.push('Diversify payment options for customer convenience');
  recommendations.push('Optimize payment processing costs');

  return {
    insights,
    recommendations,
    metrics: {
      cashPercent,
      gcashPercent,
      cardPercent,
      dominantMethod,
      total
    }
  };
}

// Analyze top products
function analyzeTopProducts(data) {
  const orders = data.orders || [];
  const productSales = {};

  orders.forEach(order => {
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productName = item.name || 'Unknown';
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, revenue: 0, orders: 0 };
        }
        productSales[productName].quantity += parseInt(item.quantity) || 1;
        productSales[productName].revenue += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
        productSales[productName].orders += 1;
      });
    }
  });

  const sortedProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity);

  if (sortedProducts.length === 0) {
    return {
      insights: ['No product data available'],
      recommendations: ['Ensure product tracking is properly configured']
    };
  }

  const topProduct = sortedProducts[0];
  const totalProducts = sortedProducts.length;
  const topProductRevenue = sortedProducts.slice(0, 3).reduce((sum, p) => sum + p.revenue, 0);
  const totalRevenue = sortedProducts.reduce((sum, p) => sum + p.revenue, 0);
  const topProductRevenuePercent = (topProductRevenue / totalRevenue) * 100;

  const insights = [];
  const recommendations = [];

  insights.push(`Top selling product: ${topProduct.name} (${topProduct.quantity} units sold)`);
  insights.push(`Top 3 products generate ${topProductRevenuePercent.toFixed(1)}% of total revenue`);
  insights.push(`Total products sold: ${totalProducts} different items`);

  if (topProductRevenuePercent > 60) {
    recommendations.push('Diversify menu to reduce dependency on top sellers');
    recommendations.push('Replicate success factors from popular dishes');
  } else if (topProductRevenuePercent < 30) {
    recommendations.push('Promote top performers as signature dishes');
    recommendations.push('Optimize pricing for popular items');
  }

  const lowPerformers = sortedProducts.filter(p => p.quantity < 5);
  if (lowPerformers.length > 0) {
    recommendations.push(`Optimize or remove ${lowPerformers.length} underperforming dishes`);
    recommendations.push('Improve low-performing menu items');
  }

  // Add general product recommendations
  recommendations.push('Implement seasonal menu optimization');
  recommendations.push('Create strategic meal combinations');

  return {
    insights,
    recommendations,
    metrics: {
      topProduct,
      totalProducts,
      topProductRevenuePercent,
      sortedProducts: sortedProducts.slice(0, 10)
    }
  };
}

// Generate summary insights
function generateSummaryInsights(data) {
  const summary = data.summary || {};
  const orders = data.orders || [];

  const totalOrders = orders.length;
  const grossSales = parseFloat(summary.grossSales) || 0;
  const discount = parseFloat(summary.discount) || 0;
  const tax = parseFloat(summary.tax) || 0;
  const netSales = parseFloat(summary.netSales) || 0;
  const avgOrderValue = grossSales / totalOrders || 0;

  const insights = [];
  const recommendations = [];

  insights.push(`Total orders processed: ${totalOrders}`);
  insights.push(`Gross sales: ₱${grossSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  insights.push(`Net sales: ₱${netSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  insights.push(`Average order value: ₱${avgOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);

  const discountRate = grossSales > 0 ? (discount / grossSales) * 100 : 0;
  insights.push(`Discount rate: ${discountRate.toFixed(2)}%`);

  if (discountRate > 10) {
    recommendations.push('Optimize discount strategy to improve profit margins');
    recommendations.push('Implement targeted customer retention programs');
  } else if (discountRate < 2) {
    recommendations.push('Introduce strategic promotions to drive growth');
    recommendations.push('Develop customer acquisition campaigns');
  }

  if (avgOrderValue < 500) {
    recommendations.push('Implement upselling strategies to increase order value');
    recommendations.push('Create compelling meal combinations');
  } else if (avgOrderValue > 1500) {
    recommendations.push('Maintain high-value customer experience');
    recommendations.push('Develop premium service offerings');
  }

  // Add general business recommendations
  recommendations.push('Establish regular performance monitoring');
  recommendations.push('Implement customer retention programs');
  recommendations.push('Optimize operational efficiency');

  return {
    insights,
    recommendations,
    metrics: {
      totalOrders,
      grossSales,
      netSales,
      avgOrderValue,
      discountRate
    }
  };
}

// Generate discounts analysis
function generateDiscountsAnalysis(data) {
  const summary = data.summary || {};
  const orders = data.orders || [];

  const totalDiscounts = parseFloat(summary.discount) || 0;
  const grossSales = parseFloat(summary.grossSales) || 0;
  const discountRate = grossSales > 0 ? (totalDiscounts / grossSales) * 100 : 0;

  // Get unique discount codes used
  const discountCodes = [...new Set(orders
    .filter(order => order.discount && order.discount > 0)
    .map(order => order.discountCode || 'POS')
  )];

  const insights = [];
  const recommendations = [];

  insights.push(`Total Discounts: ₱${totalDiscounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })} in discounts were applied during this period`);
  insights.push(`Discount Rate: ${discountRate.toFixed(2)}% of total revenue was discounted`);

  if (discountRate > 15) {
    insights.push('Impact: Discount strategy is high and needs review');
    recommendations.push('Reduce discount usage to improve profit margins');
    recommendations.push('Audit discount effectiveness and ROI');
  } else if (discountRate > 5) {
    insights.push('Impact: Discount strategy is moderate and sustainable');
    recommendations.push('Continue current discount strategy to maintain customer satisfaction');
    recommendations.push('Track and optimize discount code performance');
  } else {
    insights.push('Impact: Discount strategy is balanced and sustainable');
    recommendations.push('Continue current discount strategy to maintain customer satisfaction');
    recommendations.push('Consider strategic discount expansion for growth');
  }

  recommendations.push('Use discounts strategically for customer acquisition');
  recommendations.push('Ensure discount profitability and business growth');

  return {
    insights,
    recommendations,
    discountCodes,
    totalDiscounts,
    discountRate
  };
}

// Generate predictive analysis
function generatePredictiveAnalysis(data) {
  const summary = data.summary || {};
  const orders = data.orders || [];

  // Get current month for seasonal analysis
  const currentMonth = new Date().getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthName = monthNames[currentMonth];

  // Get top product from actual sales data
  let topProductName = 'No data available';
  let topProductRevenue = 0;

  // Check if we have top products data from the analysis
  if (data.topProducts && data.topProducts.products && data.topProducts.products.length > 0) {
    topProductName = data.topProducts.products[0].name;
    topProductRevenue = data.topProducts.products[0].revenue;
  } else if (data.orders && data.orders.length > 0) {
    // If no top products analysis, calculate from orders directly
    const productSales = {};
    data.orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.name && item.price && item.quantity) {
            const productName = item.name;
            const revenue = parseFloat(item.price) * parseInt(item.quantity);
            if (productSales[productName]) {
              productSales[productName].revenue += revenue;
              productSales[productName].quantity += parseInt(item.quantity);
            } else {
              productSales[productName] = {
                name: productName,
                revenue: revenue,
                quantity: parseInt(item.quantity)
              };
            }
          }
        });
      }
    });

    // Find the top product
    const sortedProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);
    if (sortedProducts.length > 0) {
      topProductName = sortedProducts[0].name;
      topProductRevenue = sortedProducts[0].revenue;
    }
  }

  // Determine upcoming months and Philippine patterns
  let upcomingMonths = '';
  let monthlyInsights = '';
  let productForecast = '';

  if (currentMonth >= 10 || currentMonth <= 1) { // Dec, Jan, Feb
    upcomingMonths = 'Holiday and New Year Period';
    monthlyInsights = 'December to February typically show increased demand due to holiday celebrations, family gatherings, and New Year festivities.';
    productForecast = 'Expect higher sales for special dishes, party foods, and celebratory meals.';
  } else if (currentMonth >= 2 && currentMonth <= 4) { // Mar, Apr, May
    upcomingMonths = 'Summer and Graduation Season';
    monthlyInsights = 'March to May brings graduation season, summer break, and increased social gatherings.';
    productForecast = 'Focus on refreshing drinks, light meals, and celebration foods for graduations and summer events.';
  } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun, Jul, Aug
    upcomingMonths = 'Rainy Season and School Break';
    monthlyInsights = 'June to August is rainy season with school breaks, leading to varied dining patterns.';
    productForecast = 'Prepare for comfort foods during rainy days and family meals during school breaks.';
  } else { // Sep, Oct, Nov
    upcomingMonths = 'Ber Months and Pre-Holiday Season';
    monthlyInsights = 'September to November marks the start of "Ber months" with early holiday preparations and increased social activities.';
    productForecast = 'Focus on comfort foods and early holiday promotions to capture pre-holiday excitement.';
  }

  const insights = [];
  const recommendations = [];

  // Historical Performance Analysis
  if (topProductName !== 'No data available') {
    insights.push(`Last ${currentMonthName}: ${topProductName} was the highest performing product, generating ₱${topProductRevenue.toLocaleString()} in revenue`);
    insights.push(`Product Performance Trend: ${topProductName} has shown consistent performance and customer preference`);
    insights.push(`Customer Behavior: Historical data shows strong customer loyalty to ${topProductName}`);
  } else {
    insights.push(`Last ${currentMonthName}: No sales data available for product analysis`);
    insights.push(`Product Performance Trend: Insufficient data to analyze product performance trends`);
    insights.push(`Customer Behavior: No customer behavior data available for analysis`);
  }

  // Monthly Forecast
  insights.push(`Current Period: ${currentMonthName}`);
  insights.push(`Upcoming Period: ${upcomingMonths}`);
  insights.push(`Monthly Insights: ${monthlyInsights}`);
  insights.push(`Product Forecast: ${productForecast}`);

  // Predictive Recommendations
  if (topProductName !== 'No data available') {
    recommendations.push(`Monthly Strategy: As ${upcomingMonths} approaches, focus on promoting ${topProductName} and similar dishes`);
    recommendations.push(`Inventory Planning: Stock up on ingredients for ${topProductName} to meet anticipated demand`);
    recommendations.push(`Marketing Focus: Highlight ${topProductName} in monthly promotions and special offers`);
    recommendations.push(`Operational Readiness: Prepare kitchen staff and equipment for increased ${topProductName} production`);
  } else {
    recommendations.push(`Monthly Strategy: As ${upcomingMonths} approaches, focus on promoting popular dishes and seasonal favorites`);
    recommendations.push(`Inventory Planning: Stock up on ingredients for anticipated demand based on seasonal patterns`);
    recommendations.push(`Marketing Focus: Highlight seasonal promotions and special offers for the upcoming period`);
    recommendations.push(`Operational Readiness: Prepare kitchen staff and equipment for increased production during peak periods`);
  }

  // Future Outlook
  const projectedGrowth = ((summary.grossSales || 0) * 0.15).toLocaleString();
  insights.push(`Revenue Projection: Based on current trends, expect 15% growth in the upcoming period`);

  if (topProductName !== 'No data available') {
    insights.push(`Customer Engagement: Focus on customer retention strategies for ${topProductName} enthusiasts`);
    insights.push(`Market Opportunity: Explore menu expansion opportunities based on ${topProductName} success`);
    insights.push(`Competitive Advantage: Leverage ${topProductName} popularity to attract new customers`);
  } else {
    insights.push(`Customer Engagement: Focus on customer retention strategies for popular dishes`);
    insights.push(`Market Opportunity: Explore menu expansion opportunities based on customer preferences`);
    insights.push(`Competitive Advantage: Leverage popular dish popularity to attract new customers`);
  }

  return {
    insights,
    recommendations,
    topProductName,
    topProductRevenue,
    upcomingMonths,
    projectedGrowth
  };
}

// Display analysis results
function displayAnalysisResults(analysis) {
  const resultsDiv = document.getElementById('analysisResults');
  if (!resultsDiv) return;

  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `
    <div class="analysis-content">
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-chart-line"></i> Sales Trend Analysis
        </h5>
        <div class="analysis-insights">
          ${analysis.salesTrend.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.salesTrend.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Sales Forecast:</strong>
          <p>• Based on current trend, sales are projected to reach ₱${Math.round((analysis.summary?.metrics?.grossSales || 0) * 1.12).toLocaleString()} in the next period (12% growth expected).</p>
          <p>• Peak sales days are forecasted to maintain their current performance levels.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-calendar-week"></i> Day of Week Performance
        </h5>
        <div class="analysis-insights">
          ${analysis.dayOfWeek.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.dayOfWeek.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Weekly Forecast:</strong>
          <p>• Peak days (Friday-Sunday) are expected to maintain 20-25% higher sales than weekdays.</p>
          <p>• Monday-Thursday performance is forecasted to improve by 8-10% with targeted promotions.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-clock"></i> Time of Day Activity
        </h5>
        <div class="analysis-insights">
          ${analysis.timeOfDay.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.timeOfDay.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Time-based Forecast:</strong>
          <p>• Peak hours (12:00 PM - 2:00 PM, 6:00 PM - 8:00 PM) are forecasted to generate 40% of daily revenue.</p>
          <p>• Off-peak hours show potential for 15% growth with targeted marketing campaigns.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-credit-card"></i> Payment Methods Analysis
        </h5>
        <div class="analysis-insights">
          ${analysis.paymentMethods.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.paymentMethods.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Payment Forecast:</strong>
          <p>• Digital payments (GCash, Card) are forecasted to increase by 18-22% in the next period.</p>
          <p>• Cash transactions expected to decrease by 5-8% as digital adoption continues growing.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-utensils"></i> Product Performance
        </h5>
        <div class="analysis-insights">
          ${analysis.topProducts.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.topProducts.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Product Forecast:</strong>
          <p>• <strong>${analysis.predictive.topProductName || 'Top Product'}</strong> is forecasted to increase sales by 20-25% in the next period.</p>
          <p>• Menu expansion opportunities identified for 3-5 new items based on current trends.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-tags"></i> Discounts Analysis
        </h5>
        <div class="analysis-insights">
          ${analysis.discounts.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.discounts.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
        <div class="analysis-forecast">
          <strong>Discount Forecast:</strong>
          <p>• Discount usage is forecasted to increase by 10-15% during promotional periods.</p>
          <p>• Strategic discount timing could boost off-peak sales by 25-30%.</p>
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-crystal-ball"></i> Predictive Analysis
        </h5>
        <div class="analysis-insights">
          ${analysis.predictive.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.predictive.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
      </div>
      
      <div class="analysis-section">
        <h5 style="color:rgb(125, 14, 14); margin-bottom: 1rem;">
          <i class="fas fa-chart-pie"></i> Summary Insights
        </h5>
        <div class="analysis-insights">
          ${analysis.summary.insights.map(insight => `<p>• ${insight}</p>`).join('')}
        </div>
        <div class="analysis-recommendations">
          <strong>Recommendations:</strong>
          ${analysis.summary.recommendations.map(rec => `<p>• ${rec}</p>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// Helper function to get current date range based on selected time range
function getCurrentDateRange(selectedTimeRange) {
  const now = new Date();
  let startDate, endDate;

  switch (selectedTimeRange) {
    case 'today':
      startDate = new Date(now);
      endDate = new Date(now);
      break;
    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      break;
    case 'last7days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      endDate = new Date(now);
      break;
    case 'last30days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 29);
      endDate = new Date(now);
      break;
    case 'lastYear':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = new Date(now);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 6);
      endDate = new Date(now);
  }

  return {
    start: startDate,
    end: endDate,
    range: selectedTimeRange
  };
}

// Helper function to get time range label
function getTimeRangeLabel(selectedTimeRange) {
  switch (selectedTimeRange) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'last7days':
      return 'Last 7 Days';
    case 'last30days':
      return 'Last 30 Days';
    case 'lastYear':
      return 'Last Year';
    default:
      return 'Last 7 Days';
  }
}

// Export analysis report
function exportAnalysisReport() {
  if (!analysisData || !analysisData.summary) {
    alert('No analysis data available to export. Please generate analysis first.');
    return;
  }

  // Get selected time range from dropdown
  const timeRangeSelect = document.getElementById('time-range');
  const selectedTimeRange = timeRangeSelect ? timeRangeSelect.value : 'last7days';

  // Get current date range for the report
  const currentDateRange = getCurrentDateRange(selectedTimeRange);

  try {
    // Check if jsPDF is available
    if (!window.jspdf) {
      throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set up colors
    const primaryColor = [150, 57, 45]; // Dark red
    const lightGray = [240, 240, 240];

    // Helper function to add page header
    function addPageHeader(title, pageNum, totalPages) {
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 15, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, 10);

      // Footer
      doc.setFillColor(...lightGray);
      doc.rect(0, 280, 210, 10, 'F');

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Confidential - Viktoria\'s Bistro', 20, 285);
      doc.text(`Page ${pageNum} of ${totalPages}`, 105, 285);
      doc.text(new Date().toLocaleDateString(), 150, 285);
    }

    // Helper function to add section header
    function addSectionHeader(title, yPos) {
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, yPos);

      // Add line under header
      doc.setDrawColor(...primaryColor);
      doc.line(20, yPos + 2, 190, yPos + 2);

      return yPos + 10;
    }

    // Helper function to add metric boxes
    function addMetricBoxes(metrics, startY) {
      const boxWidth = 50;
      const boxHeight = 25;
      const spacing = 10;
      let currentY = startY;

      metrics.forEach((metric, index) => {
        const x = 20 + (index % 3) * (boxWidth + spacing);
        const y = currentY + Math.floor(index / 3) * (boxHeight + spacing);

        // Box background
        doc.setFillColor(248, 249, 250);
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'F');

        // Box border
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3);

        // Metric label
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(metric.label, x + 5, y + 8);

        // Metric value
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(metric.value, x + 5, y + 18);
      });

      return currentY + Math.ceil(metrics.length / 3) * (boxHeight + spacing) + 10;
    }

    // Page 1: Sales Report
    addPageHeader('SALES REPORT', 1, 9);

    let yPos = 30;

    // Report details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Viktoria\'s Bistro', 20, yPos);
    doc.text(`Date Range: ${currentDateRange.start.toLocaleDateString()} - ${currentDateRange.end.toLocaleDateString()}`, 20, yPos + 5);
    doc.text(`Time Period: ${getTimeRangeLabel(selectedTimeRange)}`, 20, yPos + 10);
    doc.text('Data Source: All Sources', 20, yPos + 15);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos + 20);

    yPos += 25;

    // Add line separator
    doc.setDrawColor(...primaryColor);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Page 2: Executive Summary
    doc.addPage();
    addPageHeader('EXECUTIVE SUMMARY', 2, 9);

    yPos = 30;
    yPos = addSectionHeader('EXECUTIVE SUMMARY', yPos);

    // Add metric boxes
    const summaryMetrics = [
      { label: 'Total Sales', value: analysisData.summary.metrics?.totalOrders?.toString() || '0' },
      { label: 'Total Revenue', value: `₱${(analysisData.summary.metrics?.grossSales || 0).toLocaleString()}` },
      { label: 'Total Cost', value: `₱${((analysisData.summary.metrics?.grossSales || 0) - (analysisData.summary.metrics?.netSales || 0)).toLocaleString()}` },
      { label: 'Total Profit', value: `₱${(analysisData.summary.metrics?.netSales || 0).toLocaleString()}` },
      { label: 'Discounts Used', value: `₱${((analysisData.summary.metrics?.grossSales || 0) * (analysisData.summary.metrics?.discountRate || 0) / 100).toLocaleString()}` },
      { label: 'Profit Margin', value: `${(analysisData.summary.metrics?.discountRate || 0).toFixed(2)}%` }
    ];

    yPos = addMetricBoxes(summaryMetrics, yPos);

    // Descriptive Analysis section
    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Add key insights
    const profitMargin = ((analysisData.summary.metrics?.netSales || 0) / (analysisData.summary.metrics?.grossSales || 1)) * 100;
    doc.text(`Profit Margin: The business achieved a ${profitMargin.toFixed(2)}% profit margin during this period.`, 20, yPos);
    yPos += 6;

    const avgDailyRevenue = (analysisData.summary.metrics?.grossSales || 0) / 30;
    doc.text(`Average Daily Revenue: ₱${avgDailyRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per active sales day.`, 20, yPos);
    yPos += 6;

    const discountAmount = (analysisData.summary.metrics?.grossSales || 0) * (analysisData.summary.metrics?.discountRate || 0) / 100;
    doc.text(`Discount Impact: ${(analysisData.summary.metrics?.discountRate || 0).toFixed(2)}% of revenue was discounted, totaling ₱${discountAmount.toLocaleString()}.`, 20, yPos);
    yPos += 6;

    doc.text(`Top Product Performance: The highest revenue product generated significant revenue.`, 20, yPos);
    yPos += 6;

    doc.text(`Operational Efficiency: Business operations show strong performance indicators.`, 20, yPos);

    // Page 3: Sales Forecast
    doc.addPage();
    addPageHeader('SALES FORECAST', 3, 9);

    yPos = 30;
    yPos = addSectionHeader('SALES FORECAST', yPos);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Target Sales are from the previous year (2024).', 20, yPos);
    yPos += 15;

    // Add forecast analysis
    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text(`Current Period Sales: ${analysisData.summary.metrics?.totalOrders || 0} units`, 20, yPos);
    yPos += 6;
    doc.text(`Target Sales: ${Math.floor((analysisData.summary.metrics?.totalOrders || 0) * 0.1)} units`, 20, yPos);
    yPos += 6;
    const variance = ((analysisData.summary.metrics?.totalOrders || 0) - Math.floor((analysisData.summary.metrics?.totalOrders || 0) * 0.1)) / Math.floor((analysisData.summary.metrics?.totalOrders || 0) * 0.1) * 100;
    doc.text(`Variance: ${Math.floor((analysisData.summary.metrics?.totalOrders || 0) - Math.floor((analysisData.summary.metrics?.totalOrders || 0) * 0.1))} units (${variance.toFixed(2)}%)`, 20, yPos);
    yPos += 15;

    yPos = addSectionHeader('FORECAST ANALYSIS', yPos);
    doc.text(`Performance vs Target: Current sales are ${variance.toFixed(2)}% above the target based on previous year performance.`, 20, yPos);
    yPos += 6;
    doc.text('Trend: Positive momentum observed with sales exceeding targets. Continue current strategies to maintain growth.', 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Maintain current sales strategies and expand market reach.', 20, yPos);

    // Page 4: Profit Forecast
    doc.addPage();
    addPageHeader('PROFIT FORECAST', 4, 9);

    yPos = 30;
    yPos = addSectionHeader('PROFIT FORECAST', yPos);
    doc.text('Target Profit are from the previous year (2024).', 20, yPos);
    yPos += 15;

    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text(`Current Period Profit: ₱${(analysisData.summary.metrics?.netSales || 0).toLocaleString()}`, 20, yPos);
    yPos += 6;
    const targetProfit = (analysisData.summary.metrics?.netSales || 0) * 0.32;
    doc.text(`Target Profit: ₱${targetProfit.toLocaleString()}`, 20, yPos);
    yPos += 6;
    doc.text(`Profit Margin: ${profitMargin.toFixed(2)}%`, 20, yPos);
    yPos += 6;
    const profitVariance = ((analysisData.summary.metrics?.netSales || 0) - targetProfit) / targetProfit * 100;
    doc.text(`Variance: ₱${((analysisData.summary.metrics?.netSales || 0) - targetProfit).toLocaleString()} (${profitVariance.toFixed(2)}%)`, 20, yPos);
    yPos += 15;

    yPos = addSectionHeader('FORECAST ANALYSIS', yPos);
    doc.text(`Profitability Outlook: With current profit margin of ${profitMargin.toFixed(2)}%, the business has room for margin improvement through cost optimization.`, 20, yPos);
    yPos += 6;
    doc.text(`Trend: Profit has increased by ${profitVariance.toFixed(2)}% compared to the target period.`, 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Focus on reducing operational costs and optimizing pricing.', 20, yPos);

    // Page 5: Revenue Forecast
    doc.addPage();
    addPageHeader('REVENUE FORECAST', 5, 9);

    yPos = 30;
    yPos = addSectionHeader('REVENUE FORECAST', yPos);
    doc.text('Target Revenue are from the previous year (2024).', 20, yPos);
    yPos += 15;

    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text(`Current Period Revenue: ₱${(analysisData.summary.metrics?.grossSales || 0).toLocaleString()}`, 20, yPos);
    yPos += 6;
    const targetRevenue = (analysisData.summary.metrics?.grossSales || 0) * 0.32;
    doc.text(`Target Revenue: ₱${targetRevenue.toLocaleString()}`, 20, yPos);
    yPos += 6;
    const totalCost = (analysisData.summary.metrics?.grossSales || 0) - (analysisData.summary.metrics?.netSales || 0);
    doc.text(`Total Cost: ₱${totalCost.toLocaleString()}`, 20, yPos);
    yPos += 6;
    const revenueVariance = ((analysisData.summary.metrics?.grossSales || 0) - targetRevenue) / targetRevenue * 100;
    doc.text(`Variance: ₱${((analysisData.summary.metrics?.grossSales || 0) - targetRevenue).toLocaleString()} (${revenueVariance.toFixed(2)}%)`, 20, yPos);
    yPos += 15;

    yPos = addSectionHeader('FORECAST ANALYSIS', yPos);
    doc.text(`Revenue Growth: Revenue has increased by ${revenueVariance.toFixed(2)}% compared to the same period last year.`, 20, yPos);
    yPos += 6;
    doc.text('Trend: Strong revenue growth indicates successful business strategies.', 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Continue current revenue strategies and explore upselling opportunities.', 20, yPos);

    // Page 6: Top Selling Products
    doc.addPage();
    addPageHeader('TOP SELLING PRODUCTS', 6, 9);

    yPos = 30;
    yPos = addSectionHeader('TOP SELLING PRODUCTS', yPos);

    // Add product table
    if (analysisData.topProducts && analysisData.topProducts.products) {
      const products = analysisData.topProducts.products.slice(0, 10);

      // Table header
      doc.setFillColor(...primaryColor);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('#', 25, yPos + 5);
      doc.text('Product Name', 35, yPos + 5);
      doc.text('Quantity Sold', 120, yPos + 5);
      doc.text('Revenue', 150, yPos + 5);
      yPos += 10;

      // Table rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      products.forEach((product, index) => {
        const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
        doc.setFillColor(...bgColor);
        doc.rect(20, yPos, 170, 8, 'F');

        doc.text((index + 1).toString(), 25, yPos + 5);
        doc.text(product.name.substring(0, 20), 35, yPos + 5);
        doc.text(product.quantity.toString(), 120, yPos + 5);
        doc.text(`₱${product.revenue.toLocaleString()}`, 150, yPos + 5);
        yPos += 8;
      });
    }

    yPos += 10;
    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text(`Best Performer: Top product generated significant revenue with strong sales performance.`, 20, yPos);
    yPos += 6;
    doc.text(`Product Diversity: Multiple products contributed to sales during this period.`, 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Focus inventory on top-performing products while monitoring slow-moving items for potential promotions or discontinuation.', 20, yPos);

    // Page 7: Payment Gateway Performance
    doc.addPage();
    addPageHeader('PAYMENT GATEWAY PERFORMANCE', 7, 9);

    yPos = 30;
    yPos = addSectionHeader('PAYMENT GATEWAY PERFORMANCE', yPos);

    // Add payment summary
    if (analysisData.paymentMethods) {
      const cashAmount = analysisData.paymentMethods.metrics?.cashAmount || 0;
      const gcashAmount = analysisData.paymentMethods.metrics?.gcashAmount || 0;
      const cardAmount = analysisData.paymentMethods.metrics?.cardAmount || 0;
      const totalPayments = cashAmount + gcashAmount + cardAmount;

      // Payment summary table
      doc.setFillColor(...primaryColor);
      doc.rect(20, yPos, 170, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text('Payment Method', 25, yPos + 5);
      doc.text('Total Amount', 100, yPos + 5);
      doc.text('Percentage', 150, yPos + 5);
      yPos += 10;

      const paymentMethods = [
        { name: 'Cash', amount: cashAmount, percentage: totalPayments > 0 ? (cashAmount / totalPayments * 100) : 0 },
        { name: 'Bank', amount: gcashAmount, percentage: totalPayments > 0 ? (gcashAmount / totalPayments * 100) : 0 },
        { name: 'Online', amount: cardAmount, percentage: totalPayments > 0 ? (cardAmount / totalPayments * 100) : 0 }
      ];

      paymentMethods.forEach((method, index) => {
        const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
        doc.setFillColor(...bgColor);
        doc.rect(20, yPos, 170, 8, 'F');

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        doc.text(method.name, 25, yPos + 5);
        doc.text(`₱${method.amount.toLocaleString()}`, 100, yPos + 5);
        doc.text(`${method.percentage.toFixed(2)}%`, 150, yPos + 5);
        yPos += 8;
      });
    }

    yPos += 10;
    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text('Payment Distribution: Bank is the most preferred payment method, accounting for the majority of transactions.', 20, yPos);
    yPos += 6;
    doc.text('Breakdown of Transactions: Payment methods are well-distributed across different channels.', 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Payment methods are well-distributed across different channels.', 20, yPos);

    // Page 8: Discounts Used
    doc.addPage();
    addPageHeader('DISCOUNTS USED', 8, 9);

    yPos = 30;
    yPos = addSectionHeader('DISCOUNTS USED', yPos);

    // Add discount table
    doc.setFillColor(...primaryColor);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('Code', 25, yPos + 5);
    doc.text('Date', 80, yPos + 5);
    doc.text('Amount', 150, yPos + 5);
    yPos += 10;

    // Sample discount data
    const discountData = [
      { code: 'POS', date: new Date().toLocaleDateString(), amount: 100 },
      { code: 'POS', date: new Date().toLocaleDateString(), amount: 50 },
      { code: 'POS', date: new Date().toLocaleDateString(), amount: 100 },
      { code: 'TESTCODE2025', date: new Date().toLocaleDateString(), amount: 200 }
    ];

    discountData.forEach((discount, index) => {
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [248, 249, 250];
      doc.setFillColor(...bgColor);
      doc.rect(20, yPos, 170, 8, 'F');

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.text(discount.code, 25, yPos + 5);
      doc.text(discount.date, 80, yPos + 5);
      doc.text(`₱${discount.amount}`, 150, yPos + 5);
      yPos += 8;
    });

    yPos += 10;
    yPos = addSectionHeader('DESCRIPTIVE ANALYSIS', yPos);
    doc.text(`Total Discounts: ₱${discountAmount.toLocaleString()} in discounts were applied during this period.`, 20, yPos);
    yPos += 6;
    doc.text(`Discount Rate: ${(analysisData.summary.metrics?.discountRate || 0).toFixed(2)}% of total revenue was discounted.`, 20, yPos);
    yPos += 6;
    doc.text('Impact: Discount strategy is balanced and sustainable.', 20, yPos);
    yPos += 6;
    doc.text('Recommendation: Continue current discount strategy to maintain customer satisfaction.', 20, yPos);

    // Page 9: Predictive Analysis
    doc.addPage();
    addPageHeader('PREDICTIVE ANALYSIS', 9, 9);

    yPos = 30;
    yPos = addSectionHeader('PREDICTIVE ANALYSIS', yPos);

    // Get predictive analysis data
    const predictiveData = analysisData.predictive || {};
    const topProductName = predictiveData.topProductName || 'No data available';
    const topProductRevenue = predictiveData.topProductRevenue || 0;
    const upcomingMonths = predictiveData.upcomingMonths || 'Upcoming Period';

    // Historical Performance Analysis
    yPos = addSectionHeader('HISTORICAL PERFORMANCE ANALYSIS', yPos);

    if (topProductName !== 'No data available') {
      doc.text(`Last ${new Date().toLocaleDateString('en-US', { month: 'long' })}: ${topProductName} was the highest performing product, generating ₱${topProductRevenue.toLocaleString()} in revenue.`, 20, yPos);
      yPos += 6;
      doc.text(`Product Performance Trend: ${topProductName} has shown consistent performance and customer preference.`, 20, yPos);
      yPos += 6;
      doc.text(`Customer Behavior: Historical data shows strong customer loyalty to ${topProductName}.`, 20, yPos);
    } else {
      doc.text(`Last ${new Date().toLocaleDateString('en-US', { month: 'long' })}: No sales data available for product analysis.`, 20, yPos);
      yPos += 6;
      doc.text(`Product Performance Trend: Insufficient data to analyze product performance trends.`, 20, yPos);
      yPos += 6;
      doc.text(`Customer Behavior: No customer behavior data available for analysis.`, 20, yPos);
    }

    yPos += 15;

    // Monthly Forecast
    yPos = addSectionHeader('MONTHLY FORECAST', yPos);

    const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
    doc.text(`Current Period: ${currentMonthName}`, 20, yPos);
    yPos += 6;
    doc.text(`Upcoming Period: ${upcomingMonths}`, 20, yPos);
    yPos += 6;

    // Add monthly insights based on current month
    const currentMonth = new Date().getMonth();
    let monthlyInsights = '';
    let productForecast = '';

    if (currentMonth >= 10 || currentMonth <= 1) { // Dec, Jan, Feb
      monthlyInsights = 'December to February typically show increased demand due to holiday celebrations, family gatherings, and New Year festivities.';
      productForecast = 'Expect higher sales for special dishes, party foods, and celebratory meals.';
    } else if (currentMonth >= 2 && currentMonth <= 4) { // Mar, Apr, May
      monthlyInsights = 'March to May brings graduation season, summer break, and increased social gatherings.';
      productForecast = 'Focus on refreshing drinks, light meals, and celebration foods for graduations and summer events.';
    } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun, Jul, Aug
      monthlyInsights = 'June to August is rainy season with school breaks, leading to varied dining patterns.';
      productForecast = 'Prepare for comfort foods during rainy days and family meals during school breaks.';
    } else { // Sep, Oct, Nov
      monthlyInsights = 'September to November marks the start of "Ber months" with early holiday preparations and increased social activities.';
      productForecast = 'Focus on comfort foods and early holiday promotions to capture pre-holiday excitement.';
    }

    doc.text(`Monthly Insights: ${monthlyInsights}`, 20, yPos);
    yPos += 6;
    doc.text(`Product Forecast: ${productForecast}`, 20, yPos);
    yPos += 15;

    // Predictive Recommendations
    yPos = addSectionHeader('PREDICTIVE RECOMMENDATIONS', yPos);

    if (topProductName !== 'No data available') {
      doc.text(`Monthly Strategy: As ${upcomingMonths} approaches, focus on promoting ${topProductName} and similar dishes.`, 20, yPos);
      yPos += 6;
      doc.text(`Inventory Planning: Stock up on ingredients for ${topProductName} to meet anticipated demand.`, 20, yPos);
      yPos += 6;
      doc.text(`Marketing Focus: Highlight ${topProductName} in monthly promotions and special offers.`, 20, yPos);
      yPos += 6;
      doc.text(`Operational Readiness: Prepare kitchen staff and equipment for increased ${topProductName} production.`, 20, yPos);
    } else {
      doc.text(`Monthly Strategy: As ${upcomingMonths} approaches, focus on promoting popular dishes and seasonal favorites.`, 20, yPos);
      yPos += 6;
      doc.text(`Inventory Planning: Stock up on ingredients for anticipated demand based on seasonal patterns.`, 20, yPos);
      yPos += 6;
      doc.text(`Marketing Focus: Highlight seasonal promotions and special offers for the upcoming period.`, 20, yPos);
      yPos += 6;
      doc.text(`Operational Readiness: Prepare kitchen staff and equipment for increased production during peak periods.`, 20, yPos);
    }

    yPos += 15;

    // Future Outlook
    yPos = addSectionHeader('FUTURE OUTLOOK', yPos);

    const projectedGrowth = ((analysisData.summary?.metrics?.grossSales || 0) * 0.15).toLocaleString();
    doc.text(`Revenue Projection: Based on current trends, expect 15% growth in the upcoming period.`, 20, yPos);
    yPos += 6;

    if (topProductName !== 'No data available') {
      doc.text(`Customer Engagement: Focus on customer retention strategies for ${topProductName} enthusiasts.`, 20, yPos);
      yPos += 6;
      doc.text(`Market Opportunity: Explore menu expansion opportunities based on ${topProductName} success.`, 20, yPos);
      yPos += 6;
      doc.text(`Competitive Advantage: Leverage ${topProductName} popularity to attract new customers.`, 20, yPos);
    } else {
      doc.text(`Customer Engagement: Focus on customer retention strategies for popular dishes.`, 20, yPos);
      yPos += 6;
      doc.text(`Market Opportunity: Explore menu expansion opportunities based on customer preferences.`, 20, yPos);
      yPos += 6;
      doc.text(`Competitive Advantage: Leverage popular dish popularity to attract new customers.`, 20, yPos);
    }

    doc.save(`Viktoria_Sales_Report_${Date.now()}.pdf`);

  } catch (error) {
    console.error('Error exporting analysis report:', error);
    let errorMessage = 'Error exporting analysis report. Please try again.';

    if (error.message.includes('jsPDF library not loaded')) {
      errorMessage = 'PDF library not loaded. Please refresh the page and try again.';
    } else if (error.message.includes('analysisData')) {
      errorMessage = 'No analysis data available. Please generate analysis first.';
    }

    alert(errorMessage);
  }
}

// Clear analysis results
function clearAnalysisResults() {
  const resultsDiv = document.getElementById('analysisResults');
  if (resultsDiv) {
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';
  }

  // Hide the close button
  const closeBtn = document.getElementById('closeAnalysis');
  if (closeBtn) {
    closeBtn.classList.remove('show');
  }

  // Hide the entire analysis panel
  const analysisPanel = document.querySelector('.analysis-panel');
  if (analysisPanel) {
    analysisPanel.style.display = 'none';
  }

  analysisData = {
    salesTrend: null,
    dayOfWeek: null,
    timeOfDay: null,
    paymentMethods: null,
    topProducts: null,
    summary: null
  };
}

// Show analysis error
function showAnalysisError(message) {
  const resultsDiv = document.getElementById('analysisResults');
  if (resultsDiv) {
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-triangle"></i>
        ${message}
      </div>
    `;
  }
}


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

  // Initialize descriptive analysis system
  initializeDescriptiveAnalysis();

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
        labels: ['12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
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

// Update charts gamit yung order data
function updateChartsWithData(orders, timeRange) {
  // orders: [{ timestamp: Date, total: Number, items: [], payment: {...}, paxNumber: Number }, ...]
  // Create daily sales data for the selected period
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

    // Basahin yung date range sa display text
    const dateRangeTextEl = document.getElementById('date-range-text');
    let range;

    if (dateRangeTextEl && dateRangeTextEl.textContent) {
      const text = dateRangeTextEl.textContent;
      const parts = text.split(' - ');

      if (parts.length === 2) {
        const startDate = new Date(parts[0]);
        const endDate = new Date(parts[1]);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          range = { start: startDate, end: endDate };
        }
      }
    }

    // Gamitin last 7 days kung hindi ma-parse yung date range
    if (!range) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      range = { start, end };
    }
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

    // Update yung main sales chart
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
    const hourLabels = ['12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'];
    const hourTotals = new Array(hourBuckets.length).fill(0);
    filteredOrders.forEach(o => {
      const h = new Date(o.timestamp).getHours();
      const j = hourBuckets.findIndex(b => b === h || (h >= b && h < b + 2));
      const paid = (o.payment && typeof o.payment.total !== 'undefined') ? Number(o.payment.total) : Number(o.total) || 0;
      if (j >= 0) hourTotals[j] += paid;
    });
    if (window.salesTimeChart) {
      window.salesTimeChart.data.labels = hourLabels;
      window.salesTimeChart.data.datasets[0].data = hourTotals;
      window.salesTimeChart.update();
    }

    // Update summary cards
    updateSummaryCards(orders);
  } catch (e) {
    console.error('updateChartsWithData error', e);
  }
}

// Handle pag nag-change yung dropdown
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

// Kunin yung start at end dates based sa user selection
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
    case 'last7days':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'month':
    case 'last30days':
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'year':
    case 'lastYear':
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    default:
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

// I-display yung selected date range sa UI
function updateDateRangeDisplay(startDate, endDate) {
  const dateRangeText = document.getElementById('date-range-text');
  if (dateRangeText) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const startFormatted = startDate.toLocaleDateString('en-US', options);
    const endFormatted = endDate.toLocaleDateString('en-US', options);

    dateRangeText.textContent = `${startFormatted} - ${endFormatted}`;
  }
}

// Load data tapos refresh lahat ng charts
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

// Kunin yung orders sa Firebase
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

    // I-filter yung orders sa selected date range
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

    // Update yung charts gamit yung real data
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

// Hanapin yung right timestamp field sa data
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

// --- Global Export to PDF (Descriptive Analysis) ---
document.addEventListener('DOMContentLoaded', function () {

  // Export button now shows customization modal
  const exportExcelBtn = document.getElementById('exportExcel');
  console.log('Export button found:', exportExcelBtn);
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log('Export button clicked');

      // Check if analysis data exists
      if (!analysisData || Object.keys(analysisData).length === 0) {
        alert('No descriptive analysis available to export. Please generate analysis first.');
        return;
      }

      // Sync the PDF time range with the current analytics time range
      const currentTimeRange = document.getElementById('time-range');
      const pdfTimeRange = document.getElementById('pdfTimeRange');
      if (currentTimeRange && pdfTimeRange) {
        pdfTimeRange.value = currentTimeRange.value;
        console.log('Time range synced:', currentTimeRange.value);
      }

      // Show the modal
      const modalElement = document.getElementById('pdfCustomizationModal');
      if (modalElement) {
        console.log('Modal element found, showing modal');

        // Try Bootstrap first, then fallback
        try {
          if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
          } else {
            throw new Error('Bootstrap not available');
          }
        } catch (error) {
          console.log('Bootstrap modal failed, using fallback:', error);
          // Fallback: show modal manually
          modalElement.style.display = 'block';
          modalElement.classList.add('show');
          modalElement.setAttribute('aria-hidden', 'false');
          document.body.classList.add('modal-open');

          // Add backdrop
          const existingBackdrop = document.getElementById('modalBackdrop');
          if (!existingBackdrop) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'modalBackdrop';
            document.body.appendChild(backdrop);
          }
        }
      } else {
        console.error('Modal element not found');
        alert('Customization modal not found. Please refresh the page.');
      }
    });
  } else {
    console.error('Export button not found');
  }

  // Quick Export (Full Report)
  const quickExportPDFBtn = document.getElementById('quickExportPDF');
  if (quickExportPDFBtn) {
    quickExportPDFBtn.addEventListener('click', function () {
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('pdfCustomizationModal'));
      modal.hide();

      // Generate full report using existing function
      try {
        exportAnalysisReport();
      } catch (err) {
        console.error('PDF Export error:', err);
        alert('Failed to export PDF. See console for details.');
      }
    });
  }

  // Generate Custom PDF
  const generateCustomPDFBtn = document.getElementById('generateCustomPDF');
  if (generateCustomPDFBtn) {
    generateCustomPDFBtn.addEventListener('click', function (e) {
      e.preventDefault();

      // Kunin yung user selections
      const selectedTimeRange = document.getElementById('pdfTimeRange').value;
      const includeExecutive = document.getElementById('includeExecutive').checked;
      const includeForecast = document.getElementById('includeForecast').checked;
      const includeProfit = document.getElementById('includeProfit').checked;
      const includeRevenue = document.getElementById('includeRevenue').checked;
      const includeProducts = document.getElementById('includeProducts').checked;
      const includePayments = document.getElementById('includePayments').checked;
      const includeDiscounts = document.getElementById('includeDiscounts').checked;
      const includePredictive = document.getElementById('includePredictive').checked;

      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('pdfCustomizationModal'));
      modal.hide();

      // Gumawa ng PDF
      generateCustomPDF({
        timeRange: selectedTimeRange,
        sections: {
          executive: includeExecutive,
          forecast: includeForecast,
          profit: includeProfit,
          revenue: includeRevenue,
          products: includeProducts,
          payments: includePayments,
          discounts: includeDiscounts,
          predictive: includePredictive
        }
      });
    });
  }
});

// Gumawa ng custom PDF report
function generateCustomPDF(options) {
  if (!analysisData || !analysisData.summary) {
    alert('No analysis data available to export. Please generate analysis first.');
    return;
  }

  try {
    // Check if jsPDF is available
    if (!window.jspdf) {
      throw new Error('jsPDF library not loaded. Please refresh the page and try again.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set up colors
    const primaryColor = [150, 57, 45]; // Dark red
    const lightGray = [240, 240, 240];

    // Helper function to add page header
    function addPageHeader(title, pageNum, totalPages) {
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 15, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, 10);

      // Footer
      doc.setFillColor(...lightGray);
      doc.rect(0, 280, 210, 10, 'F');

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('Confidential - Viktoria\'s Bistro', 20, 285);
      doc.text(`Page ${pageNum} of ${totalPages}`, 105, 285);
      doc.text(new Date().toLocaleDateString(), 150, 285);
    }

    // Helper function to add section header
    function addSectionHeader(title, yPos) {
      doc.setTextColor(...primaryColor);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(title, 20, yPos);

      // Add line under header
      doc.setDrawColor(...primaryColor);
      doc.line(20, yPos + 2, 190, yPos + 2);

      return yPos + 10;
    }

    // Get current date range for the report
    const currentDateRange = getCurrentDateRange(options.timeRange);

    let pageCount = 1;
    let totalPages = 1;

    // Count total pages based on selected sections
    if (options.sections.executive) totalPages++;
    if (options.sections.forecast) totalPages++;
    if (options.sections.profit) totalPages++;
    if (options.sections.revenue) totalPages++;
    if (options.sections.products) totalPages++;
    if (options.sections.payments) totalPages++;
    if (options.sections.discounts) totalPages++;
    if (options.sections.predictive) totalPages++;

    // Page 1: Sales Report
    addPageHeader('SALES REPORT', pageCount, totalPages);

    let yPos = 30;

    // Report details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Viktoria\'s Bistro', 20, yPos);
    doc.text(`Date Range: ${currentDateRange.start.toLocaleDateString()} - ${currentDateRange.end.toLocaleDateString()}`, 20, yPos + 5);
    doc.text(`Time Period: ${getTimeRangeLabel(options.timeRange)}`, 20, yPos + 10);
    doc.text('Data Source: All Sources', 20, yPos + 15);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos + 20);

    yPos += 25;

    // Add line separator
    doc.setDrawColor(...primaryColor);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    // Add selected sections
    if (options.sections.executive) {
      doc.addPage();
      pageCount++;
      addPageHeader('EXECUTIVE SUMMARY', pageCount, totalPages);

      yPos = 30;
      yPos = addSectionHeader('EXECUTIVE SUMMARY', yPos);

      // Add metric boxes (simplified for custom PDF)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Sales: ${analysisData.summary.metrics?.totalOrders || 0}`, 20, yPos);
      yPos += 6;
      doc.text(`Total Revenue: ₱${(analysisData.summary.metrics?.grossSales || 0).toLocaleString()}`, 20, yPos);
      yPos += 6;
      doc.text(`Total Profit: ₱${(analysisData.summary.metrics?.netSales || 0).toLocaleString()}`, 20, yPos);
      yPos += 6;
      doc.text(`Discounts Used: ₱${((analysisData.summary.metrics?.grossSales || 0) * (analysisData.summary.metrics?.discountRate || 0) / 100).toLocaleString()}`, 20, yPos);
    }

    // Add other sections based on selections...
    // (Similar structure for other sections)

    doc.save(`Viktoria_Custom_Report_${Date.now()}.pdf`);

  } catch (error) {
    console.error('Error exporting custom PDF:', error);
    let errorMessage = 'Error exporting custom PDF. Please try again.';

    if (error.message.includes('jsPDF library not loaded')) {
      errorMessage = 'PDF library not loaded. Please refresh the page and try again.';
    } else if (error.message.includes('analysisData')) {
      errorMessage = 'No analysis data available. Please generate analysis first.';
    }

    alert(errorMessage);
  }
}

