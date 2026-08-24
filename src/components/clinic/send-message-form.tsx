"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Send, Plus, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, sendMediaMessage } from "@/lib/actions/messages";
import type { MediaType } from "@/lib/types";

const MAX_IMAGE_MB = 5;
const MAX_DOCUMENT_MB = 100;
const ACCEPTED = "image/jpeg,image/png,image/webp,application/pdf,.doc,.docx";

function mediaTypeForFile(file: File): MediaType {
  return file.type.startsWith("image/") ? "image" : "document";
}

export function SendMessageForm({
  conversationId,
  clinicId,
}: {
  conversationId: string;
  clinicId: string;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    const type = mediaTypeForFile(file);
    const maxMb = type === "image" ? MAX_IMAGE_MB : MAX_DOCUMENT_MB;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`File must be under ${maxMb}MB.`);
      return;
    }

    setPendingFile(file);
    setPreviewUrl(type === "image" ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;

    if (!pendingFile && !caption.trim()) return;

    setPending(true);
    setError(null);

    try {
      if (pendingFile) {
        const supabase = createClient();
        const type = mediaTypeForFile(pendingFile);
        const ext = pendingFile.name.split(".").pop();
        const path = `${clinicId}/outbound/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-media")
          .upload(path, pendingFile, { contentType: pendingFile.type });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { data } = supabase.storage.from("chat-media").getPublicUrl(path);

        const result = await sendMediaMessage(conversationId, {
          mediaUrl: data.publicUrl,
          mediaType: type,
          filename: pendingFile.name,
          caption: caption.trim(),
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        clearFile();
        setCaption("");
      } else {
        const formData = new FormData();
        formData.set("body", caption.trim());
        const result = await sendMessage(conversationId, { error: null }, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setCaption("");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shrink-0 bg-[#F0F2F5] px-2 py-2 sm:px-4">
      {error && <p className="mb-1 px-2 text-xs text-destructive">{error}</p>}

      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: object URL, not a remote/optimizable asset
            <img src={previewUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
          ) : (
            <FileText className="size-8 shrink-0 text-muted-foreground" />
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-[#111B21]">
            {pendingFile.name}
          </span>
          <button
            type="button"
            onClick={clearFile}
            aria-label="Remove attachment"
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach media"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#54656F] transition-colors hover:bg-black/5 disabled:opacity-60"
        >
          <Plus className="size-5" />
        </button>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={pendingFile ? "Add a caption..." : "Type a message"}
          autoComplete="off"
          disabled={pending}
          className="h-10 flex-1 rounded-full border-none bg-white px-4 text-sm text-[#111B21] shadow-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || (!pendingFile && !caption.trim())}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white transition-colors hover:bg-[#029273] disabled:opacity-60"
        >
          <Send className="size-4.5" />
        </button>
      </form>
    </div>
  );
}
