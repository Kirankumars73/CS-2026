// Light / black theme. Light by default; black only when someone picks it with the navbar switch.
// index.html applies the saved choice before first paint; these helpers read and change it afterwards.
const KEY = 'cs26-theme';

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the theme still applies, it just won't be remembered
  }
}
