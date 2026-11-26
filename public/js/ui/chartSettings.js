// Chart appearance dialog. Changes apply live and are remembered in localStorage.
const COLOR_FIELDS = { bg: '#cBg', text: '#cText', grid: '#cGrid', up: '#cUp', down: '#cDown' };
const CHECK_FIELDS = { vert: ['#cVert', true], horz: ['#cHorz', true], volume: ['#cVol', true], border: ['#cBorder', false], magnet: ['#cMagnet', false] };

export function bindChartSettings(view) {
  const dlg = document.querySelector('#chartDlg'), $ = (s) => dlg.querySelector(s);
  const sync = () => {
    const c = view.colors(), s = view.getSettings();
    for (const [k, sel] of Object.entries(COLOR_FIELDS)) $(sel).value = c[k];
    for (const [k, [sel, def]] of Object.entries(CHECK_FIELDS)) $(sel).checked = k in s ? !!s[k] : def;
  };
  for (const [k, sel] of Object.entries(COLOR_FIELDS)) $(sel).oninput = (e) => view.setSettings({ [k]: e.target.value });
  for (const [k, [sel]] of Object.entries(CHECK_FIELDS)) $(sel).onchange = (e) => view.setSettings({ [k]: e.target.checked });
  $('#cReset').onclick = () => { view.resetSettings(); sync(); };
  $('#cClose').onclick = () => dlg.close();
  const open = () => { sync(); dlg.showModal(); };
  document.querySelector('#chartBtn').onclick = open;
  return { open };
}
