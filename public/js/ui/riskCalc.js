// Risk calculator dialog: how many lots to trade so a stop-out costs X% of the balance.
import { fmt } from '../core/format.js';
import { riskSize, getRiskPct, setRiskPct } from '../trading/risk.js';

export function bindRiskCalc({ getContext, onUse }) {
  const dlg = document.querySelector('#riskDlg'), $ = (s) => dlg.querySelector(s); let last = null;
  function calc() {
    const { spec, leverage } = getContext(), pct = +$('#rPct').value;
    if (pct > 0) setRiskPct(pct);
    last = riskSize({ balance: +$('#rBal').value, riskPct: pct, entry: +$('#rEntry').value, stop: +$('#rStop').value, tp: +$('#rTp').value || null, leverage, spec });
    $('#rUse').disabled = !last?.canTrade;
    $('#rOut').innerHTML = !last ? '<span class="muted">Enter entry and stop loss.</span>' : `
      <div class="row"><span class="muted">Position size</span><b class="num">${last.lots} lot</b></div>
      <div class="row"><span class="muted">Units</span><span class="num">${last.units.toPrecision(5)}</span></div>
      <div class="row"><span class="muted">Money at risk</span><b class="num neg">-$${fmt(last.risk)}</b></div>
      <div class="row"><span class="muted">Margin needed (1:${leverage})</span><span class="num">$${fmt(last.margin)}</span></div>
      ${last.reward != null ? `<div class="row"><span class="muted">Reward at target</span><b class="num pos">+$${fmt(last.reward)}</b></div><div class="row"><span class="muted">Risk : reward</span><span class="num">1 : ${last.rr.toFixed(2)}</span></div>` : ''}
      ${last.canTrade ? '' : `<div class="neg" style="font-size:12px">Below the minimum ${spec.minLot} lot. Raise the risk % or tighten the stop.</div>`}`;
  }
  dlg.addEventListener('input', calc);
  $('#rClose').onclick = () => dlg.close();
  $('#rUse').onclick = () => { if (last?.canTrade) { dlg.close(); onUse(last, +$('#rStop').value, +$('#rTp').value || null); } };
  document.querySelector('#riskBtn').onclick = () => {
    const { balance, price, spec } = getContext();
    $('#rBal').value = balance.toFixed(2); $('#rPct').value = getRiskPct(); $('#rEntry').value = price; $('#rStop').value = ''; $('#rTp').value = '';
    $('#rEntry').step = $('#rStop').step = $('#rTp').step = 'any'; calc(); dlg.showModal();
  };
}
