// Three colourful dots that hop over each other and swap places while something loads.
// The movement lives in styles.css (no inline styles, because the Content Security Policy forbids them).
// The visible words stay in the page for screen readers and for anyone who turns animation off.
// For whole page waits the app uses GlobalLoader, which hovers over the page and holds this component.
export default function LoadingDots({ label = "Loading…" }) {
  return (
    <div className="loading-dots" role="status" aria-live="polite">
      <span className="loading-dots-track" aria-hidden="true">
        <i className="dot-a" />
        <i className="dot-b" />
        <i className="dot-c" />
      </span>
      <span className="loading-dots-label">{label}</span>
    </div>
  );
}
