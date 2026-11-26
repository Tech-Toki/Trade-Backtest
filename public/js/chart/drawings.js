// User drawings. Points are stored as {time, price}, so shapes stay put when you zoom, scroll or replay forward.
// To add a tool: add it to TOOLS, handle it in draw() and body(), and give it an icon in ui/toolbar.js.
import { fmt, money } from '../core/format.js';
import { label } from './labels.js';

const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const EXT = [0, 0.618, 1, 1.618, 2.618];
// n = number of points (0 = freehand). init = default pixel points when the shape is made with one drag a -> b.
export const TOOLS = {
  trend: { n: 2 }, ray: { n: 2 }, extended: { n: 2 }, arrow: { n: 2 },
  hline: { n: 1 }, hray: { n: 1 }, vline: { n: 1 }, cross: { n: 1 }, text: { n: 1 },
  channel: { n: 3, init: (a, b) => [a, b, { x: a.x, y: a.y + 60 }] },
  rect: { n: 2 }, ellipse: { n: 2 },
  triangle: { n: 3, init: (a, b) => [{ x: (a.x + b.x) / 2, y: a.y }, { x: a.x, y: b.y }, { x: b.x, y: b.y }] },
  brush: { n: 0 },
  fib: { n: 2 },
  fibext: { n: 3, init: (a, b) => [a, b, { x: b.x + 20, y: b.y + (a.y - b.y) * 0.382 }] },
  measure: { n: 2 },
  longpos: { n: 4, make: (pt, d) => posPoints(pt, d, 1) },
  shortpos: { n: 4, make: (pt, d) => posPoints(pt, d, -1) },
};
const POS = new Set(['longpos', 'shortpos']);
// Planner box (like TradingView's Long/Short Position): [entry, target, stop, right edge]. Does not place a trade.
function posPoints(pt, d, dir) {
  const dist = d.getAtr() * 1.5 || pt.price * 0.005;
  return [pt, { time: pt.time, price: pt.price + dir * dist }, { time: pt.time, price: pt.price - dir * dist }, { time: pt.time + 20 * d.getStep(), price: pt.price }];
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
const far = (a, b) => { const d = dist(a, b) || 1; return { x: a.x + ((b.x - a.x) / d) * 6000, y: a.y + ((b.y - a.y) / d) * 6000 }; };
const inPoly = (p, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i].y > p.y) !== (P[j].y > p.y) && p.x < ((P[j].x - P[i].x) * (p.y - P[i].y)) / (P[j].y - P[i].y) + P[i].x) c = !c; return c; };
const dur = (s) => { s = Math.abs(s); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

export class Drawings {
  constructor(coords, { getDp, getStep, getAtr = () => 0, getRisk = () => null, onToolChange = () => {}, onChange = () => {} }) {
    Object.assign(this, { c: coords, getDp, getStep, getAtr, getRisk, onToolChange, onChange, items: [], tool: 'cursor', sel: null, draft: null, orig: null, color: '#e2a33b' });
  }
  setTool(t) { this.draft = null; this.awaiting = false; this.tool = t; if (t !== 'cursor') this.sel = null; this.onToolChange(t); }
  removeSelected() { if (!this.sel) return; this.items = this.items.filter((i) => i !== this.sel); this.sel = null; this.onChange(); }
  clear() { this.items = []; this.sel = null; this.onChange(); }
  deselect() { this.sel = null; }
  cursor(h) { return this.tool === 'eraser' ? 'crosshair' : h.i >= 0 ? 'crosshair' : 'move'; }
  setColor(col) { this.color = col; if (this.sel) { this.sel.color = col; this.onChange(); } }

  #px(it) {
    const out = [];
    for (const p of it.pts) { const x = this.c.x(p.time), y = this.c.y(p.price); if (x == null || y == null) return null; out.push({ x, y }); }
    return out;
  }
  #pt(x, y) { return { time: this.c.t(x), price: this.c.p(y) }; }

  draw(ctx, w, h) {
    for (const it of [...this.items, ...(this.draft ? [this.draft] : [])]) {
      let P = this.#px(it); if (!P) continue;
      const def = TOOLS[it.type], real = P;
      if (POS.has(it.type)) { this.#drawPos(ctx, it, P, it === this.sel); continue; }
      if (it === this.draft && def.init) P = def.init(P[0], P[1]);
      const [a, b, c] = P, sel = it === this.sel, dp = this.getDp();
      ctx.strokeStyle = ctx.fillStyle = it.color; ctx.lineWidth = sel ? 2 : 1.4; ctx.setLineDash([]); ctx.font = '11px ui-monospace,monospace';
      const path = (pts, close) => { ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); if (close) ctx.closePath(); };
      const shade = (fn, col = it.color) => { ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = col; ctx.beginPath(); fn(); ctx.fill(); ctx.restore(); };
      ctx.beginPath();
      switch (it.type) {
        case 'trend': case 'arrow': path([a, b]); break;
        case 'ray': { const f = far(a, b); path([a, f]); break; }
        case 'extended': path([far(b, a), far(a, b)]); break;
        case 'hline': path([{ x: 0, y: a.y }, { x: w, y: a.y }]); break;
        case 'hray': path([a, { x: w, y: a.y }]); break;
        case 'vline': path([{ x: a.x, y: 0 }, { x: a.x, y: h }]); break;
        case 'cross': path([{ x: 0, y: a.y }, { x: w, y: a.y }]); path([{ x: a.x, y: 0 }, { x: a.x, y: h }]); break;
        case 'channel': path([a, b]); path([c, { x: c.x + b.x - a.x, y: c.y + b.y - a.y }]); shade(() => path([a, b, { x: c.x + b.x - a.x, y: c.y + b.y - a.y }, c], true)); break;
        case 'rect': ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y); shade(() => ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y)); break;
        case 'ellipse': { const e = () => ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, 7); e(); shade(e); break; }
        case 'triangle': path(P, true); shade(() => path(P, true)); break;
        case 'brush': path(P); break;
        case 'measure': ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y); shade(() => ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y), b.y <= a.y ? '#2fb67c' : '#e5534b'); break;
      }
      ctx.stroke();
      if (it.type === 'arrow') { const ang = Math.atan2(b.y - a.y, b.x - a.x); ctx.beginPath(); path([b, { x: b.x - 12 * Math.cos(ang - 0.4), y: b.y - 12 * Math.sin(ang - 0.4) }, { x: b.x - 12 * Math.cos(ang + 0.4), y: b.y - 12 * Math.sin(ang + 0.4) }], true); ctx.fill(); }
      if (it.type === 'hline') ctx.fillText(fmt(it.pts[0].price, dp), w - 140, a.y - 4);
      if (it.type === 'text') { ctx.font = '14px system-ui,sans-serif'; ctx.fillText(it.text, a.x, a.y); }
      if (it.type === 'measure') {
        const d = it.pts[1].price - it.pts[0].price, bars = Math.round(Math.abs(it.pts[1].time - it.pts[0].time) / this.getStep());
        const txt = `${d >= 0 ? '+' : ''}${fmt(d, dp)} (${fmt((d / it.pts[0].price) * 100)}%)  ${bars} bars · ${dur(it.pts[1].time - it.pts[0].time)}`, tw = ctx.measureText(txt).width + 12;
        const cx = (a.x + b.x) / 2 - tw / 2, cy = Math.min(a.y, b.y) - 24;
        ctx.fillStyle = 'rgba(20,23,28,.92)'; ctx.fillRect(cx, cy, tw, 18); ctx.fillStyle = '#fff'; ctx.fillText(txt, cx + 6, cy + 13);
      }
      if (it.type === 'fib' || it.type === 'fibext') {
        const ext = it.type === 'fibext', xs = P.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs) + (ext ? 60 : 0);
        ctx.setLineDash([4, 4]); ctx.beginPath(); path(P); ctx.stroke(); ctx.setLineDash([]);
        for (const lv of ext ? EXT : FIB) {
          const price = ext ? it.pts[2].price + (it.pts[1].price - it.pts[0].price) * lv : it.pts[0].price + (it.pts[1].price - it.pts[0].price) * lv, y = this.c.y(price); if (y == null) continue;
          ctx.globalAlpha = 0.8; ctx.beginPath(); path([{ x: x0, y }, { x: x1, y }]); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.fillText(`${lv} (${fmt(price, dp)})`, x0 + 4, y - 3);
        }
      }
      if (sel && def.n > 1) real.forEach((p) => { ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 4, p.y - 4, 8, 8); ctx.strokeRect(p.x - 4, p.y - 4, 8, 8); });
    }
  }

  #geo(P) { return { x0: P[0].x, x1: Math.max(P[3].x, P[0].x + 30), yE: P[0].y, yT: P[1].y, yS: P[2].y }; }
  #handles(it, P) { if (!POS.has(it.type)) return P; const g = this.#geo(P); return [{ x: g.x0, y: g.yE }, { x: g.x1, y: g.yT }, { x: g.x1, y: g.yS }, { x: g.x1, y: g.yE }]; }
  #drawPos(ctx, it, P, sel) {
    const g = this.#geo(P), bw = g.x1 - g.x0, dp = this.getDp(), [e, tp, sl] = it.pts;
    ctx.fillStyle = 'rgba(47,182,124,.16)'; ctx.fillRect(g.x0, Math.min(g.yE, g.yT), bw, Math.abs(g.yT - g.yE));
    ctx.fillStyle = 'rgba(229,83,75,.16)'; ctx.fillRect(g.x0, Math.min(g.yE, g.yS), bw, Math.abs(g.yS - g.yE));
    const ln = (y, c) => { ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); };
    ln(g.yT, '#2fb67c'); ln(g.yS, '#e5534b'); ln(g.yE, '#8a93a1');
    const tpD = Math.abs(tp.price - e.price), slD = Math.abs(e.price - sl.price), r = this.getRisk(e.price, sl.price);
    label(ctx, `Target: ${fmt(tpD, dp)} (${fmt((tpD / e.price) * 100)}%)${r ? '  ' + money(r.units * tpD) : ''}`, g.x0 + 4, g.yT < g.yE ? g.yT - 21 : g.yT + 3, '#1f9a68');
    label(ctx, `Stop: ${fmt(slD, dp)} (${fmt((slD / e.price) * 100)}%)${r ? '  ' + money(-r.units * slD) : ''}`, g.x0 + 4, g.yS < g.yE ? g.yS - 21 : g.yS + 3, '#d6453d');
    const txt = `R:R ${+(tpD / slD).toFixed(2)}${r ? ` · ${r.lots} lot · risk $${fmt(r.risk)}` : ''}`;
    ctx.font = '11.5px system-ui,sans-serif';
    label(ctx, txt, g.x0 + bw / 2 - (ctx.measureText(txt).width + 12) / 2, g.yE - 9, '#4d5666');
    ctx.strokeStyle = '#8a93a1'; ctx.fillStyle = '#fff';
    if (sel) for (const h of this.#handles(it, P)) { ctx.fillRect(h.x - 4, h.y - 4, 8, 8); ctx.strokeRect(h.x - 4, h.y - 4, 8, 8); }
  }
  #body(it, P, q) {
    if (POS.has(it.type)) { const g = this.#geo(P); return q.x > g.x0 - 4 && q.x < g.x1 + 4 && q.y > Math.min(g.yT, g.yS, g.yE) - 4 && q.y < Math.max(g.yT, g.yS, g.yE) + 4; }
    const [a, b, c] = P, near = (u, v) => segDist(q, u, v) < 6, box = (u, v) => q.x > Math.min(u.x, v.x) - 5 && q.x < Math.max(u.x, v.x) + 5 && q.y > Math.min(u.y, v.y) - 5 && q.y < Math.max(u.y, v.y) + 5;
    switch (it.type) {
      case 'trend': case 'arrow': return near(a, b);
      case 'ray': return near(a, far(a, b));
      case 'extended': return near(far(b, a), far(a, b));
      case 'hline': return Math.abs(q.y - a.y) < 6;
      case 'hray': return Math.abs(q.y - a.y) < 6 && q.x > a.x - 5;
      case 'vline': return Math.abs(q.x - a.x) < 6;
      case 'cross': return Math.abs(q.y - a.y) < 6 || Math.abs(q.x - a.x) < 6;
      case 'channel': return near(a, b) || near({ x: c.x, y: c.y }, { x: c.x + b.x - a.x, y: c.y + b.y - a.y });
      case 'rect': case 'measure': return box(a, b);
      case 'ellipse': return (((q.x - (a.x + b.x) / 2) / (Math.abs(b.x - a.x) / 2 || 1)) ** 2 + ((q.y - (a.y + b.y) / 2) / (Math.abs(b.y - a.y) / 2 || 1)) ** 2) <= 1.15;
      case 'triangle': return inPoly(q, P) || near(a, b) || near(b, c) || near(c, a);
      case 'brush': return P.some((p, i) => i && near(P[i - 1], p));
      case 'text': return q.x > a.x - 4 && q.x < a.x + it.text.length * 8 + 4 && q.y > a.y - 16 && q.y < a.y + 4;
      case 'fib': case 'fibext': {
        const ext = it.type === 'fibext', xs = P.map((p) => p.x);
        if (q.x < Math.min(...xs) - 5 || q.x > Math.max(...xs) + (ext ? 65 : 5)) return false;
        return (ext ? EXT : FIB).some((lv) => Math.abs(q.y - (this.c.y(ext ? it.pts[2].price + (it.pts[1].price - it.pts[0].price) * lv : it.pts[0].price + (it.pts[1].price - it.pts[0].price) * lv) ?? -999)) < 5);
      }
    }
  }
  hit(x, y) {
    if (this.tool !== 'cursor' && this.tool !== 'eraser') return null; // a drawing tool is active: clicks start a new shape
    const q = { x, y };
    for (const it of [...this.items].reverse()) {
      const P = this.#px(it); if (!P) continue;
      if (this.tool !== 'eraser' && TOOLS[it.type].n > 1) { const H = this.#handles(it, P); for (let i = 0; i < H.length; i++) if (dist(H[i], q) < 9) return { it, i }; }
      if (this.#body(it, P, q)) return { it, i: -1 };
    }
    return null;
  }
  grab(h, x, y) {
    if (this.tool === 'eraser') { this.items = this.items.filter((i) => i !== h.it); this.sel = null; this.onChange(); return; }
    this.sel = h.it; this.orig = { px: this.#px(h.it), x, y };
  }
  hover(x, y) { if (this.awaiting) this.draft.pts[this.draft.pts.length - 1] = this.#pt(x, y); }
  // Click A, move, click B. (Dragging from A to B also works.)
  #finish() {
    const d = this.draft, P = this.#px(d);
    if (!(P && P.length > 1 && dist(P[0], P[P.length - 1]) > 5)) return false;
    if (TOOLS[d.type].init) d.pts = TOOLS[d.type].init(P[0], P[1]).map((p) => this.#pt(p.x, p.y));
    this.items.push(d); this.sel = d; this.setTool('cursor'); this.onChange();
    return true;
  }
  begin(x, y) {
    if (this.awaiting) { this.draft.pts[this.draft.pts.length - 1] = this.#pt(x, y); this.#finish(); return true; }
    const t = this.tool; if (t === 'cursor' || t === 'eraser') return false;
    const it = { type: t, color: this.color, pts: [this.#pt(x, y)] };
    if (TOOLS[t].make) { it.pts = TOOLS[t].make(it.pts[0], this); this.items.push(it); this.sel = it; this.setTool('cursor'); return true; }
    if (TOOLS[t].n === 1) {
      if (t === 'text') { const s = prompt('Text'); if (s) it.text = s.slice(0, 80); else { this.setTool('cursor'); return true; } }
      this.items.push(it); this.sel = it; this.setTool('cursor'); return true;
    }
    if (TOOLS[t].n) it.pts.push({ ...it.pts[0] });
    this.draft = it; return true;
  }
  drag(h, x, y) {
    if (this.tool === 'eraser') return;
    if (this.draft) { if (this.draft.type === 'brush') this.draft.pts.push(this.#pt(x, y)); else this.draft.pts[1] = this.#pt(x, y); return; }
    if (!h) return;
    if (POS.has(h.it.type) && (h.i === 1 || h.i === 2 || h.i === 3)) {
      const pts = h.it.pts, tick = 10 ** -this.getDp();
      if (h.i === 3) { const t = this.c.t(x); if (t != null && t > pts[0].time + this.getStep()) pts[3].time = t; return; }
      const v = this.c.p(y); if (v == null) return;
      pts[h.i].price = (h.i === 1) === (h.it.type === 'longpos') ? Math.max(v, pts[0].price + tick) : Math.min(v, pts[0].price - tick);
      return;
    }
    if (h.i >= 0 && !POS.has(h.it.type)) h.it.pts[h.i] = this.#pt(x, y);
    else { const dx = x - this.orig.x, dy = y - this.orig.y; h.it.pts = this.orig.px.map((p) => this.#pt(p.x + dx, p.y + dy)); }
  }
  end() {
    const d = this.draft;
    if (d && !this.awaiting) {
      if (!this.#finish()) { if (d.type === 'brush') this.setTool('cursor'); else this.awaiting = true; } // short click on A: wait for B
      return;
    }
    this.onChange();
  }
}
