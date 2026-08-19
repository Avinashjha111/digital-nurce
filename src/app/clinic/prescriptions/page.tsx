import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function ClinicPrescriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="Upload and review prescriptions."
      />
      <ComingSoon
        icon={FileText}
        title="Prescription upload + review lands in Milestones 5-7"
        milestone="Upload, Gemini extraction and human approval workflow."
      />
    </div>
  );
}
