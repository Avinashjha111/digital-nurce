import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { AgencyRemindersTable, type AgencyReminderRow } from "@/components/agency/agency-reminders-table";

export default async function AgencyRemindersPage() {
  const supabase = await createClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, patients(name), prescription_medicines(name), clinics(name)")
    .order("scheduled_at", { ascending: false })
    .returns<AgencyReminderRow[]>();

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="Scheduled medicine reminders across all clinics."
      />

      {!reminders || reminders.length === 0 ? (
        <ComingSoon
          icon={Bell}
          title="No reminders yet"
          milestone="Reminders are created automatically when a clinic approves a prescription."
        />
      ) : (
        <AgencyRemindersTable reminders={reminders} />
      )}
    </div>
  );
}
