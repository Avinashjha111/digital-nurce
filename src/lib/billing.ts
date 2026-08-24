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

export type ClinicUsageSummary = {
  hasActivePlan: boolean;
  planName: string | null;
  messagesRemaining: number;
  includedMessages: number;
  expiryDate: string | null;
  cycleStart: string | null;
  breakdown: {
    receivedFromPatients: number;
    textRepliesSent: number;
    mediaSent: number;
    remindersSent: number;
    followUpsSent: number;
  };
};

/**
 * Balance + "where did it go" breakdown for a clinic's current plan cycle
 * (since the active subscription's start_date). Used by both the sidebar
 * balance chip and the full Message Usage report page, clinic and agency
 * side alike, so the two never disagree.
 */
export async function getClinicUsageSummary(clinicId: string): Promise<ClinicUsageSummary> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("clinic_subscriptions")
    .select("start_date, expiry_date, messages_remaining, plans(name, included_messages)")
    .eq("clinic_id", clinicId)
    .eq("status", "active")
    .maybeSingle();

  const empty: ClinicUsageSummary = {
    hasActivePlan: false,
    planName: null,
    messagesRemaining: 0,
    includedMessages: 0,
    expiryDate: null,
    cycleStart: null,
    breakdown: {
      receivedFromPatients: 0,
      textRepliesSent: 0,
      mediaSent: 0,
      remindersSent: 0,
      followUpsSent: 0,
    },
  };

  if (!subscription) return empty;

  const plan = (
    subscription as unknown as { plans: { name: string; included_messages: number } | null }
  ).plans;
  const cycleStart = subscription.start_date;

  const [
    { count: receivedFromPatients },
    { count: textRepliesSent },
    { count: mediaSent },
    { count: remindersSent },
    { count: followUpsSent },
  ] = await Promise.all([
    admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("direction", "inbound")
      .gte("created_at", cycleStart),
    admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("direction", "outbound")
      .is("media_type", null)
      .gte("created_at", cycleStart),
    admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("direction", "outbound")
      .not("media_type", "is", null)
      .gte("created_at", cycleStart),
    admin
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .in("status", ["sent", "delivered"])
      .gte("scheduled_at", cycleStart),
    admin
      .from("follow_ups")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .not("message_sent_at", "is", null)
      .gte("message_sent_at", cycleStart),
  ]);

  return {
    hasActivePlan: true,
    planName: plan?.name ?? null,
    messagesRemaining: subscription.messages_remaining,
    includedMessages: plan?.included_messages ?? 0,
    expiryDate: subscription.expiry_date,
    cycleStart,
    breakdown: {
      receivedFromPatients: receivedFromPatients ?? 0,
      textRepliesSent: textRepliesSent ?? 0,
      mediaSent: mediaSent ?? 0,
      remindersSent: remindersSent ?? 0,
      followUpsSent: followUpsSent ?? 0,
    },
  };
}
