// Small rounded text tag used by position boxes and drawings.
export function label(ctx, text, x, y, bg) {
  ctx.font = '11.5px system-ui,sans-serif';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = bg; ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, 18, 3) : ctx.rect(x, y, w, 18);
  ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(text, x + 6, y + 13);
  return w;
}
