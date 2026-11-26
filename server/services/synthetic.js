// Fallback only: seeded random walk, used when data/market/<SYMBOL>.csv is missing.
const N = 5 * 365 * 1440;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

module.exports = function synthetic({ start, end, vol, seed }) {
  const r = rng(seed), now = Math.floor(Date.now() / 60000) * 60, t0 = now - (N - 1) * 60;
  const ret = new Float32Array(N);
  let vm = 1, sum = 0;
  for (let i = 0; i < N; i++) {
    if (i % 1440 === 0) vm = Math.min(2.5, Math.max(0.5, Math.exp(0.9 * Math.log(vm) + 0.25 * gauss(r))));
    ret[i] = gauss(r) * vol * vm; sum += ret[i];
  }
  const adj = (Math.log(end / start) - sum) / N;
  const t = new Uint32Array(N), o = new Float32Array(N), h = new Float32Array(N), l = new Float32Array(N), c = new Float32Array(N), v = new Float32Array(N);
  let p = start;
  for (let i = 0; i < N; i++) {
    const open = p; p = open * Math.exp(ret[i] + adj);
    const w = Math.abs(gauss(r)) * vol * 0.6;
    t[i] = t0 + i * 60; o[i] = open; c[i] = p; h[i] = Math.max(open, p) * (1 + w); l[i] = Math.min(open, p) * (1 - w);
    v[i] = (50 + r() * 150) * (1 + Math.abs(ret[i]) / vol);
  }
  return { t, o, h, l, c, v, source: 'synthetic' };
};
