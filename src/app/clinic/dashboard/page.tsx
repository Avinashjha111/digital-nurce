import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function ClinicDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your clinic's patients, prescriptions and reminders."
      />
      <ComingSoon
        icon={LayoutDashboard}
        title="Live metrics arrive as later milestones ship"
        milestone="Patient, prescription and reminder counts populate here starting Milestone 3."
      />
    </div>
  );
}
