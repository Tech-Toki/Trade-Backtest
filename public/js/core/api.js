// The session is an httpOnly cookie set by the server; JavaScript never sees it. Only display info is kept locally.
export const getUser = () => { try { return JSON.parse(localStorage.getItem('tb_user')); } catch { return null; } };
export const isLoggedIn = () => !!getUser();
export const setSession = (user) => localStorage.setItem('tb_user', JSON.stringify(user));

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'backtest' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !location.pathname.startsWith('/auth')) { localStorage.removeItem('tb_user'); location.href = '/auth.html'; }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem('tb_user'); location.href = '/auth.html';
}
