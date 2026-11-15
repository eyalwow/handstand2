// Presentation-only sizing. No analysis hooks or storage reads/writes.
const nav = document.querySelector('.app-nav');
if (nav && typeof ResizeObserver === 'function') {
  const observer = new ResizeObserver(entries => {
    const size = entries[0].borderBoxSize?.[0]?.blockSize;
    if (size > 0) document.documentElement.style.setProperty('--fit-nav', `${Math.ceil(size) + 24}px`);
  });
  observer.observe(nav);
}
// Keyboard focus stays above the fixed navigation, including enlarged text.
document.addEventListener('focusin', event => {
  if (!nav || nav.contains(event.target) || event.target.closest('dialog')) return;
  const target = event.target.getBoundingClientRect(), boundary = nav.getBoundingClientRect();
  if (boundary.height && target.bottom > boundary.top && target.top < boundary.bottom)
    window.scrollBy({top:target.bottom - boundary.top + 16, behavior:'instant'});
});
