import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar footer chip, clinic-side: an at-a-glance "how many messages do I
// have left" next to the WhatsApp connection status, without needing to
// open the full Message Usage report. Links there on click.
export function SidebarMessageBalance({
  hasActivePlan,
  messagesRemaining,
  includedMessages,
}: {
  hasActivePlan: boolean;
  messagesRemaining: number;
  includedMessages: number;
}) {
  const low = hasActivePlan && includedMessages > 0 && messagesRemaining / includedMessages <= 0.1;
  const zero = hasActivePlan && messagesRemaining <= 0;

  const label = !hasActivePlan
    ? "No active plan"
    : `${messagesRemaining.toLocaleString("en-IN")}/${includedMessages.toLocaleString("en-IN")} messages left`;

  return (
    <Link
      href="/clinic/usage"
      className="flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-2 hover:bg-sidebar-accent"
    >
      <MessageSquareText
        className={cn(
          "size-3.5 shrink-0",
          zero || !hasActivePlan
            ? "text-destructive"
            : low
              ? "text-status-warning"
              : "text-status-success"
        )}
      />
      <span className="truncate text-[12px] text-sidebar-foreground/70">{label}</span>
      <span
        className={cn(
          "ml-auto size-1.5 shrink-0 rounded-full",
          zero || !hasActivePlan ? "bg-destructive" : low ? "bg-status-warning" : "bg-status-success"
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
