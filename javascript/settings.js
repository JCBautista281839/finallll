// Settings Page Management

let currentAdminUser = null;
let otpService = null;
let pendingEmailUpdate = null;
let pendingPasswordUpdate = null;

// Wait for Firebase to be ready before checking authentication
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && 
                firebase.auth && 
                firebase.firestore && 
                firebase.apps && 
                firebase.apps.length > 0) {
                console.log('Firebase is ready');
                resolve();
            } else if (typeof firebase !== 'undefined' && 
                       firebase.auth && 
                       firebase.firestore && 
                       window.firebaseConfig) {
                // Firebase SDK is loaded but not initialized, initialize it
                console.log('Firebase SDK loaded but not initialized, initializing...');
                try {
                    firebase.initializeApp(window.firebaseConfig);
                    console.log('Firebase initialized successfully');
                    resolve();
                } catch (error) {
                    console.error('Error initializing Firebase:', error);
                    setTimeout(checkFirebase, 100);
                }
            } else {
                console.log('Waiting for Firebase initialization...');
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Check authentication - SIMPLIFIED
async function initializeAuthListener() {
    await waitForFirebase();
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("User is signed in:", user.uid);
            currentAdminUser = user;
            // Fetch user role from Firestore
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                // Role-based page access
                if (userData.role && userData.role.toLowerCase() === 'kitchen') {
                    if (!window.location.pathname.endsWith('/html/kitchen.html')) {
                        window.location.href = '/html/kitchen.html';
                        return;
                    }
                }
                // Add more role-based redirects here if needed
            }
            initializeSettings();
            loadTeamMembers();
        } else {
            console.log("No user signed in");
            window.location.href = '/index.html';
        }
    });
}

// Initialize auth listener
initializeAuthListener();

// Initialize settings functionality
function initializeSettings() {
    // Initialize OTP service
    if (typeof SendGridOTPService !== 'undefined') {
        otpService = new SendGridOTPService();
        console.log('✅ OTP Service initialized');
    } else {
        console.error('❌ SendGridOTPService not available');
    }

    // Settings menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function () {
            const section = this.dataset.section;
            switchSection(section);

            // Update active menu item
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // Load current user data when security section is opened
            if (section === 'security') {
                loadCurrentUserData();
            }
        });
    });

    // Add team member form - USE THE SIMPLE VERSION
    const addTeamForm = document.getElementById('addTeamForm');
    if (addTeamForm) {
        addTeamForm.addEventListener('submit', addTeamMemberSimple); // Changed this line
    }

    // Clear form button
    const clearFormBtn = document.getElementById('clearForm');
    if (clearFormBtn) {
        clearFormBtn.addEventListener('click', clearAddTeamForm);
    }

    // Security form handlers
    initializeSecurityForms();

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Switch between settings sections
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// SIMPLIFIED - Add team member without auto logout
async function addTeamMemberSimple(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('phone').value.trim();
    const startDate = document.getElementById('startDate').value;

    // Validation
    if (!firstName || !lastName || !email || !role || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Password validation
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const addButton = document.getElementById('addTeamMember');
    const originalText = addButton.innerHTML;
    addButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Creating Account...';
    addButton.disabled = true;

    try {
        // Wait for Firebase to be ready
        await waitForFirebase();
        
        // Get current user's auth before creating new user
        const currentUser = firebase.auth().currentUser;

        // Create Firebase Auth account
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const newUser = userCredential.user;

        // Update user profile
        await newUser.updateProfile({
            displayName: `${firstName} ${lastName}`
        });

        // Save user data and kitchen access flag
        const userData = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            role: role.toLowerCase(),
            phone: phone || '',
            startDate: startDate || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
            active: true,
            uid: newUser.uid,
            canAccessKitchen: role.toLowerCase() === 'kitchen'
        };

        // Save to both collections and log errors if any
        try {
            await firebase.firestore().collection('users').doc(newUser.uid).set(userData);
        } catch (firestoreError) {
            console.error('❌ Error writing to users collection:', firestoreError);
            showToast('Error saving user to Firestore: ' + firestoreError.message, 'error');
            addButton.innerHTML = originalText;
            addButton.disabled = false;
            return;
        }
        try {
            await firebase.firestore().collection('team_members').doc(newUser.uid).set(userData);
        } catch (firestoreError) {
            console.error('❌ Error writing to team_members collection:', firestoreError);
            showToast('Error saving team member to Firestore: ' + firestoreError.message, 'error');
            addButton.innerHTML = originalText;
            addButton.disabled = false;
            return;
        }

        showToast(`Team member ${firstName} ${lastName} created successfully!`, 'success');

        // Clear form and reload team list
        clearAddTeamForm();
        loadTeamMembers();

    } catch (error) {
        console.error('❌ Error creating team member:', error);
        let errorMessage = 'Error creating team member account';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email address is already in use';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        }

        showToast(errorMessage, 'error');
    }

    addButton.innerHTML = originalText;
    addButton.disabled = false;
}

