// Loads real 1-minute candles from data/market/<SYMBOL>.csv  (columns: time(sec),open,high,low,close,volume).
// The first load parses the CSV and writes a binary cache (<SYMBOL>.bin); later starts read the cache in about a second.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const DIR = path.join(__dirname, '..', '..', 'data', 'market');

function readBin(file) {
  const buf = fs.readFileSync(file), n = buf.readUInt32LE(0), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  let off = 4;
  const take = (Type) => { const a = new Type(ab.slice(off, off + n * 4)); off += n * 4; return a; };
  return { t: take(Uint32Array), o: take(Float32Array), h: take(Float32Array), l: take(Float32Array), c: take(Float32Array), v: take(Float32Array), source: 'csv' };
}
function writeBin(file, d) {
  const head = Buffer.alloc(4); head.writeUInt32LE(d.t.length, 0);
  const part = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  fs.writeFileSync(file, Buffer.concat([head, ...[d.t, d.o, d.h, d.l, d.c, d.v].map(part)]));
}

module.exports = async function loadCsv(symbol) {
  const csv = path.join(DIR, symbol + '.csv'), bin = path.join(DIR, symbol + '.bin');
  const hasCsv = fs.existsSync(csv), hasBin = fs.existsSync(bin);
  if (hasBin && (!hasCsv || fs.statSync(bin).mtimeMs >= fs.statSync(csv).mtimeMs)) return readBin(bin);
  if (!hasCsv) return null;
  const T = [], O = [], H = [], L = [], C = [], V = [];
  const rl = readline.createInterface({ input: fs.createReadStream(csv), crlfDelay: Infinity });
  for await (const line of rl) {
    const p = line.split(','), t = +p[0];
    if (!(t > 0) || (T.length && t <= T[T.length - 1])) continue; // skip header / out-of-order rows
    T.push(t); O.push(+p[1]); H.push(+p[2]); L.push(+p[3]); C.push(+p[4]); V.push(+p[5] || 0);
  }
  if (!T.length) return null;
  const d = { t: Uint32Array.from(T), o: Float32Array.from(O), h: Float32Array.from(H), l: Float32Array.from(L), c: Float32Array.from(C), v: Float32Array.from(V), source: 'csv' };
  try { writeBin(bin, d); } catch (e) { console.warn('  (could not write cache)', e.message); }
  return d;
};
