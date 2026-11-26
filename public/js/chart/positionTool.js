// TradingView-style long/short box for every open trade: entry, target zone, stop zone.
// Anchored to the entry candle and a fixed number of bars wide. Drag the target or stop line to move it.
import { fmt, money } from '../core/format.js';
import { label } from './labels.js';

const WIDTH_BARS = 20, GREEN = '#2fb67c', RED = '#e5534b';

export class PositionTool {
  constructor(coords, engine, { getSymbol, getPrice, getStep }) { Object.assign(this, { c: coords, engine, getSymbol, getPrice, getStep }); }
  #list() { return this.engine.positions.filter((p) => p.symbol === this.getSymbol()); }
  #geo(p) {
    const x0 = this.c.x(p.openTime), x1 = this.c.x(p.openTime + WIDTH_BARS * this.getStep()), yE = this.c.y(p.entry), yT = this.c.y(p.tp), yS = this.c.y(p.sl);
    return [x0, x1, yE, yT, yS].some((v) => v == null) ? null : { x0, x1, yE, yT, yS };
  }
  cursor() { return 'ns-resize'; }

  draw(ctx) {
    for (const p of this.#list()) {
      const g = this.#geo(p); if (!g) continue;
      const bw = g.x1 - g.x0, price = this.getPrice();
      ctx.fillStyle = 'rgba(47,182,124,.16)'; ctx.fillRect(g.x0, Math.min(g.yE, g.yT), bw, Math.abs(g.yT - g.yE));
      ctx.fillStyle = 'rgba(229,83,75,.16)'; ctx.fillRect(g.x0, Math.min(g.yE, g.yS), bw, Math.abs(g.yS - g.yE));
      const line = (y, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); };
      line(g.yT, GREEN); line(g.yS, RED); line(g.yE, '#8a93a1');

      const tpD = Math.abs(p.tp - p.entry), slD = Math.abs(p.entry - p.sl);
      label(ctx, `Target: ${fmt(tpD, p.dp)} (${fmt((tpD / p.entry) * 100)}%)  ${money(tpD * p.units)}`, g.x0 + 4, g.yT < g.yE ? g.yT - 21 : g.yT + 3, '#1f9a68');
      label(ctx, `Stop: ${fmt(slD, p.dp)} (${fmt((slD / p.entry) * 100)}%)  ${money(-slD * p.units)}`, g.x0 + 4, g.yS < g.yE ? g.yS - 21 : g.yS + 3, '#d6453d');

      const pnl = this.engine.pnl(p, price), rr = +(tpD / slD).toFixed(2), lots = p.lots < 0.01 ? p.lots.toFixed(4) : p.lots.toFixed(2);
      const txt = `Open PnL: ${money(pnl)}, Qty: ${lots} lot, R:R ${rr}`;
      ctx.font = '11.5px system-ui,sans-serif';
      label(ctx, txt, g.x0 + bw / 2 - (ctx.measureText(txt).width + 12) / 2, g.yE - 9, pnl >= 0 ? '#1f9a68' : '#d6453d');

      ctx.strokeStyle = '#8a93a1'; ctx.fillStyle = '#fff';
      for (const [x, y] of [[g.x0, g.yT], [g.x1, g.yT], [g.x0, g.yS], [g.x1, g.yS]]) { ctx.fillRect(x - 4, y - 4, 8, 8); ctx.strokeRect(x - 4, y - 4, 8, 8); }
    }
  }
  hit(x, y) {
    for (const p of this.#list()) {
      const g = this.#geo(p); if (!g || x < g.x0 - 8 || x > g.x1 + 8) continue;
      if (Math.abs(y - g.yT) < 6) return { p, key: 'tp' };
      if (Math.abs(y - g.yS) < 6) return { p, key: 'sl' };
    }
    return null;
  }
  drag(h, x, y) {
    if (!h) return;
    let v = this.c.p(y); if (v == null) return;
    const { p, key } = h, tick = 10 ** -p.dp, above = (key === 'tp') === (p.side === 'long');
    v = above ? Math.max(v, p.entry + tick) : Math.min(v, p.entry - tick);
    this.engine.setLevel(p, key, +v.toFixed(p.dp));
  }
}
