import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getClinicUsageSummary } from "@/lib/billing";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function AgencyUsagePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "agency_admin") redirect("/agency/dashboard");

  const supabase = await createClient();
  const { data: clinics } = await supabase.from("clinics").select("id, name").order("name");

  const rows = await Promise.all(
    (clinics ?? []).map(async (clinic) => ({
      clinic,
      usage: await getClinicUsageSummary(clinic.id),
    }))
  );

  return (
    <div>
      <PageHeader
        title="Message Usage"
        description="WhatsApp message balance and delivery breakdown, per clinic."
      />

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Left / Included</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Text sent</TableHead>
                <TableHead className="text-right">Media sent</TableHead>
                <TableHead className="text-right">Reminders</TableHead>
                <TableHead className="text-right">Follow-ups</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No clinics yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ clinic, usage }) => {
                  const low =
                    usage.hasActivePlan &&
                    usage.includedMessages > 0 &&
                    usage.messagesRemaining / usage.includedMessages <= 0.1;
                  return (
                    <TableRow key={clinic.id}>
                      <TableCell className="font-medium">{clinic.name}</TableCell>
                      <TableCell>
                        {usage.hasActivePlan ? usage.planName : (
                          <span className="text-muted-foreground">No active plan</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right",
                          usage.hasActivePlan && (usage.messagesRemaining <= 0 || low) && "font-medium text-status-warning"
                        )}
                      >
                        {usage.hasActivePlan
                          ? `${usage.messagesRemaining.toLocaleString("en-IN")} / ${usage.includedMessages.toLocaleString("en-IN")}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.breakdown.receivedFromPatients.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.breakdown.textRepliesSent.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.breakdown.mediaSent.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.breakdown.remindersSent.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.breakdown.followUpsSent.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
