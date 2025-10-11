// Initialize required managers
async function initializeManagers() {
  console.log('[SHIPPING] Starting manager initialization...');

  try {
    // Wait for Firebase to be available
    let attempts = 0;
    while (typeof firebase === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof firebase === 'undefined') {
      throw new Error('Firebase failed to initialize');
    }

    // Initialize Firebase if not already initialized
    if (!firebase.apps?.length) {
      if (typeof firebaseConfig === 'undefined') {
        throw new Error('Firebase configuration not found');
      }
      firebase.initializeApp(firebaseConfig);
    }

    // Initialize Firestore
    const db = firebase.firestore();
    if (!db) {
      throw new Error('Firestore failed to initialize');
    }
    console.log('[SHIPPING] Firebase and Firestore initialized successfully');
  } catch (error) {
    console.error('[SHIPPING] Error during initialization:', error);
    throw error;
  }

  // Initialize Firebase Order Manager
  if (typeof FirebaseOrderManager === 'undefined') {
    throw new Error('FirebaseOrderManager is not defined');
  }

  const orderManager = new FirebaseOrderManager();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for initialization

  if (!orderManager.isInitialized) {
    throw new Error('Firebase Order Manager failed to initialize');
  }

  // Initialize Lalamove Quotation Manager
  if (typeof LalamoveQuotationManager === 'undefined') {
    throw new Error('LalamoveQuotationManager is not defined');
  }

  const quotationManager = new LalamoveQuotationManager();

  return { orderManager, quotationManager };
}

document.addEventListener('DOMContentLoaded', async function() {
  console.log('[SHIPPING] DOMContentLoaded event fired, starting initialization...');

  try {
    const managers = await initializeManagers();
    window.orderManager = managers.orderManager;
    window.quotationManager = managers.quotationManager;
    console.log('[SHIPPING] Managers initialized successfully');

    // Initialize rest of the page
    init();
  } catch (error) {
    console.error('[SHIPPING] Initialization error:', error);
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4757;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.textContent = 'Error initializing the page. Please refresh and try again.';
    document.body.appendChild(errorDiv);
  }
});