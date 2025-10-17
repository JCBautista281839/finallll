/**
 * Universal Authentication Manager for Automatic Logout
 * 
 * This module handles automatic logout when the user closes the tab,
 * navigates away, or becomes inactive for extended periods.
 * Works across both admin and customer interfaces.
 */

// Check if AuthManager is already declared to prevent redeclaration errors
if (typeof AuthManager === 'undefined') {
  class AuthManager {
    constructor() {
      this.isInitialized = false;
      this.logoutTimeout = null;
      this.inactivityTimeout = null;
      this.isLoggingOut = false;
      this.isNavigating = false; // Track if user is navigating vs closing tab

      // Configuration
      this.config = {
        inactivityTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
        logoutDelay: 1000, // 1 second delay before logout
        enableInactivityLogout: true,
        enableTabCloseLogout: true, // Enabled to logout on tab close
        enableVisibilityLogout: false // Disabled by default - only logout on actual tab close
      };

      this.init();
    }

    // Initialize the authentication manager
    async init() {
      try {
        console.log('[AuthManager] Initializing universal authentication manager...');

        // Wait for Firebase to be ready
        await this.waitForFirebase();

        // Configure Firebase auth persistence to SESSION (persists only for tab session)
        await this.configureAuthPersistence();

        // Set up event listeners
        this.setupEventListeners();

        // Set up inactivity monitoring
        if (this.config.enableInactivityLogout) {
          this.setupInactivityMonitoring();
        }

        this.isInitialized = true;
        console.log('[AuthManager] Universal authentication manager initialized successfully');

      } catch (error) {
        console.error('[AuthManager] Initialization failed:', error);
        this.isInitialized = false;
      }
    }

    // Wait for Firebase to be ready
    waitForFirebase() {
      return new Promise((resolve, reject) => {
        const checkFirebase = () => {
          if (typeof firebase !== 'undefined' &&
            firebase.apps &&
            firebase.apps.length > 0 &&
            firebase.auth) {
            resolve();
          } else {
            setTimeout(checkFirebase, 100);
          }
        };
        checkFirebase();

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Firebase initialization timeout'));
        }, 10000);
      });
    }

    // Configure Firebase authentication persistence
    async configureAuthPersistence() {
      try {
        console.log('[AuthManager] Configuring Firebase auth persistence...');

        // Set Firebase auth persistence to SESSION
        // This ensures the user is logged out when the tab/browser is closed
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

        console.log('[AuthManager] Firebase auth persistence set to SESSION');

      } catch (error) {
        console.error('[AuthManager] Error configuring auth persistence:', error);
        // Don't throw error - continue with default persistence
      }
    }

    // Set up all event listeners
    setupEventListeners() {
      console.log('[AuthManager] Setting up event listeners...');

      // Tab close detection
      if (this.config.enableTabCloseLogout) {
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('unload', this.handleUnload.bind(this));
      }

      // Visibility change detection (tab switching, minimizing, etc.)
      if (this.config.enableVisibilityLogout) {
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      }

      // Page hide detection (mobile browsers, some desktop scenarios)
      window.addEventListener('pagehide', this.handlePageHide.bind(this));

      // Navigation detection to distinguish between tab close and navigation
      this.setupNavigationDetection();

      // User activity detection for inactivity timeout
      this.setupActivityListeners();

      console.log('[AuthManager] Event listeners set up successfully');
    }

    // Set up navigation detection
    setupNavigationDetection() {
      // Detect clicks on links (navigation)
      document.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (target && target.href && !target.href.startsWith('javascript:')) {
          this.isNavigating = true;
          console.log('[AuthManager] Navigation detected - user clicked link');

          // Reset navigation flag after a short delay
          setTimeout(() => {
            this.isNavigating = false;
          }, 1000);
        }
      });

      // Detect form submissions (navigation)
      document.addEventListener('submit', () => {
        this.isNavigating = true;
        console.log('[AuthManager] Navigation detected - form submission');

        setTimeout(() => {
          this.isNavigating = false;
        }, 1000);
      });

      // Detect programmatic navigation
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        this.isNavigating = true;
        console.log('[AuthManager] Navigation detected - pushState');
        setTimeout(() => { this.isNavigating = false; }, 1000);
        return originalPushState.apply(history, args);
      }.bind(this);

      history.replaceState = function (...args) {
        this.isNavigating = true;
        console.log('[AuthManager] Navigation detected - replaceState');
        setTimeout(() => { this.isNavigating = false; }, 1000);
        return originalReplaceState.apply(history, args);
      }.bind(this);
    }

    // Set up activity listeners for inactivity detection
    setupActivityListeners() {
      const activityEvents = [
        'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
      ];

      activityEvents.forEach(event => {
        document.addEventListener(event, this.resetInactivityTimer.bind(this), true);
      });
    }

    // Set up inactivity monitoring
    setupInactivityMonitoring() {
      console.log('[AuthManager] Setting up inactivity monitoring...');
      this.resetInactivityTimer();
    }

    // Reset inactivity timer
    resetInactivityTimer() {
      if (!this.config.enableInactivityLogout) return;

      // Clear existing timeout
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }

      // Set new timeout
      this.inactivityTimeout = setTimeout(() => {
        console.log('[AuthManager] User inactive for', this.config.inactivityTimeout / 1000 / 60, 'minutes');
        this.performLogout('inactivity');
      }, this.config.inactivityTimeout);
    }

    // Handle beforeunload event (tab close, page refresh, navigation)
    handleBeforeUnload(event) {
      console.log('[AuthManager] beforeunload event triggered');

      // Only logout if user is actually authenticated
      if (this.isUserAuthenticated()) {
        console.log('[AuthManager] User is authenticated, preparing logout on tab close');
        // Don't perform logout immediately in beforeunload - wait for unload
        // This prevents logout on page refresh or navigation
      }
    }

    // Handle unload event
    handleUnload(event) {
      console.log('[AuthManager] unload event triggered');

      // Only logout if it's not navigation and user is authenticated
      if (!this.isNavigating && this.isUserAuthenticated() && !this.isLoggingOut) {
        console.log('[AuthManager] Performing immediate logout on unload (tab close detected)');
        this.performImmediateLogout('tab_close');
      } else if (this.isNavigating) {
        console.log('[AuthManager] Unload event ignored - user is navigating, not closing tab');
      } else {
        console.log('[AuthManager] Unload event ignored - user not authenticated or already logging out');
      }
    }

    // Handle visibility change (tab switching, minimizing)
    handleVisibilityChange(event) {
      if (document.hidden) {
        console.log('[AuthManager] Page became hidden');

        // Only logout on visibility change if explicitly enabled
        if (this.config.enableVisibilityLogout && this.isUserAuthenticated()) {
          console.log('[AuthManager] Logging out due to page visibility change');
          this.performLogout('visibility_change');
        } else {
          console.log('[AuthManager] Visibility logout disabled - user can switch tabs safely');
        }
      } else {
        console.log('[AuthManager] Page became visible');
        // Reset inactivity timer when page becomes visible
        this.resetInactivityTimer();
      }
    }

    // Handle page hide event (mobile browsers, some desktop scenarios)
    handlePageHide(event) {
      console.log('[AuthManager] pagehide event triggered');

      // Only logout on page hide if it's likely a tab close (not navigation)
      // Check if the page is being unloaded (persisted = false means tab close)
      if (event.persisted === false && this.isUserAuthenticated() && !this.isLoggingOut) {
        console.log('[AuthManager] Performing logout on page hide (tab close detected)');
        this.performLogout('page_hide');
      } else {
        console.log('[AuthManager] Page hide event ignored (likely navigation, not tab close)');
      }
    }

    // Check if user is authenticated
    isUserAuthenticated() {
      try {
        const user = firebase.auth().currentUser;
        return user !== null;
      } catch (error) {
        console.error('[AuthManager] Error checking authentication:', error);
        return false;
      }
    }

    // Perform logout with delay
    performLogout(reason = 'unknown') {
      if (this.isLoggingOut) {
        console.log('[AuthManager] Logout already in progress, skipping');
        return;
      }

      console.log('[AuthManager] Performing logout due to:', reason);
      this.isLoggingOut = true;

      // Clear inactivity timer
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
      }

      // Set logout timeout
      this.logoutTimeout = setTimeout(() => {
        this.executeLogout(reason);
      }, this.config.logoutDelay);
    }

    // Perform immediate logout (for unload events)
    performImmediateLogout(reason = 'unknown') {
      if (this.isLoggingOut) {
        console.log('[AuthManager] Logout already in progress, skipping immediate logout');
        return;
      }

      console.log('[AuthManager] Performing immediate logout due to:', reason);
      this.isLoggingOut = true;

      // Clear any pending logout timeout
      if (this.logoutTimeout) {
        clearTimeout(this.logoutTimeout);
        this.logoutTimeout = null;
      }

      // Execute logout immediately
      this.executeLogout(reason);
    }

    // Execute the actual logout
    async executeLogout(reason) {
      try {
        console.log('[AuthManager] Executing logout due to:', reason);

        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.auth) {
          console.log('[AuthManager] Firebase not available, clearing local storage only');
          this.clearAllStorage();
          return;
        }

        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
          console.log('[AuthManager] No user to logout');
          this.clearAllStorage();
          return;
        }

        console.log('[AuthManager] Logging out user:', user.email);

        // Sign out from Firebase
        await firebase.auth().signOut();

        // Clear all browser storage
        this.clearAllStorage();

        console.log('[AuthManager] Logout completed successfully');

        // Log logout event for analytics/debugging
        this.logLogoutEvent(reason, user.email);

      } catch (error) {
        console.error('[AuthManager] Error during logout:', error);

        // Even if Firebase logout fails, clear all storage
        this.clearAllStorage();
      } finally {
        this.isLoggingOut = false;
      }
    }

    // Clear all browser storage
    clearAllStorage() {
      try {
        console.log('[AuthManager] Clearing all browser storage...');

        // Remove authentication-related items from localStorage
        const itemsToRemove = [
          'userRole',
          'signupEmail',
          'signupName',
          'userProfile',
          'cartItems',
          'orderFormData',
          'quotationData',
          'pickupAddress',
          'deliveryAddress',
          'userPreferences',
          'userSettings',
          'lastLoginTime',
          'sessionData',
          'tempData',
          'formData',
          'checkoutData',
          'paymentData',
          'shippingData',
          'orderHistory',
          'favorites',
          'recentOrders',
          'userLocation',
          'notificationSettings',
          'themeSettings',
          'languageSettings',
          'adminSettings',
          'inventoryData',
          'menuData',
          'orderData',
          'analyticsData',
          'posData',
          'receiptData',
          'kitchenData',
          'staffData',
          'customerData'
        ];

        itemsToRemove.forEach(item => {
          localStorage.removeItem(item);
        });

        // Clear all session storage
        sessionStorage.clear();

        // Clear IndexedDB if available
        this.clearIndexedDB();

        // Clear cookies (if any authentication cookies exist)
        this.clearAuthCookies();

        console.log('[AuthManager] All browser storage cleared successfully');

      } catch (error) {
        console.error('[AuthManager] Error clearing browser storage:', error);
      }
    }

    // Clear IndexedDB
    clearIndexedDB() {
      try {
        if ('indexedDB' in window) {
          // List of known IndexedDB databases to clear
          const databasesToClear = [
            'firebaseLocalStorageDb',
            'firebase-heartbeat-database',
            'firebase-messaging-database',
            'cart-db',
            'user-data-db',
            'offline-data-db',
            'admin-db',
            'inventory-db',
            'menu-db',
            'order-db'
          ];

          databasesToClear.forEach(dbName => {
            try {
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              deleteRequest.onsuccess = () => {
                console.log(`[AuthManager] IndexedDB database ${dbName} cleared`);
              };
              deleteRequest.onerror = () => {
                console.warn(`[AuthManager] Could not clear IndexedDB database ${dbName}`);
              };
            } catch (error) {
              console.warn(`[AuthManager] Error clearing IndexedDB database ${dbName}:`, error);
            }
          });
        }
      } catch (error) {
        console.error('[AuthManager] Error clearing IndexedDB:', error);
      }
    }

    // Clear authentication cookies
    clearAuthCookies() {
      try {
        // List of authentication-related cookies to clear
        const cookiesToClear = [
          'authToken',
          'sessionToken',
          'userSession',
          'firebaseAuth',
          'userData',
          'loginState',
          'adminSession',
          'staffSession',
          'customerSession'
        ];

        cookiesToClear.forEach(cookieName => {
          // Clear cookie for current domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          // Clear cookie for parent domain
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        });

        console.log('[AuthManager] Authentication cookies cleared');
      } catch (error) {
        console.error('[AuthManager] Error clearing cookies:', error);
      }
    }

    // Log logout event for analytics/debugging
    logLogoutEvent(reason, userEmail) {
      try {
        const logoutEvent = {
          timestamp: new Date().toISOString(),
          reason: reason,
          userEmail: userEmail,
          userAgent: navigator.userAgent,
          url: window.location.href
        };

        console.log('[AuthManager] Logout event:', logoutEvent);

        // Store in localStorage for debugging (optional)
        const logoutHistory = JSON.parse(localStorage.getItem('logoutHistory') || '[]');
        logoutHistory.push(logoutEvent);

        // Keep only last 10 logout events
        if (logoutHistory.length > 10) {
          logoutHistory.splice(0, logoutHistory.length - 10);
        }

        localStorage.setItem('logoutHistory', JSON.stringify(logoutHistory));

      } catch (error) {
        console.error('[AuthManager] Error logging logout event:', error);
      }
    }

    // Manual logout method (for logout buttons)
    async manualLogout() {
      console.log('[AuthManager] Manual logout requested');

      // Clear any pending automatic logout
      if (this.logoutTimeout) {
        clearTimeout(this.logoutTimeout);
        this.logoutTimeout = null;
      }

      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
      }

      await this.executeLogout('manual');
    }

    // Update configuration
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      console.log('[AuthManager] Configuration updated:', this.config);

      // Restart inactivity monitoring if timeout changed
      if (this.config.enableInactivityLogout) {
        this.resetInactivityTimer();
      }
    }

    // Get current configuration
    getConfig() {
      return { ...this.config };
    }

    // Get logout history
    getLogoutHistory() {
      try {
        return JSON.parse(localStorage.getItem('logoutHistory') || '[]');
      } catch (error) {
        console.error('[AuthManager] Error getting logout history:', error);
        return [];
      }
    }

    // Clear logout history
    clearLogoutHistory() {
      localStorage.removeItem('logoutHistory');
      console.log('[AuthManager] Logout history cleared');
    }

    // Destroy the auth manager (cleanup)
    destroy() {
      console.log('[AuthManager] Destroying authentication manager...');

      // Clear timeouts
      if (this.logoutTimeout) {
        clearTimeout(this.logoutTimeout);
        this.logoutTimeout = null;
      }

      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
      }

      // Remove event listeners
      window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
      window.removeEventListener('unload', this.handleUnload.bind(this));
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
      window.removeEventListener('pagehide', this.handlePageHide.bind(this));

      this.isInitialized = false;
      console.log('[AuthManager] Authentication manager destroyed');
    }
  }

  // Global AuthManager instance
  let authManager = null;

  // Initialize AuthManager
  function initializeAuthManager() {
    if (!authManager) {
      authManager = new AuthManager();
    }
    return authManager;
  }

  // Global functions for backward compatibility
  window.performAutoLogout = function (reason) {
    const manager = initializeAuthManager();
    return manager.performLogout(reason);
  };

  window.performManualLogout = function () {
    const manager = initializeAuthManager();
    return manager.manualLogout();
  };

  // Global logoutUser function for HTML onclick handlers
  window.logoutUser = function () {
    console.log('[AuthManager] logoutUser() called from HTML');
    const manager = initializeAuthManager();
    return manager.manualLogout();
  };

  window.getAuthManager = function () {
    return initializeAuthManager();
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[auth-manager.js] DOM loaded, initializing Universal Auth Manager...');
    initializeAuthManager();
  });

  // Export for module usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, initializeAuthManager };
  }

} // End of AuthManager conditional block

