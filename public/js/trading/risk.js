// Position size from risk: lose `riskPct` % of balance if the stop is hit. Lots round DOWN to the lot step.
export const RISK_KEY = 'tb_risk';
export const getRiskPct = () => +(localStorage.getItem(RISK_KEY) || 1);
export const setRiskPct = (v) => localStorage.setItem(RISK_KEY, v);

export function riskSize({ balance, riskPct, entry, stop, tp, leverage, spec }) {
  const dist = Math.abs(entry - stop), target = (balance * riskPct) / 100;
  if (!(dist > 0) || !(target > 0)) return null;
  const lots = +(Math.floor(target / dist / spec.contractSize / spec.lotStep + 1e-9) * spec.lotStep).toFixed(4);
  const units = lots * spec.contractSize;
  return {
    lots, units, risk: units * dist, margin: (units * entry) / leverage, canTrade: lots >= spec.minLot,
    reward: tp ? units * Math.abs(tp - entry) : null, rr: tp ? Math.abs(tp - entry) / dist : null,
  };
}
