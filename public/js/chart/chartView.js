// Thin wrapper around TradingView's lightweight-charts: candles, volume, theme and user chart settings.
const COLORS = {
  dark: { bg: '#10141a', text: '#8b94a5', grid: '#181d26', up: '#2fc383', down: '#f0616a' },
  light: { bg: '#ffffff', text: '#667085', grid: '#eef0f4', up: '#12a56b', down: '#e04a52' },
};
const KEY = 'tb_chart';
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export function createChartView(el) {
  let theme = 'dark', bars = [], st = JSON.parse(localStorage.getItem(KEY) || '{}');
  const chart = LightweightCharts.createChart(el, {
    autoSize: true, layout: { attributionLogo: false }, // credit is given as a link on each page instead
    timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false, rightOffset: 12 },
    rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.14 } },
  });
  const candles = chart.addCandlestickSeries();
  const volume = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false });
  chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });

  const colors = () => { const c = { ...COLORS[theme] }; for (const k of Object.keys(c)) if (st[k]) c[k] = st[k]; return c; };
  const volPoint = (b) => { const c = colors(); return { time: b.time, value: b.volume, color: rgba(b.close >= b.open ? c.up : c.down, 0.35) }; };
  function apply() {
    const c = colors();
    chart.applyOptions({
      layout: { background: { type: 'solid', color: c.bg }, textColor: c.text },
      grid: { vertLines: { color: c.grid, visible: st.vert !== false }, horzLines: { color: c.grid, visible: st.horz !== false } },
      crosshair: { mode: st.magnet ? 1 : 0 },
    });
    candles.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderUpColor: c.up, borderDownColor: c.down, borderVisible: !!st.border });
    volume.applyOptions({ visible: st.volume !== false });
    if (bars.length) volume.setData(bars.map(volPoint));
  }
  return {
    chart, candles, volume, colors,
    getSettings: () => st,
    setSettings(patch) { Object.assign(st, patch); localStorage.setItem(KEY, JSON.stringify(st)); apply(); },
    resetSettings() { st = {}; localStorage.removeItem(KEY); apply(); },
    applyTheme(t) { theme = t; apply(); },
    setBars(b) {
      bars = b; candles.setData(b); volume.setData(b.map(volPoint));
      const show = () => chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, b.length - 110), to: b.length + 35 });
      show(); requestAnimationFrame(show); // second pass once layout has settled
    },
    // If the replay point is off-screen, scroll back to it (keeps your zoom).
    ensureVisible() { const r = chart.timeScale().getVisibleLogicalRange(); if (r && (bars.length - 1 > r.to || bars.length - 1 < r.from)) chart.timeScale().scrollToRealTime(); },
    update(bar) { candles.update(bar); volume.update(volPoint(bar)); },
    // Older candles were added at the front: keep the same candles on screen.
    prepend(k, b) {
      const ts = chart.timeScale(), r = ts.getVisibleLogicalRange();
      bars = b; candles.setData(b); volume.setData(b.map(volPoint));
      if (r) ts.setVisibleLogicalRange({ from: r.from + k, to: r.to + k });
    },
    resetView() { chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, bars.length - 110), to: bars.length + 35 }); },
    setBottomMargin(b) { chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.06, bottom: b } }); },
  };
}
