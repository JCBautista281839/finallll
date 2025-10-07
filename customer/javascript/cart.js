document.addEventListener("DOMContentLoaded", () => {
  const openCartBtn = document.querySelector(".open-cart");
  const closeCartBtn = document.querySelector(".close-cart");
  const cartOverlay = document.getElementById("shopping-cart");
  const cartItemsContainer = document.getElementById("cart-items");
  const addToCartButtons = document.querySelectorAll(".add-to-cart");

  let cart = {}; // in-memory cart object
  
  // Load cart from sessionStorage on page load
  function loadCartFromStorage() {
    const savedCart = sessionStorage.getItem('cartData');
    if (savedCart) {
      cart = JSON.parse(savedCart);
      updateCartDisplay();
    }
  }
  
  // Save cart to sessionStorage
  function saveCartToStorage() {
    sessionStorage.setItem('cartData', JSON.stringify(cart));
  }
  
  // Load cart on page load
  loadCartFromStorage();

  // Show cart overlay
  openCartBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cartOverlay.classList.add("active");
  });

  // Close cart overlay
  closeCartBtn.addEventListener("click", () => {
    cartOverlay.classList.remove("active");
  });

  // Add to cart button event
  addToCartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".menu-item");
      const itemName = item.querySelector("p").textContent.trim();
      const itemPrice = item.querySelector(".price").textContent.trim();

      // Save item or increment quantity
      if (cart[itemName]) {
        cart[itemName].quantity += 1;
      } else {
        cart[itemName] = {
          name: itemName,
          price: itemPrice,
          quantity: 1,
        };
      }

      updateCartDisplay();
      saveCartToStorage();
    });
  });

  function updateCartDisplay() {
   cartItemsContainer.innerHTML = "";
  const cartItems = Object.values(cart);
  const cartCountSpan = document.getElementById("cart-count");

  // Update cart count badge
  let totalItems = 0;
  cartItems.forEach(item => totalItems += item.quantity);
  cartCountSpan.textContent = totalItems;

  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = `<p class="empty-cart">No items in cart.</p>`;
    return;
  }

  cartItems.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("cart-item");
    itemDiv.innerHTML = `
      <p><strong>${item.name}</strong></p>
      <p>${item.price} × ${item.quantity}</p>
    `;
    cartItemsContainer.appendChild(itemDiv);
  });
  }
});
