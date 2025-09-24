// Reviews functionality with Firebase integration
document.addEventListener('DOMContentLoaded', () => {
  console.log('Reviews system loaded, initializing Firebase...');
  
  // Wait for Firebase to be ready
  function waitForFirebase() {
    if (window.isFirebaseReady && window.isFirebaseReady()) {
      console.log('Firebase is ready for reviews!');
      initializeReviewsSystem();
    } else {
      console.log('Firebase not ready yet, waiting...');
      setTimeout(waitForFirebase, 100);
    }
  }
  
  function initializeReviewsSystem() {
    console.log('Initializing reviews system...');
    loadReviewsFromFirebase();
    setupReviewForm();
  }
  
  function loadReviewsFromFirebase() {
    console.log('Loading reviews from Firebase...');
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
  }
  
  function updateReviewsDisplay(reviewDocs) {
    const reviewsContainer = document.querySelector('.customer-reviews-cards');
    if (!reviewsContainer) return;
    
    // Clear existing reviews
    reviewsContainer.innerHTML = '';
    
    reviewDocs.forEach((doc, index) => {
      const reviewData = doc.data();
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
    
    // Create categories HTML
    const categories = reviewData.categories || ['Overall Service'];
    const categoriesHTML = createCategoriesDisplay(categories);
    
    reviewCard.innerHTML = `
      <div class="review-avatar">${avatar}</div>
      <div class="review-content">
        <div class="review-header">
          <div class="review-name">${reviewData.name || 'ANONYMOUS'}</div>
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
      return '<span class="review-category-tag">Overall Service</span>';
    }
    
    return categories.map(category => 
      `<span class="review-category-tag">${category}</span>`
    ).join(' ');
  }
  
  function setupReviewForm() {
    const ratingForm = document.querySelector('.rating-form');
    if (!ratingForm) return;
    
    let selectedRating = 0;
    let selectedCategory = 'Overall Service';
    
    // Handle star rating selection
    const starInputs = ratingForm.querySelectorAll('.star-input');
    starInputs.forEach((star, index) => {
      star.addEventListener('click', () => {
        selectedRating = index + 1;
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
    let selectedCategories = ['Overall Service']; // Start with Overall Service selected
    
    // Remove counter functionality - no longer needed
    
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Category button clicked:', btn.textContent);
        console.log('Current active state:', btn.classList.contains('active'));
        
        if (btn.classList.contains('active')) {
          // If already selected, deselect it
          btn.classList.remove('active');
          btn.style.backgroundColor = '#eee';
          btn.style.color = '#282828';
          selectedCategories = selectedCategories.filter(cat => cat !== btn.textContent);
          console.log('Deselected:', btn.textContent);
        } else {
          // If not selected, select it
          btn.classList.add('active');
          btn.style.backgroundColor = '#96392d';
          btn.style.color = '#fff';
          selectedCategories.push(btn.textContent);
          console.log('Selected:', btn.textContent);
        }
        
        // Allow deselecting all if user wants to start over
        // But provide a helpful message
        if (selectedCategories.length === 0) {
          alert('Please select at least one category for your review.');
          btn.classList.add('active');
          selectedCategories.push(btn.textContent);
        }
        
        console.log('Selected categories:', selectedCategories);
        console.log('Button classes after click:', btn.className);
      });
    });
    
    // Initialize with Overall Service selected
    setTimeout(() => {
      const firstBtn = categoryBtns[0];
      if (firstBtn) {
        firstBtn.classList.add('active');
        firstBtn.style.backgroundColor = '#96392d';
        firstBtn.style.color = '#fff';
        console.log('Initialized first button with active class:', firstBtn.className);
      }
    }, 100);
    
    // Handle form submission
    ratingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const comment = ratingForm.querySelector('.rating-textarea').value.trim();
      
      if (selectedRating === 0) {
        alert('Please select a rating before submitting.');
        return;
      }
      
      if (!comment) {
        alert('Please write a comment before submitting.');
        return;
      }
      
      submitReview({
        rating: selectedRating,
        categories: selectedCategories, // Save all selected categories
        comment: comment,
        name: 'Anonymous' // You can modify this to get user name if needed
      });
    });
  }
  
  function updateStarDisplay(stars, rating) {
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }
  
  function submitReview(reviewData) {
    console.log('Submitting review:', reviewData);
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
        alert('Sorry, there was an error submitting your review. Please try again.');
      });
  }
  
  function showSuccessMessage() {
    // Create a temporary success message
    const successMsg = document.createElement('div');
    successMsg.className = 'review-success-message';
    successMsg.innerHTML = `
      <div style="background: #4CAF50; color: white; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;">
        ✓ Thank you for your review! It has been submitted successfully.
      </div>
    `;
    
    const ratingForm = document.querySelector('.rating-form');
    ratingForm.insertBefore(successMsg, ratingForm.firstChild);
    
    // Remove message after 3 seconds
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  }
  
  function resetReviewForm() {
    const ratingForm = document.querySelector('.rating-form');
    
    // Reset rating
    const starInputs = ratingForm.querySelectorAll('.star-input');
    starInputs.forEach(star => star.classList.remove('active'));
    
    // Reset categories - only keep Overall Service selected
    const categoryBtns = ratingForm.querySelectorAll('.rating-category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    categoryBtns[0].classList.add('active'); // Set first category (Overall Service) as active
    
    // Reset selected categories array
    selectedCategories = ['Overall Service'];
    
    // Reset textarea
    ratingForm.querySelector('.rating-textarea').value = '';
  }
  
  // Start the Firebase initialization
  waitForFirebase();
});
