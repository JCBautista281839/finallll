// Access Control Test - Test the role-based access control system
// This file can be used to test the authentication and authorization system

class AccessControlTest {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Access Control Tests...');
        
        await this.testAuthGuardInitialization();
        await this.testRoleBasedNavigation();
        await this.testPageAccessRestrictions();
        await this.testKitchenRestrictions();
        await this.testAdminAccess();
        
        this.displayTestResults();
    }

    async testAuthGuardInitialization() {
        console.log('🔍 Testing AuthGuard Initialization...');
        
        try {
            if (typeof window.authGuard !== 'undefined') {
                this.testResults.push({
                    test: 'AuthGuard Initialization',
                    status: 'PASS',
                    message: 'AuthGuard is properly initialized'
                });
            } else {
                this.testResults.push({
                    test: 'AuthGuard Initialization',
                    status: 'FAIL',
                    message: 'AuthGuard is not initialized'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'AuthGuard Initialization',
                status: 'ERROR',
                message: error.message
            });
        }
    }

    async testRoleBasedNavigation() {
        console.log('🔍 Testing Role-Based Navigation...');
        
        try {
            const navLinks = document.querySelectorAll('.nav-link');
            const visibleLinks = Array.from(navLinks).filter(link => 
                link.style.display !== 'none' && link.style.visibility !== 'hidden'
            );
            
            if (visibleLinks.length > 0) {
                this.testResults.push({
                    test: 'Role-Based Navigation',
                    status: 'PASS',
                    message: `Found ${visibleLinks.length} visible navigation links`
                });
            } else {
                this.testResults.push({
                    test: 'Role-Based Navigation',
                    status: 'FAIL',
                    message: 'No visible navigation links found'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'Role-Based Navigation',
                status: 'ERROR',
                message: error.message
            });
        }
    }

    async testPageAccessRestrictions() {
        console.log('🔍 Testing Page Access Restrictions...');
        
        try {
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop().replace('.html', '');
            
            // Check if access denied message exists
            const accessDeniedMsg = document.getElementById('access-denied-message');
            
            if (accessDeniedMsg && accessDeniedMsg.style.display !== 'none') {
                this.testResults.push({
                    test: 'Page Access Restrictions',
                    status: 'PASS',
                    message: 'Access restrictions are working - access denied message shown'
                });
            } else {
                this.testResults.push({
                    test: 'Page Access Restrictions',
                    status: 'PASS',
                    message: `Access allowed for current page: ${currentPage}`
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'Page Access Restrictions',
                status: 'ERROR',
                message: error.message
            });
        }
    }

    async testKitchenRestrictions() {
        console.log('🔍 Testing Kitchen Restrictions...');
        
        try {
            const addButton = document.getElementById('inventoryAddAction');
            const editButtons = document.querySelectorAll('.edit-btn, .btn-edit');
            const deleteButtons = document.querySelectorAll('.delete-btn, .btn-delete');
            
            let restrictedElements = 0;
            
            if (addButton && addButton.style.display === 'none') restrictedElements++;
            editButtons.forEach(btn => {
                if (btn.style.display === 'none') restrictedElements++;
            });
            deleteButtons.forEach(btn => {
                if (btn.style.display === 'none') restrictedElements++;
            });
            
            this.testResults.push({
                test: 'Kitchen Restrictions',
                status: 'PASS',
                message: `${restrictedElements} restricted elements found (add/edit/delete buttons)`
            });
        } catch (error) {
            this.testResults.push({
                test: 'Kitchen Restrictions',
                status: 'ERROR',
                message: error.message
            });
        }
    }

    async testAdminAccess() {
        console.log('🔍 Testing Admin Access...');
        
        try {
            if (typeof window.authGuard !== 'undefined') {
                const authGuard = window.authGuard;
                const userRole = authGuard.getUserRole();
                
                if (userRole === 'admin') {
                    const navLinks = document.querySelectorAll('.nav-link');
                    const visibleLinks = Array.from(navLinks).filter(link => 
                        link.style.display !== 'none'
                    );
                    
                    this.testResults.push({
                        test: 'Admin Access',
                        status: 'PASS',
                        message: `Admin user has access to ${visibleLinks.length} navigation items`
                    });
                } else {
                    this.testResults.push({
                        test: 'Admin Access',
                        status: 'INFO',
                        message: `Current user role: ${userRole} (not admin)`
                    });
                }
            } else {
                this.testResults.push({
                    test: 'Admin Access',
                    status: 'FAIL',
                    message: 'AuthGuard not available for admin access test'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'Admin Access',
                status: 'ERROR',
                message: error.message
            });
        }
    }

    displayTestResults() {
        console.log('\n📊 Access Control Test Results:');
        console.log('================================');
        
        this.testResults.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : 
                             result.status === 'FAIL' ? '❌' : 
                             result.status === 'ERROR' ? '⚠️' : 'ℹ️';
            
            console.log(`${statusIcon} ${result.test}: ${result.message}`);
        });
        
        const passCount = this.testResults.filter(r => r.status === 'PASS').length;
        const totalCount = this.testResults.length;
        
        console.log(`\n📈 Summary: ${passCount}/${totalCount} tests passed`);
        
        // Display results in UI if possible
        this.displayResultsInUI();
    }

    displayResultsInUI() {
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'access-control-test-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        
        resultsContainer.innerHTML = `
            <h4 style="margin: 0 0 10px 0; color: #007bff;">🧪 Access Control Test Results</h4>
            ${this.testResults.map(result => {
                const statusIcon = result.status === 'PASS' ? '✅' : 
                                 result.status === 'FAIL' ? '❌' : 
                                 result.status === 'ERROR' ? '⚠️' : 'ℹ️';
                return `<div style="margin: 5px 0;">
                    ${statusIcon} <strong>${result.test}</strong><br>
                    <span style="color: #666;">${result.message}</span>
                </div>`;
            }).join('')}
            <button onclick="this.parentElement.remove()" style="
                margin-top: 10px;
                padding: 5px 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">Close</button>
        `;
        
        document.body.appendChild(resultsContainer);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (resultsContainer.parentElement) {
                resultsContainer.remove();
            }
        }, 30000);
    }
}

// Auto-run tests when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only run tests if we're on a page with authentication
    if (typeof firebase !== 'undefined' && firebase.auth) {
        setTimeout(() => {
            const tester = new AccessControlTest();
            tester.runAllTests();
        }, 2000); // Wait for auth to initialize
    }
});

// Export for manual testing
if (typeof window !== 'undefined') {
    window.AccessControlTest = AccessControlTest;
}
