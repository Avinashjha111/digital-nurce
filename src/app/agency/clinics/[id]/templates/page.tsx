import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateStatusBadge } from "@/components/template-status-badge";
import { CreateTemplateDialog } from "@/components/clinic/create-template-dialog";
import { RefreshTemplateStatusButton } from "@/components/clinic/refresh-template-status-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Clinic, WhatsappTemplate } from "@/lib/types";

export default async function ClinicTemplatesPage({
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

  const { data: templates } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("clinic_id", id)
    .order("created_at", { ascending: false })
    .returns<WhatsappTemplate[]>();

  return (
    <div>
      <PageHeader
        title="WhatsApp Templates"
        description={`Pre-approved message templates for ${clinic.name}.`}
        action={<CreateTemplateDialog clinicId={id} />}
      />

      {!templates || templates.length === 0 ? (
        <ComingSoon
          icon={MessageSquareText}
          title="No templates yet"
          milestone='Click "Create Template" to submit one for Meta approval. Needed to message patients outside the 24-hour reply window (reminders, follow-ups).'
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="font-medium">{template.name}</TableCell>
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
