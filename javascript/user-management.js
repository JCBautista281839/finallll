// Firebase Configuration - Replace with your actual config
if (typeof firebaseConfig === 'undefined') {
  var firebaseConfig = {
    apiKey: "AIzaSyAXFKAt6OGLlUfQBnNmEhek6uqNQm4634Y",
    authDomain: "victoria-s-bistro.firebaseapp.com",
    databaseURL: "https://victoria-s-bistro-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "victoria-s-bistro",
    storageBucket: "victoria-s-bistro.firebasestorage.app",
    messagingSenderId: "672219366880",
    appId: "1:672219366880:web:220df1e01d0b9ab72d9785",
    measurementId: "G-H9G17QXSMV"
  };
}

// Initialize Firebase (only if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let isAdminMode = false;
let selectedUserId = null;
let currentUserIsAdmin = false;
let uploadedImageUrl = '';

// Get form elements
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');

// Prevent numbers in first name and last name
if (firstNameInput) {
    firstNameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[0-9]/g, '');
    });
}
if (lastNameInput) {
    lastNameInput.addEventListener('input', function() {
        this.value = this.value.replace(/[0-9]/g, '');
    });
}
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');

// Prevent letters in phone number input
if (phoneInput) {
    // Set initial value to '+63'
    if (!phoneInput.value || !phoneInput.value.startsWith('+63')) {
        phoneInput.value = '+63';
    }

    phoneInput.addEventListener('input', function(e) {
        // Always keep '+63' prefix
        let val = this.value.replace(/[^0-9]/g, '');
        // Remove any leading '63' if user types it
        if (val.startsWith('63')) val = val.slice(2);
        // Limit to 10 digits
        val = val.slice(0, 10);
        // Ensure first digit is 9 and not 0
        if (val.length > 0) {
            if (val[0] !== '9') {
                val = '9' + val.slice(1);
            }
            if (val[0] === '0') {
                val = '9' + val.slice(1);
            }
        }
    this.value = '+63 ' + val;
    });

    phoneInput.addEventListener('focus', function() {
        if (!this.value.startsWith('+63')) {
            this.value = '+63';
        }
    });
}
const addressInput = document.getElementById('address');
const dobInput = document.getElementById('dob');
const maleRadio = document.getElementById('male');
const femaleRadio = document.getElementById('female');
const profileName = document.querySelector('.profile-name');
const profileImage = document.getElementById('profileImg');

// Updated handleSaveClick function to integrate with Firebase
async function handleSaveClick() {
    console.log('Save button clicked');
    
    const saveBtn = document.getElementById('saveUserData');
    if (!saveBtn) {
        console.error('Save button not found');
        return;
    }
    
    // Show loading state
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    saveBtn.disabled = true;
    
    try {
        // Collect form data
        const userData = {
            firstName: document.getElementById('firstName')?.value?.trim() || '',
            lastName: document.getElementById('lastName')?.value?.trim() || '',
            email: document.getElementById('email')?.value?.trim() || '',
            address: document.getElementById('address')?.value?.trim() || '',
            phone: document.getElementById('phone')?.value?.trim() || '',
            dob: document.getElementById('dob')?.value?.trim() || '',
            gender: document.querySelector('input[name="gender"]:checked')?.value || 'male'
        };
        
        console.log('Collected user data:', userData);
        
        // Update profile name immediately for better UX
        updateProfileName(userData.firstName, userData.lastName, userData.email);
        
        // Try to save to Firebase
        const saveResult = await saveToFirebaseBackground(userData);
        
        if (saveResult.success) {
            console.log('Profile saved successfully to Firebase');
            
            // Show success state
            saveBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Saved!';
            saveBtn.classList.add('btn-success');
            saveBtn.classList.remove('btn-primary');
            
            showSimpleToast('Profile updated successfully!', 'success');
        } else {
            console.warn('Firebase save failed:', saveResult.error);
            
            // Show partial success
            saveBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Saved Locally';
            saveBtn.classList.add('btn-warning');
            saveBtn.classList.remove('btn-primary');
            
            showSimpleToast('Profile updated locally. Will sync when connected.', 'warning');
        }
        
    } catch (error) {
        console.error('Error in handleSaveClick:', error);
        
        // Show error state
        saveBtn.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Error';
        saveBtn.classList.add('btn-danger');
        saveBtn.classList.remove('btn-primary');
        
        showSimpleToast('Error saving profile: ' + error.message, 'error');
    } finally {
        // Reset button after 2 seconds
        setTimeout(() => {
            saveBtn.innerHTML = originalHTML;
            saveBtn.classList.remove('btn-success', 'btn-danger', 'btn-warning');
            saveBtn.classList.add('btn-primary');
            saveBtn.disabled = false;
        }, 2000);
    }
}

