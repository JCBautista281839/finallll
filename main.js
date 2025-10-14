// Hamburger Menu functionality is handled in index.html

// Global variables for search functionality
let allMenuItems = [];
let searchTimeout = null;

// Firebase configuration - check if already declared to prevent redeclaration errors
if (typeof firebaseConfig === 'undefined') {
    window.firebaseConfig = {
        apiKey: "AIzaSyAXFKAt6OGLlUfQBnNmEhek6uqNQm4634Y",
        authDomain: "victoria-s-bistro.firebaseapp.com",
        databaseURL: "https://victoria-s-bistro-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "victoria-s-bistro",
        storageBucket: "victoria-s-bistro.firebasestorage.app",
        messagingSenderId: "672219366880",
        appId: "1:672219366880:web:220df1e01d0b9ab72d9785",
        measurementId: "G-H9G17QXSMV"
    };
}

// Initialize Firebase
async function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (firebase.apps && firebase.apps.length > 0) {
            console.log('Firebase already initialized');
            return firebase.app();
        }

        // Initialize Firebase
        console.log('Initializing Firebase...');

        // Check if firebaseConfig is available
        if (typeof window.firebaseConfig === 'undefined') {
            console.error('Firebase configuration not found');
            return null;
        }

        const app = firebase.initializeApp(window.firebaseConfig);
        console.log('Firebase initialized successfully');

        // Configure authentication persistence to SESSION
        try {
            await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
            console.log('Firebase auth persistence set to SESSION');
        } catch (persistenceError) {
            console.warn('Could not set auth persistence:', persistenceError);
        }

        return app;

    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return null;
    }
}

// Test Firebase connection
function testFirebaseConnection() {
    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            console.log('Firebase not initialized yet');
            return;
        }

        console.log('Testing Firebase connection...');
        const db = firebase.firestore();

        // Simple test query
        db.collection('test').doc('connection').get()
            .then(() => {
                console.log('✅ Firebase connection successful');
            })
            .catch((error) => {
                console.error('❌ Firebase connection failed:', error.message);
            });

    } catch (error) {
        console.error('Firebase connection test error:', error);
    }
}

// Global Firebase ready check function
window.isFirebaseReady = function () {
    return typeof firebase !== 'undefined' &&
        firebase.apps &&
        firebase.apps.length > 0 &&
        firebase.auth &&
        firebase.firestore;
};

// Auto-initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Page loaded, initializing Firebase...');
    await initializeFirebase();

    // Test connection after a short delay
    setTimeout(() => {
        testFirebaseConnection();
    }, 1000);
});

// Handle user profile icon click (fallback for pages without custom implementation)
function handleUserProfileClick(event) {
    event.preventDefault();

    try {
        // Check if Firebase is initialized
        if (typeof firebase === 'undefined') {
            console.log('Firebase not loaded, redirecting to login');
            window.location.href = 'html/login.html';
            return;
        }

        // Check if user is authenticated
        const user = firebase.auth().currentUser;

        if (user) {
            // User is logged in - redirect to account page
            console.log('User is logged in:', user.email);
            console.log('Redirecting to account page...');
            window.location.href = 'customer/html/account.html';
        } else {
            // User is not logged in - redirect to login
            console.log('User is not logged in, redirecting to login');
            window.location.href = 'html/login.html';
        }

    } catch (error) {
        console.error('Error checking user authentication:', error);
        // Fallback to login page
        window.location.href = 'html/login.html';
    }
}

// Scroll animations for hero elements
function initializeScrollAnimations() {
    // Animate elements on scroll (in and out)
    (function () {
        if (window.innerWidth <= 768) return; // Don't run on mobile

        const targets = document.querySelectorAll('.scroll-left, .scroll-right');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                } else {
                    // Don't remove 'in-view' for scroll-left/right on exit, let scroll handler do it
                    if (!entry.target.classList.contains('scroll-left') && !entry.target.classList.contains('scroll-right')) {
                        entry.target.classList.remove('in-view');
                    }
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

        targets.forEach((el) => observer.observe(el));
    })();

    // Exit animation on scroll
    window.addEventListener('scroll', function () {
        if (window.innerWidth <= 768) return; // Don't run on mobile

        const scrollLeft = document.querySelector('.scroll-left');
        const scrollRight = document.querySelector('.scroll-right');
        if (!scrollLeft || !scrollRight) return;

        let scrollPosition = window.scrollY;

        // Start exit animation after scrolling a bit
        if (scrollPosition > 100) {
            scrollLeft.classList.add('exit-left');
            scrollRight.classList.add('exit-right');
        } else {
            scrollLeft.classList.remove('exit-left');
            scrollRight.classList.remove('exit-right');
        }
    });
}

// Simple slide transition function
function slideNavigate(url, direction = 'right') {
    // Find the main content area (everything except header)
    const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.body;

    // Add slide out class based on direction
    if (direction === 'right') {
        mainContent.classList.add('slide-out-right');
    } else {
        mainContent.classList.add('slide-out-left');
    }

    // Navigate after transition
    setTimeout(() => {
        window.location.href = url;
    }, 400);
}

