import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { AgencyPatientsTable, type AgencyPatientRow } from "@/components/agency/agency-patients-table";

export default async function AgencyPatientsPage() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, whatsapp_number, created_at, clinics(name)")
    .order("created_at", { ascending: false })
    .returns<AgencyPatientRow[]>();

  return (
    <div>
      <PageHeader title="Patients" description="Patients across all clinics." />

      {!patients || patients.length === 0 ? (
        <ComingSoon
          icon={Users}
          title="No patients yet"
          milestone="Patients appear here once clinics register them."
        />
      ) : (
        <AgencyPatientsTable patients={patients} />
      )}
    </div>
  );
}
