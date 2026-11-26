const router = require('express').Router();
const crypto = require('crypto');
const { db, save } = require('../db');
const { requireAuth } = require('../middleware/auth');
router.use(requireAuth);

const mine = (req) => db.profiles.filter((p) => p.userId === req.user.id);
const pub = ({ id, name, balance, leverage }) => ({ id, name, balance, leverage });
function clean(b = {}) {
  const name = String(b.name || '').trim().slice(0, 40), balance = +b.balance, leverage = +b.leverage;
  if (!name || !(balance >= 100 && balance <= 1e9) || !(leverage >= 1 && leverage <= 1000)) return null;
  return { name, balance, leverage };
}

router.get('/', (req, res) => {
  let list = mine(req);
  if (!list.length) {
    const p = { id: crypto.randomUUID(), userId: req.user.id, name: 'Main', balance: 10000, leverage: 100 };
    db.profiles.push(p);
    db.trades.forEach((t) => { if (t.userId === req.user.id && !t.profileId) t.profileId = p.id; }); // migrate old trades
    save(); list = [p];
  }
  res.json({ profiles: list.map(pub) });
});
router.post('/', (req, res) => {
  const d = clean(req.body); if (!d) return res.status(400).json({ error: 'Name, balance (100+) and leverage (1-1000) required' });
  if (mine(req).length >= 20) return res.status(400).json({ error: 'Profile limit reached' });
  const p = { id: crypto.randomUUID(), userId: req.user.id, ...d };
  db.profiles.push(p); save(); res.status(201).json({ profile: pub(p) });
});
router.patch('/:id', (req, res) => {
  const p = mine(req).find((x) => x.id === req.params.id); if (!p) return res.status(404).json({ error: 'Not found' });
  const d = clean({ ...p, ...req.body }); if (!d) return res.status(400).json({ error: 'Invalid profile' });
  Object.assign(p, d); save(); res.json({ profile: pub(p) });
});
router.delete('/:id', (req, res) => {
  const list = mine(req), p = list.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (list.length === 1) return res.status(400).json({ error: 'Keep at least one profile' });
  db.profiles = db.profiles.filter((x) => x !== p); db.trades = db.trades.filter((t) => t.profileId !== p.id); save();
  res.json({ ok: true });
});
module.exports = router;
