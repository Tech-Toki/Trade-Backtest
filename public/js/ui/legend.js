// Chart header: symbol, timeframe, OHLC of the hovered (or latest) candle, and Sell / Buy quote buttons with the spread.
import { fmt } from '../core/format.js';
import { quote } from '../trading/quotes.js';

export function createLegend(view, { getBars, getSpec, getTf, onSell, onBuy }) {
  const $ = (s) => document.querySelector(s); let hover = null;
  const prevClose = (bars, t) => { let lo = 0, hi = bars.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; bars[m].time <= t ? (lo = m) : (hi = m - 1); } return lo > 0 ? bars[lo - 1].close : null; };
  function render() {
    const bars = getBars(), spec = getSpec(), last = bars[bars.length - 1];
    if (!spec || !last) return;
    const b = hover || last, dp = spec.dp, prev = prevClose(bars, b.time) ?? b.open, chg = b.close - prev, c = b.close >= b.open ? 'pos' : 'neg';
    $('#lgName').textContent = `${spec.label} · ${getTf()}`;
    $('#lgOhlc').innerHTML = `<span class="${c}">O ${fmt(b.open, dp)} H ${fmt(b.high, dp)} L ${fmt(b.low, dp)} C ${fmt(b.close, dp)} &nbsp;${chg >= 0 ? '+' : ''}${fmt(chg, dp)} (${chg >= 0 ? '+' : ''}${fmt((chg / prev) * 100)}%)</span>`;
    const q = quote(last.close, spec);
    $('#lgSell').textContent = fmt(q.bid, dp); $('#lgBuy').textContent = fmt(q.ask, dp); $('#lgSpread').textContent = fmt(spec.spread, dp);
  }
  view.chart.subscribeCrosshairMove((p) => { hover = p.time ? p.seriesData.get(view.candles) || null : null; render(); });
  $('#lgSell').onclick = onSell; $('#lgBuy').onclick = onBuy;
  return { render };
}
