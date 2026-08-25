import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { BulkSendTemplateForm } from "@/components/agency/bulk-send-template-form";
import type { Clinic, WhatsappTemplate } from "@/lib/types";

export default async function BulkSendTemplatePage({
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

  const [{ data: templates }, { data: patients }] = await Promise.all([
    supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("clinic_id", id)
      .eq("status", "approved")
      .order("name")
      .returns<WhatsappTemplate[]>(),
    supabase
      .from("patients")
      .select("id, name, whatsapp_number")
      .eq("clinic_id", id)
      .order("name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Bulk Send Template"
        description={`Send an approved WhatsApp template to many of ${clinic.name}'s patients at once.`}
      />
      <BulkSendTemplateForm
        clinicId={id}
        templates={templates ?? []}
        patients={patients ?? []}
      />
    </div>
  );
}
