// Terminal page: wires the chart, replay, trading engine, drawings and side panels together.
import { api, isLoggedIn, getUser } from '../core/api.js';
import { toast } from '../ui/toast.js';
import { download, tradesCSV } from '../analytics/export.js';
import { initThemeToggle } from '../core/theme.js';
import { iso } from '../core/format.js';
import { createChartView } from '../chart/chartView.js';
import { createCoords } from '../chart/coords.js';
import { Indicators, INDICATORS } from '../chart/indicators.js';
import { Overlay } from '../chart/overlay.js';
import { Drawings } from '../chart/drawings.js';
import { PositionTool } from '../chart/positionTool.js';
import { Engine } from '../trading/engine.js';
import { Replay } from '../trading/replay.js';
import { Profiles } from '../trading/profiles.js';
import { toUnits, DEFAULTS } from '../trading/sizing.js';
import { quote } from '../trading/quotes.js';
import { riskSize, getRiskPct } from '../trading/risk.js';
import { buildDrawingToolbar, bindSegment } from '../ui/toolbar.js';
import { renderAccount, renderPositions, renderHistory, renderPreview } from '../ui/panels.js';
import { openProfileDialog } from '../ui/dialogs.js';
import { bindChartSettings } from '../ui/chartSettings.js';
import { initAccount } from '../ui/account.js';
import { bindMenu } from '../ui/menu.js';
import { createLegend } from '../ui/legend.js';
import { createDateSelect } from '../ui/dateSelect.js';
import { initContextMenu } from '../ui/contextMenu.js';
import { bindRiskCalc } from '../ui/riskCalc.js';

if (!isLoggedIn()) location.href = '/auth.html';
const $ = (s) => document.querySelector(s);
const msg = (t) => { if (t) toast(t); };
const state = { symbol: 'BTCUSD', tf: '1h', mode: 'lot', specs: {} };
const spec = () => state.specs[state.symbol];
const atr = (bars, n) => { const b = bars.slice(-n); return b.reduce((a, x) => a + (x.high - x.low), 0) / (b.length || 1); };

const engine = new Engine();
const profiles = new Profiles(api);
const view = createChartView($('#chart'));
const indicators = new Indicators(view);
const dateSel = createDateSelect();
const replay = new Replay({
  api,
  onReset: (bars) => { view.setBars(bars); indicators.refresh(bars); refresh(); },
  onPrepend: (k) => { view.prepend(k, replay.shown); indicators.refresh(replay.shown); },
  onBar: (bar, raw) => { view.update(bar); indicators.tick(replay.shown); engine.checkExits(raw); engine.stopOut(bar.close, bar.time); refresh(); },
  onEnd: () => msg('End of data'),
  onState: (on) => ($('#play').textContent = on ? '⏸ Pause' : '▶ Play'),
});
view.chart.timeScale().subscribeVisibleLogicalRangeChange((r) => { if (r && r.from < 40) replay.loadOlder(); }); // scroll left = older history, no limit

/* ---------- drawing layers ---------- */
const coords = createCoords(view.chart, view.candles, () => replay.shown, () => replay.stepSec);
const overlay = new Overlay($('#chart'), view);
const tools = buildDrawingToolbar($('#dtools'), {
  favEl: $('#favBar'),
  onPick: (t) => drawings.setTool(t), onDelete: () => drawings.removeSelected(), onColor: (c) => drawings.setColor(c),
  onClear: () => drawings.items.length && confirm('Delete all drawings on this symbol?') && drawings.clear(),
});
const drawings = overlay.add(new Drawings(coords, {
  getDp: () => spec()?.dp ?? 2, getStep: () => replay.stepSec, getAtr: () => atr(replay.shown, 14),
  getRisk: (entry, stop) => spec() && riskSize({ balance: engine.balance, riskPct: getRiskPct(), entry, stop, leverage: engine.leverage, spec: spec() }),
  onToolChange: (t) => { tools.setActive(t); overlay.redraw(); },
  onChange: () => { localStorage.setItem('tb_dr_' + state.symbol, JSON.stringify(drawings.items)); overlay.redraw(); },
}));
overlay.add(new PositionTool(coords, engine, { getSymbol: () => state.symbol, getPrice: () => replay.last?.close ?? 0, getStep: () => replay.stepSec }));
const loadDrawings = () => { drawings.items = JSON.parse(localStorage.getItem('tb_dr_' + state.symbol) || '[]'); overlay.redraw(); };

const legend = createLegend(view, { getBars: () => replay.shown, getSpec: spec, getTf: () => state.tf, onSell: () => openTrade('short'), onBuy: () => openTrade('long') });

