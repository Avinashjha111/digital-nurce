import { Bell } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function ClinicRemindersPage() {
  return (
    <div>
      <PageHeader title="Reminders" description="Active medicine reminders." />
      <ComingSoon
        icon={Bell}
        title="Reminder scheduling lands in Milestone 8"
        milestone="Schedule generation, scheduler run and WhatsApp reminder delivery."
      />
    </div>
  );
}
