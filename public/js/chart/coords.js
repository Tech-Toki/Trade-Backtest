// Converts between (time, price) and screen pixels, including points beyond the last candle
// (needed because replay keeps adding bars after a drawing was placed).
export function createCoords(chart, series, getBars, getStep) {
  const ts = chart.timeScale();
  const idxOf = (t) => {
    const b = getBars(), n = b.length; if (!n) return null;
    if (t >= b[n - 1].time) return n - 1 + (t - b[n - 1].time) / getStep();
    if (t <= b[0].time) return (t - b[0].time) / getStep();
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; b[m].time <= t ? (lo = m) : (hi = m); }
    return lo + (t - b[lo].time) / (b[hi].time - b[lo].time);
  };
  const timeOf = (i) => {
    const b = getBars(), n = b.length; if (!n || i == null) return null;
    if (i >= n - 1) return b[n - 1].time + (i - (n - 1)) * getStep();
    if (i <= 0) return b[0].time + i * getStep();
    const a = Math.floor(i);
    return b[a].time + (i - a) * (b[a + 1].time - b[a].time);
  };
  return {
    x: (t) => { const i = idxOf(t); return i == null ? null : ts.logicalToCoordinate(i); },
    t: (x) => timeOf(ts.coordinateToLogical(x)),
    y: (p) => series.priceToCoordinate(p),
    p: (y) => series.coordinateToPrice(y),
    barPx: () => (ts.logicalToCoordinate(1) ?? 0) - (ts.logicalToCoordinate(0) ?? 0) || 8,
  };
}
