"use client";

import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export type AgencyPrescriptionRow = Prescription & {
  patients: { name: string } | null;
  doctors: { name: string } | null;
  clinics: { name: string } | null;
};

export function AgencyPrescriptionsTable({
  prescriptions,
}: {
  prescriptions: AgencyPrescriptionRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter(
      (p) =>
        (p.clinics?.name ?? "").toLowerCase().includes(q) ||
        (p.doctors?.name ?? "").toLowerCase().includes(q)
    );
  }, [prescriptions, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by clinic or doctor name..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <ComingSoon
          icon={FileText}
          title="No matching prescriptions"
          milestone={`No clinic or doctor name matches "${query}".`}
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
                {filtered.map((prescription) => (
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
