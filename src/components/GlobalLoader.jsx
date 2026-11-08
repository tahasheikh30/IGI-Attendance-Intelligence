import { useEffect, useRef, useState } from "react";
import { useIsBusy } from "../lib/activity";
import LoadingDots from "./LoadingDots";

// Quick requests finish before anyone could read a loader, and a flash of one feels worse than none.
// So it appears only after SHOW_DELAY_MS, and once shown stays at least MIN_VISIBLE_MS.
const SHOW_DELAY_MS = 250;
const MIN_VISIBLE_MS = 600;

function useDelayedVisibility(active) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    let timer;
    if (active && !visible) {
      timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);
    } else if (!active && visible) {
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
      timer = setTimeout(() => setVisible(false), remaining);
    }
    return () => clearTimeout(timer);
  }, [active, visible]);
  return visible;
}

/**
 * One loader for the whole app, hovering over the page and not part of it: a thin coloured bar across
 * the top and a small card in the middle of the screen with the jumping dots. It shows whenever a
 * request is running, never blocks clicks, and is only in the page while something is loading.
 */
export default function GlobalLoader() {
  const visible = useDelayedVisibility(useIsBusy());
  if (!visible) return null;
  return (
    <div className="gl" aria-busy="true">
      <div className="gl-bar" aria-hidden="true" />
      <div className="gl-card">
        <LoadingDots />
      </div>
    </div>
  );
}
