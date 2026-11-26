export const fmt = (n, dp = 2) => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const money = (n) => (n < 0 ? '-' : n > 0 ? '+' : '') + '$' + fmt(Math.abs(n));
export const cls = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '');
export const iso = (ts) => new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ');
