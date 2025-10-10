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
    setupAuthStateMonitoring();
    checkScrollToParameter();
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
      'Appetizer',
      'Specials',
      'Silog',
      'More Loved',
      'Pasta',
      'Pansit',
      'Bilao',
      'Burgers',
      'Sandwiches',
      'Feast',
      'Rice Bowls',
      'Drinks',
      'Sizzlings',
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
    // 6 items per row on large screens (col-lg-2), 4 per row on md (col-md-3), 2 per row on xs (col-6)
    col.className = 'col-lg-2 col-md-3 col-6';

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
    // Function to check if user is authenticated
    function checkUserAuthentication() {
      return new Promise((resolve) => {
        const user = firebase.auth().currentUser;
        if (user) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    }

    // Add to cart functionality - using event delegation for dynamically created buttons
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) {
        e.preventDefault();

        // Check if user is logged in
        const isAuthenticated = await checkUserAuthentication();

        if (!isAuthenticated) {
          // Show elegant notification and redirect to login page
          showLoginRequiredNotification();
          setTimeout(() => {
            window.location.href = '/html/login.html';
          }, 2000);
          return;
        }

        // Get the menu item data from the button's data attribute
        const itemData = JSON.parse(e.target.getAttribute('data-item'));

        // Use the global addToCart function
        if (window.addToCart) {
          window.addToCart({
            id: itemData.id,
            name: itemData.name,
            price: itemData.price,
            description: itemData.description,
            photoUrl: itemData.photoUrl
          });

          // Show success feedback
          showAddToCartSuccess(itemData.name);
        }
      }
    });
  }

  function setupAuthStateMonitoring() {
    // Monitor authentication state changes
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('User is authenticated:', user.email);
        // Update UI to show user is logged in
        updateUserInterface(true);
      } else {
        console.log('User is not authenticated');
        // Update UI to show user is not logged in
        updateUserInterface(false);
      }
    });
  }

  function updateUserInterface(isAuthenticated) {
    // Update user icon link based on authentication status
    const userIconLink = document.querySelector('.header-icons .icon-link');
    if (userIconLink) {
      if (isAuthenticated) {
        // If user is logged in, link to account page
        userIconLink.href = '/customer/html/account.html';
        userIconLink.title = 'My Account';
      } else {
        // If user is not logged in, link to login page
        userIconLink.href = '/html/login.html';
        userIconLink.title = 'Login';
      }
    }
  }

  function showLoginRequiredNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'login-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-user-lock"></i>
        <span>Please log in to add items to your cart</span>
        <div class="notification-progress"></div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #e5735a, #ff6b6b);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 350px;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    // Add content styles
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
    `;

    // Add progress bar styles
    const progress = notification.querySelector('.notification-progress');
    progress.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: rgba(255,255,255,0.3);
      width: 100%;
      border-radius: 0 0 10px 10px;
      overflow: hidden;
    `;

    // Add progress animation
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 100%;
      background: rgba(255,255,255,0.8);
      width: 100%;
      animation: progress 2s linear forwards;
    `;
    progress.appendChild(progressBar);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);

    // Add to body
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove notification after 2 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 2000);
  }

  function showAddToCartSuccess(itemName) {
    // Create success notification element
    const notification = document.createElement('div');
    notification.className = 'add-to-cart-success';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-check-circle"></i>
        <span>Added "${itemName}" to cart!</span>
        <div class="notification-progress"></div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 350px;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    // Add content styles
    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
    `;

    // Add progress bar styles
    const progress = notification.querySelector('.notification-progress');
    progress.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: rgba(255,255,255,0.3);
      width: 100%;
      border-radius: 0 0 10px 10px;
      overflow: hidden;
    `;

    // Add progress animation
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 100%;
      background: rgba(255,255,255,0.8);
      width: 100%;
      animation: progress 1.5s linear forwards;
    `;
    progress.appendChild(progressBar);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progress {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);

    // Add to body
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove notification after 1.5 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 300);
    }, 1500);
  }

  // Function to check URL parameter and scroll to specific dish
  function checkScrollToParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const scrollTo = urlParams.get('scrollTo');

    if (scrollTo) {
      console.log('Scroll to parameter found:', scrollTo);
      // Wait for menu to load, then scroll to the specific dish
      setTimeout(() => {
        scrollToDish(scrollTo);
      }, 2000); // Wait 2 seconds for menu to load
    }
  }

  // Function to scroll to a specific dish
  function scrollToDish(dishName) {
    console.log('Attempting to scroll to dish:', dishName);

    // Find the menu item by name (case-insensitive)
    const menuItems = document.querySelectorAll('.menu-item');
    let targetItem = null;

    menuItems.forEach(item => {
      const itemName = item.querySelector('.menu-item-name');
      if (itemName) {
        const name = itemName.textContent.trim();
        // Check for exact match or partial match (for "Crispy Kare-Kare" vs "Crispy Kare Kare")
        if (name.toLowerCase().includes(dishName.toLowerCase()) ||
          dishName.toLowerCase().includes(name.toLowerCase())) {
          targetItem = item;
        }
      }
    });

    if (targetItem) {
      console.log('Found target dish, scrolling to it...');

      // Scroll to the item with smooth behavior
      targetItem.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Add a highlight effect
      targetItem.style.boxShadow = '0 0 20px rgba(229, 115, 90, 0.5)';
      targetItem.style.transform = 'scale(1.05)';
      targetItem.style.transition = 'all 0.3s ease';

      // Remove highlight after 3 seconds
      setTimeout(() => {
        targetItem.style.boxShadow = '';
        targetItem.style.transform = '';
      }, 3000);

      // Show a notification
      showDishFoundNotification(dishName);
    } else {
      console.log('Dish not found:', dishName);
      showDishNotFoundNotification(dishName);
    }
  }

  // Function to show notification when dish is found
  function showDishFoundNotification(dishName) {
    const notification = document.createElement('div');
    notification.className = 'dish-found-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-utensils"></i>
        <span>Found "${dishName}"!</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 300px;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Function to show notification when dish is not found
  function showDishNotFoundNotification(dishName) {
    const notification = document.createElement('div');
    notification.className = 'dish-not-found-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-search"></i>
        <span>"${dishName}" not found in current menu</span>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #FF9800, #F57C00);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 350px;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      transform: translateX(100%);
      transition: transform 0.3s ease-in-out;
    `;

    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove notification after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Start the Firebase initialization
  waitForFirebase();
});
