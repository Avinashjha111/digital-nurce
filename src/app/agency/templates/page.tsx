import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { AgencyTemplatesTable, type AgencyTemplateRow } from "@/components/agency/agency-templates-table";

// One place to see every template across every clinic this agency
// manages -- clicking a clinic name jumps to that clinic's own template
// page (where "Create Template" lives, since a template always belongs
// to exactly one clinic). Without this, finding "whose template is this"
// meant opening each clinic one at a time.
export default async function AgencyTemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("whatsapp_templates")
    // clinics has two OTHER fkeys into whatsapp_templates (reminder/follow-up
    // template assignment), so the embed is ambiguous unless the actual
    // clinic_id relationship is named explicitly.
    .select(
      "id, clinic_id, name, category, language, body_text, status, rejection_reason, clinics!whatsapp_templates_clinic_id_fkey(name)"
    )
    .order("created_at", { ascending: false })
    .returns<AgencyTemplateRow[]>();

  return (
    <div>
      <PageHeader
        title="Templates"
        description="WhatsApp message templates across all clinics."
      />

      {!templates || templates.length === 0 ? (
        <ComingSoon
          icon={MessageSquareText}
          title="No templates yet"
          milestone="Templates appear here once created from a clinic's own Templates page."
        />
      ) : (
        <AgencyTemplatesTable templates={templates} />
      )}
    </div>
  );
}
