"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Bold, CheckCircle2, Italic, Plus, Strikethrough, Trash2, Variable } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTemplate, type CreateTemplateState } from "@/lib/actions/templates";
import { extractPlaceholders, hasLeadingOrTrailingVariable } from "@/lib/whatsapp/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplatePreview } from "@/components/clinic/template-preview";
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
import type { WhatsappTemplateButton } from "@/lib/types";

const initialState: CreateTemplateState = { error: null };

const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

const HEADER_TYPES = [
  { value: "none", label: "None" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "location", label: "Location" },
];

const MEDIA_ACCEPT: Record<string, string> = {
  image: "image/jpeg,image/png",
  video: "video/mp4,video/3gpp",
  document: "application/pdf",
};

const BUTTON_TYPES = [
  { value: "QUICK_REPLY", label: "Quick Reply" },
  { value: "URL", label: "Visit Website" },
  { value: "PHONE_NUMBER", label: "Call Phone Number" },
  { value: "COPY_CODE", label: "Copy Offer Code" },
];

function emptyButton(type: WhatsappTemplateButton["type"]): WhatsappTemplateButton {
  switch (type) {
    case "QUICK_REPLY":
      return { type, text: "" };
    case "URL":
      return { type, text: "", url: "" };
    case "PHONE_NUMBER":
      return { type, text: "", phoneNumber: "" };
    case "COPY_CODE":
      return { type, example: "" };
  }
}

