// The colour theme is a person's saved setting (kept on the server, per account). It is also remembered on this
// browser, as the single word "light" or "dark", so the next visit opens in the right colours straight away, before
// anything has loaded and on the sign in page, instead of flashing light first.
const KEY = "attendance_theme";
const THEMES = ["light", "dark"];

export function getRememberedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return THEMES.includes(t) ? t : null;
  } catch {
    return null; // storage can be blocked (private windows); the saved setting still applies after sign in
  }
}

export function applyTheme(theme) {
  if (!THEMES.includes(theme)) return;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* not remembered here; harmless */ }
}

/** Called once at start up, before the first screen is drawn. */
export function applyRememberedTheme() {
  const t = getRememberedTheme();
  if (t) document.documentElement.dataset.theme = t;
}
