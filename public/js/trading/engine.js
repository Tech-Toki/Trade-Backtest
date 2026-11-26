// Account + position bookkeeping. No DOM, no chart: safe to unit test.
// Candle prices are BID. Longs open at ask (bid + spread) and close at bid; shorts open at bid and close at ask.
export class Engine {
  constructor() { this.spread = 0; this.stopOutLevel = 50; this.reset({ initial: 10000, leverage: 100, closed: [] }); this.onClose = () => {}; this.onChange = () => {}; }
  reset({ initial, leverage, closed }) { this.initial = initial; this.leverage = leverage; this.closed = closed; this.positions = []; this.nextId = 1; }
  get balance() { return this.initial + this.closed.reduce((a, t) => a + t.pnl, 0); }

  exitPrice(p, bid) { return p.side === 'long' ? bid : bid + this.spread; } // price you would close at right now
  pnl(p, bid) { return (this.exitPrice(p, bid) - p.entry) * p.units * (p.side === 'long' ? 1 : -1); }
  unrealized(bid) { return this.positions.reduce((a, p) => a + this.pnl(p, bid), 0); }
  equity(bid) { return this.balance + this.unrealized(bid); }
  margin() { return this.positions.reduce((a, p) => a + (p.entry * p.units) / this.leverage, 0); }
  freeMargin(bid) { return this.equity(bid) - this.margin(); }
  marginLevel(bid) { const m = this.margin(); return m ? (this.equity(bid) / m) * 100 : Infinity; }

  open({ symbol, side, units, lots, bid, time, sl, tp, dp }) {
    const entry = side === 'long' ? bid + this.spread : bid, need = (entry * units) / this.leverage;
    if (need > this.freeMargin(bid)) return { error: `Not enough margin: need $${need.toFixed(2)}, free $${Math.max(0, this.freeMargin(bid)).toFixed(2)}` };
    const p = { id: this.nextId++, symbol, side, entry: +entry.toFixed(dp), units, lots, sl, tp, openTime: time, dp };
    this.positions.push(p); this.onChange();
    return { p };
  }
  close(p, fill, reason, time) {
    this.positions = this.positions.filter((x) => x !== p);
    const pnl = (fill - p.entry) * p.units * (p.side === 'long' ? 1 : -1);
    const t = { symbol: p.symbol, side: p.side, entry: p.entry, exit: fill, size: p.units, lots: p.lots, pnl, openTime: p.openTime, closeTime: time, reason };
    this.closed.unshift(t); this.onClose(t); this.onChange();
  }
  closeMarket(p, bid, time, reason = 'MKT') { this.close(p, this.exitPrice(p, bid), reason, time); }
  closeAll(bid, time, reason = 'MKT') { [...this.positions].forEach((p) => this.closeMarket(p, bid, time, reason)); }
  setLevel(p, key, price) { p[key] = price; this.onChange(); }

  // c = raw candle (bid). A candle that gaps past a level fills at its open; stop wins over target inside one candle.
  checkExits(c) {
    const s = this.spread;
    for (const p of [...this.positions]) {
      if (p.side === 'long') {
        if (p.sl && c.low <= p.sl) this.close(p, Math.min(p.sl, c.open), 'SL', c.time);
        else if (p.tp && c.high >= p.tp) this.close(p, Math.max(p.tp, c.open), 'TP', c.time);
      } else {
        if (p.sl && c.high + s >= p.sl) this.close(p, Math.max(p.sl, c.open + s), 'SL', c.time);
        else if (p.tp && c.low + s <= p.tp) this.close(p, Math.min(p.tp, c.open + s), 'TP', c.time);
      }
    }
  }
  // Broker-style stop-out: below the margin level, the biggest loser is closed first.
  stopOut(bid, time) {
    while (this.positions.length && this.marginLevel(bid) < this.stopOutLevel) {
      const worst = [...this.positions].sort((a, b) => this.pnl(a, bid) - this.pnl(b, bid))[0];
      this.closeMarket(worst, bid, time, 'SO');
    }
  }
}
