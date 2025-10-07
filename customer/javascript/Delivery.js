document.addEventListener('DOMContentLoaded', function() {
    const btnDelivery = document.getElementById('btn-delivery');
    const btnPickup = document.getElementById('btn-pickup');
    const addressSection = document.getElementById('address-section');
  
    function setActive(isDelivery) {
      if (isDelivery) {
        btnDelivery.style.background = '#ff5c5c';
        btnPickup.style.background = '#888';
        addressSection.style.display = '';
      } else {
        btnDelivery.style.background = '#888';
        btnPickup.style.background = '#ff5c5c';
        addressSection.style.display = 'none';
      }
    }
  
    btnDelivery.addEventListener('click', function() { setActive(true); });
    btnPickup.addEventListener('click', function() { setActive(false); });
  
    // Default: show address for Delivery
    setActive(true);
  });