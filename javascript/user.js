// User Account Management JavaScript

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

// Menu toggle functionality
function toggleMenu(menuId) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Add active class to clicked menu item
    document.getElementById(menuId).classList.add('active');

    // Hide all panels
    document.getElementById('personalInfoPanel').style.display = 'none';
    document.getElementById('loginPasswordPanel').style.display = 'none';

    // Show selected panel
    if (menuId === 'personalInfoMenu') {
        document.getElementById('personalInfoPanel').style.display = 'block';
    } else if (menuId === 'loginPasswordMenu') {
        document.getElementById('loginPasswordPanel').style.display = 'block';
    }
}

// Password visibility toggle functions
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];
    
    if (password.length >= 8) {
        strength += 25;
    } else {
        feedback.push('At least 8 characters');
    }
    
    if (/[a-z]/.test(password)) {
        strength += 25;
    } else {
        feedback.push('Lowercase letter');
    }
    
    if (/[A-Z]/.test(password)) {
        strength += 25;
    } else {
        feedback.push('Uppercase letter');
    }
    
    if (/[0-9]/.test(password)) {
        strength += 25;
    } else {
        feedback.push('Number');
    }
    
    return { strength, feedback };
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (password.length > 0) {
        const result = checkPasswordStrength(password);
        strengthDiv.style.display = 'block';
        
        strengthFill.style.width = result.strength + '%';
        
        if (result.strength < 50) {
            strengthFill.style.backgroundColor = '#dc3545';
            strengthText.textContent = 'Weak password';
            strengthText.style.color = '#dc3545';
        } else if (result.strength < 75) {
            strengthFill.style.backgroundColor = '#ffc107';
            strengthText.textContent = 'Medium password';
            strengthText.style.color = '#ffc107';
        } else {
            strengthFill.style.backgroundColor = '#28a745';
            strengthText.textContent = 'Strong password';
            strengthText.style.color = '#28a745';
        }
    } else {
        strengthDiv.style.display = 'none';
    }
}

// Password change functionality
function handlePasswordSaveClick() {
    console.log('Password save button clicked');

    // Get form data
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
        if (window.showMessage) {
            window.showMessage('Please fill in all password fields.', 'error');
        }
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        if (window.showMessage) {
            window.showMessage('New password must be at least 6 characters long.', 'error');
        }
        return;
    }

    // Validate password confirmation
    if (newPassword !== confirmPassword) {
        if (window.showMessage) {
            window.showMessage('New passwords do not match.', 'error');
        }
        return;
    }

    // Check password strength
    const strengthResult = checkPasswordStrength(newPassword);
    if (strengthResult.strength < 50) {
        if (window.showMessage) {
            window.showMessage('Password is too weak. Please choose a stronger password.', 'error');
        }
        return;
    }

    // Show loading state
    const saveButton = document.getElementById('savePasswordData');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Verifying...';
    saveButton.disabled = true;

    // Update password in Firebase (current password already verified)
    saveButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Updating...';
    
    updateUserPassword(currentPassword, newPassword)
        .then(() => {
            console.log('✅ Password updated successfully');
            if (window.showMessage) {
                window.showMessage('✅ Password updated successfully!', 'success');
            }

            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('passwordStrength').style.display = 'none';

            // Add visual feedback
            document.querySelectorAll('#loginPasswordForm .form-control').forEach(field => {
                field.classList.add('is-valid');
                field.classList.remove('is-invalid');
            });

        })
        .catch((error) => {
            console.error('❌ Error updating password:', error);
            
            let errorMessage = 'Failed to update password.';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect. Please try again.';
                // Highlight current password field as invalid
                document.getElementById('currentPassword').classList.add('is-invalid');
                document.getElementById('currentPassword').classList.remove('is-valid');
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'New password is too weak. Please choose a stronger password.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log back in, then try again.';
            } else {
                errorMessage = `Failed to update password: ${error.message}`;
            }
            
            if (window.showMessage) {
                window.showMessage(`❌ ${errorMessage}`, 'error');
            }

            // Add visual feedback for errors
            document.querySelectorAll('#loginPasswordForm .form-control').forEach(field => {
                field.classList.add('is-invalid');
                field.classList.remove('is-valid');
            });
        })
        .finally(() => {
            // Reset button state
            saveButton.disabled = false;
            saveButton.innerHTML = originalText;
        });
}