// Background Firebase save function (updated)
async function saveToFirebaseBackground(userData) {
    try {
        console.log('Attempting Firebase save...');
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not found');
            return { success: false, error: 'Firebase SDK not found' };
        }
        
        // Check if Firebase is initialized
        if (!firebase.apps || firebase.apps.length === 0) {
            console.warn('Firebase not initialized');
            return { success: false, error: 'Firebase not initialized' };
        }
        
        // Check network status
        if (navigator.onLine === false) {
            console.warn('Browser is offline');
            return { success: false, error: 'Browser is offline' };
        }
        
        // Get current user or use a test user ID
        let targetUserId;
        let userEmail;
        
        if (isAdminMode && selectedUserId) {
            // Admin editing another user
            console.log('Admin mode: editing user', selectedUserId);
            targetUserId = selectedUserId;
            userEmail = userData.email; // Use form email
        } else {
            // For testing purposes, we'll create a test user if no auth user exists
            const currentAuthUser = auth.currentUser;
            
            if (currentAuthUser) {
                targetUserId = currentAuthUser.uid;
                userEmail = userData.email; // Always use the form email, not auth email
                console.log('Authenticated user mode:', targetUserId);
            } else {
                // Create a test user ID based on email for testing
                targetUserId = btoa(userData.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
                userEmail = userData.email;
                console.log('Test mode: using generated user ID:', targetUserId);
            }
        }
        
        if (!targetUserId) {
            return { success: false, error: 'No target user ID' };
        }
        
        // Prepare final user data
        const finalUserData = {
            ...userData, // This includes userData.email from the form
            userId: targetUserId,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add profile image if available
        if (uploadedImageUrl) {
            finalUserData.profileImage = uploadedImageUrl;
        }
        
        console.log('Form email:', userData.email);
        console.log('Final email in data:', finalUserData.email);
        console.log('Saving user data to Firestore:', finalUserData);
        
        // Save to Firestore with timeout
        const userDoc = db.collection('users').doc(targetUserId);
        
        // Use Promise.race to implement timeout
        const savePromise = userDoc.set(finalUserData, { merge: true });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firebase save timeout')), 10000)
        );
        
        await Promise.race([savePromise, timeoutPromise]);
        
        console.log('Firebase save completed successfully');
        return { success: true };
        
    } catch (error) {
        console.error('Firebase save failed:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

// Function to update profile name in the UI
function updateProfileName(firstName, lastName, email) {
    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement) {
        const displayName = `${firstName} ${lastName}`.trim();
        profileNameElement.textContent = displayName || email.split('@')[0] || 'User';
    }
}

// Load user profile from Firebase
async function loadUserProfile(userId = null) {
    try {
        let targetUserId = userId;
        
        if (!targetUserId) {
            const currentAuthUser = auth.currentUser;
            if (currentAuthUser) {
                targetUserId = currentAuthUser.uid;
            } else {
                // For testing, try to load based on email if available
                const emailField = document.getElementById('email');
                if (emailField && emailField.value) {
                    targetUserId = btoa(emailField.value).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
                } else {
                    console.log('No user ID available for loading profile');
                    return;
                }
            }
        }
        
        console.log('Loading profile for user:', targetUserId);
        
        const docRef = db.collection('users').doc(targetUserId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const userData = doc.data();
            console.log('User data loaded from Firebase:', userData);
            populateProfileForm(userData);
        } else {
            console.log('No profile found in Firebase');
            // You can create a default profile here if needed
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        showSimpleToast('Failed to load profile data', 'error');
    }
}

// Fill the form with user data (updated)
function populateProfileForm(userData) {
    try {
        // Populate form fields
        if (firstNameInput) firstNameInput.value = userData.firstName || '';
        if (lastNameInput) lastNameInput.value = userData.lastName || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (addressInput) addressInput.value = userData.address || '';
        if (dobInput) dobInput.value = userData.dob || '';
        
        // Set gender radio button
        if (userData.gender === 'male' && maleRadio) {
            maleRadio.checked = true;
        } else if (userData.gender === 'female' && femaleRadio) {
            femaleRadio.checked = true;
        }
        
        // Update profile display name
        updateProfileName(userData.firstName, userData.lastName, userData.email);
        
        // Update profile image if available
        if (userData.profileImage) {
            displayProfileImage(userData.profileImage);
            uploadedImageUrl = userData.profileImage;
        }
        
        console.log('Profile form populated successfully');
    } catch (error) {
        console.error('Error populating profile form:', error);
    }
}

// Authentication state listener
function initAuthStateListener() {
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(function(user) {
                currentUser = user;
                if (user) {
                    console.log('User is signed in:', user.email);
                    loadUserProfile(user.uid);
                } else {
                    console.log('No user is signed in');
                    // For testing purposes, you might want to load a test profile
                    // loadUserProfile();
                }
            });
        } else {
            console.warn('Firebase auth not available for state listener');
        }
    } catch (error) {
        console.error('Error setting up auth state listener:', error);
    }
}

// Enhanced toast function
function showSimpleToast(message, type) {
    const existingToast = document.getElementById('simpleToast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.id = 'simpleToast';
    
    let bgColor;
    switch(type) {
        case 'success': bgColor = '#28a745'; break;
        case 'error': bgColor = '#dc3545'; break;
        case 'warning': bgColor = '#ffc107'; break;
        default: bgColor = '#6c757d';
    }
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 8px;
        color: ${type === 'warning' ? '#000' : 'white'};
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        background: ${bgColor};
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS animation if not exists
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <span>${message}</span>
            <button onclick="this.closest('#simpleToast').remove()" style="
                background: none;
                border: none;
                color: ${type === 'warning' ? '#000' : 'white'};
                margin-left: 15px;
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                line-height: 1;
            ">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Helper functions for backward compatibility
function showSaveSuccess(message) {
    showSimpleToast(message, 'success');
}

function showSaveError(message) {
    showSimpleToast(message, 'error');
}

// Profile image upload functionality
function initProfileImageUpload() {
    const profileImageContainer = document.getElementById('profileImageContainer');
    const profileImg = document.getElementById('profileImg');
    const placeholderIcon = document.getElementById('placeholderIcon');
    const editProfileIcon = document.getElementById('editProfileIcon');
    
    console.log('🔍 Setting up profile image upload...');
    
    // Check if Cloudinary utils are available
    if (typeof window.cloudinaryUtils !== 'undefined') {
        console.log('✅ Using Cloudinary widget for profile image upload');
        
        // Listen for the cloudinaryReady event
        window.addEventListener('cloudinaryReady', function() {
            console.log('🎉 Cloudinary widget is ready for profile image upload');
        });
        
        // Listen for profile image updates from Cloudinary
        window.addEventListener('profileImageUpdated', function(event) {
            console.log('📸 Profile image updated event received:', event.detail);
            
            // Update global variable
            uploadedImageUrl = event.detail.url || event.detail.optimizedUrl;
            
            // Display the image
            displayProfileImage(uploadedImageUrl);
            
            // Update Firestore with new profile image
            updateProfileImageInFirestore(uploadedImageUrl);
        });
    } else {
        console.log('⚠️ Cloudinary utils not found, using fallback method');
        setupFallbackProfileImageUpload();
    }
}

// Fallback method for profile image upload if Cloudinary isn't available
function setupFallbackProfileImageUpload() {
    const editProfileIcon = document.getElementById('editProfileIcon');
    const profileImageContainer = document.getElementById('profileImageContainer');
    
    // Create hidden file input if it doesn't exist
    let profileImageInput = document.getElementById('profileImageInput');
    if (!profileImageInput) {
        profileImageInput = document.createElement('input');
        profileImageInput.type = 'file';
        profileImageInput.id = 'profileImageInput';
        profileImageInput.accept = 'image/*';
        profileImageInput.style.display = 'none';
        document.body.appendChild(profileImageInput);
    }

    // Show file picker when edit icon or container is clicked
    if (editProfileIcon) {
        editProfileIcon.addEventListener('click', () => {
            profileImageInput.click();
        });
    }
    
    if (profileImageContainer) {
        profileImageContainer.addEventListener('click', () => {
            profileImageInput.click();
        });
    }

    // Handle file selection with the fallback method
    profileImageInput.addEventListener('change', handleFileSelection);
}

// Handle file selection for profile image
async function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showSimpleToast('Please select an image file.', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showSimpleToast('Image size must be less than 5MB.', 'error');
        return;
    }

    try {
        // Show loading state
        const editProfileIcon = document.getElementById('editProfileIcon');
        if (editProfileIcon) {
            editProfileIcon.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        }
        showSimpleToast('Uploading photo...', 'warning');

        // Try to use the Cloudinary direct upload first if available
        if (typeof window.uploadProfileImage === 'function') {
            console.log('📤 Using Cloudinary direct upload API...');
            try {
                const result = await window.uploadProfileImage(file);
                if (result && (result.url || result.optimizedUrl)) {
                    // Use the optimized URL if available, otherwise use the standard URL
                    uploadedImageUrl = result.optimizedUrl || result.url;
                    displayProfileImage(uploadedImageUrl);
                    updateProfileImageInFirestore(uploadedImageUrl);
                    showSimpleToast('Profile photo updated successfully!', 'success');
                    return;
                }
            } catch (cloudinaryError) {
                console.error('❌ Cloudinary direct upload failed, falling back to Firebase Storage:', cloudinaryError);
                // Continue with Firebase Storage upload
            }
        }
        
        // Fallback to Firebase Storage if Cloudinary fails or isn't available
        console.log('📤 Using Firebase Storage fallback...');
        
        // Get user ID
        let userId = null;
        if (selectedUserId && isAdminMode) {
            userId = selectedUserId;
        } else if (auth.currentUser) {
            userId = auth.currentUser.uid;
        } else {
            // Generate test user ID for testing
            const emailField = document.getElementById('email');
            const email = emailField ? emailField.value : 'test@example.com';
            userId = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
        }

        // Upload image to Firebase Storage
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`profileImages/${userId}/${Date.now()}_${file.name}`);
        
        const uploadTask = await imageRef.put(file);
        const downloadURL = await uploadTask.ref.getDownloadURL();

        // Save image URL to global variable
        uploadedImageUrl = downloadURL;

        // Update UI and Firestore
        displayProfileImage(downloadURL);
        updateProfileImageInFirestore(downloadURL);
        
        showSimpleToast('Profile photo updated successfully!', 'success');

    } catch (error) {
        console.error('Error uploading profile photo:', error);
        showSimpleToast('Failed to upload photo: ' + error.message, 'error');
    } finally {
        // Reset edit icon
        const editProfileIcon = document.getElementById('editProfileIcon');
        if (editProfileIcon) {
            editProfileIcon.innerHTML = '<i class="bi bi-pencil"></i>';
        }
    }
}

// Update Firestore with new profile image URL
async function updateProfileImageInFirestore(imageUrl) {
    if (!imageUrl) {
        console.error('No image URL provided to update Firestore');
        return;
    }
    
    try {
        // Get user ID
        let userId = null;
        if (selectedUserId && isAdminMode) {
            userId = selectedUserId;
        } else if (auth.currentUser) {
            userId = auth.currentUser.uid;
        } else {
            // Generate test user ID for testing
            const emailField = document.getElementById('email');
            const email = emailField ? emailField.value : 'test@example.com';
            userId = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
        }
        
        console.log('📝 Updating profile image in Firestore for user:', userId);
        
        // Update Firestore with new profile image
        await db.collection('users').doc(userId).set({
            profileImage: imageUrl,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Profile image updated in Firestore successfully');
    } catch (error) {
        console.error('❌ Error updating profile image in Firestore:', error);
    }
}

// Function to display profile image
function displayProfileImage(imageUrl) {
    const profileImg = document.getElementById('profileImg');
    const placeholderIcon = document.getElementById('placeholderIcon');
    
    console.log('Displaying profile image:', imageUrl);
    
    if (profileImg && imageUrl) {
        // Set the image source
        profileImg.src = imageUrl;
        
        // Ensure the image is visible
        profileImg.style.display = 'block';
        profileImg.style.visibility = 'visible';
        profileImg.style.opacity = '1';
        profileImg.classList.add('loaded');
        
        // Log confirmation
        console.log('Profile image source set to:', profileImg.src);
        
        // Hide the placeholder icon
        if (placeholderIcon) {
            placeholderIcon.style.display = 'none';
        }
        
        // Add event handlers to confirm image loads correctly
        profileImg.onload = function() {
            console.log('Profile image loaded successfully');
            // Add a class to show it's loaded
            profileImg.classList.add('loaded');
            
            // Make sure placeholder is hidden
            if (placeholderIcon) {
                placeholderIcon.style.display = 'none';
            }
        };
        
        profileImg.onerror = function(error) {
            console.error('Error loading profile image:', error);
            console.error('Failed image URL:', imageUrl);
            
            // Show placeholder if image fails to load
            if (placeholderIcon) {
                placeholderIcon.style.display = 'block';
            }
            profileImg.style.display = 'none';
            profileImg.classList.remove('loaded');
        };
    } else {
        console.log('No profile image to display or image element not found');
        
        // If no image URL or no image element, show placeholder
        if (profileImg) {
            profileImg.style.display = 'none';
            profileImg.classList.remove('loaded');
        }
        
        if (placeholderIcon) {
            placeholderIcon.style.display = 'block';
        }
    }
}

// Function to load and display existing profile image
async function loadProfileImage(userId) {
    try {
        if (!userId) return;
        
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.profileImage) {
                displayProfileImage(userData.profileImage);
                uploadedImageUrl = userData.profileImage;
                console.log('✅ Loaded existing profile image from Firestore:', userData.profileImage.substring(0, 50) + '...');
            } else {
                console.log('⚠️ No profile image found in user data');
                // If there's no profile image, make sure the placeholder is showing
                const profileImg = document.getElementById('profileImg');
                const placeholderIcon = document.getElementById('placeholderIcon');
                
                if (profileImg) {
                    profileImg.style.display = 'none';
                    profileImg.classList.remove('loaded');
                }
                
                if (placeholderIcon) {
                    placeholderIcon.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading profile image:', error);
    }
}

// Enhanced direct save function (keeping your original logic)
function forceSaveUserProfile() {
    const saveButton = document.getElementById('saveUserData');
    if (saveButton) {
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
        saveButton.disabled = true;
    }
    
    // Get form values directly
    const firstName = document.getElementById('firstName')?.value?.trim() || '';
    const lastName = document.getElementById('lastName')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const phone = document.getElementById('phone')?.value?.trim() || '';
    const address = document.getElementById('address')?.value?.trim() || '';
    const dob = document.getElementById('dob')?.value?.trim() || '';
    const gender = document.querySelector('input[name="gender"]:checked')?.value || 'male';
    
    console.log('Collected user data for force save:', { firstName, lastName, email, phone, address, dob, gender });
    
    // Get user ID
    let userId = null;
    if (selectedUserId && isAdminMode) {
        userId = selectedUserId;
        console.log('Admin editing user:', userId);
    } else if (auth.currentUser) {
        userId = auth.currentUser.uid;
        console.log('User editing own profile:', userId);
    } else {
        // Generate test user ID for testing
        userId = btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 28);
        console.log('Generated test user ID:', userId);
    }
    
    // Create user data object
    const userData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        dob,
        gender,
        userId,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to Firestore
    console.log('Force saving to Firebase for user ID:', userId);
    
    db.collection('users').doc(userId).set(userData, { merge: true })
        .then(() => {
            console.log('User profile force saved successfully!');
            
            if (saveButton) {
                saveButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Saved!';
                saveButton.classList.add('btn-success');
                
                setTimeout(() => {
                    saveButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Changes';
                    saveButton.classList.remove('btn-success');
                    saveButton.disabled = false;
                }, 2000);
            }
            
            showSaveSuccess('Profile updated successfully!');
            updateProfileName(firstName, lastName, email);
        })
        .catch(error => {
            console.error('Error force saving user profile:', error);
            showSaveError('Failed to save: ' + (error.message || 'Unknown error'));
            
            if (saveButton) {
                saveButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Save Changes';
                saveButton.disabled = false;
            }
        });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing user management...');
    
    // Check if Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        showSimpleToast('Firebase SDK not loaded. Please check your internet connection.', 'error');
        return;
    }
    
    console.log('✅ Firebase SDK loaded successfully');
    
    try {
        // Initialize auth state listener
        console.log('🔐 Initializing auth state listener...');
        initAuthStateListener();
        
        // Wait for Cloudinary to be ready (if it will be)
        console.log('⏳ Waiting for Cloudinary initialization...');
        
        // Initialize profile image upload
        console.log('📷 Initializing profile image upload...');
        setTimeout(() => {
            initProfileImageUpload();
        }, 500);
        
        // Load user profile immediately instead of waiting
        console.log('👤 Loading user profile...');
        loadUserProfile();
        
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        showSimpleToast('Error initializing page: ' + error.message, 'error');
    }
});

// Export functions for global use
window.handleSaveClick = handleSaveClick;
window.forceSaveUserProfile = forceSaveUserProfile;
window.loadUserProfile = loadUserProfile;
document.addEventListener('DOMContentLoaded', function() {
    const personalInfoMenu = document.getElementById('personalInfoMenu');
    const loginPasswordMenu = document.getElementById('loginPasswordMenu');
    const infoPanel = document.querySelector('.info-panel');

    if (loginPasswordMenu && infoPanel) {
        loginPasswordMenu.addEventListener('click', function() {
            // Remove active class from other menu items
            document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
            loginPasswordMenu.classList.add('active');
            // Replace info panel content with login/password form
            infoPanel.innerHTML = `
                <h2 class="info-title">Login & Password</h2>
                <form id="loginPasswordForm" class="personal-info-form">
                    <div class="mb-3">
                        <label for="newEmail" class="form-label">New Email</label>
                        <input type="email" class="form-control" id="newEmail" placeholder="Enter new email">
                    </div>
                    <div class="mb-3">
                        <label for="currentPassword" class="form-label">Current Password</label>
                        <input type="password" class="form-control" id="currentPassword" placeholder="Enter current password">
                    </div>
                    <div class="mb-3">
                        <label for="newPassword" class="form-label">New Password</label>
                        <input type="password" class="form-control" id="newPassword" placeholder="Enter new password">
                        <div id="passwordRequirements" class="form-text text-muted">Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number.</div>
                    </div>
                    <div class="mb-3">
                        <label for="confirmPassword" class="form-label">Confirm New Password</label>
                        <input type="password" class="form-control" id="confirmPassword" placeholder="Confirm new password">
                    </div>
                    <div class="d-flex justify-content-end mt-4">
                        <button type="button" class="btn btn-primary" id="savePasswordChanges">
                            <i class="bi bi-shield-check me-2"></i>Update Security
                        </button>
                    </div>
                </form>
            `;

            // Add password validation logic
            setTimeout(() => {
                const newPasswordInput = document.getElementById('newPassword');
                const saveBtn = document.getElementById('savePasswordChanges');
                const requirements = document.getElementById('passwordRequirements');
                if (newPasswordInput && saveBtn && requirements) {
                    // Add confirm password warning
                    const confirmInput = document.getElementById('confirmPassword');
                    let confirmWarning = document.getElementById('confirmPasswordWarning');
                    if (!confirmWarning && confirmInput) {
                        confirmWarning = document.createElement('div');
                        confirmWarning.id = 'confirmPasswordWarning';
                        confirmWarning.className = 'form-text text-danger';
                        confirmWarning.style.display = 'none';
                        // Insert directly after the input box
                        if (confirmInput.nextSibling) {
                            confirmInput.parentNode.insertBefore(confirmWarning, confirmInput.nextSibling);
                        } else {
                            confirmInput.parentNode.appendChild(confirmWarning);
                        }
                    }
                    // Prepare requirements HTML
                    const reqHTML = `
                        <span id="pw-len" class="text-danger">&#10060; Minimum 8 characters</span><br>
                        <span id="pw-upper" class="text-danger">&#10060; At least 1 uppercase letter</span><br>
                        <span id="pw-lower" class="text-danger">&#10060; At least 1 lowercase letter</span><br>
                        <span id="pw-num" class="text-danger">&#10060; At least 1 number</span>
                    `;
                    requirements.style.display = 'none';
                    // Helper to update requirements UI
                    function updateRequirements(val) {
                        const lenMet = val.length >= 8;
                        const upperMet = /[A-Z]/.test(val);
                        const lowerMet = /[a-z]/.test(val);
                        const numMet = /\d/.test(val);
                        document.getElementById('pw-len').className = lenMet ? 'text-success' : 'text-danger';
                        document.getElementById('pw-len').innerHTML = (lenMet ? '&#9989;' : '&#10060;') + ' Minimum 8 characters';
                        document.getElementById('pw-upper').className = upperMet ? 'text-success' : 'text-danger';
                        document.getElementById('pw-upper').innerHTML = (upperMet ? '&#9989;' : '&#10060;') + ' At least 1 uppercase letter';
                        document.getElementById('pw-lower').className = lowerMet ? 'text-success' : 'text-danger';
                        document.getElementById('pw-lower').innerHTML = (lowerMet ? '&#9989;' : '&#10060;') + ' At least 1 lowercase letter';
                        document.getElementById('pw-num').className = numMet ? 'text-success' : 'text-danger';
                        document.getElementById('pw-num').innerHTML = (numMet ? '&#9989;' : '&#10060;') + ' At least 1 number';
                        return lenMet && upperMet && lowerMet && numMet;
                    }

                    requirements.style.display = 'none';
                    requirements.innerHTML = reqHTML;
                    // Always keep requirements state up to date
                    newPasswordInput.addEventListener('focus', function() {
                        requirements.style.display = 'block';
                        updateRequirements(this.value);
                    });
                    newPasswordInput.addEventListener('blur', function() {
                        requirements.style.display = 'none';
                    });
                    function showConfirmWarning() {
                        const newVal = newPasswordInput.value;
                        if (confirmInput.value && confirmInput.value !== newVal) {
                            confirmWarning.textContent = 'Password does not match';
                            confirmWarning.style.display = 'block';
                            saveBtn.disabled = true;
                        } else {
                            confirmWarning.textContent = '';
                            confirmWarning.style.display = 'none';
                        }
                    }
                    function updateSaveBtn() {
                        const val = newPasswordInput.value;
                        const allMet = updateRequirements(val);
                        if (allMet && confirmInput.value === val) {
                            saveBtn.disabled = false;
                        } else {
                            saveBtn.disabled = true;
                        }
                    }
                    newPasswordInput.addEventListener('input', function() {
                        updateRequirements(this.value);
                        showConfirmWarning();
                        updateSaveBtn();
                    });
                    confirmInput.addEventListener('input', function() {
                        showConfirmWarning();
                        updateSaveBtn();
                    });
                    newPasswordInput.addEventListener('blur', function() {
                        showConfirmWarning();
                        updateSaveBtn();
                    });
                    confirmInput.addEventListener('blur', function() {
                        showConfirmWarning();
                        updateSaveBtn();
                    });
                }
            }, 100);
        });
    }
    if (personalInfoMenu && infoPanel) {
        personalInfoMenu.addEventListener('click', function() {
            document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
            personalInfoMenu.classList.add('active');
            // Reload the page to show personal info panel
            window.location.reload();
        });
    }
});
                    if (confirmInput && confirmWarning) {
                        function checkConfirmPassword() {
                            const newVal = newPasswordInput.value;
                            if (confirmInput.value && confirmInput.value !== newVal) {
                                confirmWarning.textContent = 'Password does not match';
                                confirmWarning.style.display = 'block';
                                saveBtn.disabled = true;
                            } else {
                                confirmWarning.textContent = '';
                                confirmWarning.style.display = 'none';
                                // Only enable if all requirements are met
                                const lenMet = newVal.length >= 8;
                                const upperMet = /[A-Z]/.test(newVal);
                                const lowerMet = /[a-z]/.test(newVal);
                                const numMet = /\d/.test(newVal);
                                if (lenMet && upperMet && lowerMet && numMet) {
                                    saveBtn.disabled = false;
                                } else {
                                    saveBtn.disabled = true;
                                }
                            }
                        }
                        confirmInput.addEventListener('input', checkConfirmPassword);
                        confirmInput.addEventListener('blur', checkConfirmPassword);
                        confirmInput.addEventListener('focus', checkConfirmPassword);
                        newPasswordInput.addEventListener('input', checkConfirmPassword);
                    }