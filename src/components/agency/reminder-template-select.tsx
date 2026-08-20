"use client";

import { useState, useTransition } from "react";
import { setReminderTemplate } from "@/lib/actions/whatsapp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WhatsappTemplate } from "@/lib/types";

const NONE = "__none__";

export function ReminderTemplateSelect({
  clinicId,
  templates,
  value,
}: {
  clinicId: string;
  templates: WhatsappTemplate[];
  value: string | null;
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
            const result = await setReminderTemplate(
              clinicId,
              next === NONE ? null : next
            );
            if (result.error) setError(result.error);
          });
        }}
      >
        <SelectTrigger className="w-full" disabled={pending}>
          <SelectValue>
            {() =>
              selected === NONE
                ? "No reminder template set"
                : (templates.find((t) => t.id === selected)?.name ?? "Select template")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No reminder template</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Medicine reminders are sent using this template. It must have
        exactly two body variables: patient name, then medicine.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
