import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import {
  AgencyPrescriptionsTable,
  type AgencyPrescriptionRow,
} from "@/components/agency/agency-prescriptions-table";

export default async function AgencyPrescriptionsPage() {
  const supabase = await createClient();
  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*, patients(name), doctors(name), clinics(name)")
    .order("created_at", { ascending: false })
    .returns<AgencyPrescriptionRow[]>();

  return (
    <div>
      <PageHeader
        title="Prescriptions"
        description="Prescriptions across all clinics."
      />

      {!prescriptions || prescriptions.length === 0 ? (
        <ComingSoon
          icon={FileText}
          title="No prescriptions yet"
          milestone="Prescriptions appear here once a clinic uploads one."
        />
      ) : (
        <AgencyPrescriptionsTable prescriptions={prescriptions} />
      )}
    </div>
  );
}
