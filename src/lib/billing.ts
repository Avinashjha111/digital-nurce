import { createAdminClient } from "@/lib/supabase/admin";

// pricing.md Section 4: Marketing-category templates cost ~7.5x more at
// the Meta layer than utility/service messages, so they weight the pool
// instead of counting 1:1 like everything else (inbound, AI replies,
// utility templates, manual staff replies).
const MARKETING_TEMPLATE_UNITS = 4;
const STANDARD_UNITS = 1;

export type MessageUnitKind = "standard" | "marketing_template";

/**
 * Decrements the clinic's active-subscription message balance. A no-op if
 * the clinic has no active subscription (nothing to decrement) -- this is
 * pure metering, not enforcement; it never blocks or throws.
 */
export async function deductMessageUnits(clinicId: string, kind: MessageUnitKind = "standard") {
  const units = kind === "marketing_template" ? MARKETING_TEMPLATE_UNITS : STANDARD_UNITS;
  const admin = createAdminClient();
  await admin.rpc("deduct_clinic_messages", { p_clinic_id: clinicId, p_units: units });
}

export type ClinicMessagingStatus =
  | { canSend: true; messagesRemaining: number; expiryDate: string }
  | { canSend: false; reason: "no_plan" }
  | { canSend: false; reason: "expired"; expiryDate: string }
  | { canSend: false; reason: "zero_balance"; expiryDate: string };

export const BLOCKED_REASON_MESSAGE: Record<
  Exclude<ClinicMessagingStatus, { canSend: true }>["reason"],
  string
> = {
  no_plan: "This clinic doesn't have an active WhatsApp plan yet. Contact your agency to get started.",
  expired: "Your WhatsApp plan has expired. Contact your agency to renew.",
  zero_balance: "You've used all your included WhatsApp messages. Contact your agency for a top-up.",
};

/**
 * The single source of truth for "can this clinic send/receive right now,
 * and why not if not" -- checked before every outbound send (Step 3
 * enforcement) and read by the dashboard/inbox banners (same function, so
 * the UI can never say something different from what actually gets
 * enforced). Always the service-role client: this is a system fact, not a
 * user-permission-gated read, and expiring a subscription is a write
 * clinic staff don't have RLS access to.
 */
export async function getClinicMessagingStatus(clinicId: string): Promise<ClinicMessagingStatus> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("clinic_subscriptions")
    .select("id, expiry_date, messages_remaining")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) return { canSend: false, reason: "no_plan" };

  // Lazily flip to 'expired' the moment anyone checks past the expiry
  // date, rather than depending on a separate cron to notice -- the date
  // itself is always the source of truth, the status column just caches it.
  if (new Date(subscription.expiry_date).getTime() < Date.now()) {
    await admin
      .from("clinic_subscriptions")
      .update({ status: "expired" })
      .eq("id", subscription.id);
    return { canSend: false, reason: "expired", expiryDate: subscription.expiry_date };
  }

  if (subscription.messages_remaining <= 0) {
    return { canSend: false, reason: "zero_balance", expiryDate: subscription.expiry_date };
  }

  return {
    canSend: true,
    messagesRemaining: subscription.messages_remaining,
    expiryDate: subscription.expiry_date,
  };
}
