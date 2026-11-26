// Left drawing toolbar: grouped tools with flyouts, plus a draggable floating bar for favourite tools.
// Star a tool in a flyout (or right-click a tool) to add it to the floating bar.
const ICONS = {
  cursor: '<path d="M5 3l12 7-5 1.5L9.5 17z"/>',
  trend: '<path d="M4 18L18 6"/><circle cx="4" cy="18" r="1.6"/><circle cx="18" cy="6" r="1.6"/>',
  ray: '<path d="M4 17L21 7"/><circle cx="4" cy="17" r="1.6"/>',
  extended: '<path d="M2 20L22 4"/><circle cx="9" cy="14.7" r="1.4"/><circle cx="15" cy="9.8" r="1.4"/>',
  hray: '<path d="M4 12h17"/><circle cx="4" cy="12" r="1.6"/>',
  hline: '<path d="M3 12h18"/>', vline: '<path d="M12 3v18"/>', cross: '<path d="M3 12h18M12 3v18"/>',
  arrow: '<path d="M4 19L19 5M19 5h-6M19 5v6"/>',
  channel: '<path d="M3 15L15 4M9 21L21 10"/>', rect: '<rect x="5" y="6" width="14" height="11"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="8" ry="5.5"/>', triangle: '<path d="M12 5l8 14H4z"/>', brush: '<path d="M4 17c3-8 5 2 8-4s4-4 8-6"/>',
  fib: '<path d="M4 5h16M4 10h16M4 15h16M4 20h16"/>', fibext: '<path d="M3 19L8 9l5 6M13 6h8M13 11h8M13 16h8"/>',
  longpos: '<rect x="4" y="4" width="16" height="8"/><path d="M4 12h16M4 18h16" opacity=".6"/>',
  shortpos: '<rect x="4" y="12" width="16" height="8"/><path d="M4 12h16M4 6h16" opacity=".6"/>',
  text: '<path d="M6 6h12M12 6v13M9 19h6"/>', measure: '<rect x="3" y="9" width="18" height="6"/><path d="M7 9v3M11 9v3M15 9v3M19 9v3"/>',
  eraser: '<path d="M5 15l8-9 6 5-6 8H8zM8 19h11"/>', trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
  clear: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11l4 6M14 11l-4 6"/>',
};
const TITLES = {
  cursor: 'Cursor', trend: 'Trend line', ray: 'Ray', extended: 'Extended line', hray: 'Horizontal ray', hline: 'Horizontal line', vline: 'Vertical line', cross: 'Cross line', arrow: 'Arrow',
  channel: 'Parallel channel', rect: 'Rectangle', ellipse: 'Ellipse', triangle: 'Triangle', brush: 'Brush', fib: 'Fib retracement', fibext: 'Trend-based fib extension',
  longpos: 'Long position', shortpos: 'Short position', text: 'Text', measure: 'Measure', eraser: 'Eraser', trash: 'Delete selected (Del)', clear: 'Delete all drawings',
};
const GROUPS = [['cursor'], ['trend', 'ray', 'extended', 'hray', 'hline', 'vline', 'cross', 'arrow'], ['channel', 'rect', 'ellipse', 'triangle', 'brush'], ['fib', 'fibext'], ['longpos', 'shortpos'], ['text'], ['measure'], ['eraser']];
const svg = (id) => `<svg viewBox="0 0 24 24">${ICONS[id]}</svg>`;
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

