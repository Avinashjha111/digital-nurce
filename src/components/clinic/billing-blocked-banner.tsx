import { CircleAlert } from "lucide-react";
import { BLOCKED_REASON_MESSAGE, type ClinicMessagingStatus } from "@/lib/billing";

export function BillingBlockedBanner({
  status,
}: {
  status: Extract<ClinicMessagingStatus, { canSend: false }>;
}) {
  return (
    <div className="shrink-0 bg-[#F0F2F5] px-3 py-3 sm:px-4">
      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-red-50 px-4 py-3 text-center">
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <CircleAlert className="size-3.5" />
          {status.reason === "no_plan" && "No active WhatsApp plan"}
          {status.reason === "expired" && "WhatsApp plan expired"}
          {status.reason === "zero_balance" && "Out of WhatsApp messages"}
        </div>
        <p className="max-w-md text-[11px] text-red-700/80">
          {BLOCKED_REASON_MESSAGE[status.reason]}
        </p>
      </div>
    </div>
  );
}
