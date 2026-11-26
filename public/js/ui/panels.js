import { fmt, money, cls } from '../core/format.js';
import { toUnits } from '../trading/sizing.js';
const $ = (s) => document.querySelector(s);
const set = (sel, text, c) => { const e = $(sel); e.textContent = text; if (c !== undefined) e.className = 'num ' + c; };
const lotsText = (l) => l.toFixed(l < 0.01 ? 4 : 2);

export function renderAccount(engine, price) {
  const un = engine.unrealized(price), wins = engine.closed.filter((t) => t.pnl > 0).length;
  set('#bal', '$' + fmt(engine.balance)); set('#eq', '$' + fmt(engine.equity(price)));
  set('#mar', '$' + fmt(engine.margin())); set('#free', '$' + fmt(engine.freeMargin(price)));
  set('#unr', money(un), cls(un));
  set('#lev', `1:${engine.leverage}`); set('#mlvl', engine.margin() ? fmt(engine.marginLevel(price), 0) + '%' : '–');
  set('#stats', `${engine.closed.length} · ${engine.closed.length ? Math.round((wins / engine.closed.length) * 100) : 0}%`);
}

// Open positions live in a table under the chart.
export function renderPositions(engine, price) {
  const rows = engine.positions.map((p) => {
    const u = engine.pnl(p, price);
    return `<tr><td>${p.symbol}</td><td><span class="tag ${p.side}">${p.side.toUpperCase()}</span></td><td class="num r">${lotsText(p.lots)}</td><td class="num r">${fmt(p.entry, p.dp)}</td><td class="num r">${fmt(p.sl, p.dp)}</td><td class="num r">${fmt(p.tp, p.dp)}</td><td class="num r ${cls(u)}"><b>${money(u)}</b></td><td class="r"><button class="x" data-close="${p.id}" title="Close at market">Close</button></td></tr>`;
  }).join('');
  $('#positions').innerHTML = rows ? `<table class="ptable"><thead><tr><th>Symbol</th><th>Side</th><th class="r">Lots</th><th class="r">Entry</th><th class="r">Stop</th><th class="r">Target</th><th class="r">P&amp;L</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="muted pad">No open positions</div>';
  $('#posCount').textContent = engine.positions.length ? `(${engine.positions.length})` : '';
}

export function renderHistory(engine) {
  $('#history').innerHTML = engine.closed.slice(0, 60).map((t) =>
    `<div class="item"><span><span class="tag ${t.side}">${t.side.toUpperCase()}</span><span class="num">${t.symbol}</span> <span class="muted">${t.reason}</span></span><b class="num ${cls(t.pnl)}">${money(t.pnl)}</b></div>`
  ).join('') || '<div class="muted">No closed trades</div>';
}

// Always two fixed rows, so the Buy / Sell buttons below never shift when the numbers change.
export function renderPreview({ mode, value, price, engine, spec }) {
  const r = toUnits({ mode, value, price, balance: engine.balance, leverage: engine.leverage, spec });
  $('#hint').innerHTML = r.units
    ? `<div>${lotsText(r.lots)} lot · ${r.units.toPrecision(4)} units</div><div>Value $${fmt(r.notional)} · Margin $${fmt(r.notional / engine.leverage)}</div>`
    : `<div>${mode === 'lot' ? `Minimum ${spec.minLot} lot, step ${spec.lotStep}` : 'Enter a size'}</div><div>&nbsp;</div>`;
}
