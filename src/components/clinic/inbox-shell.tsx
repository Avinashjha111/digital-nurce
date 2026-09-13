"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// Real WhatsApp's own mobile pattern: one pane at a time on a phone --
// the conversation list, or the open thread, never both side by side.
// Desktop always shows both. `/clinic/inbox` (no id) = list; anything
// past that = a thread is open.
export function InboxShell({ list, thread }: { list: ReactNode; thread: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasOpenThread = pathname !== "/clinic/inbox";

  // Real-time live updates: listen for incoming WhatsApp messages and status changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("inbox-live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
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

