// Performance page: filters -> KPIs, equity curve, breakdowns, calendar, trade list.
import { api, isLoggedIn, logout } from '../core/api.js';
import { toast } from '../ui/toast.js';
import { reveal, countUp } from '../ui/motion.js';
import { bindMenu } from '../ui/menu.js';
import { download, tradesCSV, summaryCSV, dailyCSV } from '../analytics/export.js';
import { initThemeToggle } from '../core/theme.js';
import { fmt, money, cls } from '../core/format.js';
import { summarize, equityCurve, breakdown } from '../analytics/stats.js';
import { renderCalendar, shift, ratio, groupByDay } from '../analytics/calendar.js';
import { tradeTable } from '../analytics/tradeTable.js';
import { createDateSelect } from '../ui/dateSelect.js';

if (!isLoggedIn()) location.href = '/auth.html';
const $ = (s) => document.querySelector(s);
const st = { trades: [], profiles: [], view: 'month', anchor: new Date() };
let chart, series;
const picker = createDateSelect({ y: '#cY', m: '#cM', d: '#cD' });

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function styleChart() {
  if (!chart) return;
  chart.applyOptions({ layout: { background: { type: 'solid', color: css('--panel') }, textColor: css('--muted') }, grid: { vertLines: { color: css('--line') }, horzLines: { color: css('--line') } } });
  const up = css('--buy'), dn = css('--sell');
  series.applyOptions({ topLineColor: up, topFillColor1: rgba(up, 0.3), topFillColor2: rgba(up, 0.02), bottomLineColor: dn, bottomFillColor1: rgba(dn, 0.02), bottomFillColor2: rgba(dn, 0.3) });
}

const filtered = () => st.trades.filter((t) => (!$('#fProfile').value || t.profileId === $('#fProfile').value) && (!$('#fSymbol').value || t.symbol === $('#fSymbol').value) && (!$('#fSide').value || t.side === $('#fSide').value));
const initialBalance = () => { const id = $('#fProfile').value; return id ? st.profiles.find((p) => p.id === id).balance : st.profiles.reduce((a, p) => a + p.balance, 0); };

const FORMATS = { money, usd: (v) => '$' + fmt(v), negusd: (v) => '-$' + fmt(v), pct1: (v) => v.toFixed(1) + '%', pct2: (v) => v.toFixed(2) + '%', int: (v) => String(Math.round(v)), dec2: (v) => v.toFixed(2) };
let kpiN = 0;
const kpi = (label, value, c = '', num = null, f = '') => `<div class="kpi" style="--i:${kpiN++}"><span>${label}</span><b class="${c}"${num != null && Number.isFinite(num) ? ` data-num="${num}" data-f="${f}"` : ''}>${value}</b></div>`;
const hrs = (s) => (s >= 86400 ? (s / 86400).toFixed(1) + 'd' : s >= 3600 ? (s / 3600).toFixed(1) + 'h' : Math.round(s / 60) + 'm');

function renderKpis(rows, eq, initial) {
  const s = summarize(rows); kpiN = 0;
  $('#kpis').innerHTML = [
    kpi('Net P&L', money(s.net), cls(s.net), s.net, 'money'), kpi('Return', (initial ? (s.net / initial) * 100 : 0).toFixed(2) + '%', cls(s.net), initial ? (s.net / initial) * 100 : 0, 'pct2'),
    kpi('Trades', s.n, '', s.n, 'int'), kpi('Win rate', (s.winRate * 100).toFixed(1) + '%', '', s.winRate * 100, 'pct1'), kpi('Wins / Losses', `${s.wins} / ${s.losses}`),
    kpi('Profit factor', s.profitFactor === Infinity ? '∞' : s.profitFactor.toFixed(2), '', s.profitFactor, 'dec2'), kpi('Avg win', '$' + fmt(s.avgWin), 'pos', s.avgWin, 'usd'), kpi('Avg loss', '-$' + fmt(s.avgLoss), 'neg', s.avgLoss, 'negusd'),
    kpi('Payoff ratio', s.payoff.toFixed(2), '', s.payoff, 'dec2'), kpi('Expectancy', money(s.expectancy), cls(s.expectancy), s.expectancy, 'money'), kpi('Best trade', money(s.best), cls(s.best), s.best, 'money'), kpi('Worst trade', money(s.worst), cls(s.worst), s.worst, 'money'),
    kpi('Max drawdown', `-$${fmt(eq.maxDD)} (${(eq.maxDDPct * 100).toFixed(1)}%)`, eq.maxDD ? 'neg' : ''), kpi('Win streak', s.maxWinStreak), kpi('Loss streak', s.maxLossStreak), kpi('Avg hold', s.n ? hrs(s.avgHold) : '–'),
  ].join('');
  $('#kpis').querySelectorAll('[data-num]').forEach((el) => countUp(el, +el.dataset.num, FORMATS[el.dataset.f]));
}

