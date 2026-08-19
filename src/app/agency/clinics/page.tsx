import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyClinicsPage() {
  return (
    <div>
      <PageHeader
        title="Clinics"
        description="Add and manage clinics on the platform."
      />
      <ComingSoon
        icon={Building2}
        title="Clinic creation lands in Milestone 2"
        milestone="Add Clinic form, clinic list and Connect WhatsApp flow."
      />
    </div>
  );
}
