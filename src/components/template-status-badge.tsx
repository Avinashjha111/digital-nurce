import { Badge } from "@/components/ui/badge";
import type { WhatsappTemplateStatus } from "@/lib/types";

const labels: Record<WhatsappTemplateStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  disabled: "Disabled",
};

const variants: Record<WhatsappTemplateStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  disabled: "destructive",
};

export function TemplateStatusBadge({ status }: { status: WhatsappTemplateStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
