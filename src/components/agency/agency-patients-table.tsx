"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeletePatientDialog } from "@/components/agency/delete-patient-dialog";

export type AgencyPatientRow = {
  id: string;
  name: string;
  whatsapp_number: string;
  created_at: string;
  clinics: { name: string } | null;
};

export function AgencyPatientsTable({ patients }: { patients: AgencyPatientRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.clinics?.name ?? "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by clinic or patient name..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <ComingSoon
          icon={Users}
          title="No matching patients"
          milestone={`No clinic or patient name matches "${query}".`}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((patient) => (
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
                    <TableCell className="text-right">
                      <DeletePatientDialog patientId={patient.id} patientName={patient.name} />
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