/* ---------- remember where you were (symbol, timeframe, replay time, open trades, indicators) ---------- */
const SKEY = 'tb_session';
function loadSession() { try { const s = JSON.parse(localStorage.getItem(SKEY)); return s && s.user === getUser()?.id ? s : null; } catch { return null; } }
function saveSession() {
  if (!replay.curTime || !state.specs[state.symbol]) return;
  localStorage.setItem(SKEY, JSON.stringify({ user: getUser()?.id, symbol: state.symbol, tf: state.tf, time: replay.curTime, speed: replay.speed, profileId: profiles.id, positions: engine.positions, indicators: Object.keys(indicators.series) }));
}
window.addEventListener('pagehide', saveSession);
const setSeg = (sel, attr, val) => document.querySelectorAll(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset[attr] == val));

/* ---------- panels ---------- */
function refresh() {
  const price = replay.last?.close ?? 0, sp = spec();
  renderAccount(engine, price); renderPositions(engine, price); renderHistory(engine);
  if (sp) {
    const q = quote(price, sp);
    renderPreview({ mode: state.mode, value: +$('#size').value, price: q.ask, engine, spec: sp });
    $('#buyPx').textContent = price ? q.ask.toFixed(sp.dp) : ''; $('#sellPx').textContent = price ? q.bid.toFixed(sp.dp) : '';
  }
  $('#clock').textContent = replay.curTime ? iso(replay.curTime) + ' UTC' : '';
  legend.render(); overlay.redraw(); saveSession();
}
engine.onChange = refresh;
engine.onClose = (t) => api('/trades', { method: 'POST', body: { ...t, profileId: profiles.id } }).catch((e) => msg(e.message));

/* ---------- trading ---------- */
function openTrade(side) {
  const bar = replay.last, sp = spec(); if (!bar) return msg('Load data first');
  const dir = side === 'long' ? 1 : -1, r = (v) => +v.toFixed(sp.dp), q = quote(bar.close, sp), entry = side === 'long' ? q.ask : q.bid;
  const { units, lots } = toUnits({ mode: state.mode, value: +$('#size').value, price: entry, balance: engine.balance, leverage: engine.leverage, spec: sp });
  if (!units) return msg(state.mode === 'lot' ? `Minimum size is ${sp.minLot} lot` : 'Enter a valid size');
  const dist = atr(replay.shown, 14) * 1.5 || entry * 0.005; // default stop/target: 1.5 x ATR(14), R:R 1
  let sl = parseFloat($('#sl').value), tp = parseFloat($('#tp').value);
  if (isNaN(sl)) sl = r(entry - dir * dist);
  if (isNaN(tp)) tp = r(entry + dir * dist);
  if ((sl - entry) * dir >= 0) return msg('Stop loss is on the wrong side of price');
  if ((tp - entry) * dir <= 0) return msg('Take profit is on the wrong side of price');
  const res = engine.open({ symbol: state.symbol, side, units, lots, bid: bar.close, time: bar.time, sl, tp, dp: sp.dp });
  msg(res.error);
  if (!res.error) { $('#sl').value = $('#tp').value = ''; toast(`${side === 'long' ? 'Bought' : 'Sold'} ${lots.toFixed(lots < 0.01 ? 4 : 2)} lot @ ${res.p.entry}`, 'ok'); }
}
const closeAll = () => replay.last && engine.closeAll(replay.last.close, replay.last.time);

/* ---------- profiles ---------- */
function fillProfileSelect() {
  const sel = $('#profile'); sel.innerHTML = '';
  profiles.list.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
  sel.value = profiles.id;
}
async function loadProfile() {
  const p = profiles.current;
  engine.reset({ initial: p.balance, leverage: p.leverage, closed: await profiles.trades() });
  refresh();
}
async function profileDialog(edit) {
  const cur = profiles.current, res = await openProfileDialog(edit ? cur : null, profiles.list.length > 1);
  if (!res) return;
  try {
    if (res.action === 'delete') { closeAll(); await profiles.remove(cur.id); fillProfileSelect(); await loadProfile(); }
    else if (edit) { await profiles.update(cur.id, res.data); engine.initial = res.data.balance; engine.leverage = res.data.leverage; fillProfileSelect(); refresh(); }
    else { closeAll(); await profiles.create(res.data); fillProfileSelect(); await loadProfile(); }
  } catch (e) { msg(e.message); }
}

