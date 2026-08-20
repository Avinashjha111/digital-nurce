import { notFound } from "next/navigation";
import Link from "next/link";
import { Bell, Building2, MessageCircle, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectWhatsAppDialog } from "@/components/clinic/connect-whatsapp-dialog";
import { ReminderTemplateSelect } from "@/components/agency/reminder-template-select";
import type { Clinic, Doctor, WhatsappTemplate } from "@/lib/types";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single<Clinic>();

  if (!clinic) notFound();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("*")
    .eq("clinic_id", id)
    .returns<Doctor[]>();

  const connected = clinic.whatsapp_status === "connected";

  const { data: approvedTemplates } = connected
    ? await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("clinic_id", id)
        .eq("status", "approved")
        .returns<WhatsappTemplate[]>()
    : { data: [] };

  return (
    <div>
      <PageHeader title={clinic.name} description="Clinic details." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Clinic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Doctor" value={doctors?.[0]?.name ?? "—"} />
            <Row label="Phone" value={clinic.phone ?? "—"} />
            <Row label="Address" value={clinic.address ?? "—"} />
            <Row label="City" value={clinic.city ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row
              label="Status"
              value={
                <Badge variant={connected ? "default" : "secondary"}>
                  {connected ? "Connected" : "Not Connected"}
                </Badge>
              }
            />
            <Row label="WhatsApp number" value={clinic.whatsapp_number ?? "—"} />
            <Row label="Provider status" value={connected ? "Active" : "—"} />
            <Row
              label="Last connection check"
              value={
                clinic.whatsapp_last_checked_at
                  ? new Date(clinic.whatsapp_last_checked_at).toLocaleString()
                  : "—"
              }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <ConnectWhatsAppDialog clinicId={clinic.id} />
              {connected && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/agency/clinics/${clinic.id}/templates`} />}
                >
                  <MessageSquareText className="h-4 w-4" />
                  Manage Templates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {connected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Reminder Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReminderTemplateSelect
                clinicId={clinic.id}
                templates={approvedTemplates ?? []}
                value={clinic.reminder_template_id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
