// Basic indicators. Overlays share the price scale; RSI gets its own band at the bottom.
const sma = (b, p) => { const o = []; let s = 0; for (let i = 0; i < b.length; i++) { s += b[i].close; if (i >= p) s -= b[i - p].close; if (i >= p - 1) o.push({ time: b[i].time, value: s / p }); } return o; };
const ema = (b, p) => { const k = 2 / (p + 1), o = []; let e; for (let i = 0; i < b.length; i++) { e = i ? b[i].close * k + e * (1 - k) : b[i].close; if (i >= p - 1) o.push({ time: b[i].time, value: e }); } return o; };
function bands(b, p, m) {
  const up = [], lo = [];
  for (let i = p - 1; i < b.length; i++) {
    let s = 0, v = 0;
    for (let j = i - p + 1; j <= i; j++) s += b[j].close;
    const mean = s / p;
    for (let j = i - p + 1; j <= i; j++) v += (b[j].close - mean) ** 2;
    const sd = Math.sqrt(v / p);
    up.push({ time: b[i].time, value: mean + m * sd }); lo.push({ time: b[i].time, value: mean - m * sd });
  }
  return [up, lo];
}
function rsi(b, p) { // Wilder smoothing
  const o = []; let g = 0, l = 0;
  for (let i = 1; i < b.length; i++) {
    const ch = b[i].close - b[i - 1].close, up = Math.max(ch, 0), dn = Math.max(-ch, 0);
    if (i <= p) { g += up; l += dn; if (i < p) continue; g /= p; l /= p; } else { g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p; }
    o.push({ time: b[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
  }
  return o;
}

const DEFS = {
  sma: { calc: (b) => [sma(b, 20)], make: (c) => [c.addLineSeries({ color: '#e2a33b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })] },
  ema: { calc: (b) => [ema(b, 50)], make: (c) => [c.addLineSeries({ color: '#4d9de0', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })] },
  bb: { calc: (b) => bands(b, 20, 2), make: (c) => [0, 1].map(() => c.addLineSeries({ color: '#a08bd6', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })) },
  rsi: {
    calc: (b) => [rsi(b, 14)],
    make: (c) => {
      const s = c.addLineSeries({ color: '#d46fa6', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false });
      c.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.72, bottom: 0.14 } });
      [30, 70].forEach((price) => s.createPriceLine({ price, color: '#7f8794', lineWidth: 1, lineStyle: 3, axisLabelVisible: false }));
      return [s];
    },
  },
};

export const INDICATORS = [{ id: 'sma', label: 'SMA 20' }, { id: 'ema', label: 'EMA 50' }, { id: 'bb', label: 'Bollinger Bands 20' }, { id: 'rsi', label: 'RSI 14' }];

export class Indicators {
  constructor(view) { this.view = view; this.series = {}; }
  toggle(id, bars) {
    if (this.series[id]) { this.series[id].forEach((s) => this.view.chart.removeSeries(s)); delete this.series[id]; }
    else { this.series[id] = DEFS[id].make(this.view.chart); this.#fill(id, bars); }
    this.view.setBottomMargin(this.series.rsi ? 0.3 : 0.14);
    return !!this.series[id];
  }
  #fill(id, bars) { DEFS[id].calc(bars).forEach((d, i) => this.series[id][i].setData(d)); }
  refresh(bars) { Object.keys(this.series).forEach((id) => this.#fill(id, bars)); }
  tick(bars) { // recompute on a recent window, push only the newest point
    const tail = bars.slice(-300);
    for (const id of Object.keys(this.series)) DEFS[id].calc(tail).forEach((d, i) => d.length && this.series[id][i].update(d[d.length - 1]));
  }
}
