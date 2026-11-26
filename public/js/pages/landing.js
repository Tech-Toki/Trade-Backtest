import { initThemeToggle } from '../core/theme.js';
import { isLoggedIn } from '../core/api.js';
import { reveal, countUp } from '../ui/motion.js';

initThemeToggle(document.getElementById('theme'));
if (isLoggedIn()) document.querySelectorAll('[data-guest]').forEach((e) => (e.hidden = true));
reveal();

// Illustration: a seeded random walk drawn as candles that grow in one by one, then a long position box.
(function drawChart() {
  let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const W = 640, H = 340, N = 56, bars = []; let p = 100;
  for (let i = 0; i < N; i++) { const o = p, c = o + (rnd() - 0.43) * 4; bars.push({ o, c, h: Math.max(o, c) + rnd() * 2, l: Math.min(o, c) - rnd() * 2 }); p = c; }
  const lo = Math.min(...bars.map((b) => b.l)), hi = Math.max(...bars.map((b) => b.h)), y = (v) => 18 + (1 - (v - lo) / (hi - lo)) * (H - 36), step = W / N;
  const entry = 30, e = bars[entry].c, tp = e + (hi - lo) * 0.3, sl = e - (hi - lo) * 0.15, x0 = entry * step, bw = 20 * step, base = 35 * 45 + 500;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Animated example of a candlestick chart with a long position">`;
  for (let i = 1; i < 5; i++) svg += `<line x1="0" x2="${W}" y1="${(H / 5) * i}" y2="${(H / 5) * i}" style="stroke:var(--line)"/>`;
  bars.forEach((b, i) => {
    const x = i * step + step / 2, col = b.c >= b.o ? 'var(--buy)' : 'var(--sell)';
    svg += `<g class="cn" style="animation-delay:${i * 45}ms"><line x1="${x}" x2="${x}" y1="${y(b.h)}" y2="${y(b.l)}" style="stroke:${col}"/><rect x="${x - step * 0.3}" y="${y(Math.max(b.o, b.c))}" width="${step * 0.6}" height="${Math.max(1.5, Math.abs(y(b.o) - y(b.c)))}" rx="1" style="fill:${col}"/></g>`;
  });
  svg += `<g class="zone" style="animation-delay:${base}ms"><rect x="${x0}" y="${y(tp)}" width="${bw}" height="${y(e) - y(tp)}" style="fill:var(--buy);opacity:.16"/><rect x="${x0}" y="${y(e)}" width="${bw}" height="${y(sl) - y(e)}" style="fill:var(--sell);opacity:.16"/>` +
    `<line x1="${x0}" x2="${x0 + bw}" y1="${y(e)}" y2="${y(e)}" style="stroke:var(--muted)"/><text x="${x0 + 8}" y="${y(tp) - 7}" font-size="11" font-family="monospace" style="fill:var(--buy)">Target +$420.00</text><text x="${x0 + 8}" y="${y(sl) + 15}" font-size="11" font-family="monospace" style="fill:var(--sell)">Stop -$210.00</text></g>` +
    `<circle class="live" cx="${(N - 1) * step + step / 2}" cy="${y(bars[N - 1].c)}" r="4" style="fill:var(--accent)"/></svg>`;
  document.getElementById('shot').innerHTML = svg;
  setTimeout(() => countUp(document.getElementById('pnl'), 420, (v) => '+$' + v.toFixed(2), 1400), base + 300);
})();
