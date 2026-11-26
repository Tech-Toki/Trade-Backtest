import { fmt, money, cls, iso } from '../core/format.js';
const hold = (s) => { s = Math.max(0, s); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

export function tradeTable(trades, limit = 300) {
  if (!trades.length) return '<p class="muted">No trades.</p>';
  const rows = [...trades].sort((a, b) => b.closeTime - a.closeTime).slice(0, limit).map((t) => `<tr>
    <td class="num">${iso(t.openTime)}</td><td class="num">${iso(t.closeTime)}</td><td>${t.symbol}</td>
    <td><span class="tag ${t.side}">${t.side.toUpperCase()}</span></td><td class="num r">${t.lots != null ? (t.lots < 0.01 ? t.lots.toFixed(4) : t.lots.toFixed(2)) : '–'}</td>
    <td class="num r">${fmt(t.entry)}</td><td class="num r">${fmt(t.exit)}</td><td class="num r ${cls(t.pnl)}"><b>${money(t.pnl)}</b></td>
    <td>${t.reason || ''}</td><td class="num r muted">${hold(t.closeTime - t.openTime)}</td></tr>`).join('');
  return `<div class="tscroll"><table><thead><tr><th>Opened</th><th>Closed</th><th>Symbol</th><th>Side</th><th class="r">Lots</th><th class="r">Entry</th><th class="r">Exit</th><th class="r">P&amp;L</th><th>Exit</th><th class="r">Held</th></tr></thead><tbody>${rows}</tbody></table></div>` +
    (trades.length > limit ? `<p class="muted">Showing the latest ${limit} of ${trades.length} trades.</p>` : '');
}
