/**
 * Authentication Manager for Automatic Logout
 * 
 * This module handles automatic logout when the user closes the tab,
 * navigates away, or becomes inactive for extended periods.
 */

// Check if AuthManager is already declared to prevent redeclaration errors
if (typeof AuthManager === 'undefined') {
  class AuthManager {
    constructor() {
      this.isInitialized = false;
      this.logoutTimeout = null;
      this.inactivityTimeout = null;
      this.isLoggingOut = false;
      
      // Configuration
      this.config = {
        inactivityTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
        logoutDelay: 1000, // 1 second delay before logout
        enableInactivityLogout: true,
        enableTabCloseLogout: true,
        enableVisibilityLogout: true
      };
      
      this.init();
    }

    // Initialize the authentication manager
    async init() {
      try {
        console.log('[AuthManager] Initializing authentication manager...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up inactivity monitoring
        if (this.config.enableInactivityLogout) {
          this.setupInactivityMonitoring();
        }
        
        this.isInitialized = true;
        console.log('[AuthManager] Authentication manager initialized successfully');
        
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
      
      // User activity detection for inactivity timeout
      this.setupActivityListeners();
      
      console.log('[AuthManager] Event listeners set up successfully');
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
        console.log('[AuthManager] User is authenticated, performing logout on tab close');
        this.performLogout('tab_close');
      }
      
      // Note: We can't prevent the unload event, but we can trigger logout
      // The actual logout will happen in the unload handler
    }

    // Handle unload event
    handleUnload(event) {
      console.log('[AuthManager] unload event triggered');
      
      if (this.isUserAuthenticated() && !this.isLoggingOut) {
        console.log('[AuthManager] Performing immediate logout on unload');
        this.performImmediateLogout('tab_close');
      }
    }

    // Handle visibility change (tab switching, minimizing)
    handleVisibilityChange(event) {
      if (document.hidden) {
        console.log('[AuthManager] Page became hidden');
        
        // Optional: logout when tab becomes hidden
        if (this.config.enableVisibilityLogout && this.isUserAuthenticated()) {
          console.log('[AuthManager] Logging out due to page visibility change');
          this.performLogout('visibility_change');
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
      
      if (this.isUserAuthenticated() && !this.isLoggingOut) {
        console.log('[AuthManager] Performing logout on page hide');
        this.performLogout('page_hide');
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
          this.clearLocalStorage();
          return;
        }
        
        // Get current user
        const user = firebase.auth().currentUser;
        if (!user) {
          console.log('[AuthManager] No user to logout');
          this.clearLocalStorage();
          return;
        }
        
        console.log('[AuthManager] Logging out user:', user.email);
        
        // Sign out from Firebase
        await firebase.auth().signOut();
        
        // Clear local storage
        this.clearLocalStorage();
        
        console.log('[AuthManager] Logout completed successfully');
        
        // Log logout event for analytics/debugging
        this.logLogoutEvent(reason, user.email);
        
      } catch (error) {
        console.error('[AuthManager] Error during logout:', error);
        
        // Even if Firebase logout fails, clear local storage
        this.clearLocalStorage();
      } finally {
        this.isLoggingOut = false;
      }
    }

    // Clear local storage
    clearLocalStorage() {
      try {
        console.log('[AuthManager] Clearing local storage...');
        
        // Remove authentication-related items
        const itemsToRemove = [
          'userRole',
          'signupEmail', 
          'signupName',
          'userProfile',
          'cartItems',
          'orderFormData',
          'quotationData',
          'pickupAddress',
          'deliveryAddress'
        ];
        
        itemsToRemove.forEach(item => {
          localStorage.removeItem(item);
        });
        
        // Clear session storage as well
        sessionStorage.clear();
        
        console.log('[AuthManager] Local storage cleared successfully');
        
      } catch (error) {
        console.error('[AuthManager] Error clearing local storage:', error);
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
  window.performAutoLogout = function(reason) {
    const manager = initializeAuthManager();
    return manager.performLogout(reason);
  };

  window.performManualLogout = function() {
    const manager = initializeAuthManager();
    return manager.manualLogout();
  };

  window.getAuthManager = function() {
    return initializeAuthManager();
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[auth-manager.js] DOM loaded, initializing Auth Manager...');
    initializeAuthManager();
  });

  // Export for module usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, initializeAuthManager };
  }

} // End of AuthManager conditional block
