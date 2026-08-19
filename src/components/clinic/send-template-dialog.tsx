"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { sendTemplateMessage, type SendTemplateState } from "@/lib/actions/send-template";
import { extractPlaceholders } from "@/lib/whatsapp/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { WhatsappTemplate } from "@/lib/types";

const initialState: SendTemplateState = { error: null };

export function SendTemplateDialog({
  patientId,
  templates,
}: {
  patientId: string;
  templates: WhatsappTemplate[];
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const boundAction = sendTemplateMessage.bind(null, patientId, templateId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const placeholders = useMemo(
    () => (selectedTemplate ? extractPlaceholders(selectedTemplate.body_text) : []),
    [selectedTemplate]
  );

  if (templates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No approved templates yet -- create one from the clinic&apos;s Manage
        Templates page.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Send className="h-3.5 w-3.5" />
        Send Template
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Template Message</DialogTitle>
          <DialogDescription>
            Works even if this patient hasn&apos;t messaged recently -- that&apos;s
            what an approved template is for.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm">Message sent.</p>
            <DialogClose render={<Button />}>Done</DialogClose>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger className="w-full">
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
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                {selectedTemplate.body_text}
              </p>
            )}

            {placeholders.map((n) => (
              <div key={n} className="flex flex-col gap-2">
                <Label htmlFor={`param_${n}`}>{`{{${n}}}`} value</Label>
                <Input id={`param_${n}`} name={`param_${n}`} required />
              </div>
            ))}

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Sending..." : "Send"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
