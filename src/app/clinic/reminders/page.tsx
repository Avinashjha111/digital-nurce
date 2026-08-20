import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { ReminderStatusBadge } from "@/components/reminder-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Reminder } from "@/lib/types";

type ReminderRow = Reminder & {
  patients: { name: string } | null;
  prescription_medicines: { name: string } | null;
};

export default async function ClinicRemindersPage() {
  const supabase = await createClient();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, patients(name), prescription_medicines(name)")
    .order("scheduled_at", { ascending: false })
    .returns<ReminderRow[]>();

  return (
    <div>
      <PageHeader title="Reminders" description="Scheduled medicine reminders." />

      {!reminders || reminders.length === 0 ? (
        <ComingSoon
          icon={Bell}
          title="No reminders yet"
          milestone="Reminders are created automatically when a prescription is approved."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">
                      {reminder.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{reminder.prescription_medicines?.name ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(reminder.scheduled_at).toLocaleString()}
                    </TableCell>
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
