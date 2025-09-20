// kitchen-access.js
// Restrict access to kitchen.html based on user role
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = '/html/login.html';
            return;
        }
        // Get user role from Firestore
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (!userData || (userData.role !== 'kitchen' && userData.role !== 'admin')) {
            alert('Access denied. You do not have permission to view the kitchen page.');
            window.location.href = '/html/Dashboard.html';
        }
    });
});