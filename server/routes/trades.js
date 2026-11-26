const router = require('express').Router();
const { db, save } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { SYMBOLS } = require('../services/market');
router.use(requireAuth);

const owns = (req, id) => db.profiles.some((p) => p.id === id && p.userId === req.user.id);

router.get('/', (req, res) => {
  if (req.query.profileId === 'all') return res.json({ trades: db.trades.filter((t) => t.userId === req.user.id).sort((a, b) => b.closeTime - a.closeTime) });
  if (!owns(req, req.query.profileId)) return res.status(404).json({ error: 'Profile not found' });
  res.json({ trades: db.trades.filter((t) => t.profileId === req.query.profileId).sort((a, b) => b.closeTime - a.closeTime) });
});
router.post('/', (req, res) => {
  const t = req.body || {};
  const nums = ['entry', 'exit', 'size', 'pnl', 'openTime', 'closeTime'];
  if (!owns(req, t.profileId) || !SYMBOLS[t.symbol] || !['long', 'short'].includes(t.side) || nums.some((k) => !Number.isFinite(t[k])))
    return res.status(400).json({ error: 'Invalid trade' });
  const trade = { userId: req.user.id, profileId: t.profileId, symbol: t.symbol, side: t.side, lots: Number.isFinite(t.lots) ? t.lots : null, reason: String(t.reason || '').slice(0, 10), ...Object.fromEntries(nums.map((k) => [k, t[k]])) };
  db.trades.push(trade); save(); res.status(201).json({ trade });
});
router.delete('/', (req, res) => {
  if (!owns(req, req.query.profileId)) return res.status(404).json({ error: 'Profile not found' });
  db.trades = db.trades.filter((t) => t.profileId !== req.query.profileId); save(); res.json({ ok: true });
});
module.exports = router;