// Verify current password function
async function verifyCurrentPassword(currentPassword) {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('No user is currently signed in');
    }

    // Create credential with current password
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    
    // Re-authenticate to verify current password
    await user.reauthenticateWithCredential(credential);
    
    return true; // If no error thrown, password is correct
}

// Automatic current password verification
async function verifyCurrentPasswordAutomatically(currentPassword) {
    const currentPasswordInput = document.getElementById('currentPassword');
    const statusDiv = document.getElementById('currentPasswordStatus');
    
    try {
        await verifyCurrentPassword(currentPassword);
        
        console.log('✅ Current password verified automatically');
        
        // Enable new password fields
        document.getElementById('newPassword').disabled = false;
        document.getElementById('confirmPassword').disabled = false;
        document.getElementById('toggleNewPassword').disabled = false;
        document.getElementById('toggleConfirmPassword').disabled = false;
        document.getElementById('savePasswordData').disabled = false;

        // Add visual feedback to current password field
        currentPasswordInput.classList.add('is-valid');
        currentPasswordInput.classList.remove('is-invalid');
        
        // Show success status
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<i class="bi bi-check-circle text-success me-1"></i><span class="text-success">Current password verified</span>';

    } catch (error) {
        console.error('❌ Error verifying current password automatically:', error);
        
        // Add visual feedback for errors
        currentPasswordInput.classList.add('is-invalid');
        currentPasswordInput.classList.remove('is-valid');
        
        // Show error status
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<i class="bi bi-x-circle text-danger me-1"></i><span class="text-danger">Current password is incorrect</span>';
    }
}

// Firebase password update function
async function updateUserPassword(currentPassword, newPassword) {
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('No user is currently signed in');
    }

    // Re-authenticate user with current password
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);

    // Update password
    await user.updatePassword(newPassword);
}

// Edit Mode Management
let isEditMode = false;
let originalData = {};

function toggleEditMode() {
    const formFields = ['firstName', 'lastName', 'address', 'phone', 'dob'];
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const saveButton = document.getElementById('saveUserData');
    const cancelButton = document.getElementById('cancelEditBtn');

    if (!isEditMode) {
        // Enter edit mode
        isEditMode = true;
        
        // Store original data
        originalData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            dob: document.getElementById('dob').value,
            gender: document.querySelector('input[name="gender"]:checked').value
        };

        // Enable form fields
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
                field.style.backgroundColor = '#fff';
            }
        });

        // Enable gender radio buttons
        genderRadios.forEach(radio => {
            radio.disabled = false;
        });

        // Update button text and show cancel button
        saveButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Changes';
        cancelButton.style.display = 'inline-block';

    } else {
        // Save mode - handle save
        handleSaveClick();
    }
}

function cancelEdit() {
    const formFields = ['firstName', 'lastName', 'address', 'phone', 'dob'];
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const saveButton = document.getElementById('saveUserData');
    const cancelButton = document.getElementById('cancelEditBtn');

    // Restore original data
    if (originalData.firstName) document.getElementById('firstName').value = originalData.firstName;
    if (originalData.lastName) document.getElementById('lastName').value = originalData.lastName;
    if (originalData.address) document.getElementById('address').value = originalData.address;
    if (originalData.phone) document.getElementById('phone').value = originalData.phone;
    if (originalData.dob) document.getElementById('dob').value = originalData.dob;
    
    // Restore gender selection
    if (originalData.gender) {
        const genderRadio = document.querySelector(`input[name="gender"][value="${originalData.gender}"]`);
        if (genderRadio) genderRadio.checked = true;
    }

    // Disable form fields
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = true;
            field.style.backgroundColor = '#f8f9fa';
        }
    });

    // Disable gender radio buttons
    genderRadios.forEach(radio => {
        radio.disabled = true;
    });

    // Update button text and hide cancel button
    saveButton.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit';
    cancelButton.style.display = 'none';
    isEditMode = false;
}

