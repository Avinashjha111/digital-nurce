"use client";

import { useActionState, useMemo, useState } from "react";
import { createTemplate, type CreateTemplateState } from "@/lib/actions/templates";
import { extractPlaceholders } from "@/lib/whatsapp/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CheckCircle2 } from "lucide-react";

const initialState: CreateTemplateState = { error: null };

const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

export function CreateTemplateDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [category, setCategory] = useState("utility");
  const [language, setLanguage] = useState("en_US");
  const boundAction = createTemplate.bind(null, clinicId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const placeholders = useMemo(() => extractPlaceholders(bodyText), [bodyText]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Create Template</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Template</DialogTitle>
          <DialogDescription>
            Submitted to Meta for approval (usually minutes to a day). Use{" "}
            {"{{1}}"}, {"{{2}}"} etc. in the body for variables filled in at
            send time.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
            <p className="text-sm">
              Template submitted to Meta. Check back for approval status.
            </p>
            <DialogClose render={<Button />}>Done</DialogClose>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Template name</Label>
              <Input
                id="name"
                name="name"
                placeholder="medicine_reminder"
                pattern="[a-z0-9_]+"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, underscores only.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v ?? "utility")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="authentication">Authentication</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="category" value={category} />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v ?? "en_US")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="language" value={language} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="body_text">Body text</Label>
              <Textarea
                id="body_text"
                name="body_text"
                rows={4}
                placeholder="Hi {{1}}, this is a reminder to take your {{2}}."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                required
              />
            </div>

            {placeholders.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Example values (required by Meta for review)</Label>
                {placeholders.map((n) => (
                  <Input
                    key={n}
                    name={`example_${n}`}
                    placeholder={`Example for {{${n}}}`}
                    required
                  />
                ))}
              </div>
            )}

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Submitting..." : "Submit to Meta"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
