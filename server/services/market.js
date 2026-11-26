const SYMBOLS = require('../config/symbols');
const loadCsv = require('./dataLoader');
const synthetic = require('./synthetic');

const TF = { '1m': 1, '5m': 5, '15m': 15, '1h': 60, '1D': 1440, '1W': 10080 };
const store = {};

async function init() {
  for (const s of Object.keys(SYMBOLS)) {
    store[s] = (await loadCsv(s)) || synthetic(SYMBOLS[s]);
    console.log(`  ${s}: ${store[s].t.length.toLocaleString()} candles (${store[s].source})`);
  }
}
const lowerBound = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; a[m] < x ? (lo = m + 1) : (hi = m); } return lo; };

// Aggregates 1m candles into `tf`. In `to` mode the last candle is cut at `to` (no look-ahead).
function candles(sym, tf, { from, to, limit }) {
  const d = store[sym], step = TF[tf] * 60, dp = 10 ** SYMBOLS[sym].dp, last = d.t[d.t.length - 1];
  const rd = (x) => Math.round(x * dp) / dp;
  const off = tf === '1W' ? 345600 : 0; // weekly candles start Monday 00:00 UTC (the epoch was a Thursday)
  const bucket = (t) => Math.floor((t - off) / step) * step + off;
  const first = to != null ? bucket(to) - (limit - 1) * step : bucket(Math.max(from, d.t[0]));
  const out = [];
  for (let k = 0; k < limit; k++) {
    const b = first + k * step;
    if (b > last) break;
    const i0 = lowerBound(d.t, from != null ? Math.max(b, from) : b);
    const end = to != null ? Math.min(b + step - 1, to) : b + step - 1;
    const i1 = lowerBound(d.t, end + 1) - 1;
    if (i1 < i0) continue;
    let hi = -Infinity, lo = Infinity, vol = 0;
    for (let i = i0; i <= i1; i++) { if (d.h[i] > hi) hi = d.h[i]; if (d.l[i] < lo) lo = d.l[i]; vol += d.v[i]; }
    out.push({ time: b, open: rd(d.o[i0]), high: rd(hi), low: rd(lo), close: rd(d.c[i1]), volume: Math.round(vol) });
  }
  return out;
}
const meta = () => Object.fromEntries(Object.entries(SYMBOLS).map(([s, cfg]) => {
  const { start, end, vol, seed, ...spec } = cfg;
  return [s, { ...spec, source: store[s].source, from: store[s].t[0], to: store[s].t[store[s].t.length - 1] }];
}));
module.exports = { SYMBOLS, TF, init, candles, meta };