const table = (title, groups) => `<h3>${title}</h3><table><thead><tr><th></th><th class="r">Trades</th><th class="r">Win %</th><th class="r">Net</th></tr></thead><tbody>${groups.map((g) =>
  `<tr><td>${g.label ?? g.key}</td><td class="num r">${g.n}</td><td class="num r">${(g.winRate * 100).toFixed(0)}%</td><td class="num r ${cls(g.net)}">${money(g.net)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No data</td></tr>'}</tbody></table>`;

function renderBreakdown(rows) {
  const names = Object.fromEntries(st.profiles.map((p) => [p.id, p.name]));
  $('#breakdown').innerHTML = table('Long vs short', breakdown(rows, (t) => t.side).map((g) => ({ ...g, label: g.key.toUpperCase() }))) +
    table('By symbol', breakdown(rows, (t) => t.symbol)) + table('By profile', breakdown(rows, (t) => t.profileId).map((g) => ({ ...g, label: names[g.key] || '—' })));
}

function renderCal(rows) {
  const { title, totals, html } = renderCalendar(rows, st.view, st.anchor);
  const showDay = st.view === 'week' || st.view === 'day';
  $('#calTitle').textContent = showDay ? title : ''; $('#cal').innerHTML = html;
  $('#cD').hidden = !showDay; $('#cM').hidden = st.view === 'year'; picker.set(st.anchor.getTime() / 1000);
  $('#totals').innerHTML = `<div><span>Net</span><b class="num ${cls(totals.pnl)}">${money(totals.pnl)}</b></div><div><span>Trades</span><b class="num">${totals.n}</b></div><div><span>Wins</span><b class="num pos">${totals.w}</b></div><div><span>Losses</span><b class="num neg">${totals.l}</b></div><div><span>Win/Loss ratio</span><b class="num">${ratio(totals)}</b></div>`;
}

function render() {
  const rows = filtered(), initial = initialBalance(), eq = equityCurve(rows, initial);
  renderKpis(rows, eq, initial); renderBreakdown(rows); renderCal(rows); $('#trades').innerHTML = tradeTable(rows);
  $('#eq').hidden = !eq.points.length; $('#eqEmpty').hidden = !!eq.points.length;
  if (eq.points.length) {
    if (!chart) {
      chart = LightweightCharts.createChart($('#eq'), { autoSize: true, layout: { attributionLogo: false }, timeScale: { timeVisible: true, borderVisible: false }, rightPriceScale: { borderVisible: false } });
      series = chart.addBaselineSeries({ lineWidth: 2 });
    }
    styleChart(); series.applyOptions({ baseValue: { type: 'price', price: initial } });
    series.setData(eq.points); chart.timeScale().fitContent();
  }
}

function bind() {
  ['#fProfile', '#fSymbol', '#fSide'].forEach((s) => ($(s).onchange = render));
  $('#views').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st.view = b.dataset.view; $('#views').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); renderCal(filtered()); };
  $('#prev').onclick = () => { st.anchor = shift(st.view, st.anchor, -1); renderCal(filtered()); };
  $('#next').onclick = () => { st.anchor = shift(st.view, st.anchor, 1); renderCal(filtered()); };
  $('#latest').onclick = () => { const r = filtered(); st.anchor = r.length ? new Date(Math.max(...r.map((t) => t.closeTime)) * 1000) : new Date(); renderCal(r); };
  $('#cal').onclick = (e) => {
    const d = e.target.closest('[data-day]'), m = e.target.closest('[data-month]');
    const go = (view, date) => { st.view = view; st.anchor = new Date(date + 'T00:00:00Z'); $('#views').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.view === view)); renderCal(filtered()); };
    if (d) go('day', d.dataset.day); else if (m) go('month', m.dataset.month + '-01');
  };
  picker.onChange(() => { st.anchor = new Date(picker.get() * 1000); renderCal(filtered()); });
  bindMenu($('#dlBtn'), $('#dlMenu'));
  $('#dlMenu').onclick = (e) => {
    const b = e.target.closest('[data-dl]'); if (!b) return;
    const rows = filtered(); if (!rows.length) return toast('No trades to download yet', 'ok');
    const initial = initialBalance(), eq = equityCurve(rows, initial), s = summarize(rows), stamp = new Date().toISOString().slice(0, 10), names = Object.fromEntries(st.profiles.map((p) => [p.id, p.name]));
    const kind = b.dataset.dl;
    if (kind === 'trades-csv') download(`trades-${stamp}.csv`, 'text/csv', tradesCSV(rows, (id) => names[id] || ''));
    else if (kind === 'summary-csv') download(`performance-summary-${stamp}.csv`, 'text/csv', summaryCSV(s, eq));
    else if (kind === 'daily-csv') download(`daily-pnl-${stamp}.csv`, 'text/csv', dailyCSV([...groupByDay(rows)]));
    else download(`${kind === 'trades-json' ? 'trades' : 'performance-report'}-${stamp}.json`, 'application/json',
      JSON.stringify(kind === 'trades-json' ? rows : { generatedAt: new Date().toISOString(), filters: { profile: $('#fProfile').selectedOptions[0].textContent, symbol: $('#fSymbol').value || 'all', side: $('#fSide').value || 'both' }, summary: s, maxDrawdown: { amount: eq.maxDD, percent: eq.maxDDPct * 100 }, equity: eq.points, trades: rows }, null, 2));
  };
  $('#logout').onclick = logout;
}

async function init() {
  initThemeToggle($('#theme'), styleChart); bind();
  const [p, t] = await Promise.all([api('/profiles'), api('/trades?profileId=all')]);
  st.profiles = p.profiles; st.trades = t.trades;
  const yr = (ts) => new Date(ts * 1000).getUTCFullYear(), years = st.trades.map((x) => yr(x.closeTime));
  const lo = Math.min(2010, ...years), hi = Math.max(new Date().getUTCFullYear(), ...years) + 1;
  picker.init(Date.UTC(lo, 0, 1) / 1000 - 1, Date.UTC(hi + 1, 0, 1) / 1000, Date.now() / 1000);
  $('#fProfile').innerHTML = '<option value="">All profiles</option>' + st.profiles.map((x) => `<option value="${x.id}"></option>`).join('');
  [...$('#fProfile').options].slice(1).forEach((o, i) => (o.textContent = st.profiles[i].name));
  if (st.trades.length) st.anchor = new Date(Math.max(...st.trades.map((x) => x.closeTime)) * 1000);
  render(); reveal();
}
init().catch((e) => ($('#kpis').textContent = e.message));
