import {
  Bell,
  CalendarClock,
  CalendarPlus,
  FileText,
  Inbox as InboxIcon,
  MessageCircle,
  MessageSquareText,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { ChartCard } from "@/components/chart-card";
import { ActivityList, type ActivityItem } from "@/components/activity-list";
import { QuickActions } from "@/components/quick-actions";
import { StatusToneBadge } from "@/components/status-tone-badge";
import { AttentionList } from "@/components/attention-list";
import { ComingSoon } from "@/components/coming-soon";
import { BillingStatusBanner } from "@/components/billing-status-banner";
import { getClinicMessagingStatus } from "@/lib/billing";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function ClinicDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: clinic } = profile?.clinic_id
    ? await supabase.from("clinics").select("name").eq("id", profile.clinic_id).single()
    : { data: null };

  const billingStatus = profile?.clinic_id
    ? await getClinicMessagingStatus(profile.clinic_id)
    : null;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
  const todayStr = startOfToday.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const [
    { count: patientCount },
    { data: prescriptions },
    { data: todaysReminders },
    { count: failedReminderCount },
    { data: dueFollowUps },
    { data: todaysAppointments },
    { count: pendingAppointmentCount },
    { data: conversations },
    { data: todaysMessages },
    { data: recentInbound },
    { data: weekFollowUps },
  ] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("prescriptions").select("status"),
    supabase
      .from("reminders")
      .select("status")
      .gte("scheduled_at", startOfToday.toISOString())
      .lt("scheduled_at", startOfTomorrow.toISOString()),
    supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.from("follow_ups").select("follow_up_date, status").eq("status", "due"),
    supabase
      .from("appointment_requests")
      .select("id, preferred_time, status, patients(name)")
      .eq("preferred_date", todayStr)
      .order("preferred_time"),
    supabase
      .from("appointment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase.from("conversations").select("unread_count"),
    supabase
      .from("messages")
      .select("direction, status")
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString()),
    supabase
      .from("messages")
      .select("id, body, created_at, patient_id, conversation_id, patients(name)")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("follow_ups")
      .select("follow_up_date, status, created_at")
      .gte("follow_up_date", sevenDaysAgo.toISOString().slice(0, 10)),
  ]);

  const pendingPrescriptions =
    prescriptions?.filter((p) => ["uploaded", "processing", "review_required"].includes(p.status))
      .length ?? 0;

  const reminderSent =
    todaysReminders?.filter((r) => r.status === "sent" || r.status === "delivered").length ?? 0;
  const reminderPending = todaysReminders?.filter((r) => r.status === "scheduled").length ?? 0;

  const dueToday = dueFollowUps?.filter((f) => f.follow_up_date === todayStr).length ?? 0;
  const overdueFollowUps = dueFollowUps?.filter((f) => f.follow_up_date < todayStr).length ?? 0;
  const followUpDueTotal = dueFollowUps?.length ?? 0;

  const unreadMessages = conversations?.reduce((sum, c) => sum + c.unread_count, 0) ?? 0;

  const messagesDelivered =
    todaysMessages?.filter((m) => m.direction === "outbound" && (m.status === "delivered" || m.status === "read"))
      .length ?? 0;
  const messagesFailed =
    todaysMessages?.filter((m) => m.direction === "outbound" && m.status === "failed").length ?? 0;

  // 7-day follow-up chart: bucket by day, classify each row as due-today,
  // completed, or overdue relative to ITS OWN follow_up_date -- not
  // today's date, so past days show what actually happened that day.
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const rows = (weekFollowUps ?? []).filter((f) => f.follow_up_date === dateStr);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      scheduled: rows.filter((r) => r.status === "upcoming" || r.status === "due").length,
      completed: rows.filter((r) => r.status === "completed").length,
      overdue: rows.filter((r) => r.status === "due" && dateStr < todayStr).length,
    };
  });

  const attentionItems = [
    pendingPrescriptions > 0 && {
      tone: "warning" as const,
      text: `${pendingPrescriptions} prescription${pendingPrescriptions > 1 ? "s" : ""} awaiting review`,
      href: "/clinic/prescriptions",
      cta: "Review Now",
    },
    (failedReminderCount ?? 0) > 0 && {
      tone: "danger" as const,
      text: `${failedReminderCount} reminder${(failedReminderCount ?? 0) > 1 ? "s" : ""} failed`,
      href: "/clinic/reminders",
      cta: "View",
    },
    followUpDueTotal > 0 && {
      tone: "action" as const,
      text: `${followUpDueTotal} follow-up${followUpDueTotal > 1 ? "s" : ""} due`,
      href: "/clinic/follow-ups",
      cta: "View Follow-Ups",
    },
    unreadMessages > 0 && {
      tone: "info" as const,
      text: `${unreadMessages} unread WhatsApp message${unreadMessages > 1 ? "s" : ""}`,
      href: "/clinic/inbox",
      cta: "Open Inbox",
    },
  ].filter(Boolean) as { tone: "warning" | "danger" | "action" | "info"; text: string; href: string; cta: string }[];

  const activityItems: ActivityItem[] = (recentInbound ?? []).map((m) => ({
    key: m.id,
    time: timeAgo(m.created_at),
    text: (
      <>
        <span className="font-medium">
          {(m as unknown as { patients: { name: string } | null }).patients?.name ?? "Unknown patient"}
        </span>{" "}
        — {m.body.length > 60 ? `${m.body.slice(0, 60)}…` : m.body}
      </>
    ),
    href: `/clinic/inbox/${m.conversation_id}`,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {greeting()}
          {profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s {clinic?.name ?? "your clinic"}&apos;s activity for today.
        </p>
      </div>

      {billingStatus && !billingStatus.canSend && <BillingStatusBanner status={billingStatus} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Today's Appointments"
          value={todaysAppointments?.length ?? 0}
          icon={CalendarClock}
          statuses={[
            { tone: "info", label: `${(todaysAppointments ?? []).filter((a) => a.status === "confirmed").length} confirmed` },
            { tone: "action", label: `${(todaysAppointments ?? []).filter((a) => a.status === "requested").length} requested` },
          ]}
          href="/clinic/follow-ups"
          cta="View Appointments"
        />
        <KpiCard
          label="Pending Prescriptions"
          value={pendingPrescriptions}
          icon={FileText}
          href="/clinic/prescriptions"
          cta="Review Now"
        />
        <KpiCard
          label="Today's Reminders"
          value={todaysReminders?.length ?? 0}
          icon={Bell}
          statuses={[
            { tone: "success", label: `${reminderSent} sent` },
            { tone: "action", label: `${reminderPending} pending` },
          ]}
          href="/clinic/reminders"
          cta="View Reminders"
        />
        <KpiCard
          label="Follow-Ups Due"
          value={dueToday}
          icon={CalendarClock}
          statuses={
            overdueFollowUps > 0 ? [{ tone: "danger", label: `${overdueFollowUps} overdue` }] : undefined
          }
          href="/clinic/follow-ups"
          cta="View Follow-Ups"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="New WhatsApp Messages" value={unreadMessages} icon={MessageCircle} href="/clinic/inbox" cta="Open Inbox" />
        <KpiCard
          label="Appointment Requests"
          value={pendingAppointmentCount ?? 0}
          icon={CalendarPlus}
          href="/clinic/follow-ups"
          cta="View"
        />
        <KpiCard
          label="Messages Remaining"
          value={billingStatus?.canSend ? billingStatus.messagesRemaining : billingStatus ? 0 : "—"}
          icon={MessageSquareText}
          statuses={
            billingStatus && !billingStatus.canSend
              ? [
                  {
                    tone: "danger",
                    label:
                      billingStatus.reason === "no_plan"
                        ? "No active plan"
                        : billingStatus.reason === "expired"
                          ? "Plan expired"
                          : "Out of messages",
                  },
                ]
              : undefined
          }
          href="/clinic/usage"
          cta="View Usage"
        />
        <KpiCard label="Active Patients" value={patientCount ?? 0} icon={Users} href="/clinic/patients" cta="View Patients" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {!todaysAppointments || todaysAppointments.length === 0 ? (
            <ComingSoon
              icon={CalendarClock}
              title="No appointments today"
              milestone="Appointment requests from patient follow-ups will show up here."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {todaysAppointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm font-medium tabular-nums">{a.preferred_time}</span>
                    <span className="text-sm">
                      {(a as unknown as { patients: { name: string } | null }).patients?.name ?? "Unknown"}
                    </span>
                  </div>
                  <StatusToneBadge tone={a.status === "confirmed" ? "success" : "action"}>
                    {a.status === "confirmed" ? "Confirmed" : "Requested"}
                  </StatusToneBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs Your Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <AttentionList items={attentionItems} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Patient Follow-Up"
          data={chartData}
          series={[
            { key: "scheduled", label: "Scheduled", tone: "action" },
            { key: "completed", label: "Completed", tone: "success" },
            { key: "overdue", label: "Overdue", tone: "danger" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{todaysMessages?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Messages Today</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-status-success">{messagesDelivered}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-status-info">{unreadMessages}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-destructive">{messagesFailed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Patient Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList items={activityItems} />
        </CardContent>
      </Card>

      <QuickActions
        actions={[
          { label: "Upload Prescription", href: "/clinic/prescriptions/new", icon: UploadCloud, primary: true },
          { label: "Add Patient", href: "/clinic/patients/new", icon: UserPlus },
          { label: "Open Inbox", href: "/clinic/inbox", icon: InboxIcon },
          { label: "View Follow-Ups", href: "/clinic/follow-ups", icon: CalendarClock },
        ]}
      />
    </div>
  );
}
