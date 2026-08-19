import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyPrescriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="Prescriptions awaiting review across all clinics."
      />
      <ComingSoon
        icon={FileText}
        title="Prescription upload + review lands in Milestones 5-7"
        milestone="Upload, Gemini extraction and human approval workflow."
      />
    </div>
  );
}
