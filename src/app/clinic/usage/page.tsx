import { redirect } from "next/navigation";
import { MessageCircle, FileText, Image as ImageIcon, Bell, CalendarClock } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getClinicUsageSummary } from "@/lib/billing";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ClinicUsagePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.clinic_id) redirect("/clinic/dashboard");

  const usage = await getClinicUsageSummary(profile.clinic_id);

  if (!usage.hasActivePlan) {
    return (
      <div>
        <PageHeader
          title="Message Usage"
          description="Your WhatsApp message balance and delivery report."
        />
        <Card className="max-w-xl">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            No active plan yet. Contact your agency to get started.
          </CardContent>
        </Card>
      </div>
    );
  }

  const usedPct =
    usage.includedMessages > 0
      ? Math.min(100, ((usage.includedMessages - usage.messagesRemaining) / usage.includedMessages) * 100)
      : 0;
  const low = usage.includedMessages > 0 && usage.messagesRemaining / usage.includedMessages <= 0.1;

  const breakdownRows = [
    { icon: MessageCircle, label: "Messages received from patients", value: usage.breakdown.receivedFromPatients },
    { icon: FileText, label: "Text replies sent", value: usage.breakdown.textRepliesSent },
    { icon: ImageIcon, label: "Photos & documents sent", value: usage.breakdown.mediaSent },
    { icon: Bell, label: "Medicine reminders sent", value: usage.breakdown.remindersSent },
    { icon: CalendarClock, label: "Follow-up nudges sent", value: usage.breakdown.followUpsSent },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Message Usage"
        description="Your WhatsApp message balance and delivery report."
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">{usage.planName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">
              {usage.messagesRemaining.toLocaleString("en-IN")}
            </span>
            <span className="text-sm text-muted-foreground">
              of {usage.includedMessages.toLocaleString("en-IN")} messages left
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", low ? "bg-status-warning" : "bg-primary")}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {usage.expiryDate && (
            <p className="text-xs text-muted-foreground">Renews/expires on {formatDate(usage.expiryDate)}</p>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Delivery Report</CardTitle>
          <p className="text-xs text-muted-foreground">
            Where your message credits went this cycle
            {usage.cycleStart ? ` (since ${formatDate(usage.cycleStart)})` : ""}.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {breakdownRows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <row.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{row.label}</span>
                </div>
                <span className="text-sm font-medium">{row.value.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
