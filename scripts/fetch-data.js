/**
 * Downloads real 1-minute candles into data/market/<SYMBOL>.csv  (time,open,high,low,close,volume)
 *   node scripts/fetch-data.js            -> both symbols, 10 years
 *   node scripts/fetch-data.js BTCUSD 3   -> one symbol, 3 years
 * Safe to stop and re-run: it resumes from the last saved candle.
 *   BTCUSD : Binance public market data (BTCUSDT, USDT ~ USD)
 *   XAUUSD : Dukascopy via the `dukascopy-node` package
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'data', 'market');
fs.mkdirSync(DIR, { recursive: true });
const which = (process.argv[2] || 'all').toUpperCase();
const YEARS = +process.argv[3] || 10;
const DAY = 864e5, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Math.floor(Date.now() / 60000) * 60000;

function lastTime(file) {
  if (!fs.existsSync(file)) return 0;
  const fd = fs.openSync(file, 'r'), { size } = fs.fstatSync(fd), len = Math.min(size, 300), buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
  const lines = buf.toString().trim().split('\n');
  return +lines[lines.length - 1].split(',')[0] || 0;
}
const startMs = (file) => (lastTime(file) ? (lastTime(file) + 60) * 1000 : now - YEARS * 365 * DAY);

async function btc() {
  const file = path.join(DIR, 'BTCUSD.csv');
  let t = startMs(file);
  while (t < now) {
    const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=${t}&limit=1000`);
    if (!r.ok) { console.log(`\nHTTP ${r.status}, retrying...`); await sleep(3000); continue; }
    const k = await r.json();
    if (!k.length) break;
    fs.appendFileSync(file, k.map((x) => [x[0] / 1000, x[1], x[2], x[3], x[4], x[5]].join(',')).join('\n') + '\n');
    t = k[k.length - 1][0] + 60000;
    process.stdout.write(`\rBTCUSD  ${new Date(t).toISOString().slice(0, 10)}`);
    await sleep(100);
  }
  console.log('\nBTCUSD done');
}

async function xau() {
  const { getHistoricalRates } = await import('dukascopy-node');
  const file = path.join(DIR, 'XAUUSD.csv');
  let last = lastTime(file);
  for (let s = startMs(file); s < now; s += 7 * DAY) {
    const rows = await getHistoricalRates({ instrument: 'xauusd', dates: { from: new Date(s), to: new Date(Math.min(s + 7 * DAY, now)) }, timeframe: 'm1', format: 'json', priceType: 'bid', volumes: true, useCache: false });
    const out = [];
    for (const r of rows) { const t = r.timestamp / 1000; if (t > last) { out.push([t, r.open, r.high, r.low, r.close, r.volume || 0].join(',')); last = t; } }
    if (out.length) fs.appendFileSync(file, out.join('\n') + '\n');
    process.stdout.write(`\rXAUUSD  ${new Date(s).toISOString().slice(0, 10)}`);
  }
  console.log('\nXAUUSD done');
}

(async () => {
  if (which === 'ALL' || which === 'BTCUSD') await btc();
  if (which === 'ALL' || which === 'XAUUSD') await xau();
})().catch((e) => { console.error('\n' + e.message); process.exit(1); });
