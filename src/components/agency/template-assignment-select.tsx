"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WhatsappTemplate } from "@/lib/types";

const NONE = "__none__";

export function TemplateAssignmentSelect({
  clinicId,
  templates,
  value,
  helpText,
  action,
}: {
  clinicId: string;
  templates: WhatsappTemplate[];
  value: string | null;
  helpText: string;
  action: (clinicId: string, templateId: string | null) => Promise<{ error: string | null }>;
}) {
  const [selected, setSelected] = useState(value ?? NONE);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (templates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No approved templates yet -- create one from Manage Templates first.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={selected}
        onValueChange={(v) => {
          const next = v ?? NONE;
          setSelected(next);
          setError(null);
          startTransition(async () => {
            const result = await action(clinicId, next === NONE ? null : next);
            if (result.error) setError(result.error);
          });
        }}
      >
        <SelectTrigger className="w-full" disabled={pending}>
          <SelectValue>
            {() =>
              selected === NONE
                ? "No template set"
                : (templates.find((t) => t.id === selected)?.name ?? "Select template")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No template</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{helpText}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
