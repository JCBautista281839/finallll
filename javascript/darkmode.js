// Global Dark Mode System
// This file handles dark mode across all pages

(function() {
    'use strict';
    
    // Initialize dark mode on page load
    function initializeDarkMode() {
        const body = document.body;
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Apply dark mode class if enabled
        if (isDarkMode) {
            body.classList.add('dark-mode');
        }
        
        // Set toggle state if toggle exists
        const darkModeToggle = document.querySelector('.checkbox');
        if (darkModeToggle) {
            darkModeToggle.checked = isDarkMode;
            
            // Add event listener for toggle
            darkModeToggle.addEventListener('change', toggleDarkMode);
        }
        
        // Also check for any other dark mode toggles (button format)
        const darkModeButtons = document.querySelectorAll('[data-dark-toggle]');
        darkModeButtons.forEach(button => {
            button.addEventListener('click', toggleDarkMode);
        });
    }
    
    // Toggle dark mode function
    function toggleDarkMode() {
        const body = document.body;
        const isDarkMode = body.classList.toggle('dark-mode');
        
        // Store preference in localStorage
        localStorage.setItem('darkMode', isDarkMode);
        
        // Update all toggles on current page
        updateToggles(isDarkMode);
        
        // Dispatch custom event for other components to listen to
        window.dispatchEvent(new CustomEvent('darkModeChanged', {
            detail: { isDarkMode: isDarkMode }
        }));
        
        console.log('Dark mode:', isDarkMode ? 'enabled' : 'disabled');
    }
    
    // Update all toggle states
    function updateToggles(isDarkMode) {
        const checkboxToggles = document.querySelectorAll('.checkbox');
        checkboxToggles.forEach(toggle => {
            toggle.checked = isDarkMode;
        });
        
        const buttonToggles = document.querySelectorAll('[data-dark-toggle]');
        buttonToggles.forEach(button => {
            button.classList.toggle('active', isDarkMode);
        });
    }
    
    // Get current dark mode state
    function isDarkModeEnabled() {
        return localStorage.getItem('darkMode') === 'true';
    }
    
    // Expose utility functions globally
    window.DarkModeUtils = {
        initialize: initializeDarkMode,
        toggle: toggleDarkMode,
        isEnabled: isDarkModeEnabled,
        updateToggles: updateToggles
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDarkMode);
    } else {
        initializeDarkMode();
    }
    
})();
