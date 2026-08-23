import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Building2,
  CalendarClock,
  CalendarPlus,
  FileText,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { ChartCard } from "@/components/chart-card";
import { ActivityList, type ActivityItem } from "@/components/activity-list";
import { QuickActions } from "@/components/quick-actions";
import { StatusToneBadge } from "@/components/status-tone-badge";

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

export default async function AgencyDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
  const todayStr = startOfToday.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

  const [
    { data: clinics },
    { data: prescriptions },
    { count: failedMessageCount },
    { data: dueFollowUps },
    { count: pendingAppointmentCount },
    { data: todaysMessages },
    { data: todaysReminders },
    { data: todaysFollowUps },
    { data: weekReminders },
    { data: clinicMessages },
    { data: recentInbound },
  ] = await Promise.all([
    supabase.from("clinics").select("id, name, whatsapp_status, created_at"),
    supabase.from("prescriptions").select("status, clinic_id"),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "outbound")
      .eq("status", "failed"),
    supabase
      .from("follow_ups")
      .select("follow_up_date, status, clinic_id, clinics(name)")
      .eq("status", "due"),
    supabase
      .from("appointment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase
      .from("messages")
      .select("id")
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString()),
    supabase
      .from("reminders")
      .select("clinic_id, status, clinics(name)")
      .gte("scheduled_at", startOfToday.toISOString())
      .lt("scheduled_at", startOfTomorrow.toISOString()),
    supabase
      .from("follow_ups")
      .select("clinic_id, status, clinics(name)")
      .eq("follow_up_date", todayStr),
    supabase
      .from("reminders")
      .select("scheduled_at, status")
      .gte("scheduled_at", sevenDaysAgo.toISOString()),
    supabase
      .from("messages")
      .select("clinic_id, direction, status, clinics(name)"),
    supabase
      .from("messages")
      .select("id, body, created_at, clinic_id, conversation_id, patients(name), clinics(name)")
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const totalClinics = clinics?.length ?? 0;
  const activeClinics = clinics?.filter((c) => c.whatsapp_status === "connected").length ?? 0;
  const disconnectedClinics = clinics?.filter((c) => c.whatsapp_status !== "connected") ?? [];

  const pendingReviews =
    prescriptions?.filter((p) => ["uploaded", "processing", "review_required"].includes(p.status))
      .length ?? 0;

  const followUpDueTotal = dueFollowUps?.length ?? 0;
  const overdueFollowUps = dueFollowUps?.filter((f) => f.follow_up_date < todayStr).length ?? 0;

  // "Today's Campaigns" -- reminders + follow-up nudges are our real
  // equivalent of a broadcast campaign, grouped per clinic per type.
  type SendRow = { clinic: string; type: string; scheduled: number; sent: number; failed: number };
  const sendRows: SendRow[] = [];
  const clinicNameById = new Map((clinics ?? []).map((c) => [c.id, c.name]));

  const reminderByClinic = new Map<string, { scheduled: number; sent: number; failed: number }>();
  for (const r of todaysReminders ?? []) {
    const entry = reminderByClinic.get(r.clinic_id) ?? { scheduled: 0, sent: 0, failed: 0 };
    if (r.status === "scheduled" || r.status === "processing") entry.scheduled++;
    else if (r.status === "sent" || r.status === "delivered") entry.sent++;
    else if (r.status === "failed") entry.failed++;
    reminderByClinic.set(r.clinic_id, entry);
  }
  for (const [clinicId, entry] of reminderByClinic) {
    sendRows.push({
      clinic: clinicNameById.get(clinicId) ?? "Unknown",
      type: "Medicine Reminders",
      ...entry,
    });
  }

  const followUpByClinic = new Map<string, { scheduled: number; sent: number; failed: number }>();
  for (const f of todaysFollowUps ?? []) {
    const entry = followUpByClinic.get(f.clinic_id) ?? { scheduled: 0, sent: 0, failed: 0 };
    if (f.status === "upcoming") entry.scheduled++;
    else if (f.status !== "cancelled") entry.sent++;
    followUpByClinic.set(f.clinic_id, entry);
  }
  for (const [clinicId, entry] of followUpByClinic) {
    sendRows.push({
      clinic: clinicNameById.get(clinicId) ?? "Unknown",
      type: "Follow-Up Nudges",
      ...entry,
    });
  }

  // 7-day campaign performance: reminders bucketed by scheduled day.
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const rows = (weekReminders ?? []).filter((r) => r.scheduled_at.slice(0, 10) === dateStr);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      sent: rows.filter((r) => r.status === "sent" || r.status === "delivered").length,
      failed: rows.filter((r) => r.status === "failed").length,
      scheduled: rows.filter((r) => r.status === "scheduled" || r.status === "processing").length,
    };
  });

  // Clinic activity: message volume + delivery rate, ranked.
  const clinicStats = new Map<string, { name: string; messages: number; delivered: number; failed: number }>();
  for (const m of clinicMessages ?? []) {
    const name = (m as unknown as { clinics: { name: string } | null }).clinics?.name ?? "Unknown";
    const entry = clinicStats.get(m.clinic_id) ?? { name, messages: 0, delivered: 0, failed: 0 };
    entry.messages++;
    if (m.direction === "outbound" && (m.status === "delivered" || m.status === "read")) entry.delivered++;
    if (m.direction === "outbound" && m.status === "failed") entry.failed++;
    clinicStats.set(m.clinic_id, entry);
  }
  const rankedClinics = [...clinicStats.values()].sort((a, b) => b.messages - a.messages).slice(0, 5);

  const attentionItems = [
    disconnectedClinics.length > 0 && {
      tone: "danger" as const,
      text: `${disconnectedClinics.length} clinic${disconnectedClinics.length > 1 ? "s" : ""} disconnected from WhatsApp`,
      href: "/agency/clinics",
      cta: "View",
    },
    (failedMessageCount ?? 0) > 0 && {
      tone: "danger" as const,
      text: `${failedMessageCount} message${(failedMessageCount ?? 0) > 1 ? "s" : ""} failed`,
      href: "/agency/conversations",
      cta: "View",
    },
    pendingReviews > 0 && {
      tone: "warning" as const,
      text: `${pendingReviews} prescription${pendingReviews > 1 ? "s" : ""} awaiting review`,
      href: "/agency/prescriptions",
      cta: "View",
    },
    overdueFollowUps > 0 && {
      tone: "warning" as const,
      text: `${overdueFollowUps} follow-up${overdueFollowUps > 1 ? "s" : ""} overdue`,
      href: "/agency/follow-ups",
      cta: "View",
    },
  ].filter(Boolean) as { tone: "danger" | "warning"; text: string; href: string; cta: string }[];

  const activityItems: ActivityItem[] = [
    ...(recentInbound ?? []).map((m) => ({
      key: m.id,
      time: timeAgo(m.created_at),
      text: (
        <>
          <span className="font-medium">
            {(m as unknown as { clinics: { name: string } | null }).clinics?.name ?? "Unknown clinic"}
          </span>{" "}
          — new message from{" "}
          {(m as unknown as { patients: { name: string } | null }).patients?.name ?? "a patient"}
        </>
      ),
      href: `/agency/conversations`,
      sortAt: m.created_at,
    })),
    ...(clinics ?? []).slice(0, 3).map((c) => ({
      key: `clinic-${c.id}`,
      time: timeAgo(c.created_at),
      text: (
        <>
          <span className="font-medium">{c.name}</span> added
        </>
      ),
      href: `/agency/clinics/${c.id}`,
      sortAt: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, Digital Nurse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Clinics" value={totalClinics} icon={Building2} href="/agency/clinics" cta="View Clinics" />
        <KpiCard
          label="Active Clinics"
          value={activeClinics}
          icon={Building2}
          statuses={[
            {
              tone: "success",
              label: `${totalClinics > 0 ? Math.round((activeClinics / totalClinics) * 100) : 0}% of total`,
            },
          ]}
        />
        <KpiCard
          label="Today's Campaigns"
          value={sendRows.length}
          icon={MessageSquare}
          statuses={[
            { tone: "success", label: `${sendRows.reduce((s, r) => s + r.sent, 0)} Sent` },
            { tone: "action", label: `${sendRows.reduce((s, r) => s + r.scheduled, 0)} Scheduled` },
          ]}
        />
        <KpiCard label="Messages Today" value={todaysMessages?.length ?? 0} icon={MessageSquare} href="/agency/conversations" cta="View Messages" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending Reviews" value={pendingReviews} icon={FileText} href="/agency/prescriptions" cta="View" />
        <KpiCard label="Failed Messages" value={failedMessageCount ?? 0} icon={AlertCircle} href="/agency/conversations" cta="View" />
        <KpiCard label="Follow-Ups Due" value={followUpDueTotal} icon={CalendarClock} href="/agency/follow-ups" cta="View" />
        <KpiCard label="Appointment Requests" value={pendingAppointmentCount ?? 0} icon={CalendarPlus} href="/agency/follow-ups" cta="View" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {sendRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No campaigns scheduled today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Clinic</th>
                    <th className="py-2 pr-4 font-medium">Campaign</th>
                    <th className="py-2 pr-4 font-medium">Scheduled</th>
                    <th className="py-2 pr-4 font-medium">Sent</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sendRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">{row.clinic}</td>
                      <td className="py-2.5 pr-4">{row.type}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{row.scheduled}</td>
                      <td className="py-2.5 pr-4 tabular-nums">{row.sent}</td>
                      <td className="py-2.5">
                        {row.failed > 0 ? (
                          <StatusToneBadge tone="danger">{row.failed} Failed</StatusToneBadge>
                        ) : row.scheduled > 0 ? (
                          <StatusToneBadge tone="action">Scheduled</StatusToneBadge>
                        ) : (
                          <StatusToneBadge tone="success">Completed</StatusToneBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs Your Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {attentionItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nothing needs attention. You&apos;re all caught up ✓
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {attentionItems.map((item) => (
                <li key={item.text} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <StatusToneBadge tone={item.tone}>&nbsp;</StatusToneBadge>
                    <span className="text-sm">{item.text}</span>
                  </div>
                  <Link href={item.href} className="text-sm font-medium text-primary hover:underline">
                    {item.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Campaign Performance"
          data={chartData}
          series={[
            { key: "sent", label: "Sent", tone: "success" },
            { key: "scheduled", label: "Scheduled", tone: "action" },
            { key: "failed", label: "Failed", tone: "danger" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinic Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {rankedClinics.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No message activity yet.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border">
                {rankedClinics.map((c, i) => {
                  const total = c.delivered + c.failed;
                  const rate = total > 0 ? Math.round((c.delivered / total) * 100) : null;
                  return (
                    <li key={c.name} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.messages} messages{rate !== null ? ` · ${rate}% delivered` : ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityList items={activityItems} />
        </CardContent>
      </Card>

      <QuickActions
        actions={[
          { label: "Add Clinic", href: "/agency/clinics/new", icon: Plus, primary: true },
          { label: "View Clinics", href: "/agency/clinics", icon: Building2 },
          { label: "View Messages", href: "/agency/conversations", icon: MessageSquare },
          { label: "View Reminders", href: "/agency/reminders", icon: Bell },
          { label: "View Patients", href: "/agency/patients", icon: Users },
        ]}
      />
    </div>
  );
}
