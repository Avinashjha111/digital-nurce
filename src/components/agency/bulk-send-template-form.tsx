"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Search, Send, XCircle } from "lucide-react";
import { sendBulkTemplateMessages, type BulkSendResult } from "@/lib/actions/bulk-send-template";
import { extractPlaceholders } from "@/lib/whatsapp/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComingSoon } from "@/components/coming-soon";
import type { WhatsappTemplate } from "@/lib/types";

type PatientOption = { id: string; name: string; whatsapp_number: string };

export function BulkSendTemplateForm({
  clinicId,
  templates,
  patients,
}: {
  clinicId: string;
  templates: WhatsappTemplate[];
  patients: PatientOption[];
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [useNameForFirst, setUseNameForFirst] = useState(true);
  const [bodyValues, setBodyValues] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BulkSendResult | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const bodyPlaceholders = useMemo(
    () => (selectedTemplate ? extractPlaceholders(selectedTemplate.body_text) : []),
    [selectedTemplate]
  );
  const filteredPatients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(q));
  }, [patients, query]);

  const allFilteredSelected =
    filteredPatients.length > 0 && filteredPatients.every((p) => selected.has(p.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filteredPatients) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  function missingValue() {
    return bodyPlaceholders.some((n) => {
      if (n === 1 && useNameForFirst) return false;
      return !bodyValues[n]?.trim();
    });
  }

  async function handleSend() {
    setPending(true);
    try {
      const outcome = await sendBulkTemplateMessages(
        clinicId,
        templateId,
        [...selected],
        useNameForFirst,
        bodyValues
      );
      setResult(outcome);
      setConfirming(false);
      if (!outcome.error) router.refresh();
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setSelected(new Set());
    setResult(null);
    setConfirming(false);
    setBodyValues({});
    setUseNameForFirst(true);
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approved templates yet -- create and get one approved from this clinic&apos;s Manage
        Templates page first.
      </p>
    );
  }

  if (patients.length === 0) {
    return (
      <ComingSoon
        icon={Send}
        title="No patients yet"
        milestone="Add patients to this clinic before sending a bulk message."
      />
    );
  }

  if (result) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-status-success" />
            <p className="font-medium">
              Sent to {result.sent} patient{result.sent === 1 ? "" : "s"}.
            </p>
          </div>
          {result.failed.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-destructive">
                <XCircle className="size-4" />
                {result.failed.length} failed
              </p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {result.failed.map((f) => (
                  <li key={f.patientId}>
                    {f.patientName}: {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button type="button" variant="outline" className="w-fit" onClick={reset}>
            Send another
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (confirming) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm">
            Send <span className="font-medium">{selectedTemplate?.name}</span> to{" "}
            <span className="font-medium">{selected.size}</span> patient
            {selected.size === 1 ? "" : "s"}? This uses{" "}
            {selectedTemplate?.category === "marketing" ? selected.size * 4 : selected.size}{" "}
            message credit{selected.size === 1 && selectedTemplate?.category !== "marketing" ? "" : "s"}
            {" "}from this clinic&apos;s balance.
          </p>
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            This can&apos;t be undone -- messages go out on WhatsApp immediately.
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={handleSend}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                `Confirm & Send`
              )}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue>
                  {() => templates.find((t) => t.id === templateId)?.name ?? "Select template"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <p className="max-w-lg rounded-md bg-muted p-2 text-xs whitespace-pre-line text-muted-foreground">
              {selectedTemplate.body_text}
            </p>
          )}

          {bodyPlaceholders.map((n) =>
            n === 1 ? (
              <div key={n} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="use-name"
                    checked={useNameForFirst}
                    onCheckedChange={(c) => setUseNameForFirst(c === true)}
                  />
                  <Label htmlFor="use-name" className="font-normal">
                    Auto-fill {`{{1}}`} with each patient&apos;s name
                  </Label>
                </div>
                {!useNameForFirst && (
                  <Input
                    className="max-w-sm"
                    placeholder={`{{1}} value (same for everyone)`}
                    value={bodyValues[1] ?? ""}
                    onChange={(e) => setBodyValues((v) => ({ ...v, 1: e.target.value }))}
                  />
                )}
              </div>
            ) : (
              <div key={n} className="flex max-w-sm flex-col gap-2">
                <Label htmlFor={`param_${n}`}>{`{{${n}}}`} value (same for everyone)</Label>
                <Input
                  id={`param_${n}`}
                  value={bodyValues[n] ?? ""}
                  onChange={(e) => setBodyValues((v) => ({ ...v, [n]: e.target.value }))}
                />
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients..."
                className="pl-8"
              />
            </div>
            <p className="text-sm text-muted-foreground">{selected.size} selected</p>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={(c) => toggleAllFiltered(c === true)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>WhatsApp number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={(c) => toggleOne(p.id, c === true)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>+{p.whatsapp_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Button
        type="button"
        className="w-fit"
        disabled={selected.size === 0 || missingValue()}
        onClick={() => setConfirming(true)}
      >
        <Send className="size-4" />
        Review &amp; Send to {selected.size} patient{selected.size === 1 ? "" : "s"}
      </Button>
    </div>
  );
}
