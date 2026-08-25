import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateStatusBadge } from "@/components/template-status-badge";
import { RefreshTemplateStatusButton } from "@/components/clinic/refresh-template-status-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WhatsappTemplateCategory, WhatsappTemplateStatus } from "@/lib/types";

type TemplateRow = {
  id: string;
  clinic_id: string;
  name: string;
  category: WhatsappTemplateCategory;
  language: string;
  body_text: string;
  status: WhatsappTemplateStatus;
  rejection_reason: string | null;
  clinics: { name: string } | null;
};

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
    .returns<TemplateRow[]>();

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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/agency/clinics/${template.clinic_id}/templates`}
                        className="text-primary hover:underline"
                      >
                        {template.clinics?.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell className="capitalize">{template.category}</TableCell>
                    <TableCell>{template.language}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {template.body_text}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <TemplateStatusBadge status={template.status} />
                        {template.status === "rejected" && template.rejection_reason && (
                          <span className="text-xs text-muted-foreground">
                            {template.rejection_reason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RefreshTemplateStatusButton templateId={template.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
