/**
 * Unified Popup System
 * Replaces all browser-native alerts with a cohesive, custom popup system
 */

// Global popup system
window.UnifiedPopup = {
    // Create and show a popup
    show: function (message, type = 'info', options = {}) {
        // Remove any existing popups
        this.hide();

        // Create popup container
        const popup = document.createElement('div');
        popup.id = 'unified-popup';
        popup.className = 'unified-popup-overlay';

        // Set up styles
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Poppins', Arial, sans-serif;
        `;

        // Create popup content
        const content = document.createElement('div');
        content.className = 'unified-popup-content';
        content.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            text-align: center;
            position: relative;
            animation: popupSlideIn 0.3s ease-out;
        `;

        // Add animation keyframes
        if (!document.getElementById('popup-styles')) {
            const style = document.createElement('style');
            style.id = 'popup-styles';
            style.textContent = `
                @keyframes popupSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                @keyframes popupSlideOut {
                    from {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.8) translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Set colors based on type using the specified color scheme
        let icon, color, bgColor;
        switch (type) {
            case 'success':
                icon = '✅';
                color = '#96392d';
                bgColor = '#f5f5f5';
                break;
            case 'error':
                icon = '❌';
                color = '#96392d';
                bgColor = '#f5f5f5';
                break;
            case 'warning':
                icon = '⚠️';
                color = '#96392d';
                bgColor = '#f5f5f5';
                break;
            case 'info':
            default:
                icon = 'ℹ️';
                color = '#96392d';
                bgColor = '#f5f5f5';
                break;
        }

        // Create message content
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
            <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 16px; line-height: 1.4;">
                ${message}
            </div>
            <button id="popup-ok-btn" style="
                background: #96392d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 8px;
            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                ${options.buttonText || 'OK'}
            </button>
        `;

        popup.appendChild(content);
        document.body.appendChild(popup);

        // Add click handlers
        const okBtn = document.getElementById('popup-ok-btn');
        const closePopup = () => {
            content.style.animation = 'popupSlideOut 0.2s ease-in';
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
                if (options.onClose) {
                    options.onClose();
                }
            }, 200);
        };

        okBtn.addEventListener('click', closePopup);
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePopup();
            }
        });

        // Auto-close after timeout if specified
        if (options.autoClose !== false) {
            const timeout = options.timeout || 5000;
            setTimeout(closePopup, timeout);
        }

        // Focus the button for keyboard accessibility
        setTimeout(() => okBtn.focus(), 100);

        return popup;
    },

    // Hide any existing popup
    hide: function () {
        const existing = document.getElementById('unified-popup');
        if (existing) {
            existing.remove();
        }
    },

    // Convenience methods
    success: function (message, options = {}) {
        return this.show(message, 'success', options);
    },

    error: function (message, options = {}) {
        return this.show(message, 'error', options);
    },

    warning: function (message, options = {}) {
        return this.show(message, 'warning', options);
    },

    info: function (message, options = {}) {
        return this.show(message, 'info', options);
    },

    // Confirm dialog
    confirm: function (message, options = {}) {
        return new Promise((resolve) => {
            const popup = this.show(message, 'warning', {
                ...options,
                autoClose: false,
                buttonText: options.confirmText || 'Confirm'
            });

            // Add cancel button
            const content = popup.querySelector('.unified-popup-content');
            const okBtn = document.getElementById('popup-ok-btn');
            okBtn.style.marginRight = '8px';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = options.cancelText || 'Cancel';
            cancelBtn.style.cssText = `
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 8px;
            `;

            okBtn.addEventListener('click', () => {
                this.hide();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                this.hide();
                resolve(false);
            });

            content.appendChild(cancelBtn);
        });
    },

    // Prompt dialog
    prompt: function (message, defaultValue = '') {
        return new Promise((resolve) => {
            const popup = this.show(message, 'info', {
                autoClose: false,
                buttonText: 'OK'
            });

            const content = popup.querySelector('.unified-popup-content');
            const okBtn = document.getElementById('popup-ok-btn');

            // Create input field
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.placeholder = 'Enter your response...';
            input.style.cssText = `
                width: 100%;
                padding: 12px;
                border: 2px solid #96392d;
                border-radius: 6px;
                font-size: 16px;
                margin: 16px 0;
                outline: none;
                transition: border-color 0.2s ease;
            `;
            input.addEventListener('focus', () => {
                input.style.borderColor = '#96392d';
            });

            // Insert input before the button
            okBtn.parentNode.insertBefore(input, okBtn);

            const handleSubmit = () => {
                const value = input.value.trim();
                this.hide();
                resolve(value);
            };

            okBtn.addEventListener('click', handleSubmit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });

            // Focus the input
            setTimeout(() => input.focus(), 100);
        });
    }
};

// Replace the native alert function globally
window.alert = function (message) {
    return UnifiedPopup.info(message);
};

// Replace the native confirm function globally
window.confirm = function (message) {
    return UnifiedPopup.confirm(message);
};

// Replace the native prompt function globally
window.prompt = function (message, defaultValue = '') {
    return UnifiedPopup.prompt(message, defaultValue);
};

// Make it available globally
window.showPopup = UnifiedPopup.show;
window.showSuccess = UnifiedPopup.success;
window.showError = UnifiedPopup.error;
window.showWarning = UnifiedPopup.warning;
window.showInfo = UnifiedPopup.info;
