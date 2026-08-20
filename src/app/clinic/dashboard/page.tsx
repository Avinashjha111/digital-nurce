import { Users, FileText, Bell, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClinicDashboardPage() {
  const supabase = await createClient();
  const { count: patientCount } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });
  const { count: reviewCount } = await supabase
    .from("prescriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["uploaded", "processing", "review_required"]);
  const { count: reminderCount } = await supabase
    .from("reminders")
    .select("*", { count: "exact", head: true })
    .eq("status", "scheduled");
  const { count: followUpCount } = await supabase
    .from("follow_ups")
    .select("*", { count: "exact", head: true })
    .in("status", ["due", "contacted"]);

  const stats = [
    { label: "Total Patients", value: patientCount ?? 0, icon: Users },
    { label: "Prescriptions Awaiting Review", value: reviewCount ?? 0, icon: FileText },
    { label: "Active Reminders", value: reminderCount ?? 0, icon: Bell },
    { label: "Follow-ups Due", value: followUpCount ?? 0, icon: CalendarClock },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your clinic's patients, prescriptions and reminders."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Remaining metrics populate as later milestones ship.
      </p>
    </div>
  );
}
