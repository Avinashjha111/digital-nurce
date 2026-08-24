"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Real WhatsApp's own mobile pattern: one pane at a time on a phone --
// the conversation list, or the open thread, never both side by side.
// Desktop always shows both. `/clinic/inbox` (no id) = list; anything
// past that = a thread is open.
export function InboxShell({ list, thread }: { list: ReactNode; thread: ReactNode }) {
  const pathname = usePathname();
  const hasOpenThread = pathname !== "/clinic/inbox";

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
