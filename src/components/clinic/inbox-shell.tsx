"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function playNotificationChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Pleasant two-tone incoming message chime (D5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.25, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.28);
  } catch {
    // Autoplay restrictions before initial user touch
  }
}

// Real WhatsApp's own mobile pattern: one pane at a time on a phone --
// the conversation list, or the open thread, never both side by side.
// Desktop always shows both. `/clinic/inbox` (no id) = list; anything
// past that = a thread is open.
export function InboxShell({ list, thread }: { list: ReactNode; thread: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasOpenThread = pathname !== "/clinic/inbox";
  const lastSoundPlayedRef = useRef<number>(0);

  // Request browser notification permission once on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Real-time live updates: listen for incoming WhatsApp messages and status changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("inbox-live-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as { direction?: string; body?: string };
          if (newMsg?.direction === "inbound") {
            const now = Date.now();
            // Throttle sound to once per 2 seconds
            if (now - lastSoundPlayedRef.current > 2000) {
              lastSoundPlayedRef.current = now;
              playNotificationChime();

              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                try {
                  new Notification("New WhatsApp Message", {
                    body: newMsg.body || "New message received",
                    icon: "/favicon.ico",
                  });
                } catch {
                  // Ignore notification error on background/locked state
                }
              }
            }
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    // Fast polling fallback every 4 seconds to guarantee messages appear instantly
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background md:rounded-lg md:border">
      <aside
        className={cn(
          "w-full shrink-0 flex-col overflow-y-auto md:flex md:w-full md:max-w-xs md:border-r",
          hasOpenThread ? "hidden" : "flex"
        )}
      >
        {list}
      </aside>
      <div
        className={cn(
          "min-w-0 flex-1 flex-col md:flex",
          hasOpenThread ? "flex" : "hidden"
        )}
      >
        {thread}
      </div>
    </div>
  );
}
