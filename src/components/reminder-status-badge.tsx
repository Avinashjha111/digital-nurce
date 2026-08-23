import { StatusToneBadge, type StatusTone } from "@/components/status-tone-badge";
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

const tones: Record<ReminderStatus, StatusTone> = {
  scheduled: "action",
  processing: "info",
  sent: "success",
  delivered: "success",
  failed: "danger",
  cancelled: "neutral",
  skipped: "neutral",
};

export function ReminderStatusBadge({ status }: { status: ReminderStatus }) {
  return <StatusToneBadge tone={tones[status]}>{labels[status]}</StatusToneBadge>;
}
