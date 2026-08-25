"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FollowUpStatusBadge } from "@/components/follow-up-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FollowUp } from "@/lib/types";

export type AgencyFollowUpRow = FollowUp & {
  patients: { name: string } | null;
  doctors: { name: string } | null;
  clinics: { name: string } | null;
};

export function AgencyFollowUpsTable({ followUps }: { followUps: AgencyFollowUpRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return followUps;
    return followUps.filter(
      (f) =>
        (f.clinics?.name ?? "").toLowerCase().includes(q) ||
        (f.patients?.name ?? "").toLowerCase().includes(q)
    );
  }, [followUps, query]);

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
          icon={CalendarClock}
          title="No matching follow-ups"
          milestone={`No clinic or patient name matches "${query}".`}
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
                  <TableHead>Follow-up date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell className="font-medium">
                      {followUp.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{followUp.clinics?.name ?? "—"}</TableCell>
                    <TableCell>{followUp.doctors?.name ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(followUp.follow_up_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <FollowUpStatusBadge status={followUp.status} />
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
