import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { MessageLogTable, type MessageLogRow } from "@/components/agency/message-log-table";
import type { Clinic } from "@/lib/types";

type MessageQueryRow = {
  id: string;
  body: string;
  media_type: MessageLogRow["mediaType"];
  source: MessageLogRow["source"];
  status: MessageLogRow["status"];
  created_at: string;
  patients: { name: string } | null;
};

// The per-clinic delivery report an agency can hand to their client:
// every message in or out, who it was to/from, what kind (a patient's own
// message, a manual staff reply, an agency template, an automated
// reminder or follow-up), and its delivery status. Reachable from the
// Message Usage table.
export default async function ClinicMessageLogPage({
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

  const { data: messages } = await supabase
    .from("messages")
    .select("id, body, media_type, source, status, created_at, patients(name)")
    .eq("clinic_id", id)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<MessageQueryRow[]>();

  const rows: MessageLogRow[] = (messages ?? []).map((m) => ({
    id: m.id,
    patientName: m.patients?.name ?? "Unknown",
    body: m.body,
    mediaType: m.media_type,
    source: m.source,
    status: m.status,
    createdAt: m.created_at,
  }));

  return (
    <div>
      <PageHeader
        title="Message Log"
        description={`Every WhatsApp message for ${clinic.name} -- download as a report to share with the client.`}
      />
      <MessageLogTable clinicName={clinic.name} rows={rows} />
    </div>
  );
}
