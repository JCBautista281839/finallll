/**
 * Submit Report Modal JavaScript
 * Handles customer support ticket submission in modal
 */

let currentUser = null;
let customerData = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Submit Report Modal] Initializing...');
    
    // Wait for Firebase to initialize
    await waitForFirebase();
    
    // Check authentication
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadCustomerData();
            setupFormListeners();
        }
    });
    
    // Add ESC key listener to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const reportModal = document.getElementById('submitReportModal');
            const successModal = document.getElementById('successModal');
            
            if (successModal && successModal.style.display === 'flex') {
                closeSuccessModal();
            } else if (reportModal && reportModal.style.display === 'flex') {
                closeReportModal();
            }
        }
    });
});

// Open report modal
function openReportModal() {
    const modal = document.getElementById('submitReportModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Load fresh customer data when opening
        if (currentUser) {
            loadCustomerData();
        }
    }
}

// Close report modal
function closeReportModal() {
    const modal = document.getElementById('submitReportModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
        
        // Reset form
        const form = document.getElementById('reportForm');
        if (form) {
            form.reset();
            // Only update character counters if they exist
            const subjectCount = document.getElementById('subjectCount');
            const descCount = document.getElementById('descCount');
            if (subjectCount) subjectCount.textContent = '0';
            if (descCount) descCount.textContent = '0';
            removeImage();
            document.getElementById('submitBtn').disabled = false;
        }
    }
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    // Close report modal too
    closeReportModal();
    
    // Refresh tickets list
    if (currentUser) {
        loadCustomerTickets(currentUser.uid);
    }
}

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && 
                firebase.apps && 
                firebase.apps.length > 0) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Load customer data from Firestore
async function loadCustomerData() {
    try {
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            customerData = userDoc.data();
            console.log('[Submit Report] Customer data loaded:', customerData);
            
            // Populate customer info (using 'name' and 'phone' fields from Firestore)
            const name = customerData.name || customerData.fullName || currentUser.displayName || 'Not provided';
            const phone = customerData.phone || customerData.contactNumber || customerData.phoneNumber || 'Not provided';
            
            console.log('[Submit Report] Name:', name);
            console.log('[Submit Report] Phone:', phone);
            
            document.getElementById('customerName').textContent = name;
            document.getElementById('customerEmail').textContent = currentUser.email || 'Not provided';
            document.getElementById('customerPhone').textContent = phone;
        } else {
            console.log('[Submit Report] No Firestore document found for user');
            // Use email if no Firestore document
            document.getElementById('customerName').textContent = currentUser.displayName || 'Customer';
            document.getElementById('customerEmail').textContent = currentUser.email;
            document.getElementById('customerPhone').textContent = 'Not provided';
        }
    } catch (error) {
        console.error('[Submit Report] Error loading customer data:', error);
        // Fallback to basic auth data
        document.getElementById('customerName').textContent = currentUser.displayName || 'Customer';
        document.getElementById('customerEmail').textContent = currentUser.email;
        document.getElementById('customerPhone').textContent = 'Not provided';
    }
}

// Load customer's recent orders for the dropdown
async function loadCustomerOrders() {
    try {
        const db = firebase.firestore();
        const ordersSnapshot = await db.collection('delivery')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const orderSelect = document.getElementById('orderId');
        
        if (!ordersSnapshot.empty) {
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                
                // Format order display
                const date = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'Unknown date';
                const total = order.total ? `₱${order.total.toFixed(2)}` : '';
                const status = order.status || '';
                
                option.textContent = `Order #${doc.id.substring(0, 8)} - ${date} ${total} (${status})`;
                orderSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('[Submit Report] Error loading orders:', error);
        // Orders dropdown will just show "Select an order" if this fails
    }
}

// Setup form event listeners
function setupFormListeners() {
    const form = document.getElementById('reportForm');
    const subjectInput = document.getElementById('subject');
    const descriptionInput = document.getElementById('description');
    const photoUpload = document.getElementById('photoUpload');
    
    // Character counter for description only (subject is now number-only)
    if (descriptionInput) {
        descriptionInput.addEventListener('input', () => {
            const descCount = document.getElementById('descCount');
            if (descCount) {
                descCount.textContent = descriptionInput.value.length;
            }
        });
    }
    
    // Photo upload preview
    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoUpload);
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
}

