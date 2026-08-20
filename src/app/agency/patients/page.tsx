import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PatientRow = {
  id: string;
  name: string;
  whatsapp_number: string;
  created_at: string;
  clinics: { name: string } | null;
};

export default async function AgencyPatientsPage() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, whatsapp_number, created_at, clinics(name)")
    .order("created_at", { ascending: false })
    .returns<PatientRow[]>();

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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>WhatsApp number</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/agency/patients/${patient.id}`}
                        className="hover:underline"
                      >
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.clinics?.name ?? "—"}</TableCell>
                    <TableCell>+{patient.whatsapp_number}</TableCell>
                    <TableCell>
                      {new Date(patient.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
