// Keep the chapter menu available on wide layouts and compact on smaller screens.
const menu = document.querySelector('.chapter-menu');
if (menu) {
  const wideLayout = window.matchMedia('(min-width: 80rem)');
  function syncMenu() {
    menu.open = wideLayout.matches;
  }
  syncMenu();
  wideLayout.addEventListener('change', syncMenu);
}