function initializeViewMode() {
    const formFields = ['firstName', 'lastName', 'address', 'phone', 'dob'];
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const saveButton = document.getElementById('saveUserData');
    const cancelButton = document.getElementById('cancelEditBtn');

    // Disable form fields initially
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.disabled = true;
            field.style.backgroundColor = '#f8f9fa';
        }
    });

    // Disable gender radio buttons initially
    genderRadios.forEach(radio => {
        radio.disabled = true;
    });

    // Set initial button text
    saveButton.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit';
    cancelButton.style.display = 'none';
    isEditMode = false;
}

// User Management Functions
function handleSaveClick() {
    console.log('Save button clicked');

    // Check if Firebase is ready
    if (!window.isFirebaseReady || !window.isFirebaseReady()) {
        console.error('Firebase not ready');
        if (window.showMessage) {
            window.showMessage('Firebase is not ready. Please wait and try again.', 'error');
        }
        return;
    }

    // Get form data
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        dob: document.getElementById('dob').value,
        gender: document.querySelector('input[name="gender"]:checked').value
    };

    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
        if (window.showMessage) {
            window.showMessage('Please fill in all required fields.', 'error');
        }
        return;
    }

    // Validate phone number if provided
    if (formData.phone && !validatePhone(formData.phone)) {
        if (window.showMessage) {
            window.showMessage('Please enter a valid phone number.', 'error');
        }
        return;
    }

    // Show loading state
    const saveButton = document.getElementById('saveUserData');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Saving...';
    saveButton.disabled = true;

    // Save to Firebase
    saveUserData(formData)
        .then(() => {
            console.log('✅ Save operation completed successfully');
            if (window.showMessage) {
                window.showMessage('✅ User data saved successfully!', 'success');
            }

            // Add visual feedback to form fields
            document.querySelectorAll('.form-control').forEach(field => {
                field.classList.add('is-valid');
                field.classList.remove('is-invalid');
            });

        })
        .catch((error) => {
            console.error('❌ Error saving user data:', error);
            if (window.showMessage) {
                window.showMessage(`❌ Failed to save user data: ${error.message}`, 'error');
            }

            // Add visual feedback for errors
            document.querySelectorAll('.form-control').forEach(field => {
                field.classList.add('is-invalid');
                field.classList.remove('is-valid');
            });
        })
        .finally(() => {
            // Restore button state and exit edit mode
            saveButton.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit';
            saveButton.disabled = false;
            
            // Exit edit mode after successful save
            if (isEditMode) {
                cancelEdit();
            }
        });
}

// Save user data to Firebase
async function saveUserData(userData) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            throw new Error('No authenticated user');
        }

        // Check if user document exists to preserve createdAt
        const userDoc = await db.collection('users').doc(user.uid).get();
        const isNewUser = !userDoc.exists;

        // Prepare data to save
        const dataToSave = {
            ...userData,
            userId: user.uid,
            email: user.email,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Only add createdAt for new users
        if (isNewUser) {
            dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        // Save to Firestore
        await db.collection('users').doc(user.uid).set(dataToSave, { merge: true });

        console.log('✅ User data saved successfully:', dataToSave);

        // Verify the save by reading back the data
        const savedDoc = await db.collection('users').doc(user.uid).get();
        if (savedDoc.exists) {
            const savedData = savedDoc.data();
            console.log('✅ Data verification successful:', savedData);

            // Update the profile name display
            updateProfileDisplay(userData.firstName, userData.lastName);

            return savedData;
        } else {
            throw new Error('Data was not saved properly');
        }

    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        throw error;
    }
}

// Update profile display with new name
function updateProfileDisplay(firstName, lastName) {
    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement && firstName && lastName) {
        profileNameElement.textContent = `${firstName} ${lastName}`;
        console.log('✅ Profile name updated:', `${firstName} ${lastName}`);
    }
}