/* ---------- controls ---------- */
const reload = (ts = replay.curTime) => { engine.spread = spec().spread || 0; return replay.load(state.symbol, state.tf, ts).catch((e) => msg(e.message)); };
function bind() {
  bindSegment($('#tfs'), 'tf', (tf) => { state.tf = tf; reload(); });
  bindSegment($('#speeds'), 'speed', (s) => (replay.speed = +s));
  bindSegment($('#modes'), 'mode', (m) => { state.mode = m; $('#size').value = DEFAULTS[m]; $('#size').step = m === 'lot' ? 0.01 : 'any'; refresh(); });
  const menu = $('#indMenu');
  menu.innerHTML = INDICATORS.map((i) => `<button data-ind="${i.id}"><span class="chk"></span>${i.label}</button>`).join('');
  bindMenu($('#indBtn'), menu);
  menu.onclick = (e) => { const b = e.target.closest('button'); if (b) b.classList.toggle('on', indicators.toggle(b.dataset.ind, replay.shown)); };
  $('#symbol').onchange = (e) => { closeAll(); state.symbol = e.target.value; loadDrawings(); reload(); };
  $('#play').onclick = () => { if (replay.playing) replay.pause(); else { view.ensureVisible(); replay.play(); } };
  $('#step').onclick = () => { replay.pause(); view.ensureVisible(); replay.step(); };
  let dateTimer; // changing the date jumps straight there, no Go button
  dateSel.onChange(() => { clearTimeout(dateTimer); dateTimer = setTimeout(() => { const ts = dateSel.get(); closeAll(); reload(ts); }, 250); });
  $('#dock .dock-head').onclick = (e) => { if (!e.target.closest('button')) $('#dock').classList.toggle('min'); };
  $('#long').onclick = () => openTrade('long');
  $('#short').onclick = () => openTrade('short');
  $('#size').oninput = refresh;
  $('#closeAll').onclick = closeAll;
  $('#positions').onclick = (e) => { const p = engine.positions.find((x) => x.id === +e.target.dataset.close); if (p) engine.closeMarket(p, replay.last.close, replay.last.time); };
  $('#profile').onchange = async (e) => { closeAll(); profiles.select(e.target.value); await loadProfile(); };
  $('#editProfile').onclick = () => profileDialog(true);
  $('#newProfile').onclick = () => profileDialog(false);
  $('#exportTrades').onclick = () => engine.closed.length ? download(`trades-${profiles.current.name}.csv`.replace(/[^\w.-]+/g, '_'), 'text/csv', tradesCSV(engine.closed, () => profiles.current.name)) : toast('No closed trades to export yet', 'ok');
  $('#reset').onclick = async () => { if (confirm('Delete this profile’s trade history and reset its balance?')) { await profiles.clearTrades(); await loadProfile(); } };
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && e.target.type !== 'color') return;
    if (e.code === 'Space') { e.preventDefault(); replay.playing ? replay.pause() : replay.play(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (drawings.sel) { e.preventDefault(); drawings.removeSelected(); } }
    else if (e.key === 'Escape') drawings.setTool('cursor');
  });
}

async function init() {
  initAccount();
  const settings = bindChartSettings(view);
  initContextMenu($('#chart'), [
    { label: 'Chart settings…', run: settings.open },
    { label: 'Reset chart view', run: () => view.resetView() },
    { label: 'Delete all drawings', run: () => drawings.items.length && confirm('Delete all drawings on this symbol?') && drawings.clear() },
  ]);
  bindRiskCalc({
    getContext: () => ({ balance: engine.balance, price: replay.last?.close ?? 0, spec: spec(), leverage: engine.leverage }),
    onUse: (res, stop, tp) => { $('#modes [data-mode=lot]').click(); $('#size').value = res.lots; $('#sl').value = stop || ''; $('#tp').value = tp || ''; refresh(); msg(''); },
  });
  initThemeToggle($('#theme'), (t) => view.applyTheme(t));
  bind();
  try {
    const meta = await api('/candles/meta');
    state.specs = meta.symbols;
    const all = Object.values(meta.symbols), day = 86400;
    const from = Math.max(...all.map((s) => s.from)), to = Math.min(...all.map((s) => s.to)), today = Math.floor(to / day) * day;
    const saved = loadSession();
    if (saved && state.specs[saved.symbol]) {
      Object.assign(state, { symbol: saved.symbol, tf: saved.tf }); replay.speed = saved.speed || 1;
      $('#symbol').value = state.symbol; setSeg('#tfs', 'tf', state.tf); setSeg('#speeds', 'speed', replay.speed);
    }
    dateSel.init(from, to, saved?.time ?? Math.max(today - 365 * day, from + 2 * day));
    const synth = all.some((s) => s.source !== 'csv');
    $('#badge').textContent = synth ? 'Simulated data' : 'Real data';
    $('#badge').title = synth ? 'Real candles not found. Run: npm run fetch:data' : 'Loaded from data/market/*.csv';
    $('#badge').classList.toggle('warn', synth);
    await profiles.load(); fillProfileSelect(); await loadProfile();
    if (saved && saved.profileId === profiles.id && saved.symbol === state.symbol && Array.isArray(saved.positions)) {
      engine.positions = saved.positions; engine.nextId = Math.max(0, ...saved.positions.map((p) => p.id)) + 1; // open trades survive leaving the page
    }
    loadDrawings();
    await reload(saved?.time ?? dateSel.get());
    (saved?.indicators || []).forEach((id) => $(`#indMenu [data-ind=${id}]`)?.classList.toggle('on', indicators.toggle(id, replay.shown)));
  } catch (e) { msg(e.message); }
}
init();
