document.addEventListener('DOMContentLoaded', () => {
  console.log('Customer menu page loaded, initializing Firebase...');
  
  // Wait for Firebase to be ready
  function waitForFirebase() {
    if (window.isFirebaseReady && window.isFirebaseReady()) {
      console.log('Firebase is ready!');
      initializeCustomerMenu();
    } else {
      console.log('Firebase not ready yet, waiting...');
      setTimeout(waitForFirebase, 100);
    }
  }
  
  function initializeCustomerMenu() {
    console.log('Initializing customer menu system...');
    loadMenuFromFirebase();
    setupEventListeners();
  }
  
  function loadMenuFromFirebase() {
    console.log('Loading menu from Firebase...');
    const db = firebase.firestore();
    
    // Get all menu items from Firebase (simplified query to avoid index requirement)
    db.collection('menu').onSnapshot((querySnapshot) => {
      console.log('Firebase query completed, documents found:', querySnapshot.size);
      
      if (querySnapshot.empty) {
        console.log('No menu items found');
        showEmptyMenu();
        return;
      }
      
      // Filter available items and group by category
      const menuByCategory = {};
      const allItems = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include available items
        if (data.available === true) {
          allItems.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      // Sort items by creation date (newest first)
      allItems.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      // Group by category
      allItems.forEach(item => {
        const category = item.category || 'General';
        
        if (!menuByCategory[category]) {
          menuByCategory[category] = [];
        }
        
        menuByCategory[category].push(item);
      });
      
      // Check if we have any available items
      if (allItems.length === 0) {
        console.log('No available menu items found');
        showEmptyMenu();
        return;
      }
      
      // Update categories and menu items
      updateCategories(menuByCategory);
      displayMenuItems(menuByCategory);
      
    }, (error) => {
      console.error('Error loading menu:', error);
      showErrorMenu();
    });
  }
  
  function updateCategories(menuByCategory) {
    const categoriesContainer = document.querySelector('.menu-categories');
    const categoryLinksContainer = document.querySelector('.category-links-container');
    
    if (!categoriesContainer || !categoryLinksContainer) return;
    
    // Clear the loading state
    categoryLinksContainer.innerHTML = '';
    
    // Define all possible categories (even if no data exists)
    const allPossibleCategories = [
      'All',
      'Appetizers', 
      'Specials', 
      'Pasta', 
      'Pansit', 
      'Bilao', 
      'Burgers', 
      'Sandwiches', 
      'Feast', 
      'Rice Bowls', 
      'Sizzlings', 
      'Drinks',
      'Desserts',
      'Main Course',
      'Soup'
    ];
    
    // Add all category links
    allPossibleCategories.forEach(category => {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'category-link';
      link.textContent = category;
      link.setAttribute('data-category', category);
      
      // Add click event
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (category === 'All') {
          showAllItems(menuByCategory);
        } else {
          showCategory(category, menuByCategory[category] || []);
        }
        
        // Update active state
        document.querySelectorAll('.category-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
      
      categoryLinksContainer.appendChild(link);
    });
    
    // Add chevron arrow for more categories
    const chevronBtn = document.createElement('a');
    chevronBtn.href = '#';
    chevronBtn.className = 'chevron-btn';
    chevronBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    chevronBtn.title = 'More categories';
    categoryLinksContainer.appendChild(chevronBtn);
    
    // Set "All" as active by default
    const allLink = categoryLinksContainer.querySelector('[data-category="All"]');
    if (allLink) {
      allLink.classList.add('active');
      showAllItems(menuByCategory);
    }
  }
  
  function showAllItems(menuByCategory) {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = '';
    
    // Get all items from all categories
    const allItems = [];
    Object.values(menuByCategory).forEach(categoryItems => {
      allItems.push(...categoryItems);
    });
    
    // Display all items
    allItems.forEach(item => {
      const menuItem = createMenuItem(item);
      menuGrid.appendChild(menuItem);
    });
  }
  
  function displayMenuItems(menuByCategory) {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    
    // Clear existing items
    menuGrid.innerHTML = '';
    
    // Show all items by default (this will be handled by updateCategories)
    showAllItems(menuByCategory);
  }
  
  function showCategory(categoryName, items) {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = '';
    
    if (!items || items.length === 0) {
      // Show empty state for categories with no items
      menuGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">No items in ${categoryName}</h5>
          <p class="text-muted">This category is currently empty.</p>
        </div>
      `;
      return;
    }
    
    items.forEach(item => {
      const menuItem = createMenuItem(item);
      menuGrid.appendChild(menuItem);
    });
  }
  
  function createMenuItem(item) {
    const col = document.createElement('div');
    col.className = 'col-lg-3 col-md-4 col-6';
    
    const imageUrl = item.photoUrl || '/src/Icons/menu.png';
    
    col.innerHTML = `
      <div class="menu-item">
        <img src="${imageUrl}" alt="${item.name}" class="menu-item-img" 
             onerror="this.src='/src/Icons/menu.png'; this.classList.add('fallback-image');">
        <div class="menu-item-details">
          <div>
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-description">${item.description || ''}</div>
            <div class="menu-item-price">₱${item.price}</div>
          </div>
          <button class="add-to-cart-btn" data-item='${JSON.stringify(item)}'>+</button>
        </div>
      </div>
    `;
    
    return col;
  }
  
  function showEmptyMenu() {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-utensils fa-3x text-muted mb-3"></i>
        <h5 class="text-muted">No Menu Items Available</h5>
        <p class="text-muted">Please check back later for our delicious menu items.</p>
      </div>
    `;
  }
  
  function showErrorMenu() {
    const menuGrid = document.querySelector('.menu-items-grid');
    if (!menuGrid) return;
    
    menuGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
        <h5 class="text-danger">Error Loading Menu</h5>
        <p class="text-muted">Unable to load menu items. Please try again later.</p>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
  
  function setupEventListeners() {
    // Cart functionality
    let cart = [];
    let cartTotal = 0;

    // Add to cart functionality - using event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) {
        e.preventDefault();
        
        // Get the menu item data from the button's data attribute
        const itemData = JSON.parse(e.target.getAttribute('data-item'));
        
        // Check if item already exists in cart
        const existingItem = cart.find(item => item.id === itemData.id);
        
        if (existingItem) {
          existingItem.quantity += 1;
          existingItem.total = existingItem.quantity * existingItem.price;
        } else {
          cart.push({
            id: itemData.id,
            name: itemData.name,
            price: itemData.price,
            quantity: 1,
            total: itemData.price,
            description: itemData.description,
            photoUrl: itemData.photoUrl
          });
        }
        
        updateOrderDisplay();
      }
    });

    function updateOrderDisplay() {
      const orderMenuContainer = document.querySelector('.order-menu');
      const orderTotalElement = document.querySelector('.order-total-price');
      
      if (!orderMenuContainer || !orderTotalElement) return;
      
      // Clear existing order items (except the header)
      const existingItems = orderMenuContainer.querySelectorAll('.order-item');
      existingItems.forEach(item => item.remove());
      
      // Add each cart item to the display
      cart.forEach(item => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
          <span>${item.quantity} ${item.name}</span>
          <span class="order-item-price">₱${item.total.toLocaleString()}</span>
        `;
        orderMenuContainer.appendChild(orderItem);
      });
      
      // Update total
      cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
      orderTotalElement.textContent = `₱${cartTotal.toLocaleString()}`;
      
      // Show/hide order menu based on cart contents
      if (cart.length === 0) {
        orderMenuContainer.style.display = 'none';
      } else {
        orderMenuContainer.style.display = 'block';
      }
    }

    // Initialize order display
    updateOrderDisplay();
  }
  
  // Start the Firebase initialization
  waitForFirebase();
});
