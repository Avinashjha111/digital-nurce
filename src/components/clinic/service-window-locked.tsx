import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServiceWindowLocked({ patientId }: { patientId: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border-t bg-muted/40 p-4 text-center">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Lock className="h-4 w-4" />
        24-hour service window closed
      </div>
      <p className="max-w-md text-xs text-muted-foreground">
        This patient hasn&apos;t messaged in the last 24 hours, so WhatsApp
        only allows an approved template message now -- not free text.
        Free-text replies unlock again as soon as they message you.
      </p>
      <Button
        size="sm"
        nativeButton={false}
        render={<Link href={`/clinic/patients/${patientId}`} />}
      >
        Send Template
      </Button>
    </div>
  );
}
