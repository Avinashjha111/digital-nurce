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
