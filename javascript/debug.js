// This file helps debug Firebase and data loading issues
(function() {
    // Skip if this is an OMR page to avoid conflicts
    if (window.location.pathname.includes('OMR') || window.location.pathname.includes('omr')) {
        return;
    }
    
    console.log('🔍 Dashboard Debug Helper loaded');
    
    // Monitor Firebase initialization
    let firebaseChecks = 0;
    const maxChecks = 20;
    const checkInterval = setInterval(function() {
        firebaseChecks++;
        
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            console.log('✅ Firebase detected as initialized after', firebaseChecks, 'checks');
            clearInterval(checkInterval);
            
            // Check for Firestore
            if (firebase.firestore) {
                console.log('✅ Firestore is available');
                
                // Test connection
                firebase.firestore().collection('inventory').limit(1).get()
                    .then(snapshot => {
                        console.log('✅ Firestore connection test successful');
                        console.log('Documents found:', snapshot.size);
                    })
                    .catch(error => {
                        console.error('❌ Firestore connection test failed:', error);
                    });
            } else {
                console.error('❌ Firestore is not available');
            }
            
            // Check for Auth
            if (firebase.auth) {
                console.log('✅ Firebase Auth is available');
                
                // Check auth state
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        console.log('✅ User is signed in:', user.email);
                    } else {
                        console.log('❌ No user is signed in');
                    }
                });
            } else {
                console.error('❌ Firebase Auth is not available');
            }
            
            return;
        }
        
        console.log('⏳ Check', firebaseChecks, '/', maxChecks, 'for Firebase initialization');
        
        if (firebaseChecks >= maxChecks) {
            console.error('❌ Firebase initialization timeout after', maxChecks, 'checks');
            clearInterval(checkInterval);
            
            // Force refresh the dashboard UI with error messages
            const topProductsBody = document.getElementById('topProductsBody');
            if (topProductsBody) {
                topProductsBody.innerHTML = `
                    <tr>
                        <td colspan="2" class="text-center text-danger py-3">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Firebase connection failed. Please refresh the page.
                        </td>
                    </tr>
                `;
            }
            
            const inventoryStatusBody = document.getElementById('inventoryStatusBody');
            if (inventoryStatusBody) {
                inventoryStatusBody.innerHTML = `
                    <tr>
                        <td colspan="2" class="text-center text-danger py-3">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Firebase connection failed. Please refresh the page.
                        </td>
                    </tr>
                `;
            }
            
            // Tell user to refresh page
            alert('Unable to connect to the database. Please refresh the page and try again.');
        }
    }, 500);
    
    // Add reset button to corner of screen for testing
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 Reset';
    resetBtn.style.cssText = 'position: fixed; bottom: 10px; left: 10px; z-index: 9999; padding: 5px 10px; font-size: 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px;';
    resetBtn.addEventListener('click', function() {
        console.log('🔄 Manual refresh triggered');
        location.reload();
    });
    document.body.appendChild(resetBtn);
})();
