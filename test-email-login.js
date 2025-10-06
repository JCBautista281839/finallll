/**
 * Test script to verify email-based login functionality
 * This script tests the updated login system that finds users by email
 */

console.log('🧪 Testing Email-Based Login System...\n');

// Test function to simulate the email search logic
async function testEmailSearch() {
    try {
        console.log('🔍 Testing email search functionality...');
        
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined') {
            console.log('⚠️ Firebase not loaded. Please run this test on a page with Firebase initialized.');
            return;
        }
        
        const testEmail = 'test@example.com';
        console.log(`📧 Searching for user with email: ${testEmail}`);
        
        // Test users collection search
        try {
            const usersQuery = await firebase.firestore()
                .collection('users')
                .where('email', '==', testEmail)
                .limit(1)
                .get();
            
            if (!usersQuery.empty) {
                const userDoc = usersQuery.docs[0];
                const userData = userDoc.data();
                console.log('✅ User found in users collection:', {
                    email: userData.email,
                    role: userData.role,
                    name: userData.name || userData.displayName
                });
            } else {
                console.log('ℹ️ No user found in users collection');
            }
        } catch (error) {
            console.log('⚠️ Error searching users collection:', error.message);
        }
        
        // Test customers collection search
        try {
            const customersQuery = await firebase.firestore()
                .collection('customers')
                .where('email', '==', testEmail)
                .limit(1)
                .get();
            
            if (!customersQuery.empty) {
                const customerDoc = customersQuery.docs[0];
                const customerData = customerDoc.data();
                console.log('✅ Customer found in customers collection:', {
                    email: customerData.email,
                    name: customerData.name,
                    role: 'customer'
                });
            } else {
                console.log('ℹ️ No customer found in customers collection');
            }
        } catch (error) {
            console.log('⚠️ Error searching customers collection:', error.message);
        }
        
        console.log('\n✅ Email search test completed');
        
    } catch (error) {
        console.error('❌ Email search test failed:', error.message);
    }
}

// Test function to verify login form changes
function testLoginFormChanges() {
    console.log('\n🔍 Testing login form changes...');
    
    // Check if login form exists
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.log('⚠️ Login form not found on this page');
        return;
    }
    
    // Check email input field
    const emailInput = document.getElementById('username');
    if (emailInput) {
        console.log('✅ Email input field found:', {
            type: emailInput.type,
            placeholder: emailInput.placeholder,
            required: emailInput.required
        });
        
        // Verify it's set to email type
        if (emailInput.type === 'email') {
            console.log('✅ Input type correctly set to "email"');
        } else {
            console.log('⚠️ Input type should be "email" but is:', emailInput.type);
        }
    } else {
        console.log('❌ Email input field not found');
    }
    
    console.log('✅ Login form test completed');
}

// Test function to check if user exists by email
async function checkUserExists(email) {
    try {
        console.log(`\n🔍 Checking if user exists: ${email}`);
        
        // Search in users collection
        const usersQuery = await firebase.firestore()
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (!usersQuery.empty) {
            const userDoc = usersQuery.docs[0];
            const userData = userDoc.data();
            console.log('✅ User found:', {
                email: userData.email,
                role: userData.role,
                isActive: userData.isActive,
                createdAt: userData.createdAt
            });
            return true;
        }
        
        // Search in customers collection
        const customersQuery = await firebase.firestore()
            .collection('customers')
            .where('email', '==', email)
            .limit(1)
            .get();
        
        if (!customersQuery.empty) {
            const customerDoc = customersQuery.docs[0];
            const customerData = customerDoc.data();
            console.log('✅ Customer found:', {
                email: customerData.email,
                name: customerData.name,
                role: 'customer'
            });
            return true;
        }
        
        console.log('❌ User not found in any collection');
        return false;
        
    } catch (error) {
        console.error('❌ Error checking user existence:', error.message);
        return false;
    }
}

// Export functions for use in browser console
window.testEmailSearch = testEmailSearch;
window.testLoginFormChanges = testLoginFormChanges;
window.checkUserExists = checkUserExists;

console.log('\n📋 Available test functions:');
console.log('  - testEmailSearch() - Test email search functionality');
console.log('  - testLoginFormChanges() - Test login form changes');
console.log('  - checkUserExists(email) - Check if a specific user exists');
console.log('\n💡 Example usage:');
console.log('  checkUserExists("gradelljbautista@gmail.com")');
console.log('  testLoginFormChanges()');

// Auto-run tests if on login page
if (window.location.pathname.includes('login.html')) {
    console.log('\n🚀 Auto-running tests on login page...');
    setTimeout(() => {
        testLoginFormChanges();
        testEmailSearch();
    }, 1000);
}
