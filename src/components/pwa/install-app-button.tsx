"use client";

import { useState, type ComponentProps } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/components/pwa/install-prompt-context";

// Reused by the header button, the mobile nav sheet, and (later) any
// Settings entry: triggers the real browser install prompt where one's
// available (Chrome/Android/Edge), otherwise shows manual "Add to Home
// Screen" steps (iOS Safari, or any browser without automatic prompting).
export function InstallAppButton({
  variant = "outline",
  className,
}: {
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const { isStandalone, canPromptInstall, isIOS, promptInstall } = useInstallPrompt();
  const [showManual, setShowManual] = useState(false);

  if (isStandalone) return null;

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        className={className}
        onClick={() => (canPromptInstall ? promptInstall() : setShowManual(true))}
      >
        <Download className="size-4" />
        Install App
      </Button>

      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Digital Nurse</DialogTitle>
            <DialogDescription>
              {isIOS
                ? "Add Digital Nurse to your home screen for quick, app-like access."
                : "Add Digital Nurse to your home screen from your browser menu."}
            </DialogDescription>
          </DialogHeader>
          {isIOS ? (
            <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>1. Tap the Share icon in Safari&apos;s toolbar.</li>
              <li>2. Scroll down and tap &quot;Add to Home Screen&quot;.</li>
              <li>3. Tap &quot;Add&quot; to confirm.</li>
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              Open your browser menu and choose &quot;Add to Home Screen&quot; or
              &quot;Install App&quot;.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
