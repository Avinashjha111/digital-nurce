import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyPatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" description="Patients across all clinics." />
      <ComingSoon
        icon={Users}
        title="Patient records land in Milestone 3"
        milestone="Patient list and profiles across every clinic."
      />
    </div>
  );
}
