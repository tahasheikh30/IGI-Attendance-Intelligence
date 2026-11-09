import { useEffect, useId, useRef, useState } from "react";

// A real <select>'s open list is drawn by the browser or the operating system, so our colours, fonts and
// rounded corners can never reach it. This draws the whole control ourselves (a button and a floating list),
// so it matches the rest of the app in both states, in both themes. It works with the keyboard:
// Enter, Space or the arrow keys open it, the arrows move, Enter picks, Escape or a click outside closes it.
export default function SelectMenu({ value, onChange, options, ariaLabel, className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const openMenu = () => {
    const r = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const needed = Math.min(options.length * 38 + 12, 280);
    // opens upward when there is more room above than below
    setPos({ left: r.left, minWidth: r.width, ...(below < needed && r.top > below ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    setActive(selectedIndex);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (i) => {
    const o = options[i];
    if (o && o.value !== value) onChange(o.value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) close(false); };
    const away = () => close(false);
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [open]);

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Tab") close(false);
  };

  return (
    <div className={`select-menu ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="select-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className="select-menu-value">{selected?.label}</span>
        <svg className="select-menu-chevron" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && pos && (
        <div id={listId} className="select-menu-list" role="listbox" aria-label={ariaLabel} style={pos}>
          {options.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={"select-menu-option" + (o.value === value ? " is-selected" : "") + (i === active ? " is-active" : "")}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              <svg className="select-menu-check" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
