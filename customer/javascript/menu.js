document.addEventListener('DOMContentLoaded', () => {
  const categoryLinks = document.querySelectorAll('.categories a');
  const categoryMenus = document.querySelectorAll('.category-menu');

  categoryLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();

      const targetId = link.getAttribute('data-category');
      const targetMenu = document.getElementById(targetId);

      // Hide all menus
      categoryMenus.forEach(menu => menu.classList.remove('active'));

      // Show the selected one
      if (targetMenu) {
        targetMenu.classList.add('active');
      }
    });
  });
});