// Update profile picture display
function updateProfilePicture(imageUrl, publicId = null) {
    const profileImg = document.getElementById('profileImg');
    const placeholderIcon = document.getElementById('placeholderIcon');

    console.log('🖼️ Attempting to update profile picture:', imageUrl);

    if (profileImg && placeholderIcon) {
        // Create a new image to test if the URL is valid
        const testImg = new Image();

        testImg.onload = function () {
            console.log('✅ Profile picture image loaded successfully');

            // Update the actual profile image
            profileImg.src = imageUrl;
            profileImg.alt = 'Profile Picture';

            // Force display and add loaded class
            profileImg.style.display = 'block';
            profileImg.classList.add('loaded');

            // Hide the placeholder icon
            placeholderIcon.style.display = 'none';

            // Store the Cloudinary data
            if (publicId) {
                profileImg.setAttribute('data-cloudinary-url', imageUrl);
                profileImg.setAttribute('data-public-id', publicId);
            }

            console.log('✅ Profile picture updated successfully:', imageUrl);
            console.log('🖼️ Profile image element:', profileImg);
            console.log('🖼️ Profile image src:', profileImg.src);
            console.log('🖼️ Profile image display:', profileImg.style.display);
            console.log('🖼️ Profile image classes:', profileImg.className);

            // Show success message only if this is a new upload (not initial load)
            if (window.showMessage && publicId) {
                window.showMessage('✅ Profile picture updated successfully!', 'success');
            }
        };

        testImg.onerror = function () {
            console.error('❌ Failed to load profile picture:', imageUrl);

            // Show placeholder if image fails to load
            profileImg.style.display = 'none';
            placeholderIcon.style.display = 'block';

            if (window.showMessage) {
                window.showMessage('❌ Failed to load profile picture', 'error');
            }
        };

        // Start loading the image
        testImg.src = imageUrl;

    } else {
        console.error('❌ Profile image elements not found');
    }
}

// Save profile picture to Firebase
async function saveProfilePictureToFirebase(imageUrl, publicId) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            throw new Error('No authenticated user');
        }

        const profileData = {
            profilePicture: imageUrl,
            profilePicturePublicId: publicId,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Save profile picture data to Firestore
        await db.collection('users').doc(user.uid).set(profileData, { merge: true });

        console.log('✅ Profile picture saved to Firebase:', profileData);
        return true;

    } catch (error) {
        console.error('❌ Error saving profile picture to Firebase:', error);
        throw error;
    }
}

// Load user data from Firebase
async function loadUserData() {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            console.log('No authenticated user');
            return;
        }

        const doc = await db.collection('users').doc(user.uid).get();

        if (doc.exists) {
            const data = doc.data();

            // Populate form fields
            if (data.firstName) document.getElementById('firstName').value = data.firstName;
            if (data.lastName) document.getElementById('lastName').value = data.lastName;
            if (data.address) document.getElementById('address').value = data.address;
            if (data.phone) document.getElementById('phone').value = data.phone;
            if (data.dob) document.getElementById('dob').value = data.dob;
            if (data.gender) {
                const genderRadio = document.querySelector(`input[name="gender"][value="${data.gender}"]`);
                if (genderRadio) genderRadio.checked = true;
            }

            // Update profile display
            updateProfileDisplay(data.firstName, data.lastName);

            // Load profile picture if available
            if (data.profilePicture) {
                console.log('🖼️ Loading profile picture from Firebase:', data.profilePicture);
                console.log('🖼️ Profile picture public ID:', data.profilePicturePublicId);
                updateProfilePicture(data.profilePicture, data.profilePicturePublicId);
            } else {
                console.log('ℹ️ No profile picture found in user data');
            }

            console.log('✅ User data loaded successfully:', data);
        } else {
            console.log('No user data found - will create new profile on save');
        }

    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

