(function () {
    function initLogoutButton() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.firebase && firebase.auth) {
                    firebase.auth().signOut().then(function () {
                        window.location.href = '/index.html';
                    }).catch(function (error) {
                        alert('Logout failed: ' + error.message);
                    });
                } else {
                    window.location.href = '/index.html';
                }
            });
        }
    }

    function initNotificationBadge() {
        if (typeof refreshUnseenNotificationBadge === 'function') {
            try {
                refreshUnseenNotificationBadge();
                // Refresh badge every 30 seconds. Guard to avoid duplicate intervals.
                if (!window.__kitchenNotificationInterval) {
                    window.__kitchenNotificationInterval = setInterval(refreshUnseenNotificationBadge, 30000);
                }
            } catch (e) {
                console.error('[Kitchen.js] refreshUnseenNotificationBadge error', e);
            }
        }
    }

    function initKitchenAccess() {
        if (typeof setupKitchenPageAccess === 'function') {
            try {
                setupKitchenPageAccess();
            } catch (e) {
                console.error('[Kitchen.js] setupKitchenPageAccess error', e);
            }
        }
    }

    function hideSeeAllLink() {
        if (typeof hideSeeAllLinkForKitchen === 'function') {
            try {
                hideSeeAllLinkForKitchen('kitchen');
            } catch (e) {
                console.error('[Kitchen.js] hideSeeAllLinkForKitchen error', e);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initLogoutButton();
        initNotificationBadge();
        initKitchenAccess();
        hideSeeAllLink();
    });
})();
