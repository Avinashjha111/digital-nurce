import { StatusToneBadge, type StatusTone } from "@/components/status-tone-badge";
import type { WhatsappTemplateStatus } from "@/lib/types";

const labels: Record<WhatsappTemplateStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  disabled: "Disabled",
};

const tones: Record<WhatsappTemplateStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  disabled: "neutral",
};

export function TemplateStatusBadge({ status }: { status: WhatsappTemplateStatus }) {
  return <StatusToneBadge tone={tones[status]}>{labels[status]}</StatusToneBadge>;
}
