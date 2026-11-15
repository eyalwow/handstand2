// Presentation-only sizing. No analysis hooks or storage reads/writes.
const nav = document.querySelector('.app-nav');
if (nav && typeof ResizeObserver === 'function') {
  const observer = new ResizeObserver(entries => {
    const size = entries[0].borderBoxSize?.[0]?.blockSize;
    if (size > 0) document.documentElement.style.setProperty('--fit-nav', `${Math.ceil(size) + 24}px`);
  });
  observer.observe(nav);
}
// Only keyboard navigation may request clearance. Pointer focus can occur on
// the enclosing <main> between pointerdown/up; moving it would lose label clicks.
let keyboardNavigation = false;
document.addEventListener('keydown', event => {
  if (event.key === 'Tab') keyboardNavigation = true;
}, true);
document.addEventListener('pointerdown', () => { keyboardNavigation = false; }, true);
document.addEventListener('focusin', event => {
  const target = event.target;
  if (!keyboardNavigation || !nav || nav.contains(target) || target.closest('dialog') ||
      !target.matches('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')) return;
  const box = target.getBoundingClientRect(), boundary = nav.getBoundingClientRect();
  if (boundary.height && box.bottom > boundary.top && box.top < boundary.bottom)
    window.scrollBy({top:box.bottom - boundary.top + 16, behavior:'instant'});
});
