/**
 * Support Ticket Badge Notification
 * Shows badge count for pending support tickets on admin sidebar
 */

(function() {
    'use strict';

    let unsubscribeSupportBadge = null;

    // Wait for Firebase to initialize
    function waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (typeof firebase !== 'undefined' && 
                    firebase.apps && 
                    firebase.apps.length > 0 &&
                    typeof firebase.firestore === 'function') {
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // Update support badge count
    function updateSupportBadge(count) {
        const badges = document.querySelectorAll('.support-badge');
        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    // Listen for pending support tickets
    async function listenForPendingTickets() {
        try {
            await waitForFirebase();
            
            const db = firebase.firestore();
            
            // Listen to pending tickets in real-time
            unsubscribeSupportBadge = db.collection('supportTickets')
                .where('status', '==', 'pending')
                .onSnapshot((snapshot) => {
                    const pendingCount = snapshot.size;
                    console.log('[Support Badge] Pending tickets:', pendingCount);
                    updateSupportBadge(pendingCount);
                }, (error) => {
                    console.error('[Support Badge] Error listening to tickets:', error);
                });
                
        } catch (error) {
            console.error('[Support Badge] Error initializing:', error);
        }
    }

    // Initialize when DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', listenForPendingTickets);
    } else {
        listenForPendingTickets();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (unsubscribeSupportBadge) {
            unsubscribeSupportBadge();
        }
    });

})();
