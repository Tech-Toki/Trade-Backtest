// Click-to-open dropdown that closes when you click elsewhere.
export function bindMenu(btn, menu) {
  btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.hidden = true; });
}
