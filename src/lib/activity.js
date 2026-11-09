import { useSyncExternalStore } from "react";

// A running count of things the person is waiting for (requests to the server). The global loader
// (components/GlobalLoader.jsx) shows while the count is above zero. Same idea as in Sentinel.

let count = 0;
let quiet = 0; // waits that show the top bar but not the loader card (signing in has its own button text)
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Mark the start of something the person waits for. Call the returned function once it is over. */
export function beginActivity({ quiet: isQuiet = false } = {}) {
  count += 1;
  if (isQuiet) quiet += 1;
  emit();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    count -= 1;
    if (isQuiet) quiet -= 1;
    emit();
  };
}

/** True while anything is being waited for (for code outside React and for tests). */
export const isBusy = () => count > 0;

/** True while anything is being waited for. */
export function useIsBusy() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count > 0,
    () => false,
  );
}

/** True while something is being waited for that deserves the loader card (not signing in). */
export function useIsCardBusy() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => count - quiet > 0,
    () => false,
  );
}
