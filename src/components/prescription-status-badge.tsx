import { StatusToneBadge, type StatusTone } from "@/components/status-tone-badge";
import type { PrescriptionStatus } from "@/lib/types";

const labels: Record<PrescriptionStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  review_required: "Review Required",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

const tones: Record<PrescriptionStatus, StatusTone> = {
  uploaded: "neutral",
  processing: "info",
  review_required: "warning",
  approved: "success",
  rejected: "danger",
  failed: "danger",
};

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  return <StatusToneBadge tone={tones[status]}>{labels[status]}</StatusToneBadge>;
}