// Force refresh profile picture
async function refreshProfilePicture() {
    console.log('🔄 Refreshing profile picture...');

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;

        if (!user) {
            console.error('No authenticated user');
            return;
        }

        const doc = await db.collection('users').doc(user.uid).get();

        if (doc.exists) {
            const data = doc.data();

            if (data.profilePicture) {
                console.log('🖼️ Found profile picture in database:', data.profilePicture);
                updateProfilePicture(data.profilePicture, data.profilePicturePublicId);

                if (window.showMessage) {
                    window.showMessage('✅ Profile picture refreshed!', 'success');
                }
            } else {
                console.log('ℹ️ No profile picture found in database');
                if (window.showMessage) {
                    window.showMessage('No profile picture found. Please upload one.', 'info');
                }
            }
        } else {
            console.log('No user document found');
        }

    } catch (error) {
        console.error('❌ Error refreshing profile picture:', error);
        if (window.showMessage) {
            window.showMessage('Failed to refresh profile picture', 'error');
        }
    }
}

// Make refresh function globally available
window.refreshProfilePicture = refreshProfilePicture;

// Debug function to check profile image state
function debugProfileImage() {
    const profileImg = document.getElementById('profileImg');
    const placeholderIcon = document.getElementById('placeholderIcon');

    console.log('🔍 Profile Image Debug Info:');
    console.log('- Profile image element:', profileImg);
    console.log('- Profile image src:', profileImg ? profileImg.src : 'N/A');
    console.log('- Profile image display:', profileImg ? profileImg.style.display : 'N/A');
    console.log('- Profile image classes:', profileImg ? profileImg.className : 'N/A');
    console.log('- Profile image opacity:', profileImg ? window.getComputedStyle(profileImg).opacity : 'N/A');
    console.log('- Placeholder icon display:', placeholderIcon ? placeholderIcon.style.display : 'N/A');
    console.log('- Placeholder icon computed display:', placeholderIcon ? window.getComputedStyle(placeholderIcon).display : 'N/A');

    if (profileImg && profileImg.src) {
        console.log('🖼️ Profile image has src, forcing display...');
        profileImg.style.display = 'block';
        profileImg.classList.add('loaded');
        if (placeholderIcon) {
            placeholderIcon.style.display = 'none';
        }
    }
}

