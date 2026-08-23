"use client";

import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatAppearanceForm } from "@/components/clinic/chat-appearance-form";
import type { ChatTheme } from "@/lib/types";

export function ChatAppearanceDialog({
  clinicId,
  theme,
  wallpaperUrl,
}: {
  clinicId: string;
  theme: ChatTheme;
  wallpaperUrl: string | null;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className="flex shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
        aria-label="Chat appearance settings"
        title="Chat appearance"
      >
        <Settings className="size-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Appearance</DialogTitle>
        </DialogHeader>
        <ChatAppearanceForm clinicId={clinicId} theme={theme} wallpaperUrl={wallpaperUrl} />
      </DialogContent>
    </Dialog>
  );
}
