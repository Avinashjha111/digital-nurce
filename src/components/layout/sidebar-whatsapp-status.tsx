import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar footer status chip: for a clinic, connected/not-connected for
// its one number; for an agency, how many of its clinics are connected.
export function SidebarWhatsAppStatus({
  connected,
  total,
  mode,
}: {
  connected: number;
  total: number;
  mode: "single" | "aggregate";
}) {
  const allConnected = total > 0 && connected === total;
  const label =
    mode === "single"
      ? connected > 0
        ? "WhatsApp connected"
        : "WhatsApp not connected"
      : `${connected}/${total} clinics connected`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-2">
      <MessageCircle
        className={cn("size-3.5 shrink-0", allConnected ? "text-status-success" : "text-status-warning")}
      />
      <span className="truncate text-[12px] text-sidebar-foreground/70">{label}</span>
      <span
        className={cn(
          "ml-auto size-1.5 shrink-0 rounded-full",
          allConnected ? "bg-status-success" : "bg-status-warning"
        )}
        aria-hidden="true"
      />
    </div>
  );
}
