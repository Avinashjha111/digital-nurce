import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { FollowUpStatusBadge } from "@/components/follow-up-status-badge";
import { BookAppointmentDialog } from "@/components/clinic/book-appointment-dialog";
import { CompleteFollowUpButton } from "@/components/clinic/complete-follow-up-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FollowUp } from "@/lib/types";

type FollowUpRow = FollowUp & {
  patients: { name: string } | null;
  doctors: { name: string } | null;
};

export default async function ClinicFollowUpsPage() {
  const supabase = await createClient();
  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("*, patients(name), doctors(name)")
    .order("follow_up_date", { ascending: true })
    .returns<FollowUpRow[]>();

  return (
    <div>
      <PageHeader title="Follow-ups" description="Patient follow-ups after treatment." />

      {!followUps || followUps.length === 0 ? (
        <ComingSoon
          icon={CalendarClock}
          title="No follow-ups yet"
          milestone="A follow-up is created automatically when a prescription that needs one is approved."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Follow-up date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUps.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell className="font-medium">
                      {followUp.patients?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>{followUp.doctors?.name ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(followUp.follow_up_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <FollowUpStatusBadge status={followUp.status} />
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {(followUp.status === "due" || followUp.status === "contacted") && (
                        <BookAppointmentDialog followUpId={followUp.id} />
                      )}
                      {(followUp.status === "contacted" ||
                        followUp.status === "appointment_requested") && (
                        <CompleteFollowUpButton followUpId={followUp.id} />
                      )}
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
