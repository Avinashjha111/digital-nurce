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
    <div className="flex h-[calc(100vh-13.5rem)] min-h-0 overflow-hidden rounded-lg border bg-background md:h-[calc(100vh-8.5rem)]">
      <aside
        className={cn(
          "w-full shrink-0 flex-col overflow-y-auto border-r md:flex md:w-full md:max-w-xs",
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