// Clear add team form
function clearAddTeamForm() {
    document.getElementById('addTeamForm').reset();
}

// Load team members - SIMPLIFIED VERSION
async function loadTeamMembers() {
    try {
        console.log('🔄 Loading team members...');

        const teamList = document.getElementById('teamList');
        if (!teamList) {
            console.error('❌ Team list element not found');
            return;
        }

        teamList.innerHTML = '<div class="loading"><i class="bi bi-hourglass-split"></i><br>Loading team members...</div>';

        // Wait for Firebase to be ready
        await waitForFirebase();

        // Get team members from team_members collection
        const teamSnapshot = await firebase.firestore().collection('team_members')
            .orderBy('createdAt', 'desc')
            .get();

        console.log('📊 Found team members:', teamSnapshot.size);

        if (teamSnapshot.empty) {
            teamList.innerHTML = `
                <div class="team-member">
                    <div class="member-cell name-col">
                        <span class="text-muted">No team members found</span>
                    </div>
                    <div class="member-cell email-col">Add your first team member above</div>
                    <div class="member-cell role-col">-</div>
                    <div class="member-cell actions-col">-</div>
                </div>
            `;
            return;
        }

        // Clear and add header
        teamList.innerHTML = `
            <div class="team-header">
                <div class="header-cell name-col">NAME</div>
                <div class="header-cell email-col">EMAIL</div>
                <div class="header-cell role-col">ROLE</div>
                <div class="header-cell actions-col">ACTIONS</div>
            </div>
        `;

        // Create and append team member elements
        teamSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.firstName && userData.lastName) {
                const memberElement = createTeamMemberElement(doc.id, userData);
                teamList.appendChild(memberElement);
            }
        });

        console.log('✅ Team members loaded successfully');

    } catch (error) {
        console.error('❌ Error loading team members:', error);
        
        const teamList = document.getElementById('teamList');
        if (teamList) {
            teamList.innerHTML = `
                <div class="team-member">
                    <div class="member-cell name-col">
                        <span class="text-danger">Error loading team members</span>
                    </div>
                    <div class="member-cell email-col">Please refresh the page</div>
                    <div class="member-cell role-col">-</div>
                    <div class="member-cell actions-col">-</div>
                </div>
            `;
        }
        
        showToast('Error loading team members: ' + error.message, 'error');
    }
}

// Create team member element - IMPROVED VERSION
function createTeamMemberElement(userId, userData) {
    const memberDiv = document.createElement('div');
    memberDiv.className = 'team-member';

    const displayName = userData.firstName && userData.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData.firstName || userData.email?.split('@')[0] || 'Unknown User';

    const role = userData.role || 'user';
    const email = userData.email || 'No email';

    const initials = displayName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();

    memberDiv.innerHTML = `
        <div class="member-cell name-col">
            <div class="member-avatar purple">
                ${initials}
            </div>
            <span class="member-name">${displayName}</span>
        </div>
        <div class="member-cell email-col">${email}</div>
        <div class="member-cell role-col">
            <span class="role-badge ${role.toLowerCase()}">${role}</span>
        </div>
        <div class="member-cell actions-col">
            <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-three-dots"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#" onclick="editUserRole('${userId}', '${role}')">
                        <i class="bi bi-pencil me-2"></i>Edit Role
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="removeUser('${userId}')">
                        <i class="bi bi-trash me-2"></i>Remove
                    </a></li>
                </ul>
            </div>
        </div>
    `;

    return memberDiv;
}

