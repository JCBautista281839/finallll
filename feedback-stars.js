// Star rating component using two images: star.png (empty), star (1).png (yellow)

document.addEventListener('DOMContentLoaded', function() {
  const stars = document.querySelectorAll('.rating-stars-input .star-input');
  let selectedRating = 0;

  function renderStars(rating) {
    stars.forEach((star, i) => {
      if (i < rating) {
        star.classList.add('star-yellow');
        star.classList.remove('star-empty');
      } else {
        star.classList.remove('star-yellow');
        star.classList.add('star-empty');
      }
    });
  }

  // Initial render (all empty)
  renderStars(0);

  stars.forEach((star, idx) => {
    // Hover: preview up to hovered star
    star.addEventListener('mouseenter', function() {
      renderStars(idx + 1);
    });
    // Mouse leave: restore to selected
    star.addEventListener('mouseleave', function() {
      renderStars(selectedRating);
    });
    // Click: set rating
    star.addEventListener('click', function() {
      selectedRating = idx + 1;
      renderStars(selectedRating);
    });
  });

  // Multi-select for rating categories
  const categoryBtns = document.querySelectorAll('.rating-category-btn');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      btn.classList.toggle('active');
    });
  });

  // Expose for form submission
  window.getFeedbackRating = function() {
    return selectedRating;
  };
});
