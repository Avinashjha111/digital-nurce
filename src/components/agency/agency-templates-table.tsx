"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText, Search } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export type AgencyTemplateRow = {
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

export function AgencyTemplatesTable({ templates }: { templates: AgencyTemplateRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || (t.clinics?.name ?? "").toLowerCase().includes(q)
    );
  }, [templates, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by clinic or template name..."
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <ComingSoon
          icon={MessageSquareText}
          title="No matching templates"
          milestone={`No clinic or template name matches "${query}".`}
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
                {filtered.map((template) => (
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
