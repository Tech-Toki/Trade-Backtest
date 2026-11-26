const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const market = require('../services/market');

router.use(requireAuth);

router.get('/meta', (req, res) => res.json({ symbols: market.meta(), timeframes: Object.keys(market.TF) }));

// ?symbol=BTCUSD&tf=1h&to=<unix>&limit=500   -> candles up to `to` (last one partial: no look-ahead)
// ?symbol=BTCUSD&tf=1h&from=<unix>&limit=500 -> candles from `from` onward
router.get('/', (req, res) => {
  const { symbol, tf } = req.query;
  if (!market.SYMBOLS[symbol] || !market.TF[tf]) return res.status(400).json({ error: 'Bad symbol or timeframe' });
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 5000);
  const to = req.query.to != null ? parseInt(req.query.to) : null;
  const from = req.query.from != null ? parseInt(req.query.from) : null;
  if ((to == null) === (from == null) || [to, from].some((x) => x != null && !Number.isFinite(x)))
    return res.status(400).json({ error: 'Provide exactly one of from/to' });
  res.json({ candles: market.candles(symbol, tf, { from, to, limit }) });
});
module.exports = router;
