"use client";

import { useEffect } from "react";

// Registers the service worker once, app-wide. A no-op on browsers
// without support (older Safari versions, some in-app browsers) --
// registration just silently doesn't happen, the app works exactly the
// same either way since the worker has no offline behavior to lose.
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures (e.g. dev-mode HTTP, unsupported browser)
      // aren't worth surfacing -- the app is fully usable without it.
    });
  }, []);

  return null;
}
