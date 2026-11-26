import { api, isLoggedIn, setSession } from '../core/api.js';
import { initThemeToggle } from '../core/theme.js';

if (isLoggedIn()) location.href = '/terminal.html';
initThemeToggle(document.getElementById('theme'));
const $ = (id) => document.getElementById(id);
let mode = location.hash === '#register' ? 'register' : 'login';

function render() {
  const reg = mode === 'register';
  $('title').textContent = reg ? 'Create your account' : 'Welcome back';
  $('sub').textContent = reg ? 'Free, and your data stays yours.' : 'Sign in to continue your practice.';
  $('nameBox').hidden = !reg; $('meter').hidden = !reg;
  $('submitText').textContent = reg ? 'Create account' : 'Sign in';
  $('switch').innerHTML = reg ? 'Already registered? <a id="sw">Sign in</a>' : 'New here? <a id="sw">Create an account</a>';
  $('sw').onclick = () => { mode = reg ? 'login' : 'register'; $('msg').textContent = ''; render(); };
  $('password').autocomplete = reg ? 'new-password' : 'current-password';
}
render();

$('pwToggle').onclick = () => { const show = $('password').type === 'password'; $('password').type = show ? 'text' : 'password'; $('pwToggle').textContent = show ? 'Hide' : 'Show'; };
const LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'], COLORS = ['var(--sell)', 'var(--sell)', '#e6a23c', 'var(--buy)', 'var(--buy)'];
$('password').oninput = () => {
  const p = $('password').value;
  const score = p ? Math.min(4, (p.length >= 10) + (p.length >= 14) + (/[a-z]/.test(p) && /[A-Z]/.test(p)) + (/\d/.test(p) && /[^A-Za-z0-9]/.test(p))) : 0;
  $('meter').querySelectorAll('span').forEach((s, i) => { s.classList.toggle('on', i < score); s.style.setProperty('--c', COLORS[score]); });
  $('pwHint').textContent = p ? LABELS[p.length < 10 ? 0 : Math.max(1, score)] : '';
};

$('form').onsubmit = async (e) => {
  e.preventDefault(); $('msg').textContent = ''; $('submit').classList.add('busy'); $('submit').disabled = true;
  try {
    const body = { email: $('email').value, password: $('password').value };
    if (mode === 'register') body.name = $('name').value;
    const { user } = await api(`/auth/${mode}`, { method: 'POST', body });
    setSession(user); location.href = '/terminal.html';
  } catch (err) { $('msg').textContent = err.message; $('msg').classList.remove('shake'); void $('msg').offsetWidth; $('msg').classList.add('shake'); }
  finally { $('submit').classList.remove('busy'); $('submit').disabled = false; }
};
