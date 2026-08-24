import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
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

// pricing.md Section 1: "Blended planning cost per message: ₹0.75 (used
// for all margin calculations below)" -- flat rate across every message,
// inbound or outbound, regardless of type. A conservative planning number,
// not a live invoice -- re-check against the actual Twilio bill and
// update this constant once real numbers come in (Section 7).
const COST_PER_MESSAGE = 0.75;

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default async function AgencyBillingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "agency_admin") redirect("/agency/dashboard");

  const supabase = await createClient();

  const { data: clinics } = await supabase.from("clinics").select("id, name");

  const [{ data: messages }, { data: subscriptions }, { data: topUps }] = await Promise.all([
    supabase.from("messages").select("clinic_id"),
    supabase.from("clinic_subscriptions").select("clinic_id, plans(price)"),
    supabase.from("top_up_purchases").select("clinic_id, top_up_packs(price)"),
  ]);

  const messageCountByClinic = new Map<string, number>();
  for (const m of messages ?? []) {
    messageCountByClinic.set(m.clinic_id, (messageCountByClinic.get(m.clinic_id) ?? 0) + 1);
  }

  const revenueByClinic = new Map<string, number>();
  for (const s of subscriptions ?? []) {
    const price = (s as unknown as { plans: { price: number } | null }).plans?.price ?? 0;
    revenueByClinic.set(s.clinic_id, (revenueByClinic.get(s.clinic_id) ?? 0) + price);
  }
  for (const t of topUps ?? []) {
    const price = (t as unknown as { top_up_packs: { price: number } | null }).top_up_packs?.price ?? 0;
    revenueByClinic.set(t.clinic_id, (revenueByClinic.get(t.clinic_id) ?? 0) + price);
  }

  const rows = (clinics ?? [])
    .map((clinic) => {
      const messageCount = messageCountByClinic.get(clinic.id) ?? 0;
      const cost = messageCount * COST_PER_MESSAGE;
      const revenue = revenueByClinic.get(clinic.id) ?? 0;
      const margin = revenue - cost;
      const marginPct = revenue > 0 ? (margin / revenue) * 100 : null;
      return { clinic, messageCount, cost, revenue, margin, marginPct };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totals = rows.reduce(
    (acc, r) => ({
      messageCount: acc.messageCount + r.messageCount,
      cost: acc.cost + r.cost,
      revenue: acc.revenue + r.revenue,
      margin: acc.margin + r.margin,
    }),
    { messageCount: 0, cost: 0, revenue: 0, margin: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Billing & Margins"
        description={`Internal only -- real message cost vs revenue per clinic, at ₹${COST_PER_MESSAGE.toFixed(2)}/message planning cost.`}
      />

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clinic</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Est. cost</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No clinics yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.clinic.id}>
                    <TableCell className="font-medium">{r.clinic.name}</TableCell>
                    <TableCell className="text-right">{r.messageCount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${r.margin < 0 ? "text-destructive" : "text-status-success"}`}
                    >
                      {formatCurrency(r.margin)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${r.marginPct !== null && r.marginPct < 0 ? "text-destructive" : ""}`}
                    >
                      {r.marginPct === null ? "—" : `${r.marginPct.toFixed(0)}%`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableBody className="border-t font-medium">
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {totals.messageCount.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.revenue)}</TableCell>
                  <TableCell
                    className={`text-right ${totals.margin < 0 ? "text-destructive" : "text-status-success"}`}
                  >
                    {formatCurrency(totals.margin)}
                  </TableCell>
                  <TableCell className="text-right">
                    {totals.revenue > 0 ? `${((totals.margin / totals.revenue) * 100).toFixed(0)}%` : "—"}
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
