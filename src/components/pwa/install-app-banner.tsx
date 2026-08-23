"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/components/pwa/install-prompt-context";

// The small, non-intrusive install card from the spec -- only on phones,
// only when not already installed, and never shown again once dismissed
// (dashboard.md's dismissal rule).
export function InstallAppBanner() {
  const { isMobile, isStandalone, isIOS, canPromptInstall, dismissed, promptInstall, dismissBanner } =
    useInstallPrompt();
  const [showManual, setShowManual] = useState(false);

  if (!isMobile || isStandalone || dismissed) return null;
  // Nothing actionable to offer: not iOS (manual steps) and no native
  // prompt captured yet -- stay quiet rather than show a dead-end card.
  if (!isIOS && !canPromptInstall) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Smartphone className="size-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Digital Nurse</p>
          <p className="text-xs text-muted-foreground">
            Add Digital Nurse to your phone for quick access.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => (canPromptInstall ? promptInstall() : setShowManual(true))}
        >
          <Download className="size-3.5" />
          Install
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Dismiss"
          onClick={dismissBanner}
        >
          <X className="size-4" />
        </Button>
      </div>

      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Digital Nurse</DialogTitle>
            <DialogDescription>
              Add Digital Nurse to your home screen for quick, app-like access.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>1. Tap the Share icon in Safari&apos;s toolbar.</li>
            <li>2. Scroll down and tap &quot;Add to Home Screen&quot;.</li>
            <li>3. Tap &quot;Add&quot; to confirm.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
