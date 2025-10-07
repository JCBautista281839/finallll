/**
 * Price Parsing Utility
 * 
 * This utility handles both string and number price formats
 * to prevent TypeError when calling .replace() on numbers
 */

// Global price parsing utility
window.parsePrice = function(price) {
  if (typeof price === 'string') {
    // Handle string prices like "Php 500" or "500"
    return parseFloat(price.replace(/[^\d.]/g, ''));
  } else if (typeof price === 'number') {
    // Handle numeric prices like 500 or 500.00
    return parseFloat(price);
  } else {
    // Handle other types by converting to string first
    return parseFloat(String(price).replace(/[^\d.]/g, ''));
  }
};

// Global price formatting utility
window.formatPrice = function(price, currency = 'Php') {
  const parsedPrice = window.parsePrice(price);
  return `${currency} ${parsedPrice.toFixed(0)}`;
};

// Global price calculation utility
window.calculateItemTotal = function(price, quantity) {
  const parsedPrice = window.parsePrice(price);
  return parsedPrice * quantity;
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('[price-utils.js] Price parsing utilities loaded');
});
