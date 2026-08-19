import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { PrescriptionStatusBadge } from "@/components/prescription-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Prescription } from "@/lib/types";

type PrescriptionRow = Prescription & {
  patients: { name: string } | null;
  doctors: { name: string } | null;
  clinics: { name: string } | null;
};

export default async function AgencyPrescriptionsPage() {
  const supabase = await createClient();
  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("*, patients(name), doctors(name), clinics(name)")
    .order("created_at", { ascending: false })
    .returns<PrescriptionRow[]>();

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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">
                      {prescription.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{prescription.clinics?.name ?? "—"}</TableCell>
                    <TableCell>{prescription.doctors?.name ?? "—"}</TableCell>
                    <TableCell>
                      <PrescriptionStatusBadge status={prescription.status} />
                    </TableCell>
                    <TableCell>
                      {new Date(prescription.created_at).toLocaleDateString()}
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
