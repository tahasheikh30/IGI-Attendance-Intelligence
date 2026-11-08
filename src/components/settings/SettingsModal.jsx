import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { usePreferences } from "../../context/PreferencesContext";
import AccountSection from "./AccountSection";
import AdministratorsSection from "./AdministratorsSection";
import DisplaySection from "./DisplaySection";
import NotificationsSection from "./NotificationsSection";

function Icon({ children }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  );
}

const SECTIONS = [
  { id: "account", label: "Account", icon: <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" /></Icon> },
  { id: "notifications", label: "Notifications", icon: <Icon><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" /></Icon> },
  { id: "display", label: "Display", icon: <Icon><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></Icon> },
  { id: "administrators", label: "Administrators", adminOnly: true,
    icon: <Icon><path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6z" /></Icon> },
];

const FOCUSABLE = 'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])';

/**
 * The settings window, opened from the profile menu. A sidebar lists the sections and the right side shows the one
 * chosen. Changes save by themselves a moment after they are made. Escape or a click outside closes it, Tab stays
 * inside it, and focus goes back to where it was.
 */
export default function SettingsModal({ initial = "account", onClose, onSignOut }) {
  const { isAdmin } = useAuth();
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);
  const [active, setActive] = useState(sections.some((s) => s.id === initial) ? initial : "account");
  const { saving, loadFailed, reload } = usePreferences();
  const dialog = useRef(null);
  const body = useRef(null);
  const first = useRef(null);

  useEffect(() => {
    const before = document.activeElement;
    first.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab") {
        const list = Array.from(dialog.current?.querySelectorAll(FOCUSABLE) || []).filter((el) => !el.disabled);
        if (list.length === 0) return;
        const firstEl = list[0];
        const lastEl = list[list.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  function choose(id) {
    setActive(id);
    body.current?.scrollTo?.({ top: 0 });
  }

  const section = sections.find((s) => s.id === active) || sections[0];

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal" ref={dialog}>
        <aside className="settings-side">
          <h2 id="settings-title">Settings</h2>
          <nav aria-label="Settings sections" className="settings-nav">
            {sections.map((s, i) => (
              <button key={s.id} ref={i === 0 ? first : undefined} type="button"
                className={`settings-nav-item${s.id === section.id ? " settings-nav-on" : ""}`}
                aria-current={s.id === section.id ? "page" : undefined} onClick={() => choose(s.id)}>
                {s.icon}<span>{s.label}</span>
              </button>
            ))}
          </nav>
          <p className="settings-saved" role="status" aria-live="polite">{saving ? "Saving..." : "Changes save automatically."}</p>
        </aside>
        <div className="settings-main">
          <header className="settings-head">
            <h2 id="settings-section-title">{section.label}</h2>
            <button type="button" className="settings-close" aria-label="Close settings" onClick={onClose}>
              <Icon><path d="M6 6l12 12M18 6L6 18" /></Icon>
            </button>
          </header>
          <div className="settings-body" ref={body}>
            {loadFailed && (
              <p className="notice notice-warn" role="alert">
                Your saved settings could not be loaded, so changes are not saved yet.{" "}
                <button type="button" className="link-btn" onClick={reload}>Try again</button>
              </p>
            )}
            {section.id === "account" && <AccountSection onSignOut={onSignOut} />}
            {section.id === "notifications" && <NotificationsSection isAdmin={isAdmin} />}
            {section.id === "display" && <DisplaySection />}
            {section.id === "administrators" && <AdministratorsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
