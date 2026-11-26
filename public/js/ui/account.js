// Avatar dropdown (opens on hover) + "Manage account" dialog.
import { api, getUser, setSession, logout } from '../core/api.js';
import { download } from '../analytics/export.js';

export function initAccount() {
  const $ = (s) => document.querySelector(s), user = getUser() || { name: '?', email: '' };
  const paint = (u) => { $('#avatar').textContent = (u.name || '?').trim()[0].toUpperCase(); $('#acName').textContent = u.name; $('#acEmail').textContent = u.email; $('#aName').value = u.name; $('#aEmail').value = u.email; };
  paint(user);
  const say = (id, text, ok) => { const e = $(id); e.textContent = text; e.className = ok ? 'pos' : 'neg'; };

  $('#acManage').onclick = () => { $('#aMsg').textContent = ''; $('#acctDlg').showModal(); document.activeElement.blur(); };
  $('#acLogout').onclick = logout;
  $('#aClose').onclick = () => $('#acctDlg').close();

  $('#aSaveName').onclick = async () => {
    try { const { user: u } = await api('/auth/me', { method: 'PATCH', body: { name: $('#aName').value } }); setSession(u); paint(u); say('#aMsg', 'Name updated', true); }
    catch (e) { say('#aMsg', e.message); }
  };
  $('#aSavePw').onclick = async () => {
    try { await api('/auth/password', { method: 'POST', body: { current: $('#aCur').value, password: $('#aNew').value } }); $('#aCur').value = $('#aNew').value = ''; say('#aMsg', 'Password changed', true); }
    catch (e) { say('#aMsg', e.message); }
  };
  $('#aExport').onclick = async () => { try { download('backtest-pro-my-data.json', 'application/json', JSON.stringify(await api('/auth/export'), null, 2)); say('#aMsg', 'Downloaded', true); } catch (e) { say('#aMsg', e.message); } };
  $('#aLogoutAll').onclick = async () => { try { await api('/auth/logout-all', { method: 'POST' }); logout(); } catch (e) { say('#aMsg', e.message); } };
  $('#aDelete').onclick = async () => {
    if (!confirm('Delete your account, all profiles and all trades? This cannot be undone.')) return;
    try { await api('/auth/me', { method: 'DELETE', body: { password: $('#aDelPw').value } }); logout(); }
    catch (e) { say('#aMsg', e.message); }
  };
}
