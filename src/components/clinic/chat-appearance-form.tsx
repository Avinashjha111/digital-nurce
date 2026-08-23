"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Image as ImageIcon, Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  removeChatWallpaper,
  saveChatWallpaper,
  updateChatTheme,
} from "@/lib/actions/chat-appearance";
import { CHAT_THEME_PRESETS } from "@/lib/chat-theme";
import { cn } from "@/lib/utils";
import type { ChatTheme } from "@/lib/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_MB = 8;

export function ChatAppearanceForm({
  clinicId,
  theme,
  wallpaperUrl,
}: {
  clinicId: string;
  theme: ChatTheme;
  wallpaperUrl: string | null;
}) {
  const [activeTheme, setActiveTheme] = useState(theme);
  const [activeWallpaper, setActiveWallpaper] = useState(wallpaperUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickTheme(next: ChatTheme) {
    setError(null);
    setActiveTheme(next);
    setActiveWallpaper(null);
    startTransition(async () => {
      const result = await updateChatTheme(next);
      if (result.error) setError(result.error);
    });
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG or WEBP photos are supported.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Photo must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${clinicId}/wallpaper-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-wallpapers")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("chat-wallpapers").getPublicUrl(path);
      setActiveWallpaper(data.publicUrl);

      const result = await saveChatWallpaper(data.publicUrl);
      if (result.error) setError(result.error);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveWallpaper() {
    setError(null);
    setActiveWallpaper(null);
    startTransition(async () => {
      const result = await removeChatWallpaper();
      if (result.error) setError(result.error);
    });
  }

  const previewStyle = activeWallpaper
    ? {
        backgroundImage: `linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(${activeWallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: CHAT_THEME_PRESETS.find((t) => t.id === activeTheme)?.bg };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium">Preview</p>
        <div
          className="flex h-32 flex-col justify-end gap-1.5 rounded-lg border p-3"
          style={previewStyle}
        >
          <div className="max-w-[70%] self-start rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 text-xs shadow-sm">
            Hi, how are you feeling today?
          </div>
          <div className="max-w-[70%] self-end rounded-lg rounded-tr-none bg-[#D9FDD3] px-2.5 py-1.5 text-xs shadow-sm">
            Much better, thank you doctor!
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Theme</p>
        <div className="flex flex-wrap gap-3">
          {CHAT_THEME_PRESETS.map((preset) => {
            const selected = !activeWallpaper && activeTheme === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={pending}
                onClick={() => pickTheme(preset.id)}
                className="flex flex-col items-center gap-1.5 disabled:opacity-50"
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2",
                    selected ? "border-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: preset.bg }}
                >
                  {selected && <Check className="size-4 text-foreground/70" />}
                </span>
                <span className="text-xs text-muted-foreground">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Or use your own photo</p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImageIcon className="size-3.5" />
            )}
            {uploading ? "Uploading..." : "Upload photo"}
          </button>
          {activeWallpaper && (
            <button
              type="button"
              disabled={pending}
              onClick={handleRemoveWallpaper}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <X className="size-3.5" />
              Remove photo
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          JPG, PNG or WEBP, up to {MAX_SIZE_MB}MB. Applies to every staff member&apos;s inbox at this clinic.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
