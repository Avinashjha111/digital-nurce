import { Badge } from "@/components/ui/badge";
import type { ReminderStatus } from "@/lib/types";

const labels: Record<ReminderStatus, string> = {
  scheduled: "Scheduled",
  processing: "Processing",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled",
  skipped: "Skipped",
};

const variants: Record<ReminderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  processing: "outline",
  sent: "default",
  delivered: "default",
  failed: "destructive",
  cancelled: "outline",
  skipped: "outline",
};

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={
        status === "processing"
          ? "border-transparent bg-brand-coral-soft text-brand-coral-soft-foreground"
          : undefined
      }
    >
      {labels[status]}
    </Badge>
  );
}
