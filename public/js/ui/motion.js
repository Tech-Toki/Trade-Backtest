const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Fade-up elements as they scroll into view.
export function reveal(root = document) {
  const els = root.querySelectorAll('.reveal:not(.in)');
  if (still() || !('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}
// Count a number up from 0.
export function countUp(el, to, format, ms = 750) {
  if (still()) { el.textContent = format(to); return; }
  const t0 = performance.now();
  const tick = (now) => { const k = Math.min(1, (now - t0) / ms); el.textContent = format(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