// Make debug function globally available
window.debugProfileImage = debugProfileImage;

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Setup notifications
    var notifLink = document.querySelector('.nav-link[title="Notifications"]');
    if (notifLink) {
        notifLink.addEventListener('click', function () {
            if (typeof loadNotifications === 'function') {
                loadNotifications();
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup menu click handlers
    const personalInfoMenu = document.getElementById('personalInfoMenu');
    const loginPasswordMenu = document.getElementById('loginPasswordMenu');
    
    if (personalInfoMenu) {
        personalInfoMenu.addEventListener('click', () => toggleMenu('personalInfoMenu'));
    }
    
    if (loginPasswordMenu) {
        loginPasswordMenu.addEventListener('click', () => toggleMenu('loginPasswordMenu'));
    }

    // Setup password visibility toggle handlers
    const toggleCurrentPassword = document.getElementById('toggleCurrentPassword');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    if (toggleCurrentPassword) {
        toggleCurrentPassword.addEventListener('click', () => 
            togglePasswordVisibility('currentPassword', 'currentPasswordIcon'));
    }
    
    if (toggleNewPassword) {
        toggleNewPassword.addEventListener('click', () => 
            togglePasswordVisibility('newPassword', 'newPasswordIcon'));
    }
    
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', () => 
            togglePasswordVisibility('confirmPassword', 'confirmPasswordIcon'));
    }

    // Setup password strength checker
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
        });
    }

    // Setup password confirmation checker
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = this.value;
            
            if (confirmPassword.length > 0) {
                if (newPassword === confirmPassword) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                }
            } else {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }

    // Setup automatic current password verification
    const currentPasswordInput = document.getElementById('currentPassword');
    let verificationTimeout;
    
    if (currentPasswordInput) {
        currentPasswordInput.addEventListener('input', function() {
            const currentPassword = this.value;
            
            // Clear previous timeout
            if (verificationTimeout) {
                clearTimeout(verificationTimeout);
            }
            
            // Reset status
            this.classList.remove('is-valid', 'is-invalid');
            document.getElementById('currentPasswordStatus').style.display = 'none';
            
            // Disable new password fields while verifying
            document.getElementById('newPassword').disabled = true;
            document.getElementById('confirmPassword').disabled = true;
            document.getElementById('toggleNewPassword').disabled = true;
            document.getElementById('toggleConfirmPassword').disabled = true;
            document.getElementById('savePasswordData').disabled = true;
            
            // Only verify if password is at least 6 characters
            if (currentPassword.length >= 6) {
                // Debounce verification - wait 1 second after user stops typing
                verificationTimeout = setTimeout(() => {
                    verifyCurrentPasswordAutomatically(currentPassword);
                }, 1000);
            }
        });
    }

    // Wait for Firebase to be ready, then load user data
    const checkFirebase = () => {
        if (window.isFirebaseReady && window.isFirebaseReady()) {
            loadUserData();
        } else {
            setTimeout(checkFirebase, 500);
        }
    };

    // Start checking after a short delay
    setTimeout(checkFirebase, 1000);

    // Listen for Cloudinary upload events
    window.addEventListener('profileImageUpdated', function (event) {
        const { url, publicId, optimizedUrl } = event.detail;
        console.log('📸 Profile image upload event received:', event.detail);

        // Update the profile picture display
        updateProfilePicture(optimizedUrl || url, publicId);

        // Save to Firebase
        saveProfilePictureToFirebase(optimizedUrl || url, publicId)
            .then(() => {
                console.log('✅ Profile picture saved to Firebase successfully');
            })
            .catch((error) => {
                console.error('❌ Failed to save profile picture to Firebase:', error);
                if (window.showMessage) {
                    window.showMessage('Profile picture uploaded but failed to save to database. Please try again.', 'warning');
                }
            });
    });

    // Listen for Cloudinary ready event
    window.addEventListener('cloudinaryReady', function () {
        console.log('📸 Cloudinary is ready for profile picture uploads');
    });

    // Setup profile picture click handlers
    const profileImageContainer = document.getElementById('profileImageContainer');
    const editProfileIcon = document.getElementById('editProfileIcon');
    const profileImageInput = document.getElementById('profileImageInput');

    // Add click handlers for profile picture upload
    if (profileImageContainer) {
        profileImageContainer.addEventListener('click', function () {
            console.log('📸 Profile image container clicked');
            if (profileImageInput) {
                profileImageInput.click();
            }
        });
    }

    if (editProfileIcon) {
        editProfileIcon.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent triggering the container click
            console.log('📸 Edit profile icon clicked');
            if (profileImageInput) {
                profileImageInput.click();
            }
        });
    }

    // Setup fallback file input for profile picture
    if (profileImageInput) {
        profileImageInput.addEventListener('change', async function (event) {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file
            if (!file.type.startsWith('image/')) {
                if (window.showMessage) {
                    window.showMessage('Please select a valid image file', 'error');
                }
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                if (window.showMessage) {
                    window.showMessage('Image size must be less than 5MB', 'error');
                }
                return;
            }

            try {
                // Show loading message
                if (window.showMessage) {
                    window.showMessage('Uploading profile picture...', 'info');
                }

                // Try to upload to Cloudinary using the cloud.js functions
                if (window.uploadProfileImage) {
                    const result = await window.uploadProfileImage(file);

                    // Update profile picture display
                    updateProfilePicture(result.optimizedUrl || result.url, result.publicId);

                    // Save to Firebase
                    await saveProfilePictureToFirebase(result.optimizedUrl || result.url, result.publicId);

                    console.log('✅ Profile picture uploaded and saved successfully');

                } else {
                    // Fallback: use FileReader for local preview
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        updateProfilePicture(e.target.result);
                        console.log('📸 Profile picture updated with local preview');
                    };
                    reader.readAsDataURL(file);
                }

            } catch (error) {
                console.error('❌ Error uploading profile picture:', error);
                if (window.showMessage) {
                    window.showMessage('Failed to upload profile picture. Please try again.', 'error');
                }
            }
        });
    }

    // Initialize view mode when page loads
    setTimeout(() => {
        initializeViewMode();
    }, 1000);
});
