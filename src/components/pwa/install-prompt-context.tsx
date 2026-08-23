"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const DISMISSED_KEY = "dn_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallPromptValue = {
  /** Phone-width viewport, not desktop/tablet. */
  isMobile: boolean;
  /** iOS Safari/Chrome -- never fires beforeinstallprompt, needs manual instructions. */
  isIOS: boolean;
  /** Already launched from the home screen / installed. */
  isStandalone: boolean;
  /** Chrome/Android/Edge captured a real install prompt we can trigger. */
  canPromptInstall: boolean;
  /** User dismissed the auto-shown banner before -- don't show it again. */
  dismissed: boolean;
  promptInstall: () => Promise<void>;
  dismissBanner: () => void;
};

const InstallPromptContext = createContext<InstallPromptValue | null>(null);

// These read browser-only globals that don't exist during SSR, and (bar
// isMobile) never change after mount -- useSyncExternalStore is the
// hydration-safe way to do that: a fixed server snapshot, then the real
// client value once mounted, without a post-mount setState-in-effect
// flicker.
function noopSubscribe() {
  return () => {};
}

function subscribeResize(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

const DISMISS_EVENT = "dn-pwa-dismiss";

function subscribeDismissed(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const isMobile = useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < 768,
    () => false
  );
  const isIOS = useSyncExternalStore(
    noopSubscribe,
    () => /iPhone|iPod/.test(navigator.userAgent),
    () => false
  );
  const isStandalone = useSyncExternalStore(
    noopSubscribe,
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    () => false
  );
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    () => window.localStorage.getItem(DISMISSED_KEY) === "1",
    () => true
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const onInstalled = () => setDeferredEvent(null);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  }, [deferredEvent]);

  const dismissBanner = useCallback(() => {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  return (
    <InstallPromptContext.Provider
      value={{
        isMobile,
        isIOS,
        isStandalone,
        canPromptInstall: deferredEvent !== null,
        dismissed,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) throw new Error("useInstallPrompt must be used within InstallPromptProvider");
  return ctx;
}
