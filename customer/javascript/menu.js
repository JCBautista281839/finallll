document.addEventListener('DOMContentLoaded', () => {
  const categoryLinks = document.querySelectorAll('.categories a');
  const categoryMenus = document.querySelectorAll('.category-menu');
  
  // Cart functionality
  let cart = [];
  let cartTotal = 0;

  categoryLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();

      const targetId = link.getAttribute('data-category');
      const targetMenu = document.getElementById(targetId);

      // Hide all menus
      categoryMenus.forEach(menu => menu.classList.remove('active'));

      // Show the selected one
      if (targetMenu) {
        targetMenu.classList.add('active');
      }
    });
  });

  // Add to cart functionality
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  const orderMenuContainer = document.querySelector('.order-menu');
  const orderTotalElement = document.querySelector('.order-total-price');

  addToCartButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get the menu item details
      const menuItem = button.closest('.menu-item');
      const itemName = menuItem.querySelector('.menu-item-name').textContent;
      const itemPriceText = menuItem.querySelector('.menu-item-price').textContent;
      const itemPrice = parseInt(itemPriceText.replace('Php ', '').replace(',', ''));
      
      // Check if item already exists in cart
      const existingItem = cart.find(item => item.name === itemName);
      
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * existingItem.price;
      } else {
        cart.push({
          name: itemName,
          price: itemPrice,
          quantity: 1,
          total: itemPrice
        });
      }
      
      updateOrderDisplay();
    });
  });

  function updateOrderDisplay() {
    // Clear existing order items (except the header)
    const existingItems = orderMenuContainer.querySelectorAll('.order-item');
    existingItems.forEach(item => item.remove());
    
    // Add each cart item to the display
    cart.forEach(item => {
      const orderItem = document.createElement('div');
      orderItem.className = 'order-item';
      orderItem.innerHTML = `
        <span>${item.quantity} ${item.name}</span>
        <span class="order-item-price">Php ${item.total.toLocaleString()}</span>
      `;
      orderMenuContainer.appendChild(orderItem);
    });
    
    // Update total
    cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
    if (orderTotalElement) {
      orderTotalElement.textContent = `Php ${cartTotal.toLocaleString()}`;
    }
    
    // Show/hide order menu based on cart contents
    if (cart.length === 0) {
      orderMenuContainer.style.display = 'none';
    } else {
      orderMenuContainer.style.display = 'block';
    }
  }

  // Initialize order display
  updateOrderDisplay();
});
