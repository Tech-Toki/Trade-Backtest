// Year / month / day dropdowns (like a booking form). Used for the replay start and the calendar.
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function createDateSelect({ y = '#sY', m = '#sM', d = '#sD' } = {}) {
  const Y = document.querySelector(y), M = document.querySelector(m), D = document.querySelector(d); let min = 0, max = 0;
  const fillDays = (keep) => {
    const n = new Date(Date.UTC(+Y.value, +M.value + 1, 0)).getUTCDate(), cur = Math.min(keep || +D.value || 1, n);
    D.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join(''); D.value = cur;
  };
  Y.addEventListener('change', () => fillDays()); M.addEventListener('change', () => fillDays()); // registered first, so callbacks see valid days
  const api = {
    init(from, to, start) {
      min = Math.ceil((from + 1) / 86400) * 86400; max = Math.floor(to / 86400) * 86400 - 86400;
      const y0 = new Date(min * 1000).getUTCFullYear(), y1 = new Date(max * 1000).getUTCFullYear();
      Y.innerHTML = Array.from({ length: y1 - y0 + 1 }, (_, i) => `<option>${y1 - i}</option>`).join('');
      M.innerHTML = MON.map((n, i) => `<option value="${i}">${n}</option>`).join('');
      api.set(start);
    },
    set(ts) { const t = new Date(ts * 1000); Y.value = t.getUTCFullYear(); M.value = t.getUTCMonth(); fillDays(t.getUTCDate()); },
    get() { const ts = Math.min(Math.max(Date.UTC(+Y.value, +M.value, +D.value) / 1000, min), max); api.set(ts); return ts; },
    onChange(cb) { [Y, M, D].forEach((e) => e.addEventListener('change', cb)); },
  };
  return api;
}
