// Drawing layers are rendered INSIDE the chart's own paint pass (a lightweight-charts series primitive),
// so boxes and drawings stay locked to the candles while you pan, zoom or replay. This class also routes
// the mouse: a layer gets input only when the cursor is on one of its handles, otherwise the chart pans.
export class Overlay {
  constructor(el, view) {
    Object.assign(this, { el, chart: view.chart, layers: [], active: null, request: null });
    const self = this;
    view.candles.attachPrimitive({
      attached: ({ requestUpdate }) => { self.request = requestUpdate; },
      detached() {}, updateAllViews() {},
      paneViews: () => [{
        zOrder: () => 'top',
        renderer: () => ({ draw: (target) => target.useMediaCoordinateSpace(({ context, mediaSize }) => self.#drawAll(context, mediaSize.width, mediaSize.height)) }),
      }],
    });
    el.addEventListener('mousedown', (e) => this.#down(e), true);
    window.addEventListener('mousemove', (e) => this.#move(e));
    window.addEventListener('mouseup', () => this.#up());
  }
  add(layer) { this.layers.push(layer); return layer; }
  redraw() { this.request?.(); }
  #drawAll(ctx, w, h) { ctx.save(); this.layers.forEach((L) => { ctx.save(); L.draw(ctx, w, h); ctx.restore(); }); ctx.restore(); }

  #pos(e) { const r = this.el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  #inPlot(p) { const s = this.chart.paneSize(); return p.x > 0 && p.x < s.width && p.y > 0 && p.y < s.height; }
  #hit(p) { for (const L of [...this.layers].reverse()) { const h = L.hit?.(p.x, p.y); if (h) return { L, h }; } return null; }
  #stop(e) { e.stopPropagation(); e.preventDefault(); }
  #down(e) {
    if (e.button !== 0) return;
    const p = this.#pos(e);
    if (!this.#inPlot(p)) return;
    document.activeElement?.blur?.(); // so Delete / Space reach the page, not a focused dropdown
    const waiting = this.layers.find((L) => L.awaiting);
    if (waiting) { waiting.begin(p.x, p.y); this.redraw(); return this.#stop(e); }
    const hit = this.#hit(p);
    if (hit) { this.active = hit; hit.L.grab?.(hit.h, p.x, p.y); this.redraw(); return this.#stop(e); }
    for (const L of this.layers) if (L.begin?.(p.x, p.y)) { this.active = { L, h: null }; this.redraw(); return this.#stop(e); }
    this.layers.forEach((L) => L.deselect?.()); this.redraw();
  }
  #move(e) {
    const p = this.#pos(e);
    if (this.active) { this.active.L.drag(this.active.h, p.x, p.y); this.redraw(); return; }
    if (!this.el.contains(e.target)) return;
    const hit = this.#inPlot(p) ? this.#hit(p) : null;
    this.el.style.cursor = hit ? hit.L.cursor?.(hit.h) || 'pointer' : this.layers.some((L) => L.tool && L.tool !== 'cursor') ? 'crosshair' : '';
    const w = this.layers.find((L) => L.awaiting);
    if (w) { w.hover(p.x, p.y); this.redraw(); }
  }
  #up() { if (this.active) { this.active.L.end?.(); this.active = null; this.redraw(); } }
}
