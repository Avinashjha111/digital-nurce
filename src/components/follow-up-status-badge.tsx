import { StatusToneBadge, type StatusTone } from "@/components/status-tone-badge";
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

const tones: Record<FollowUpStatus, StatusTone> = {
  upcoming: "neutral",
  due: "action",
  contacted: "info",
  appointment_requested: "info",
  completed: "success",
  overdue: "danger",
  cancelled: "neutral",
};

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return <StatusToneBadge tone={tones[status]}>{labels[status]}</StatusToneBadge>;
}
