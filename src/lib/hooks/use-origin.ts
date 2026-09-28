"use client";

import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/** Origin hanya ada di browser: server merender string kosong, klien menggantinya setelah hidrasi. */
export function useOrigin(): string {
  return useSyncExternalStore(
    subscribeNothing,
    () => window.location.origin,
    () => "",
  );
}
