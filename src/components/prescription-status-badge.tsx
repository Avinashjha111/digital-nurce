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
  review_required: "default",
  approved: "default",
  rejected: "destructive",
  failed: "destructive",
};

export function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
