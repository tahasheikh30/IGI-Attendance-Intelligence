// Three dots that hop over each other and swap places while something loads.
// page: sits in the middle of the screen without blocking clicks, for whole page waits.
// The movement lives in styles.css (no inline styles, because the Content Security Policy forbids them).
// The visible words stay in the page for screen readers and for anyone who turns animation off.
export default function LoadingDots({ label = "Loading…", inline = false, page = false }) {
  return (
    <div
      className={`loading-dots${inline ? " loading-dots-inline" : ""}${page ? " loading-dots-page" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="loading-dots-track" aria-hidden="true">
        <i className="dot-a" />
        <i className="dot-b" />
        <i className="dot-c" />
      </span>
      <span className="loading-dots-label">{label}</span>
    </div>
  );
}
