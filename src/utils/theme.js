// Light / black theme. index.html sets data-theme before first paint (saved choice, else the
// device setting); these helpers read and change it afterwards.
const KEY = 'cs26-theme';

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function savedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme, { save = true } = {}) {
  document.documentElement.dataset.theme = theme;
  if (!save) return;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the theme still applies, it just won't be remembered
  }
}
