import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AgencyDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of clinics, patients, prescriptions and reminders."
      />
      <ComingSoon
        icon={LayoutDashboard}
        title="Live metrics arrive as later milestones ship"
        milestone="Clinic, patient, prescription and reminder counts populate here starting Milestone 2."
      />
    </div>
  );
}
