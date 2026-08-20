import { Badge } from "@/components/ui/badge";
import type { PrescriptionStatus } from "@/lib/types";

const labels: Record<PrescriptionStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  review_required: "Review Required",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

const variants: Record<PrescriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  uploaded: "secondary",
  processing: "secondary",
  review_required: "outline",
  approved: "default",
  rejected: "destructive",
  failed: "destructive",
};

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  return (
    <Badge
      variant={variants[status]}
      className={
        status === "review_required"
          ? "border-transparent bg-brand-coral-soft text-brand-coral-soft-foreground"
          : undefined
      }
    >
      {labels[status]}
    </Badge>
  );
}
