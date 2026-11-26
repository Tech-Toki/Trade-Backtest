// Pure maths for the performance page: no DOM, easy to test.
export const dayKey = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);
const sum = (a) => a.reduce((s, t) => s + t.pnl, 0);

export function summarize(trades) {
  const n = trades.length, wins = trades.filter((t) => t.pnl > 0), losses = trades.filter((t) => t.pnl < 0);
  const gp = sum(wins), gl = -sum(losses), pnls = trades.map((t) => t.pnl);
  let cw = 0, cl = 0, maxWin = 0, maxLoss = 0;
  for (const t of [...trades].sort((a, b) => a.closeTime - b.closeTime)) {
    if (t.pnl > 0) { cw++; cl = 0; } else if (t.pnl < 0) { cl++; cw = 0; } else cw = cl = 0;
    maxWin = Math.max(maxWin, cw); maxLoss = Math.max(maxLoss, cl);
  }
  const avgWin = wins.length ? gp / wins.length : 0, avgLoss = losses.length ? gl / losses.length : 0;
  return {
    n, wins: wins.length, losses: losses.length, even: n - wins.length - losses.length,
    winRate: n ? wins.length / n : 0, net: gp - gl, gp, gl,
    profitFactor: gl ? gp / gl : gp ? Infinity : 0, avgWin, avgLoss, payoff: avgLoss ? avgWin / avgLoss : 0,
    expectancy: n ? (gp - gl) / n : 0, best: n ? Math.max(...pnls) : 0, worst: n ? Math.min(...pnls) : 0,
    maxWinStreak: maxWin, maxLossStreak: maxLoss, avgHold: n ? trades.reduce((s, t) => s + (t.closeTime - t.openTime), 0) / n : 0,
  };
}

// Balance after each closed trade, plus the worst peak-to-trough drop.
export function equityCurve(trades, initial) {
  const rows = [...trades].sort((a, b) => a.closeTime - b.closeTime || a.openTime - b.openTime);
  if (!rows.length) return { points: [], maxDD: 0, maxDDPct: 0 };
  const pts = [{ time: Math.min(...rows.map((t) => t.openTime)), value: initial }];
  let eq = initial, peak = initial, maxDD = 0, maxDDPct = 0;
  for (const t of rows) {
    eq += t.pnl; peak = Math.max(peak, eq);
    const dd = peak - eq; if (dd > maxDD) { maxDD = dd; maxDDPct = dd / peak; }
    pts.push({ time: t.closeTime, value: eq });
  }
  const points = []; // chart needs strictly increasing times: keep the last value per second
  for (const p of pts) { if (points.length && points[points.length - 1].time === p.time) points[points.length - 1] = p; else points.push(p); }
  return { points, maxDD, maxDDPct };
}

export function breakdown(trades, keyFn) {
  const groups = new Map();
  for (const t of trades) { const k = keyFn(t); (groups.get(k) || groups.set(k, []).get(k)).push(t); }
  return [...groups].map(([key, list]) => ({ key, ...summarize(list) })).sort((a, b) => b.net - a.net);
}
