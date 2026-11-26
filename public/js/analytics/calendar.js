// Year / month / week / day views of closed trades, grouped by the market date they closed on (UTC).
import { money, cls } from '../core/format.js';
import { dayKey } from './stats.js';
import { tradeTable } from './tradeTable.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n) => String(n).padStart(2, '0');
const DAY = 864e5, EMPTY = { pnl: 0, n: 0, w: 0, l: 0 };

export function groupByDay(trades) {
  const m = new Map();
  for (const t of trades) {
    const k = dayKey(t.closeTime), s = m.get(k) || { ...EMPTY };
    s.pnl += t.pnl; s.n++; if (t.pnl > 0) s.w++; else if (t.pnl < 0) s.l++;
    m.set(k, s);
  }
  return m;
}
export const addStats = (list) => list.reduce((a, s) => (s ? { pnl: a.pnl + s.pnl, n: a.n + s.n, w: a.w + s.w, l: a.l + s.l } : a), { ...EMPTY });
export const ratio = (s) => (s.l ? (s.w / s.l).toFixed(2) : s.w ? '∞' : '–');
const tint = (p, max) => (!p ? '' : `style="background:${p > 0 ? 'rgba(47,182,124,' : 'rgba(229,83,75,'}${(0.1 + 0.4 * Math.min(1, Math.abs(p) / (max || 1))).toFixed(2)})"`);
const detail = (s) => `<small>${s.n} trade${s.n === 1 ? '' : 's'} · ${s.w}W ${s.l}L</small>`;
const body = (s) => (s && s.n ? `<b class="num ${cls(s.pnl)}">${money(s.pnl)}</b>${detail(s)}` : '');
const shortDate = (d) => `${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCDate()}`;

export function renderCalendar(trades, view, anchor) {
  const days = groupByDay(trades), y = anchor.getUTCFullYear(), m = anchor.getUTCMonth();
  const prefix = (p) => addStats([...days].filter(([k]) => k.startsWith(p)).map(([, s]) => s));

  if (view === 'year') {
    const stats = MONTHS.map((_, i) => prefix(`${y}-${pad(i + 1)}`)), max = Math.max(...stats.map((s) => Math.abs(s.pnl)), 1);
    const html = `<div class="year">${stats.map((s, i) => `<div class="cd mo" data-month="${y}-${pad(i + 1)}" ${tint(s.pnl, max)}><span class="dn">${MONTHS[i]}</span>${s.n ? body(s) + `<small>ratio ${ratio(s)}</small>` : '<small class="muted">no trades</small>'}</div>`).join('')}</div>`;
    return { title: String(y), totals: prefix(`${y}-`), html };
  }
  if (view === 'month') {
    const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
    while (cells.length % 7) cells.push(null);
    const stat = (d) => days.get(`${y}-${pad(m + 1)}-${pad(d)}`), max = Math.max(...cells.map((d) => (d ? Math.abs(stat(d)?.pnl || 0) : 0)), 1);
    let html = `<div class="mgrid">${DOW.map((d) => `<div class="dh">${d}</div>`).join('')}<div class="dh">Week</div>`;
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      html += week.map((d) => (d ? `<div class="cd" data-day="${y}-${pad(m + 1)}-${pad(d)}" ${tint(stat(d)?.pnl, max)}><span class="dn">${d}</span>${body(stat(d))}</div>` : '<div class="cd off"></div>')).join('');
      const ws = addStats(week.map((d) => (d ? stat(d) : null)));
      html += `<div class="cd wk"><span class="dn">Total</span>${body(ws)}</div>`;
    }
    return { title: `${MONTHS[m]} ${y}`, totals: prefix(`${y}-${pad(m + 1)}-`), html: html + '</div>' };
  }
  if (view === 'week') {
    const start = new Date(Date.UTC(y, m, anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7)));
    const list = Array.from({ length: 7 }, (_, i) => { const d = new Date(start.getTime() + i * DAY); return { d, k: d.toISOString().slice(0, 10) }; });
    const max = Math.max(...list.map(({ k }) => Math.abs(days.get(k)?.pnl || 0)), 1);
    const html = `<div class="week">${list.map(({ d, k }, i) => { const s = days.get(k); return `<div class="cd" data-day="${k}" ${tint(s?.pnl, max)}><span class="dn">${DOW[i]} ${d.getUTCDate()}</span>${s ? body(s) + `<small>ratio ${ratio(s)}</small>` : '<small class="muted">no trades</small>'}</div>`; }).join('')}</div>`;
    return { title: `${shortDate(start)} – ${shortDate(list[6].d)}, ${list[6].d.getUTCFullYear()}`, totals: addStats(list.map(({ k }) => days.get(k))), html };
  }
  const k = anchor.toISOString().slice(0, 10), rows = trades.filter((t) => dayKey(t.closeTime) === k);
  return { title: `${DOW[(anchor.getUTCDay() + 6) % 7]} ${anchor.getUTCDate()} ${MONTHS[m]} ${y}`, totals: days.get(k) || { ...EMPTY }, html: tradeTable(rows) };
}

export function shift(view, anchor, dir) {
  const d = new Date(anchor);
  if (view === 'year') d.setUTCFullYear(d.getUTCFullYear() + dir);
  else if (view === 'month') d.setUTCMonth(d.getUTCMonth() + dir, 1);
  else d.setUTCDate(d.getUTCDate() + dir * (view === 'week' ? 7 : 1));
  return d;
}
