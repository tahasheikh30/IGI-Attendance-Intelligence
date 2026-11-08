import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getPreferences, savePreferences } from "../api";
import { useNotifications, useToast } from "../components/Toaster";

export const DEFAULT_PREFERENCES = {
  notifications: {
    enabled: true,
    popups: true,
    categories: { data: true, access: true, uploads: true, users: true },
  },
  display: { default_view: "overview", default_days: 30, density: "comfortable" },
};

const SAVE_DELAY_MS = 600;
const PreferencesContext = createContext(null);

// A settings change is { notifications?: {...}, display?: {...} } merged one level deeper than the top, and the
// notification categories one more level, so a toggle changes only the key it names.
function merge(prefs, patch) {
  return {
    notifications: {
      ...prefs.notifications, ...patch.notifications,
      categories: { ...prefs.notifications.categories, ...patch.notifications?.categories },
    },
    display: { ...prefs.display, ...patch.display },
  };
}

/**
 * The signed in person's settings. They load once, a change shows at once (optimistic) and is saved a moment
 * later in one request however many switches were flipped meanwhile. A failed save puts the last saved settings
 * back and says so, rather than leaving the screen showing something the server does not have.
 */
export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef(DEFAULT_PREFERENCES);   // what the server has
  const latest = useRef(DEFAULT_PREFERENCES);  // what the screen shows
  const timer = useRef(null);
  const { configure } = useNotifications();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const p = await getPreferences();
      saved.current = latest.current = p;
      setPrefs(p);
      setLoaded(true);
    } catch {
      setLoadFailed(true);
      setLoaded(true); // defaults apply; saving stays off until a reload works
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // compact density is a CSS switch on the page root
  useEffect(() => {
    document.documentElement.dataset.density = prefs.display.density;
    return () => { delete document.documentElement.dataset.density; };
  }, [prefs.display.density]);

  // the toaster follows these switches
  useEffect(() => { configure(prefs.notifications); }, [prefs.notifications, configure]);

  const flush = useCallback(async () => {
    const sending = latest.current;
    try {
      const stored = await savePreferences(sending);
      saved.current = stored;
      if (latest.current === sending) { latest.current = stored; setPrefs(stored); }
    } catch {
      latest.current = saved.current;
      setPrefs(saved.current);
      toast.error("Settings were not saved", { message: "Your previous settings are back.", essential: true });
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const update = useCallback((patch) => {
    if (loadFailed) return;
    const next = merge(latest.current, patch);
    latest.current = next;
    setPrefs(next);
    setSaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }, [flush, loadFailed]);

  const value = useMemo(
    () => ({ prefs, loaded, loadFailed, saving, update, reload: load }),
    [prefs, loaded, loadFailed, saving, update, load],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

const OUTSIDE = { prefs: DEFAULT_PREFERENCES, loaded: false, loadFailed: false, saving: false, update() {}, reload() {} };

/** Outside a provider (a component rendered on its own) the defaults apply and changes are ignored. */
export function usePreferences() {
  return useContext(PreferencesContext) || OUTSIDE;
}