// Edit user role - SIMPLIFIED
async function editUserRole(userId, currentRole) {
    const newRole = prompt(`Enter new role for user (current: ${currentRole}):\n- admin\n- manager\n- kitchen\n- user`);

    if (newRole && newRole !== currentRole) {
        const validRoles = ['admin', 'manager', 'kitchen', 'user'];
        if (!validRoles.includes(newRole.toLowerCase())) {
            showToast('Invalid role. Please choose: admin, manager, kitchen, or user', 'error');
            return;
        }

        // Wait for Firebase to be ready
        await waitForFirebase();
        
        firebase.firestore().collection('users').doc(userId).update({
            role: newRole.toLowerCase(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            showToast('User role updated successfully', 'success');
            loadTeamMembers();
        }).catch(error => {
            console.error('Error updating user role:', error);
            showToast('Error updating user role', 'error');
        });
    }
}

// Remove user - SIMPLIFIED
async function removeUser(userId) {
    if (confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
        try {
            // Wait for Firebase to be ready
            await waitForFirebase();
            
            await firebase.firestore().collection('users').doc(userId).delete();
            showToast('User removed successfully', 'success');
            loadTeamMembers();
        } catch (error) {
            console.error('Error removing user:', error);
            showToast('Error removing user', 'error');
        }
    }
}

// Logout functionality
function handleLogout() {
    firebase.auth().signOut().then(() => {
        console.log('User signed out successfully');
        window.location.href = '../index.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        window.location.href = '../index.html';
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close ms-auto" onclick="this.parentElement.remove()"></button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Debug function to test manually
function testAddTeamMember() {
    const testData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'kitchen'
    };

    firebase.firestore().collection('team_members').add({
        ...testData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: firebase.auth().currentUser.uid,
        active: true
    }).then(() => {
        console.log('✅ Test team member added');
        loadTeamMembers();
    }).catch(error => {
        console.error('❌ Error adding test member:', error);
    });
}

// Load current user data for security section
function loadCurrentUserData() {
    if (currentAdminUser) {
        const currentEmailInput = document.getElementById('currentEmail');
        if (currentEmailInput) {
            currentEmailInput.value = currentAdminUser.email;
        }
    }
}

// Initialize security forms
function initializeSecurityForms() {
    // Email update form
    const updateEmailForm = document.getElementById('updateEmailForm');
    if (updateEmailForm) {
        updateEmailForm.addEventListener('submit', handleEmailUpdate);
    }

    // Email OTP form
    const emailOTPForm = document.getElementById('emailOTPForm');
    if (emailOTPForm) {
        emailOTPForm.addEventListener('submit', handleEmailOTPVerification);
    }

    // Password update form
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', handlePasswordUpdate);
    }

    // Password OTP form
    const passwordOTPForm = document.getElementById('passwordOTPForm');
    if (passwordOTPForm) {
        passwordOTPForm.addEventListener('submit', handlePasswordOTPVerification);
    }

    // Cancel buttons
    const cancelEmailBtn = document.getElementById('cancelEmailUpdate');
    if (cancelEmailBtn) {
        cancelEmailBtn.addEventListener('click', cancelEmailUpdate);
    }

    const cancelPasswordBtn = document.getElementById('cancelPasswordUpdate');
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', cancelPasswordUpdate);
    }

    // Resend OTP buttons
    const resendEmailOTPBtn = document.getElementById('resendEmailOTP');
    if (resendEmailOTPBtn) {
        resendEmailOTPBtn.addEventListener('click', resendEmailOTP);
    }

    const resendPasswordOTPBtn = document.getElementById('resendPasswordOTP');
    if (resendPasswordOTPBtn) {
        resendPasswordOTPBtn.addEventListener('click', resendPasswordOTP);
    }

    // Password visibility toggles
    initializePasswordToggles();
}

// Initialize password visibility toggles
function initializePasswordToggles() {
    const toggles = [
        { button: 'toggleCurrentPassword', input: 'currentPassword' },
        { button: 'toggleNewPassword', input: 'newPassword' },
        { button: 'toggleConfirmNewPassword', input: 'confirmNewPassword' }
    ];

    toggles.forEach(toggle => {
        const button = document.getElementById(toggle.button);
        const input = document.getElementById(toggle.input);
        
        if (button && input) {
            button.addEventListener('click', function() {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                const icon = button.querySelector('i');
                icon.classList.toggle('bi-eye');
                icon.classList.toggle('bi-eye-slash');
            });
        }
    });
}

// Handle email update
async function handleEmailUpdate(e) {
    e.preventDefault();
    
    const newEmail = document.getElementById('newEmail').value.trim();
    const currentEmail = currentAdminUser.email;

    if (!newEmail) {
        showToast('Please enter a new email address', 'error');
        return;
    }

    if (newEmail === currentEmail) {
        showToast('New email must be different from current email', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const updateBtn = document.getElementById('updateEmailBtn');
    const originalText = updateBtn.innerHTML;
    updateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending OTP...';
    updateBtn.disabled = true;

    try {
        if (!otpService) {
            throw new Error('OTP service not available');
        }

        // Send OTP to new email
        const result = await otpService.sendEmailOTP(newEmail, newEmail.split('@')[0]);
        
        if (result.success) {
            // Store pending update
            pendingEmailUpdate = {
                newEmail: newEmail,
                otp: result.otp
            };

            // Show OTP section
            document.getElementById('emailOTPSection').style.display = 'block';
            document.getElementById('updateEmailForm').style.display = 'none';

            showToast('OTP sent to your new email address', 'success');
        } else {
            throw new Error(result.message || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Error sending email OTP:', error);
        showToast('Error sending OTP: ' + error.message, 'error');
    }

    updateBtn.innerHTML = originalText;
    updateBtn.disabled = false;
}

// Handle email OTP verification
async function handleEmailOTPVerification(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('emailOTP').value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
        showToast('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    if (!pendingEmailUpdate) {
        showToast('No pending email update found', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyEmailOTP');
    const originalText = verifyBtn.innerHTML;
    verifyBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Verifying...';
    verifyBtn.disabled = true;

    try {
        if (!otpService) {
            throw new Error('OTP service not available');
        }

        // Verify OTP
        const result = await otpService.verifyEmailOTP(pendingEmailUpdate.newEmail, otpCode);
        
        if (result.success) {
            // Update Firebase Auth email
            await currentAdminUser.updateEmail(pendingEmailUpdate.newEmail);
            
            // Update Firestore user document
            await firebase.firestore().collection('users').doc(currentAdminUser.uid).update({
                email: pendingEmailUpdate.newEmail,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Email updated successfully!', 'success');
            
            // Reset forms
            resetEmailUpdateForm();
            
            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            throw new Error(result.message || 'Invalid OTP');
        }
    } catch (error) {
        console.error('Error verifying email OTP:', error);
        
        if (error.code === 'auth/requires-recent-login') {
            showToast('Please log in again to update your email', 'error');
        } else {
            showToast('Error verifying OTP: ' + error.message, 'error');
        }
    }

    verifyBtn.innerHTML = originalText;
    verifyBtn.disabled = false;
}

// Handle password update
async function handlePasswordUpdate(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }

    const updateBtn = document.getElementById('updatePasswordBtn');
    const originalText = updateBtn.innerHTML;
    updateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending OTP...';
    updateBtn.disabled = true;

    try {
        // First verify current password by re-authenticating
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentAdminUser.email, 
            currentPassword
        );
        
        await currentAdminUser.reauthenticateWithCredential(credential);

        if (!otpService) {
            throw new Error('OTP service not available');
        }

        // Send OTP to current email
        const result = await otpService.sendEmailOTP(currentAdminUser.email, currentAdminUser.displayName || currentAdminUser.email.split('@')[0]);
        
        if (result.success) {
            // Store pending update
            pendingPasswordUpdate = {
                newPassword: newPassword,
                otp: result.otp
            };

            // Show OTP section
            document.getElementById('passwordOTPSection').style.display = 'block';
            document.getElementById('updatePasswordForm').style.display = 'none';

            showToast('OTP sent to your email address', 'success');
        } else {
            throw new Error(result.message || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Error sending password OTP:', error);
        
        if (error.code === 'auth/wrong-password') {
            showToast('Current password is incorrect', 'error');
        } else {
            showToast('Error sending OTP: ' + error.message, 'error');
        }
    }

    updateBtn.innerHTML = originalText;
    updateBtn.disabled = false;
}

// Handle password OTP verification
async function handlePasswordOTPVerification(e) {
    e.preventDefault();
    
    const otpCode = document.getElementById('passwordOTP').value.trim();
    
    if (!otpCode || otpCode.length !== 6) {
        showToast('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    if (!pendingPasswordUpdate) {
        showToast('No pending password update found', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyPasswordOTP');
    const originalText = verifyBtn.innerHTML;
    verifyBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Updating...';
    verifyBtn.disabled = true;

    try {
        if (!otpService) {
            throw new Error('OTP service not available');
        }

        // Verify OTP
        const result = await otpService.verifyEmailOTP(currentAdminUser.email, otpCode);
        
        if (result.success) {
            // Update Firebase Auth password
            await currentAdminUser.updatePassword(pendingPasswordUpdate.newPassword);
            
            showToast('Password updated successfully!', 'success');
            
            // Reset forms
            resetPasswordUpdateForm();
        } else {
            throw new Error(result.message || 'Invalid OTP');
        }
    } catch (error) {
        console.error('Error verifying password OTP:', error);
        showToast('Error verifying OTP: ' + error.message, 'error');
    }

    verifyBtn.innerHTML = originalText;
    verifyBtn.disabled = false;
}

// Cancel email update
function cancelEmailUpdate() {
    resetEmailUpdateForm();
    showToast('Email update cancelled', 'info');
}

// Cancel password update
function cancelPasswordUpdate() {
    resetPasswordUpdateForm();
    showToast('Password update cancelled', 'info');
}

// Reset email update form
function resetEmailUpdateForm() {
    document.getElementById('emailOTPSection').style.display = 'none';
    document.getElementById('updateEmailForm').style.display = 'block';
    document.getElementById('newEmail').value = '';
    document.getElementById('emailOTP').value = '';
    pendingEmailUpdate = null;
}

// Reset password update form
function resetPasswordUpdateForm() {
    document.getElementById('passwordOTPSection').style.display = 'none';
    document.getElementById('updatePasswordForm').style.display = 'block';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
    document.getElementById('passwordOTP').value = '';
    pendingPasswordUpdate = null;
}

// Resend email OTP
async function resendEmailOTP() {
    if (!pendingEmailUpdate) {
        showToast('No pending email update found', 'error');
        return;
    }

    const resendBtn = document.getElementById('resendEmailOTP');
    const originalText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending...';
    resendBtn.disabled = true;

    try {
        if (!otpService) {
            throw new Error('OTP service not available');
        }

        const result = await otpService.sendEmailOTP(pendingEmailUpdate.newEmail, pendingEmailUpdate.newEmail.split('@')[0]);
        
        if (result.success) {
            pendingEmailUpdate.otp = result.otp;
            showToast('OTP resent successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to resend OTP');
        }
    } catch (error) {
        console.error('Error resending email OTP:', error);
        showToast('Error resending OTP: ' + error.message, 'error');
    }

    resendBtn.innerHTML = originalText;
    resendBtn.disabled = false;
}

// Resend password OTP
async function resendPasswordOTP() {
    if (!pendingPasswordUpdate) {
        showToast('No pending password update found', 'error');
        return;
    }

    const resendBtn = document.getElementById('resendPasswordOTP');
    const originalText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending...';
    resendBtn.disabled = true;

    try {
        if (!otpService) {
            throw new Error('OTP service not available');
        }

        const result = await otpService.sendEmailOTP(currentAdminUser.email, currentAdminUser.displayName || currentAdminUser.email.split('@')[0]);
        
        if (result.success) {
            pendingPasswordUpdate.otp = result.otp;
            showToast('OTP resent successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to resend OTP');
        }
    } catch (error) {
        console.error('Error resending password OTP:', error);
        showToast('Error resending OTP: ' + error.message, 'error');
    }

    resendBtn.innerHTML = originalText;
    resendBtn.disabled = false;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Settings page loaded');

    // Small delay to ensure Firebase is ready
    setTimeout(() => {
        if (firebase.auth().currentUser) {
            loadTeamMembers();
        }
    }, 1000);
});