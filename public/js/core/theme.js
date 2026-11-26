// Initial theme is applied by an inline script in <head> (no flash). This wires the toggle button.
export const getTheme = () => document.documentElement.dataset.theme || 'dark';
export function initThemeToggle(btn, onChange) {
  const apply = (t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('tb_theme', t);
    btn.textContent = t === 'dark' ? '☀' : '☾';
    btn.title = t === 'dark' ? 'Light mode' : 'Dark mode';
    onChange && onChange(t);
  };
  btn.onclick = () => apply(getTheme() === 'dark' ? 'light' : 'dark');
  apply(getTheme());
}