// Handle photo upload and preview
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    
    if (file) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            event.target.value = '';
            return;
        }
        
        // Update file name display
        document.getElementById('fileName').textContent = file.name;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Remove uploaded image
function removeImage() {
    document.getElementById('photoUpload').value = '';
    document.getElementById('fileName').textContent = 'Choose a photo or click to take a picture';
    document.getElementById('imagePreview').style.display = 'none';
}

// Handle form submission
async function handleSubmit(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login to submit a ticket');
        return;
    }
    
    // Get form data
    const formData = {
        category: document.getElementById('category').value,
        subject: document.getElementById('subject').value.trim(),
        description: document.getElementById('description').value.trim()
    };
    
    // Validate
    if (formData.description.length < 20) {
        alert('Please provide a more detailed description (minimum 20 characters)');
        return;
    }
    
    // Show loading
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('submitBtn').disabled = true;
    
    try {
        const db = firebase.firestore();
        
        // Upload photo if provided
        let photoURL = null;
        const photoFile = document.getElementById('photoUpload').files[0];
        
        if (photoFile) {
            console.log('[Submit Report] Photo file detected, uploading to Cloudinary...');
            photoURL = await uploadPhoto(photoFile);
            if (photoURL) {
                console.log('[Submit Report] Photo uploaded successfully');
            } else {
                console.warn('[Submit Report] Photo upload failed, continuing without photo');
            }
        }
        
        // Generate ticket ID
        const ticketId = generateTicketId();
        
        // Create ticket object
        const ticket = {
            ticketId: ticketId,
            customerId: currentUser.uid,
            customerEmail: currentUser.email,
            customerName: customerData?.name || customerData?.fullName || currentUser.displayName || 'Customer',
            customerPhone: customerData?.phone || customerData?.contactNumber || customerData?.phoneNumber || 'Not provided',
            category: formData.category,
            subject: formData.subject,
            description: formData.description,
            priority: 'medium', // Default priority
            status: 'pending',
            photoURL: photoURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            resolvedAt: null,
            adminNotes: '',
            conversation: []
        };
        
        // Save to Firestore
        await db.collection('supportTickets').add(ticket);
        
        console.log('[Submit Report] Ticket submitted successfully:', ticketId);
        
        // Hide loading
        document.getElementById('loadingIndicator').style.display = 'none';
        
        // Show success modal
        showSuccessModal(ticketId);
        
    } catch (error) {
        console.error('[Submit Report] Error submitting ticket:', error);
        alert('Error submitting ticket. Please try again.');
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('submitBtn').disabled = false;
    }
}

// Upload photo to Cloudinary
async function uploadPhoto(file) {
    try {
        console.log('[Submit Report] Uploading photo to Cloudinary...');
        
        // Check if Cloudinary upload function is available
        if (typeof window.uploadImageToCloudinary !== 'function') {
            console.error('[Submit Report] Cloudinary upload function not available');
            throw new Error('Photo upload service not available');
        }
        
        // Upload to Cloudinary
        const result = await window.uploadImageToCloudinary(file);
        console.log('[Submit Report] Photo uploaded successfully:', result.secure_url);
        
        return result.secure_url;
    } catch (error) {
        console.error('[Submit Report] Error uploading photo to Cloudinary:', error);
        // Return null to allow ticket submission without photo
        return null;
    }
}

// Generate unique ticket ID
function generateTicketId() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TKT-${year}-${random}`;
}

// Show success modal
function showSuccessModal(ticketId) {
    // Close report modal first
    closeReportModal();
    
    // Show success modal
    document.getElementById('ticketIdDisplay').textContent = ticketId;
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.style.display = 'flex';
    }
}

// View my tickets - now just closes modal and scrolls to tickets
function viewMyTickets() {
    closeSuccessModal();
    
    // Scroll to tickets section
    const ticketsSection = document.querySelector('.support-section');
    if (ticketsSection) {
        ticketsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Submit another ticket
function submitAnother() {
    closeSuccessModal();
    openReportModal();
}

// No longer needed - keeping modal in same page
// function goBack() - REMOVED
