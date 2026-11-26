// Candle-by-candle replay. Higher timeframes only ever show the forming candle (no look-ahead).
const TF_SEC = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '1D': 86400, '1W': 604800 };

export class Replay {
  constructor({ api, onBar, onReset, onEnd, onPrepend = () => {}, onState = () => {} }) {
    Object.assign(this, { api, onBar, onReset, onEnd, onPrepend, onState, exhausted: false, loadingOlder: false, symbol: 'BTCUSD', tf: '1h', speed: 1, playing: false, timer: null, shown: [], future: [], cursor: 0, curTime: 0 });
  }
  get last() { return this.shown[this.shown.length - 1] || null; }
  get stepSec() { return TF_SEC[this.tf]; }

  async load(symbol, tf, ts) {
    this.pause();
    Object.assign(this, { symbol, tf });
    const q = `symbol=${symbol}&tf=${tf}`;
    const [h, f] = await Promise.all([this.api(`/candles?${q}&to=${ts - 1}&limit=500`), this.api(`/candles?${q}&from=${ts}&limit=3000`)]);
    Object.assign(this, { shown: h.candles, future: f.candles, cursor: 0, curTime: ts, exhausted: false });
    this.onReset(this.shown);
  }
  // Called when the user scrolls near the left edge: fetch older candles so history is unlimited.
  async loadOlder(n = 1500) {
    const ref = this.shown;
    if (this.loadingOlder || this.exhausted || !ref.length) return;
    this.loadingOlder = true;
    try {
      const r = await this.api(`/candles?symbol=${this.symbol}&tf=${this.tf}&to=${ref[0].time - 1}&limit=${n}`);
      if (ref !== this.shown) return; // session was reloaded meanwhile
      if (!r.candles.length) { this.exhausted = true; return; }
      ref.unshift(...r.candles); this.onPrepend(r.candles.length);
    } finally { this.loadingOlder = false; }
  }
  async more() {
    const r = await this.api(`/candles?symbol=${this.symbol}&tf=${this.tf}&from=${this.curTime}&limit=3000`);
    this.future = r.candles; this.cursor = 0;
    return r.candles.length > 0;
  }
  async step() {
    if (this.cursor >= this.future.length && !(await this.more())) { this.pause(); this.onEnd(); return; }
    const n = this.future[this.cursor++], last = this.last;
    let bar = n;
    if (last && last.time === n.time) { // remainder of a candle that was partly shown
      bar = { time: n.time, open: last.open, high: Math.max(last.high, n.high), low: Math.min(last.low, n.low), close: n.close, volume: last.volume + n.volume };
      this.shown[this.shown.length - 1] = bar;
    } else this.shown.push(bar);
    this.curTime = n.time + this.stepSec;
    this.onBar(bar, n);
  }
  play() { if (this.playing) return; this.playing = true; this.onState(true); this.#loop(); }
  pause() { this.playing = false; clearTimeout(this.timer); this.onState(false); }
  #loop() { if (!this.playing) return; this.step().then(() => { if (this.playing) this.timer = setTimeout(() => this.#loop(), 1000 / this.speed); }); }
}