export function CreateTemplateDialog({ clinicId }: { clinicId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [category, setCategory] = useState("utility");
  const [language, setLanguage] = useState("en_US");

  const [headerType, setHeaderType] = useState("none");
  const [headerText, setHeaderText] = useState("");
  const [headerExample, setHeaderExample] = useState("");
  const [headerMediaPath, setHeaderMediaPath] = useState("");
  const [headerUploadState, setHeaderUploadState] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [headerUploadError, setHeaderUploadError] = useState<string | null>(null);

  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<WhatsappTemplateButton[]>([]);
  const [bodyExamples, setBodyExamples] = useState<Record<number, string>>({});

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const boundAction = createTemplate.bind(null, clinicId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const bodyPlaceholders = useMemo(() => extractPlaceholders(bodyText), [bodyText]);
  const headerPlaceholders = useMemo(() => extractPlaceholders(headerText), [headerText]);
  const bodyHasBadVariablePlacement = useMemo(
    () => hasLeadingOrTrailingVariable(bodyText),
    [bodyText]
  );
  const headerHasBadVariablePlacement = useMemo(
    () => hasLeadingOrTrailingVariable(headerText),
    [headerText]
  );

  // Wraps the selected text in the body textarea with a marker (or drops
  // the marker pair at the cursor if nothing's selected) -- WhatsApp's own
  // inline styles: *bold*, _italic_, ~strike~.
  function wrapBodySelection(marker: string) {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyText.slice(start, end);
    const next = bodyText.slice(0, start) + marker + selected + marker + bodyText.slice(end);
    setBodyText(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selected ? end + marker.length * 2 : start + marker.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function insertVariable() {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const existing = extractPlaceholders(bodyText);
    const nextNum = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const token = `{{${nextNum}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = bodyText.slice(0, start) + token + bodyText.slice(end);
    setBodyText(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleHeaderFileChange(file: File | null) {
    setHeaderMediaPath("");
    setHeaderUploadError(null);
    if (!file) return;

    setHeaderUploadState("uploading");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("template-media")
        .upload(path, file, { contentType: file.type });

      if (error) {
        setHeaderUploadState("error");
        setHeaderUploadError(error.message);
        return;
      }
      setHeaderMediaPath(path);
      setHeaderUploadState("done");
    } catch {
      setHeaderUploadState("error");
      setHeaderUploadError("Upload failed.");
    }
  }

  function updateButton(index: number, next: WhatsappTemplateButton) {
    setButtons((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeButton(index: number) {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Create Template</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Template</DialogTitle>
          <DialogDescription>
            Submitted to Meta for approval (usually minutes to a day). Use{" "}
            {"{{1}}"}, {"{{2}}"} etc. for variables filled in at send time.
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
          <form
            action={formAction}
            className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_260px] lg:items-start"
          >
            <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Template name</Label>
              <Input
                id="name"
                name="name"
                placeholder="medicine_reminder"
                pattern="[a-z0-9_]+"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    <SelectValue>{() => category}</SelectValue>
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
                    <SelectValue>
                      {() => LANGUAGES.find((l) => l.value === language)?.label ?? language}
                    </SelectValue>
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

            {/* Header */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <Label>Header (optional)</Label>
              <Select value={headerType} onValueChange={(v) => setHeaderType(v ?? "none")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => HEADER_TYPES.find((h) => h.value === headerType)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {HEADER_TYPES.map((h) => (
                    <SelectItem key={h.value} value={h.value}>
                      {h.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="header_type" value={headerType} />

              {headerType === "text" && (
                <>
                  <Input
                    name="header_text"
                    placeholder="Add a short line of text (max 60 chars)"
                    maxLength={60}
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />
                  {headerHasBadVariablePlacement && (
                    <p className="text-xs text-destructive">
                      Meta will reject this: a variable can&apos;t be right at
                      the start or end (punctuation alone after it doesn&apos;t
                      count as text). Add a real word after/before it.
                    </p>
                  )}
                  {headerPlaceholders.length > 0 && (
                    <Input
                      name="header_example"
                      placeholder="Example value for the header's {{1}}"
                      value={headerExample}
                      onChange={(e) => setHeaderExample(e.target.value)}
                      required
                    />
                  )}
                </>
              )}

              {(headerType === "image" || headerType === "video" || headerType === "document") && (
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="file"
                    accept={MEDIA_ACCEPT[headerType]}
                    onChange={(e) => handleHeaderFileChange(e.target.files?.[0] ?? null)}
                  />
                  {headerUploadState === "uploading" && (
                    <p className="text-xs text-muted-foreground">Uploading sample...</p>
                  )}
                  {headerUploadState === "done" && (
                    <p className="text-xs text-primary">Sample uploaded.</p>
                  )}
                  {headerUploadState === "error" && (
                    <p className="text-xs text-destructive">{headerUploadError}</p>
                  )}
                  <input type="hidden" name="header_media_path" value={headerMediaPath} />
                  <p className="text-xs text-muted-foreground">
                    Needs a Meta App ID saved on this clinic&apos;s WhatsApp connection.
                  </p>
                </div>
              )}

              {headerType === "location" && (
                <p className="text-xs text-muted-foreground">
                  The patient&apos;s conversation will show a location pin; no sample needed.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body_text">Body text</Label>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => wrapBodySelection("*")}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Bold className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Italic"
                    onClick={() => wrapBodySelection("_")}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Italic className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Strikethrough"
                    onClick={() => wrapBodySelection("~")}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Strikethrough className="size-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-border" />
                  <button
                    type="button"
                    title="Insert variable"
                    onClick={insertVariable}
                    className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Variable className="size-3.5" />
                    Variable
                  </button>
                </div>
              </div>
              <Textarea
                ref={bodyTextareaRef}
                id="body_text"
                name="body_text"
                rows={4}
                placeholder="Hi {{1}}, this is a reminder to take your {{2}}."
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                required
              />
              {bodyHasBadVariablePlacement && (
                <p className="text-xs text-destructive">
                  Meta will reject this: a variable can&apos;t be right at the
                  start or end (punctuation alone after it doesn&apos;t count
                  as text). Add a real word after/before it.
                </p>
              )}
            </div>

            {bodyPlaceholders.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Example values (required by Meta for review)</Label>
                {bodyPlaceholders.map((n) => (
                  <Input
                    key={n}
                    name={`example_${n}`}
                    placeholder={`Example for {{${n}}}`}
                    value={bodyExamples[n] ?? ""}
                    onChange={(e) =>
                      setBodyExamples((prev) => ({ ...prev, [n]: e.target.value }))
                    }
                    required
                  />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="footer_text">Footer (optional)</Label>
              <Input
                id="footer_text"
                name="footer_text"
                placeholder="Add a short line of text (max 60 chars)"
                maxLength={60}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label>Buttons (optional, up to 10)</Label>
                {buttons.length < 10 && (
                  <Select
                    value=""
                    onValueChange={(v) => {
                      if (v) setButtons((prev) => [...prev, emptyButton(v as WhatsappTemplateButton["type"])]);
                    }}
                  >
                    <SelectTrigger size="sm">
                      <span className="flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Add button
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_TYPES.map((bt) => (
                        <SelectItem key={bt.value} value={bt.value}>
                          {bt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {buttons.map((button, index) => (
                <div key={index} className="flex flex-col gap-1.5 rounded-md bg-muted/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {BUTTON_TYPES.find((bt) => bt.value === button.type)?.label}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeButton(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {button.type === "COPY_CODE" ? (
                    <Input
                      placeholder="Sample offer code, e.g. SAVE20"
                      value={button.example}
                      onChange={(e) => updateButton(index, { ...button, example: e.target.value })}
                    />
                  ) : (
                    <Input
                      placeholder="Button label"
                      maxLength={25}
                      value={button.text}
                      onChange={(e) => updateButton(index, { ...button, text: e.target.value })}
                    />
                  )}

                  {button.type === "URL" && (
                    <Input
                      placeholder="https://example.com"
                      value={button.url}
                      onChange={(e) => updateButton(index, { ...button, url: e.target.value })}
                    />
                  )}
                  {button.type === "PHONE_NUMBER" && (
                    <Input
                      placeholder="+91XXXXXXXXXX"
                      value={button.phoneNumber}
                      onChange={(e) =>
                        updateButton(index, { ...button, phoneNumber: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
              <input type="hidden" name="buttons_json" value={JSON.stringify(buttons)} />
            </div>

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <Button
              type="submit"
              disabled={
                pending ||
                headerUploadState === "uploading" ||
                bodyHasBadVariablePlacement ||
                headerHasBadVariablePlacement
              }
              className="w-fit"
            >
              {pending ? "Submitting..." : "Submit to Meta"}
            </Button>
            </div>

            <div className="lg:sticky lg:top-0">
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Preview</p>
              <TemplatePreview
                headerType={headerType}
                headerText={headerText}
                headerExample={headerExample}
                bodyText={bodyText}
                bodyExamples={bodyExamples}
                footerText={footerText}
                buttons={buttons}
              />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
