import { Badge } from "@/components/ui/badge";
import type { FollowUpStatus } from "@/lib/types";

const labels: Record<FollowUpStatus, string> = {
  upcoming: "Upcoming",
  due: "Due",
  contacted: "Contacted",
  appointment_requested: "Appointment Requested",
  completed: "Completed",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const variants: Record<FollowUpStatus, "default" | "secondary" | "destructive" | "outline"> = {
  upcoming: "secondary",
  due: "outline",
  contacted: "outline",
  appointment_requested: "outline",
  completed: "default",
  overdue: "destructive",
  cancelled: "outline",
};

const coral: FollowUpStatus[] = ["due", "appointment_requested"];

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={
        coral.includes(status)
          ? "border-transparent bg-brand-coral-soft text-brand-coral-soft-foreground"
          : undefined
      }
    >
      {labels[status]}
    </Badge>
  );
}
