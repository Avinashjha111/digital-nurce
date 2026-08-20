import { notFound } from "next/navigation";
import { User, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendTemplateDialog } from "@/components/agency/send-template-dialog";
import type { Conversation, Patient, WhatsappTemplate } from "@/lib/types";

type PatientRow = Patient & { clinics: { name: string } | null };

export default async function AgencyPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*, clinics(name)")
    .eq("id", id)
    .single<PatientRow>();

  if (!patient) notFound();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("patient_id", id)
    .maybeSingle<Conversation>();

  const { data: approvedTemplates } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("clinic_id", patient.clinic_id)
    .eq("status", "approved")
    .returns<WhatsappTemplate[]>();

  return (
    <div>
      <PageHeader
        title={patient.name}
        description={`Patient at ${patient.clinics?.name ?? "an unknown clinic"}.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Clinic" value={patient.clinics?.name ?? "—"} />
            <Row label="WhatsApp number" value={`+${patient.whatsapp_number}`} />
            <Row
              label="Registered"
              value={new Date(patient.created_at).toLocaleDateString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Send Template
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {conversation
                ? "This patient has an existing conversation -- check the Conversations list for status."
                : "No WhatsApp messages with this patient yet. A template can start the conversation."}
            </p>
            <SendTemplateDialog patientId={id} templates={approvedTemplates ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
