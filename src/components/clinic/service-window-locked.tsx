import Link from "next/link";
import { Lock } from "lucide-react";

export function ServiceWindowLocked({ patientId }: { patientId: string }) {
  return (
    <div className="shrink-0 bg-[#F0F2F5] px-3 py-3 sm:px-4">
      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[#FFF3C4] px-4 py-3 text-center">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#8B6D00]">
          <Lock className="size-3.5" />
          24-hour service window closed
        </div>
        <p className="max-w-md text-[11px] text-[#8B6D00]/80">
          This patient hasn&apos;t messaged in the last 24 hours, so WhatsApp
          only allows an approved template message now, not free text.
          Free-text replies unlock again as soon as they message you.
        </p>
        <Link
          href={`/clinic/patients/${patientId}`}
          className="mt-1 rounded-full bg-[#00A884] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#029273]"
        >
          Send Template
        </Link>
      </div>
    </div>
  );
}
