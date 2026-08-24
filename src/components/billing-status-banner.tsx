import { CircleAlert } from "lucide-react";
import { BLOCKED_REASON_MESSAGE, type ClinicMessagingStatus } from "@/lib/billing";

const TITLE: Record<Exclude<ClinicMessagingStatus, { canSend: true }>["reason"], string> = {
  no_plan: "No active WhatsApp plan",
  expired: "Your WhatsApp plan has expired",
  zero_balance: "You're out of WhatsApp messages",
};

/** Dashboard-level version of the inbox's billing-blocked banner -- same
 * underlying status, shown wherever staff land first so it's impossible
 * to miss. */
export function BillingStatusBanner({
  status,
}: {
  status: Extract<ClinicMessagingStatus, { canSend: false }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
      <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
      <div>
        <p className="text-sm font-medium text-red-800">{TITLE[status.reason]}</p>
        <p className="mt-0.5 text-xs text-red-700">{BLOCKED_REASON_MESSAGE[status.reason]}</p>
      </div>
    </div>
  );
}
