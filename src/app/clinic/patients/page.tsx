import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function ClinicPatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" description="Patients registered at your clinic." />
      <ComingSoon
        icon={Users}
        title="Patient records land in Milestone 3"
        milestone="Patient list, profiles and history."
      />
    </div>
  );
}
