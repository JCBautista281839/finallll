// Reviews functionality with Firebase integration
document.addEventListener('DOMContentLoaded', () => {
  console.log('Reviews system loaded, initializing Firebase...');

  /* Integrated right-side popup helper (to replace alert()) */
  function ensureToastStyles() {
    if (document.getElementById('site-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'site-toast-styles';
    style.textContent = `
      .site-toast-container { position: fixed; right: 18px; top: 18px; z-index: 11000; display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
      .site-toast { background: #231517; color: #fff; padding: 18px 20px; border-radius: 12px; min-width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); font-family: 'PoppinsRegular', sans-serif; }
      .site-toast .toast-body { color: #f1e9e9; font-size: 14px; margin-bottom: 8px; }
      .site-toast .toast-actions { display:flex; gap:8px; justify-content:flex-end; }
      .site-toast .btn-toast { background:#ffd1dc; color:#6b0f14; border:none; padding:8px 14px; border-radius:999px; cursor:pointer; font-weight:600; }
      .site-toast.success { border-left: 6px solid #4CAF50; }
      .site-toast.error { border-left: 6px solid #f44336; }
    `;
    document.head.appendChild(style);
  }

  function getToastContainer() {
    let container = document.querySelector('.site-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'site-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showInlineAlert(message, options = {}) {
    ensureToastStyles();
    const { type = 'info', autoHide = true, duration = 3500 } = options;
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `site-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-body">${message}</div>
      <div class="toast-actions"><button class="btn-toast">OK</button></div>
    `;

    const btn = toast.querySelector('.btn-toast');
    btn.addEventListener('click', () => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });

    container.appendChild(toast);

    if (autoHide) {
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, duration);
    }

    return toast;
  }

  // Wait for Firebase to be ready
  function waitForFirebase() {
    if (window.isFirebaseReady && window.isFirebaseReady()) {
      console.log('Firebase is ready for reviews!');
      initializeReviewsSystem();
    } else {
      console.log('Firebase not ready yet, waiting...');
      setTimeout(waitForFirebase, 200);
    }
  }

  function initializeReviewsSystem() {
    console.log('Initializing reviews system...');
    loadReviewsFromFirebase();
    setupReviewForm();
    setupAuthStateListener();
  }

  function loadReviewsFromFirebase() {
    console.log('Loading reviews from Firebase...');

    try {
      const db = firebase.firestore();

      // Get reviews from Firebase
      db.collection('reviews')
        .orderBy('createdAt', 'desc')
        .limit(3) // Show only the 3 most recent reviews
        .onSnapshot((querySnapshot) => {
          console.log('Reviews loaded from Firebase:', querySnapshot.size);

          if (querySnapshot.empty) {
            console.log('No reviews found, showing default reviews');
            return;
          }

          // Update the reviews display
          updateReviewsDisplay(querySnapshot.docs);

        }, (error) => {
          console.error('Error loading reviews:', error);
          // Keep default reviews if Firebase fails
        });
    } catch (error) {
      console.error('Error accessing Firebase:', error);
    }
  }

  function updateReviewsDisplay(reviewDocs) {
    const reviewsContainer = document.querySelector('.customer-reviews-cards');
    if (!reviewsContainer) return;

    // Clear existing reviews
    reviewsContainer.innerHTML = '';

    reviewDocs.forEach((doc, index) => {
      const reviewData = doc.data();
      console.log(`Review ${index + 1} categories:`, reviewData.categories);

      // Clean up categories before displaying
      if (reviewData.categories && Array.isArray(reviewData.categories)) {
        reviewData.categories = [...new Set(reviewData.categories.filter(cat => cat && cat.trim()))];
        console.log(`Cleaned categories for review ${index + 1}:`, reviewData.categories);
      }

      const reviewCard = createReviewCard(reviewData, index);
      reviewsContainer.appendChild(reviewCard);
    });
  }

  function createReviewCard(reviewData, index) {
    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';

    // Get first letter of name or use 'A' for anonymous
    const avatar = reviewData.name ? reviewData.name.charAt(0).toUpperCase() : 'A';

    // Create star rating HTML
    const stars = createStarRating(reviewData.rating || 4);

    // Create categories HTML - use empty array if no categories to avoid duplicates
    const categories = reviewData.categories || [];
    const categoriesHTML = createCategoriesDisplay(categories);

    // Format the name properly
    const displayName = reviewData.name && reviewData.name !== 'Anonymous' ?
      reviewData.name.toUpperCase() : 'ANONYMOUS';

    reviewCard.innerHTML = `
      <div class="review-avatar">${avatar}</div>
      <div class="review-content">
        <div class="review-header">
          <div class="review-name">${displayName}</div>
          <div class="review-stars">
            ${stars}
          </div>
        </div>
        <div class="review-categories">
          ${categoriesHTML}
        </div>
        <div class="review-text">"${reviewData.comment || 'Great food and service!'}"</div>
      </div>
    `;

    return reviewCard;
  }

  function createStarRating(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        // Filled star: use star (1).png (yellow filled)
        starsHTML += '<span class="star-filled"></span>';
      } else {
        // Empty star: use star.png (empty outline)
        starsHTML += '<span class="star-empty"></span>';
      }
    }
    return starsHTML;
  }

  function createCategoriesDisplay(categories) {
    if (!categories || categories.length === 0) {
      return '<span class="review-category-tag">General Review</span>';
    }

    // Remove duplicates and filter out empty/null values
    const uniqueCategories = [...new Set(categories.filter(cat => cat && cat.trim()))];

    return uniqueCategories.map(category =>
      `<span class="review-category-tag">${category}</span>`
    ).join(' ');
  }

  // Global variable to track selected rating
  let globalSelectedRating = 0;

  function setupReviewForm() {
    const ratingForm = document.querySelector('.rating-form');
    if (!ratingForm) return;

    let selectedRating = 0;
    globalSelectedRating = 0; // Initialize global variable

    // Check authentication state and update UI accordingly
    checkAuthenticationAndUpdateUI();

    // Handle star rating selection
    const starInputs = ratingForm.querySelectorAll('.star-input');
    starInputs.forEach((star, index) => {
      star.addEventListener('click', () => {
        selectedRating = index + 1;
        globalSelectedRating = index + 1; // Update global variable
        updateStarDisplay(starInputs, selectedRating);
      });

      star.addEventListener('mouseenter', () => {
        updateStarDisplay(starInputs, index + 1);
      });
    });

    // Reset stars on mouse leave
    ratingForm.addEventListener('mouseleave', () => {
      updateStarDisplay(starInputs, selectedRating);
    });

    // Handle category selection - allow unlimited multiple selection
    const categoryBtns = ratingForm.querySelectorAll('.rating-category-btn');
    let selectedCategories = []; // Start with no categories selected

    // Remove counter functionality - no longer needed

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Button clicked:', btn.textContent);
        console.log('Button disabled:', btn.disabled);

        // Don't allow interaction if form is disabled
        if (btn.disabled) {
          console.log('Button is disabled, ignoring click');
          return;
        }

        const isCurrentlyActive = btn.classList.contains('active');
        console.log('Current active state:', isCurrentlyActive);

        if (isCurrentlyActive) {
          // If already selected, deselect it
          console.log('Deselecting button:', btn.textContent);
          toggleCategoryButton(btn, false);
          selectedCategories = selectedCategories.filter(cat => cat !== btn.textContent);
          console.log('Deselected:', btn.textContent);
        } else {
          // If not selected, select it
          console.log('Selecting button:', btn.textContent);
          toggleCategoryButton(btn, true);
          selectedCategories.push(btn.textContent);
          console.log('Selected:', btn.textContent);
        }

        // Show message if no categories are selected (but allow it)
        if (selectedCategories.length === 0) {
          showCategoryMessage('No categories selected. You can add categories to help categorize your review.');
        }

        console.log('Selected categories:', selectedCategories);
        console.log('Button classes after toggle:', btn.className);
      });
    });

    // Initialize with no categories selected by default
    setTimeout(() => {
      // Ensure all buttons start in unselected state
      categoryBtns.forEach((btn, index) => {
        // Clear any existing classes and styles
        btn.classList.remove('active');
        btn.style.removeProperty('background-color');
        btn.style.removeProperty('color');
        btn.style.removeProperty('border');

        // Set default unselected state
        toggleCategoryButton(btn, false);
        console.log(`Initialized button ${index + 1} (${btn.textContent}) as unselected`);
      });
      console.log('All category buttons initialized as unselected');
    }, 100);

    // Handle form submission
    ratingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // If not authenticated, show alert only
      if (!isUserAuthenticated()) {
        showInlineAlert('Please sign in to submit your review.', { type: 'error', autoHide: false });
        return;
      }

      const comment = ratingForm.querySelector('.rating-textarea').value.trim();

      if (selectedRating === 0) {
        showInlineAlert('Please select a rating before submitting.', { type: 'error', autoHide: false });
        return;
      }

      if (!comment) {
        showInlineAlert('Please write a comment before submitting.', { type: 'error', autoHide: false });
        return;
      }

      // Categories are now optional - no validation needed

      // Check if user wants to post anonymously
      const anonymousCheckbox = document.getElementById('anonymous-review');
      const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;

      submitReview({
        rating: selectedRating,
        categories: selectedCategories, // Save all selected categories
        comment: comment,
        name: isAnonymous ? 'Anonymous' : getAuthenticatedUserName()
      });

      // Refresh page after successful submit
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });
  }

  function updateStarDisplay(stars, rating) {
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
        star.classList.remove('star-empty');
      } else {
        star.classList.remove('active');
        if (!star.classList.contains('star-empty')) {
          star.classList.add('star-empty');
        }
      }
    });
  }

  function toggleCategoryButton(button, isActive) {
    // Clear any existing inline styles first
    button.style.removeProperty('background-color');
    button.style.removeProperty('color');
    button.style.removeProperty('border');

    if (isActive) {
      // Select the button
      button.classList.add('active');
      button.style.setProperty('background-color', '#96392d', 'important');
      button.style.setProperty('color', '#fff', 'important');
      button.style.setProperty('border', '2px solid #760000', 'important');
      button.style.setProperty('transform', 'scale(1.02)', 'important');

      // Add a subtle animation
      setTimeout(() => {
        button.style.setProperty('transform', 'scale(1)', 'important');
      }, 150);
    } else {
      // Deselect the button
      button.classList.remove('active');
      button.style.setProperty('background-color', '#f8f9fa', 'important');
      button.style.setProperty('color', '#333', 'important');
      button.style.setProperty('border', '2px solid #dee2e6', 'important');
      button.style.setProperty('transform', 'scale(0.98)', 'important');

      // Add a subtle animation
      setTimeout(() => {
        button.style.setProperty('transform', 'scale(1)', 'important');
      }, 150);
    }
  }

  function showCategoryMessage(message) {
    // Remove any existing message
    const existingMessage = document.querySelector('.category-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'category-message';
    messageDiv.innerHTML = `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 8px 12px; margin: 8px 0; text-align: center; font-size: 12px; color: #856404; font-family: 'PoppinsRegular', sans-serif;">
        ${message}
      </div>
    `;

    // Insert after the category buttons
    const ratingForm = document.querySelector('.rating-form');
    const categoriesDiv = ratingForm.querySelector('.rating-categories');
    if (categoriesDiv) {
      categoriesDiv.parentNode.insertBefore(messageDiv, categoriesDiv.nextSibling);

      // Remove message after 3 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 3000);
    }
  }

  function submitReview(reviewData) {
    console.log('Submitting review:', reviewData);

    try {
      const db = firebase.firestore();

      // Add timestamp
      reviewData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

      // Submit to Firebase
      db.collection('reviews').add(reviewData)
        .then((docRef) => {
          console.log('Review submitted successfully:', docRef.id);

          // Show success message
          showSuccessMessage();

          // Reset form
          resetReviewForm();

        })
        .catch((error) => {
          console.error('Error submitting review:', error);
          showInlineAlert('Sorry, there was an error submitting your review. Please try again.', { type: 'error' });
        });
    } catch (error) {
      console.error('Error accessing Firebase:', error);
      showInlineAlert('Sorry, there was an error accessing the database. Please try again.', { type: 'error' });
    }
  }

  function showSuccessMessage() {
    // Use the integrated right-side toast for success
    showInlineAlert('✓ Thank you for your review! It has been submitted successfully.', { type: 'success', autoHide: true, duration: 3000 });
  }

  function resetReviewForm() {
    const ratingForm = document.querySelector('.rating-form');

    // Reset rating to zero (no stars selected)
    const starInputs = ratingForm.querySelectorAll('.star-input');
    starInputs.forEach(star => star.classList.remove('active'));

    // Reset global rating variable
    globalSelectedRating = 0;

    // Force update star display to show 0 stars
    updateStarDisplay(starInputs, 0);

    // Reset categories - no categories selected by default
    const categoryBtns = ratingForm.querySelectorAll('.rating-category-btn');
    categoryBtns.forEach(btn => toggleCategoryButton(btn, false));

    // Reset selected categories array
    selectedCategories = [];

    // Reset textarea
    ratingForm.querySelector('.rating-textarea').value = '';

    // Reset anonymous checkbox
    const anonymousCheckbox = document.getElementById('anonymous-review');
    if (anonymousCheckbox) {
      anonymousCheckbox.checked = false;
    }

    console.log('Review form reset - rating set to 0, all fields cleared');
  }

  // Authentication helper functions
  function isUserAuthenticated() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        return user !== null;
      }
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  function getAuthenticatedUserName() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const user = firebase.auth().currentUser;
        if (user) {
          return user.displayName || user.email.split('@')[0] || 'User';
        }
      }
      return 'Anonymous';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'Anonymous';
    }
  }

  function checkAuthenticationAndUpdateUI() {
    const ratingForm = document.querySelector('.rating-form');
    if (!ratingForm) return;

    // Always show normal form, never replace with sign-in layout
    updateFormForAuthenticatedUser();
  }

  function updateFormForAuthenticatedUser() {
    const ratingForm = document.querySelector('.rating-form');
    const shareBtn = ratingForm.querySelector('.share-btn');
    const ratingTitle = ratingForm.querySelector('.rating-form-title');

    // Remove any login prompts
    const loginPrompt = ratingForm.querySelector('.login-prompt');
    if (loginPrompt) {
      loginPrompt.remove();
    }

    // Restore normal functionality
    if (shareBtn) {
      shareBtn.textContent = 'Share';
      shareBtn.disabled = false;
      shareBtn.style.opacity = '1';
    }

    if (ratingTitle) {
      ratingTitle.textContent = 'Rate your experience';
    }

    // Enable form elements
    enableFormElements(true);

  }

  function updateFormForUnauthenticatedUser() {
    const ratingForm = document.querySelector('.rating-form');
    if (!ratingForm) return;

    // Create the unauthenticated user form layout
    ratingForm.innerHTML = `
      <div class="rating-form-title-stars-row">
        <span class="rating-form-title">Share your experience</span>
        <span class="rating-stars-input" id="customRatingStars">
            <span class="star-input star-empty" data-value="1" tabindex="0" aria-label="1 star"></span>
            <span class="star-input star-empty" data-value="2" tabindex="0" aria-label="2 stars"></span>
            <span class="star-input star-empty" data-value="3" tabindex="0" aria-label="3 stars"></span>
            <span class="star-input star-empty" data-value="4" tabindex="0" aria-label="4 stars"></span>
            <span class="star-input star-empty" data-value="5" tabindex="0" aria-label="5 stars"></span>
          </span>
      </div>
      <div class="rating-categories">
        <button type="button" class="rating-category-btn active" disabled>Overall Service</button>
        <button type="button" class="rating-category-btn" disabled>Food Quality</button>
        <button type="button" class="rating-category-btn" disabled>Cleanliness</button>
        <button type="button" class="rating-category-btn" disabled>Ambience</button>
        <button type="button" class="rating-category-btn" disabled>Pricing</button>
      </div>
      <textarea class="rating-textarea" placeholder="Please sign in to write a review..." maxlength="300" disabled></textarea>
      <div class="anonymous-toggle">
        <label class="anonymous-checkbox">
          <input type="checkbox" id="anonymous-review" disabled />
          <span class="checkmark"></span>
          Post as anonymous
        </label>
      </div>
      <button type="button" class="share-btn" id="sign-in-btn">Sign In to Review</button>
    `;

    // Add event listener for the sign-in button
    const signInBtn = ratingForm.querySelector('#sign-in-btn');
    if (signInBtn) {
      signInBtn.addEventListener('click', () => {
        window.location.href = 'html/login.html';
      });
    }
  }

  function enableFormElements(enabled) {
    const ratingForm = document.querySelector('.rating-form');
    const stars = ratingForm.querySelectorAll('.star-input');
    const categories = ratingForm.querySelectorAll('.rating-category-btn');
    const textarea = ratingForm.querySelector('.rating-textarea');
    const anonymousCheckbox = document.getElementById('anonymous-review');

    stars.forEach(star => {
      star.style.pointerEvents = enabled ? 'auto' : 'none';
      star.style.opacity = enabled ? '1' : '0.5';
    });

    categories.forEach(btn => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
    });

    if (textarea) {
      textarea.disabled = !enabled;
      textarea.style.opacity = enabled ? '1' : '0.5';
      if (!enabled) {
        textarea.placeholder = 'Please sign in to write a review...';
      } else {
        textarea.placeholder = 'Tell us what can be improved...';
      }
    }

    // Handle anonymous checkbox
    if (anonymousCheckbox) {
      anonymousCheckbox.disabled = !enabled;
      const checkboxLabel = anonymousCheckbox.closest('.anonymous-checkbox');
      if (checkboxLabel) {
        checkboxLabel.style.opacity = enabled ? '1' : '0.5';
        checkboxLabel.style.pointerEvents = enabled ? 'auto' : 'none';
      }
    }
  }


  function showLoginPrompt() {
    // Create a modal-style login prompt
    const modal = document.createElement('div');
    modal.className = 'review-login-modal';
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
          <div style="margin-bottom: 16px;">
            <i class="fas fa-user-lock" style="font-size: 48px; color: #96392d; margin-bottom: 16px;"></i>
          </div>
          <h3 style="color: #96392d; font-family: 'PoppinsRegular', sans-serif; margin-bottom: 12px;">Sign In Required</h3>
          <p style="color: #666; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
            Please sign in to your account to share your review and help other customers make informed decisions.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="review-login-btn" style="background: #96392d; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-family: 'PoppinsRegular', sans-serif; cursor: pointer; font-size: 14px;">
              Sign In
            </button>
            <button id="review-cancel-btn" style="background: #f8f9fa; color: #666; border: 1px solid #dee2e6; padding: 12px 24px; border-radius: 6px; font-family: 'PoppinsRegular', sans-serif; cursor: pointer; font-size: 14px;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('review-login-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
      window.location.href = 'html/login.html';
    });

    document.getElementById('review-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }


  function setupAuthStateListener() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
          console.log('Reviews: Auth state changed:', user ? 'User logged in' : 'User logged out');

          // Update the review form UI based on authentication state
          setTimeout(() => {
            checkAuthenticationAndUpdateUI();
          }, 100);
        });
      }
    } catch (error) {
      console.error('Error setting up auth state listener for reviews:', error);
    }
  }

  // Start the Firebase initialization
  waitForFirebase();
});
