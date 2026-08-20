import { Badge } from "@/components/ui/badge";
import type { WhatsappTemplateStatus } from "@/lib/types";

const labels: Record<WhatsappTemplateStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  disabled: "Disabled",
};

const variants: Record<WhatsappTemplateStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  disabled: "destructive",
};

export function TemplateStatusBadge({ status }: { status: WhatsappTemplateStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={
        status === "pending"
          ? "border-transparent bg-brand-coral-soft text-brand-coral-soft-foreground"
          : undefined
      }
    >
      {labels[status]}
    </Badge>
  );
}