// Setup slide navigation
function setupSlideNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[href]');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetUrl = this.getAttribute('href');

            if (targetUrl && !targetUrl.startsWith('http') && !targetUrl.startsWith('#')) {
                // Determine slide direction based on target page
                const direction = targetUrl.includes('menu') ? 'right' : 'left';
                slideNavigate(targetUrl, direction);
            } else {
                window.location.href = targetUrl;
            }
        });
    });
}

// Initialize scroll animations when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    initializeScrollAnimations();
    setupSlideNavigation();
    initializeSearchFunctionality();
});

// Search functionality
function initializeSearchFunctionality() {
    console.log('Initializing search functionality...');

    // Load menu items from Firebase
    loadMenuItemsForSearch();

    // Setup search input event listeners
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchResults = document.getElementById('searchResults');

    if (searchInput && searchDropdown && searchResults) {
        // Input event listener
        searchInput.addEventListener('input', function (e) {
            const query = e.target.value.trim();

            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (query.length === 0) {
                hideSearchDropdown();
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                hideSearchDropdown();
            }
        });

        // Show dropdown when input is focused and has content
        searchInput.addEventListener('focus', function () {
            if (this.value.trim().length > 0) {
                showSearchDropdown();
            }
        });
    }
}

// Load menu items from Firebase for search
function loadMenuItemsForSearch() {
    if (typeof firebase === 'undefined') {
        console.log('Firebase not available, retrying...');
        setTimeout(loadMenuItemsForSearch, 1000);
        return;
    }

    const db = firebase.firestore();

    db.collection('menu').onSnapshot((querySnapshot) => {
        allMenuItems = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Only include available items
            if (data.available === true) {
                allMenuItems.push({
                    id: doc.id,
                    name: data.name || '',
                    price: data.price || 0,
                    category: data.category || '',
                    photoUrl: data.photoUrl || '/src/Icons/menu.png',
                    ...data
                });
            }
        });

        console.log('Loaded', allMenuItems.length, 'menu items for search');
    }, (error) => {
        console.error('Error loading menu items for search:', error);
    });
}

// Perform search
function performSearch(query) {
    if (allMenuItems.length === 0) {
        console.log('No menu items loaded yet');
        return;
    }

    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    // Filter menu items based on query
    const filteredItems = allMenuItems.filter(item => {
        const name = item.name.toLowerCase();
        const category = item.category.toLowerCase();
        const queryLower = query.toLowerCase();

        return name.includes(queryLower) || category.includes(queryLower);
    });

    // Sort by relevance (exact name matches first, then category matches)
    filteredItems.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const queryLower = query.toLowerCase();

        const aExactMatch = aName === queryLower;
        const bExactMatch = bName === queryLower;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        const aStartsWith = aName.startsWith(queryLower);
        const bStartsWith = bName.startsWith(queryLower);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return aName.localeCompare(bName);
    });

    // Display results
    displaySearchResults(filteredItems);
}

// Display search results
function displaySearchResults(items) {
    const searchResults = document.getElementById('searchResults');
    const searchDropdown = document.getElementById('searchDropdown');

    if (!searchResults || !searchDropdown) return;

    if (items.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No items found</div>';
    } else {
        searchResults.innerHTML = items.map(item => `
            <div class="search-result-item" data-item-id="${item.id}" data-item-name="${item.name}">
                <img src="${item.photoUrl}" alt="${item.name}" class="search-result-image" 
                     onerror="this.src='/src/Icons/menu.png'">
                <div class="search-result-content">
                    <div class="search-result-name">${item.name}</div>
                    <div class="search-result-price">₱${parseFloat(item.price).toFixed(2)}</div>
                    <div class="search-result-category">${item.category}</div>
                </div>
            </div>
        `).join('');

        // Add click listeners to result items
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function () {
                const itemName = this.getAttribute('data-item-name');
                navigateToMenuItem(itemName);
            });
        });
    }

    showSearchDropdown();
}

// Navigate to menu item
function navigateToMenuItem(itemName) {
    console.log('Navigating to menu item:', itemName);

    // Hide search dropdown
    hideSearchDropdown();

    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // Navigate to menu page with item parameter
    const menuUrl = `/customer/html/menucustomer.html?scrollTo=${encodeURIComponent(itemName)}`;

    // Use slide navigation if available
    if (typeof slideNavigate === 'function') {
        slideNavigate(menuUrl, 'right');
    } else {
        window.location.href = menuUrl;
    }
}

// Show search dropdown
function showSearchDropdown() {
    const searchDropdown = document.getElementById('searchDropdown');
    if (searchDropdown) {
        searchDropdown.style.display = 'block';
    }
}

// Hide search dropdown
function hideSearchDropdown() {
    const searchDropdown = document.getElementById('searchDropdown');
    if (searchDropdown) {
        searchDropdown.style.display = 'none';
    }
}