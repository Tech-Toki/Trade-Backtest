export function toast(text, type = 'error') {
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = text; c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 3800);
}
