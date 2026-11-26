// Downloads. CSV cells that start with = + - @ are prefixed so spreadsheets never run them as formulas
// (numbers are left alone so negative P&L stays numeric).
const cell = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const toCSV = (rows, cols) => [cols.map((c) => cell(c.h)).join(','), ...rows.map((r) => cols.map((c) => cell(c.v(r))).join(','))].join('\r\n');

export function download(name, mime, text) {
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: mime }));
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const utc = (ts) => new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);

export const tradesCSV = (trades, profileName = () => '') => toCSV([...trades].sort((a, b) => a.closeTime - b.closeTime), [
  { h: 'Profile', v: (t) => profileName(t.profileId) }, { h: 'Symbol', v: (t) => t.symbol }, { h: 'Side', v: (t) => t.side },
  { h: 'Lots', v: (t) => t.lots }, { h: 'Units', v: (t) => t.size }, { h: 'Opened (UTC)', v: (t) => utc(t.openTime) }, { h: 'Closed (UTC)', v: (t) => utc(t.closeTime) },
  { h: 'Entry', v: (t) => t.entry }, { h: 'Exit', v: (t) => t.exit }, { h: 'P&L', v: (t) => +t.pnl.toFixed(2) }, { h: 'Exit reason', v: (t) => t.reason },
  { h: 'Held (minutes)', v: (t) => Math.round((t.closeTime - t.openTime) / 60) },
]);
export function summaryCSV(s, eq) {
  const rows = [['Net P&L', +s.net.toFixed(2)], ['Trades', s.n], ['Wins', s.wins], ['Losses', s.losses], ['Win rate %', +(s.winRate * 100).toFixed(2)],
    ['Win/Loss ratio', s.losses ? +(s.wins / s.losses).toFixed(2) : ''], ['Profit factor', Number.isFinite(s.profitFactor) ? +s.profitFactor.toFixed(2) : ''],
    ['Average win', +s.avgWin.toFixed(2)], ['Average loss', +s.avgLoss.toFixed(2)], ['Payoff ratio', +s.payoff.toFixed(2)], ['Expectancy per trade', +s.expectancy.toFixed(2)],
    ['Best trade', +s.best.toFixed(2)], ['Worst trade', +s.worst.toFixed(2)], ['Max drawdown', +eq.maxDD.toFixed(2)], ['Max drawdown %', +(eq.maxDDPct * 100).toFixed(2)],
    ['Longest win streak', s.maxWinStreak], ['Longest loss streak', s.maxLossStreak], ['Average hold (minutes)', Math.round(s.avgHold / 60)]];
  return toCSV(rows, [{ h: 'Metric', v: (r) => r[0] }, { h: 'Value', v: (r) => r[1] }]);
}
export const dailyCSV = (days) => toCSV([...days].sort((a, b) => a[0].localeCompare(b[0])), [
  { h: 'Date (UTC)', v: (r) => r[0] }, { h: 'P&L', v: (r) => +r[1].pnl.toFixed(2) }, { h: 'Trades', v: (r) => r[1].n }, { h: 'Wins', v: (r) => r[1].w }, { h: 'Losses', v: (r) => r[1].l },
  { h: 'Win/Loss ratio', v: (r) => (r[1].l ? +(r[1].w / r[1].l).toFixed(2) : '') },
]);
