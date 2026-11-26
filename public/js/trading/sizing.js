// Three ways to size an order. Everything resolves to units of the instrument.
//   lot   : MT5-style lots (units = lots x contractSize), rounded down to the lot step
//   pct   : % of balance committed as margin  -> position value = balance x % x leverage
//   money : dollars committed as margin       -> position value = amount x leverage
export const MODES = { lot: 'Lots', pct: '% Balance', money: 'Margin $' };
export const DEFAULTS = { lot: 0.1, pct: 10, money: 1000 };

export function toUnits({ mode, value, price, balance, leverage, spec }) {
  if (!(value > 0) || !(price > 0)) return { units: 0, lots: 0, notional: 0 };
  let units;
  if (mode === 'lot') {
    const lots = Math.floor(value / spec.lotStep + 1e-9) * spec.lotStep;
    units = lots >= spec.minLot ? lots * spec.contractSize : 0;
  } else units = ((mode === 'pct' ? (balance * value) / 100 : value) * leverage) / price;
  return { units, lots: units / spec.contractSize, notional: units * price };
}
