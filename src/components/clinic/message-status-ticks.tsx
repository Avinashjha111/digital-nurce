import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import type { MessageStatus } from "@/lib/types";

// WhatsApp's own iconography for outbound message state -- clock while
// still sending, one grey check once accepted, two grey checks once
// delivered to the device, two blue checks once actually read.
export function MessageStatusTicks({ status }: { status: MessageStatus }) {
  if (status === "failed") {
    return <AlertCircle className="size-3.5 text-red-600" aria-label="Failed" />;
  }
  if (status === "queued") {
    return <Clock className="size-3 text-black/40" aria-label="Sending" />;
  }
  if (status === "sent") {
    return <Check className="size-3.5 text-black/40" aria-label="Sent" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="size-3.5 text-black/40" aria-label="Delivered" />;
  }
  return <CheckCheck className="size-3.5 text-[#53BDEB]" aria-label="Read" />;
}