export function buildDrawingToolbar(el, { favEl, onPick, onDelete, onClear, onColor }) {
  let favs = load('tb_favs', ['trend', 'hline', 'rect', 'fib', 'longpos', 'shortpos']), active = 'cursor';
  el.innerHTML = GROUPS.map((g, i) => `<div class="grp" data-g="${i}"><button data-main title="${TITLES[g[0]]}">${svg(g[0])}${g.length > 1 ? '<span class="caret"></span>' : ''}</button>` +
    (g.length > 1 ? `<div class="fly" hidden>${g.map((t) => `<button data-tool="${t}">${svg(t)}<span>${TITLES[t]}</span><i class="star" data-star="${t}" title="Add to favourites bar">★</i></button>`).join('')}</div>` : '') + '</div>').join('') +
    `<hr><button data-act="trash" title="${TITLES.trash}">${svg('trash')}</button><button data-act="clear" title="${TITLES.clear}">${svg('clear')}</button><input type="color" id="drawColor" value="#e2a33b" title="Drawing colour">`;
  const cur = GROUPS.map((g) => g[0]), closeFly = () => el.querySelectorAll('.fly').forEach((f) => (f.hidden = true));

  /* favourites bar */
  const saved = load('tb_favpos', null);
  function renderFavs() {
    el.querySelectorAll('[data-star]').forEach((s) => s.classList.toggle('on', favs.includes(s.dataset.star)));
    favEl.hidden = !favs.length;
    favEl.innerHTML = '<span class="grab" title="Drag">⋮⋮</span>' + favs.map((t) => `<button data-fav="${t}" class="${t === active ? 'on' : ''}" title="${TITLES[t]}">${svg(t)}</button>`).join('');
    if (!saved && favs.length) requestAnimationFrame(() => { if (!favEl.dataset.moved) { favEl.style.left = Math.max(8, (favEl.parentElement.clientWidth - favEl.offsetWidth) / 2) + 'px'; favEl.style.top = '8px'; } });
  }
  const toggleFav = (t) => { favs = favs.includes(t) ? favs.filter((x) => x !== t) : [...favs, t]; localStorage.setItem('tb_favs', JSON.stringify(favs)); renderFavs(); };
  if (saved) { favEl.style.left = saved.x + 'px'; favEl.style.top = saved.y + 'px'; favEl.dataset.moved = '1'; }
  let drag = null;
  favEl.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.grab')) return;
    const r = favEl.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, pr: favEl.parentElement.getBoundingClientRect() };
    favEl.setPointerCapture(e.pointerId);
  });
  favEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    favEl.style.left = Math.min(Math.max(0, e.clientX - drag.pr.left - drag.dx), drag.pr.width - favEl.offsetWidth) + 'px';
    favEl.style.top = Math.min(Math.max(0, e.clientY - drag.pr.top - drag.dy), drag.pr.height - favEl.offsetHeight) + 'px';
  });
  favEl.addEventListener('pointerup', () => { if (drag) { favEl.dataset.moved = '1'; localStorage.setItem('tb_favpos', JSON.stringify({ x: favEl.offsetLeft, y: favEl.offsetTop })); drag = null; } });
  favEl.addEventListener('click', (e) => { const b = e.target.closest('[data-fav]'); if (b) onPick(b.dataset.fav); });

  el.onclick = (e) => {
    const star = e.target.closest('[data-star]'); if (star) return toggleFav(star.dataset.star);
    const act = e.target.closest('[data-act]'); if (act) return act.dataset.act === 'trash' ? onDelete() : onClear();
    const item = e.target.closest('.fly [data-tool]'); if (item) { closeFly(); return onPick(item.dataset.tool); }
    const grp = e.target.closest('.grp'); if (!grp) return;
    if (e.target.closest('.caret')) { const f = grp.querySelector('.fly'), open = f.hidden; closeFly(); f.hidden = !open; return; }
    closeFly(); onPick(cur[+grp.dataset.g]);
  };
  el.oncontextmenu = (e) => { const g = e.target.closest('.grp'); if (g) { e.preventDefault(); const t = cur[+g.dataset.g]; if (t !== 'cursor') toggleFav(t); } };
  document.addEventListener('click', (e) => { if (!el.contains(e.target)) closeFly(); });
  el.querySelector('#drawColor').oninput = (e) => onColor(e.target.value);
  renderFavs();
  return {
    setActive(t) {
      active = t;
      el.querySelectorAll('.grp').forEach((g, i) => {
        const has = GROUPS[i].includes(t), b = g.querySelector('[data-main]');
        if (has) { cur[i] = t; b.title = TITLES[t]; b.querySelector('svg').outerHTML = svg(t); }
        b.classList.toggle('on', has);
      });
      favEl.querySelectorAll('[data-fav]').forEach((b) => b.classList.toggle('on', b.dataset.fav === t));
    },
  };
}

export function bindSegment(el, attr, cb) {
  el.onclick = (e) => {
    const b = e.target.closest('button'); if (!b || b.dataset[attr] == null) return;
    el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    cb(b.dataset[attr]);
  };
}
