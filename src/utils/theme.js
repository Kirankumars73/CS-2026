// Light / black theme. Light by default and right after every login; black only when someone
// picks it with the navbar switch. index.html applies the saved choice before first paint;
// these helpers read and change it afterwards, and tell every switch on the page.
const KEY = 'cs26-theme';
const listeners = new Set();

export function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

// For useSyncExternalStore(subscribeTheme, currentTheme)
export function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked (e.g. private mode): the theme still applies, it just won't be remembered
  }
  listeners.forEach(listener => listener());
}
