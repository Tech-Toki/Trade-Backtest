// Right-click menu for the chart.
export function initContextMenu(el, items) {
  const m = document.createElement('div');
  m.className = 'menu ctx'; m.hidden = true; document.body.appendChild(m);
  m.innerHTML = items.map((it, i) => `<button data-i="${i}">${it.label}</button>`).join('');
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.hidden = false; });
  m.onclick = (e) => { const b = e.target.closest('button'); if (b) { m.hidden = true; items[+b.dataset.i].run(); } };
  document.addEventListener('click', () => (m.hidden = true));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && (m.hidden = true));
}
