document.querySelectorAll('[data-gallery]').forEach(gallery => {
  gallery.querySelectorAll('[data-panel]').forEach(button => {
    button.addEventListener('click', () => {
      gallery.querySelectorAll('[data-panel]').forEach(tab => {
        const selected = tab === button;
        tab.setAttribute('aria-pressed', String(selected));
        document.getElementById(tab.dataset.panel).hidden = !selected;
      });
    });
  });
});
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function updateArtwork() {
  document.querySelectorAll('img[src*="coffee-break"]').forEach(image => {
    image.src = image.src.replace(/coffee-break(?:-still)?\.webp/, reducedMotion.matches ? 'coffee-break-still.webp' : 'coffee-break.webp');
  });
}
reducedMotion.addEventListener('change', updateArtwork);
updateArtwork();
