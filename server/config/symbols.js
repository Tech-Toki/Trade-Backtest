// Per-instrument contract specs. 1 lot follows the common MT5 convention.
module.exports = {
  BTCUSD: { label: 'Bitcoin / US Dollar', contractSize: 1, spread: 10, dp: 2, minLot: 0.01, lotStep: 0.01, start: 16500, end: 105000, vol: 0.0008, seed: 1337 },
  XAUUSD: { label: 'Gold / US Dollar', contractSize: 100, spread: 0.3, dp: 2, minLot: 0.01, lotStep: 0.01, start: 1800, end: 4100, vol: 0.00024, seed: 4242 },
};
