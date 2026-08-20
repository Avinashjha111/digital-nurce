import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
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

type FollowUpRow = FollowUp & {
  patients: { name: string } | null;
  doctors: { name: string } | null;
  clinics: { name: string } | null;
};

export default async function AgencyFollowUpsPage() {
  const supabase = await createClient();
  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("*, patients(name), doctors(name), clinics(name)")
    .order("follow_up_date", { ascending: true })
    .returns<FollowUpRow[]>();

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Patient follow-ups across all clinics."
      />

      {!followUps || followUps.length === 0 ? (
        <ComingSoon
          icon={CalendarClock}
          title="No follow-ups yet"
          milestone="A follow-up is created automatically when a clinic approves a prescription that needs one."
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
                {followUps.map((followUp) => (
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
