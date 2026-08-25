import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { AgencyFollowUpsTable, type AgencyFollowUpRow } from "@/components/agency/agency-follow-ups-table";

export default async function AgencyFollowUpsPage() {
  const supabase = await createClient();
  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("*, patients(name), doctors(name), clinics(name)")
    .order("follow_up_date", { ascending: true })
    .returns<AgencyFollowUpRow[]>();

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Patient follow-ups across all clinics."
      />

      {!followUps || followUps.length === 0 ? (
        <ComingSoon
          icon={CalendarClock}
          title="No follow-ups yet"
          milestone="A follow-up is created automatically when a clinic approves a prescription that needs one."
        />
      ) : (
        <AgencyFollowUpsTable followUps={followUps} />
      )}
    </div>
  );
}
