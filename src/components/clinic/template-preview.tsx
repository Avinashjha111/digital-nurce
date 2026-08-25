import type { ReactNode } from "react";
import { Copy, ExternalLink, FileText, Image as ImageIcon, MapPin, Phone, Video } from "lucide-react";
import type { WhatsappTemplateButton } from "@/lib/types";

// WhatsApp only ever supports these three inline styles in a template
// body -- *bold*, _italic_, ~strike~ -- non-nested. Not a real markdown
// parser, just this.
function renderWhatsAppMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const inner = token.slice(1, -1);
    if (token.startsWith("*")) parts.push(<strong key={key++}>{inner}</strong>);
    else if (token.startsWith("_")) parts.push(<em key={key++}>{inner}</em>);
    else parts.push(<s key={key++}>{inner}</s>);
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function substitutePlaceholders(text: string, examples: Record<number, string>) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => examples[Number(n)] || `{{${n}}}`);
}

const BUTTON_ICON: Partial<Record<WhatsappTemplateButton["type"], typeof Phone>> = {
  PHONE_NUMBER: Phone,
  URL: ExternalLink,
  COPY_CODE: Copy,
};

function buttonLabel(button: WhatsappTemplateButton) {
  if (button.type === "COPY_CODE") return "Copy offer code";
  return button.text || "Button";
}

export function TemplatePreview({
  headerType,
  headerText,
  headerExample,
  bodyText,
  bodyExamples,
  footerText,
  buttons,
}: {
  headerType: string;
  headerText: string;
  headerExample: string;
  bodyText: string;
  bodyExamples: Record<number, string>;
  footerText: string;
  buttons: WhatsappTemplateButton[];
}) {
  const displayHeader = headerText ? substitutePlaceholders(headerText, { 1: headerExample }) : "";
  const displayBody = substitutePlaceholders(bodyText, bodyExamples);

  return (
    <div className="rounded-lg bg-[#E5DDD5] p-3">
      <div className="mx-auto flex max-w-[260px] flex-col gap-1 rounded-lg rounded-tl-none bg-white p-2.5 text-[13px] shadow-sm">
        {headerType === "text" && displayHeader && (
          <p className="font-semibold text-[#111B21]">{renderWhatsAppMarkdown(displayHeader)}</p>
        )}

        {(headerType === "image" || headerType === "video" || headerType === "document") && (
          <div className="flex h-20 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {headerType === "image" && <ImageIcon className="size-5" />}
            {headerType === "video" && <Video className="size-5" />}
            {headerType === "document" && <FileText className="size-5" />}
          </div>
        )}

        {headerType === "location" && (
          <div className="flex h-20 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <MapPin className="size-5" />
          </div>
        )}

        <p className="whitespace-pre-wrap text-[#111B21]">
          {displayBody ? (
            renderWhatsAppMarkdown(displayBody)
          ) : (
            <span className="text-muted-foreground">Your message will appear here...</span>
          )}
        </p>

        {footerText && <p className="text-xs text-muted-foreground">{footerText}</p>}

        <span className="self-end text-[10px] text-black/40">12:00 PM</span>
      </div>

      {buttons.length > 0 && (
        <div className="mx-auto mt-px flex max-w-[260px] flex-col overflow-hidden rounded-b-lg bg-white shadow-sm">
          {buttons.map((button, i) => {
            const Icon = BUTTON_ICON[button.type];
            return (
              <div
                key={i}
                className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[13px] text-[#00A5F4]"
              >
                {Icon && <Icon className="size-3.5" />}
                {buttonLabel(button)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
