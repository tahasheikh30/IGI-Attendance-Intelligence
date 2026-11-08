import { useSyncExternalStore } from "react";

// A running count of things the person is waiting for (requests to the server). The global loader
// (components/GlobalLoader.jsx) shows while the count is above zero. Same idea as in Sentinel.

let count = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Mark the start of something the person waits for. Call the returned function once it is over. */
export function beginActivity() {
  count += 1;
  emit();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    count -= 1;
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
