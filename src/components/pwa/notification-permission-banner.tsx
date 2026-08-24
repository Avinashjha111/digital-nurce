"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePushSubscription } from "@/lib/actions/push-subscriptions";

const DISMISSED_KEY = "dn_push_banner_dismissed";

function noopSubscribe() {
  return () => {};
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Offers to turn on push notifications for new patient WhatsApp messages.
// Only shown when there's something actionable to do: push is supported,
// permission hasn't been decided yet, and the user hasn't dismissed it
// before. Once permission is denied at the browser level there's nothing
// we can do from here, so it stays quiet rather than nag.
export function NotificationPermissionBanner() {
  const [pending, setPending] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dismissedLocal, setDismissedLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    () => false
  );
  const permission = useSyncExternalStore(
    noopSubscribe,
    () => (typeof Notification !== "undefined" ? Notification.permission : "default"),
    () => "default" as NotificationPermission
  );
  const dismissed = useSyncExternalStore(
    noopSubscribe,
    () => window.localStorage.getItem(DISMISSED_KEY) === "1",
    () => true
  );

  if (!supported || permission !== "default" || dismissed || dismissedLocal || enabled) return null;

  async function handleEnable() {
    setPending(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      if (result !== "granted") return;

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Notifications aren't configured for this deployment yet.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setError("Couldn't set up notifications on this device.");
        return;
      }

      const saveResult = await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });

      if (saveResult.error) {
        setError(saveResult.error);
        return;
      }

      setEnabled(true);
    } catch {
      setError("Couldn't enable notifications on this device.");
    } finally {
      setPending(false);
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setDismissedLocal(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Bell className="size-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Turn on notifications</p>
        <p className="text-xs text-muted-foreground">
          {error ?? "Get notified the moment a patient messages you on WhatsApp."}
        </p>
      </div>
      <Button size="sm" className="shrink-0" disabled={pending} onClick={handleEnable}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
        Enable
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Dismiss"
        onClick={dismiss}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
