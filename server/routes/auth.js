const router = require('express').Router();
const crypto = require('crypto');
const { rateLimit } = require('express-rate-limit');
const { db, save } = require('../db');
const password = require('../security/password');
const { requireAuth, issue, clear } = require('../middleware/auth');

const limiter = (limit) => rateLimit({ windowMs: 15 * 60e3, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Try again in a few minutes.' } });
const loginLimit = limiter(20), sensitive = limiter(10);
const pub = (u) => ({ id: u.id, email: u.email, name: u.name });
const norm = (e) => String(e || '').trim().toLowerCase();
const me = (req) => db.users.find((u) => u.id === req.user.id);

router.post('/register', loginLimit, async (req, res) => {
  const name = String(req.body?.name || '').trim(), email = norm(req.body?.email), pw = String(req.body?.password || '');
  if (!name || name.length > 60 || !/^[^\s@]{1,64}@[^\s@]{1,255}$/.test(email)) return res.status(400).json({ error: 'Valid name and email required' });
  const bad = password.problem(pw, email); if (bad) return res.status(400).json({ error: bad });
  if (db.users.some((u) => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
  const user = { id: crypto.randomUUID(), name, email, hash: await password.hash(pw), createdAt: Date.now(), tv: 0, fails: 0, lockUntil: 0 };
  db.users.push(user); save(); issue(res, user);
  res.status(201).json({ user: pub(user) });
});

router.post('/login', loginLimit, async (req, res) => {
  const email = norm(req.body?.email), pw = String(req.body?.password || '').slice(0, 200), u = db.users.find((x) => x.email === email);
  if (u && u.lockUntil > Date.now()) return res.status(429).json({ error: 'Too many failed attempts. Try again in a few minutes.' });
  const r = await password.verify(pw, u ? u.hash : password.DUMMY);
  if (!u || !r.ok) {
    if (u) { u.fails = (u.fails || 0) + 1; if (u.fails >= 5) { u.lockUntil = Date.now() + 15 * 60e3; u.fails = 0; } save(); }
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  u.fails = 0; u.lockUntil = 0;
  if (r.legacy) u.hash = await password.hash(pw); // upgrade old hashes
  save(); issue(res, u);
  res.json({ user: pub(u) });
});

router.post('/logout', (req, res) => { clear(res); res.json({ ok: true }); });
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.patch('/me', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 60) return res.status(400).json({ error: 'Name is required (max 60 characters)' });
  const u = me(req); u.name = name; save(); res.json({ user: pub(u) });
});

// 403 (not 401) on a wrong password so the client does not treat it as an expired session.
router.post('/password', requireAuth, sensitive, async (req, res) => {
  const u = me(req), next = String(req.body?.password || '');
  if (!(await password.verify(String(req.body?.current || '').slice(0, 200), u.hash)).ok) return res.status(403).json({ error: 'Current password is wrong' });
  const bad = password.problem(next, u.email); if (bad) return res.status(400).json({ error: bad });
  u.hash = await password.hash(next); u.tv = (u.tv || 0) + 1; save(); issue(res, u); // all other devices are signed out
  res.json({ ok: true });
});
router.post('/logout-all', requireAuth, sensitive, (req, res) => { const u = me(req); u.tv = (u.tv || 0) + 1; save(); clear(res); res.json({ ok: true }); });

router.delete('/me', requireAuth, sensitive, async (req, res) => {
  const u = me(req);
  if (!(await password.verify(String(req.body?.password || '').slice(0, 200), u.hash)).ok) return res.status(403).json({ error: 'Password is wrong' });
  db.users = db.users.filter((x) => x !== u); db.profiles = db.profiles.filter((x) => x.userId !== u.id); db.trades = db.trades.filter((x) => x.userId !== u.id);
  save(); clear(res); res.json({ ok: true });
});

// Download everything stored about you.
router.get('/export', requireAuth, sensitive, (req, res) => {
  const u = me(req), strip = ({ userId, ...rest }) => rest;
  res.setHeader('Content-Disposition', 'attachment; filename="backtest-pro-my-data.json"');
  res.json({ exportedAt: new Date().toISOString(), account: { name: u.name, email: u.email, createdAt: new Date(u.createdAt).toISOString() }, profiles: db.profiles.filter((p) => p.userId === u.id).map(strip), trades: db.trades.filter((t) => t.userId === u.id).map(strip) });
});
module.exports = router;
