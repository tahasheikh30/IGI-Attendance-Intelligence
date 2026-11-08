import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * Toasts (small messages that appear and fade away) and the notification list behind them.
 *
 *   const toast = useToast();
 *   toast.success("User created", { category: "users" });
 *   toast.error("Upload failed", { message: "The file was not an .xlsx", category: "uploads" });
 *
 * Every toast is also kept in a notification list, so something that happened while the person was on another
 * page can still be read later. The profile menu shows a dot while any are unread. The list lives in memory only
 * (a reload clears it): messages can name employees or accounts, so nothing is written to browser storage.
 *
 * Outside a provider (a component rendered on its own, as in tests) every call quietly does nothing.
 */
const ToastContext = createContext(null);

const NOOP_TOAST = { success() {}, error() {}, warn() {}, info() {}, dismiss() {} };
const NOOP = {
  toast: NOOP_TOAST, notifications: [], unread: 0,
  markAllRead() {}, clearAll() {}, configure() {},
};

const MAX_VISIBLE = 4;
const MAX_LOGGED = 50;
const DURATION = { success: 4000, info: 4500, warn: 6000, error: 7000 };

export function useToast() {
  return (useContext(ToastContext) || NOOP).toast;
}

export function useNotifications() {
  return useContext(ToastContext) || NOOP;
}

/**
 * Whether a message is shown, kept, both or neither, given the person's notification settings:
 *   { enabled, popups, categories: { data, access, uploads, users } }
 * An error is never dropped (a failed save must be seen), but with pop-ups off it is only kept in the list.
 * A message with no category (or an unknown one) follows the master switch only.
 */
export function deliveryFor(settings, tone, category, essential = tone === "error") {
  if (!settings) return { popup: true, keep: true };
  const off = !settings.enabled || (category && settings.categories?.[category] === false);
  if (off && !essential) return { popup: false, keep: false };
  return { popup: settings.popups !== false, keep: true };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const nextId = useRef(1);
  const settings = useRef(null); // the notification settings, set by the preferences provider
  const configure = useCallback((next) => { settings.current = next || null; }, []);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const push = useCallback((tone, title, opts = {}) => {
    const { message = "", to = null, log = true, duration, category = null, essential } = opts;
    const id = nextId.current++;
    const delivery = deliveryFor(settings.current, tone, category, essential);
    if (!delivery.keep) return id; // switched off in Settings: neither shown nor listed
    if (delivery.popup) {
      setToasts((all) => {
        if (all.some((t) => t.title === title && t.message === message)) return all; // the same message twice: once
        return [...all, { id, tone, title, message, duration: duration ?? DURATION[tone] }].slice(-MAX_VISIBLE);
      });
    }
    if (log) {
      setNotifications((all) =>
        [{ id, tone, title, message, to, category, at: new Date(), read: false }, ...all].slice(0, MAX_LOGGED));
    }
    return id;
  }, []);

  const toast = useMemo(() => ({
    success: (title, opts) => push("success", title, opts),
    error: (title, opts) => push("error", title, opts),
    warn: (title, opts) => push("warn", title, opts),
    info: (title, opts) => push("info", title, opts),
    dismiss,
  }), [push, dismiss]);

  const markAllRead = useCallback(() => {
    setNotifications((all) => (all.some((n) => !n.read) ? all.map((n) => ({ ...n, read: true })) : all));
  }, []);
  const clearAll = useCallback(() => setNotifications([]), []);

  const unread = notifications.filter((n) => !n.read).length;
  const value = useMemo(
    () => ({ toast, notifications, unread, markAllRead, clearAll, configure }),
    [toast, notifications, unread, markAllRead, clearAll, configure],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: <path d="M5 12.5l4.2 4.2L19 7" />,
  error: (<><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>),
  warn: (<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.5v.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>),
};

export function ToneIcon({ tone, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[tone] || ICONS.info}
    </svg>
  );
}

function Toast({ item, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  const left = useRef(item.duration);
  const startedAt = useRef(0);

  const close = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 180);
  }, [item.id, onDismiss]);

  const run = useCallback(() => {
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(close, left.current);
  }, [close]);

  useEffect(() => {
    run();
    return () => clearTimeout(timer.current);
  }, [run]);

  // hovering or focusing a toast pauses it, so it can be read and its close button reached
  const pause = () => {
    clearTimeout(timer.current);
    left.current = Math.max(1200, left.current - (Date.now() - startedAt.current));
  };

  return (
    <li
      className={`toast toast-${item.tone}${leaving ? " toast-leaving" : ""}`}
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={pause} onMouseLeave={run} onFocus={pause} onBlur={run}
    >
      <span className="toast-icon"><ToneIcon tone={item.tone} /></span>
      <div className="toast-body">
        <p className="toast-title">{item.title}</p>
        {item.message && <p className="toast-message">{item.message}</p>}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss message" onClick={close}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </li>
  );
}

function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <ul className="toaster" aria-label="Messages">
      {toasts.map((t) => <Toast key={t.id} item={t} onDismiss={onDismiss} />)}
    </ul>
  );
}
