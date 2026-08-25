"use client";

import { useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
import { formatReminderTime } from "@/lib/reminders/schedule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Reminder } from "@/lib/types";

export type AgencyReminderRow = Reminder & {
  patients: { name: string } | null;
  prescription_medicines: { name: string } | null;
  clinics: { name: string } | null;
};

export function AgencyRemindersTable({ reminders }: { reminders: AgencyReminderRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reminders;
    return reminders.filter(
      (r) =>
        (r.clinics?.name ?? "").toLowerCase().includes(q) ||
        (r.patients?.name ?? "").toLowerCase().includes(q)
    );
  }, [reminders, query]);

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
          icon={Bell}
          title="No matching reminders"
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
                  <TableHead>Medicine</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">
                      {reminder.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{reminder.clinics?.name ?? "—"}</TableCell>
                    <TableCell>{reminder.prescription_medicines?.name ?? "—"}</TableCell>
                    <TableCell>{formatReminderTime(reminder.scheduled_at)}</TableCell>
                    <TableCell>
                      <ReminderStatusBadge status={reminder.status} />
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
