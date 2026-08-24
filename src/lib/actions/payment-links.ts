"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createRazorpayPaymentLink } from "@/lib/razorpay";

export type CreatePaymentLinkResult = { error: string | null; shortUrl?: string };

async function createLink(
  clinicId: string,
  kind: "plan" | "top_up",
  itemId: string
): Promise<CreatePaymentLinkResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "agency_admin") {
    return { error: "Only the managing agency can send payment links." };
  }

  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("id", clinicId)
    .single();
  if (!clinic) return { error: "Clinic not found." };

  const table = kind === "plan" ? "plans" : "top_up_packs";
  const { data: item } = await supabase
    .from(table)
    .select("id, name, price")
    .eq("id", itemId)
    .single();
  if (!item) return { error: "Plan or pack not found." };

  const result = await createRazorpayPaymentLink({
    amountRupees: item.price,
    description: `${item.name} -- ${clinic.name} (Digital Nurse)`,
    notes: {
      clinic_id: clinicId,
      kind,
      item_id: itemId,
    },
  });

  if (!result.ok) return { error: result.error };

  const { error: insertErr } = await supabase.from("payment_links").insert({
    clinic_id: clinicId,
    kind,
    plan_id: kind === "plan" ? itemId : null,
    top_up_pack_id: kind === "top_up" ? itemId : null,
    razorpay_payment_link_id: result.id,
    short_url: result.shortUrl,
    amount: item.price,
    created_by: profile.id,
  });

  if (insertErr) return { error: insertErr.message };

  revalidatePath(`/agency/clinics/${clinicId}`);

  return { error: null, shortUrl: result.shortUrl };
}

export async function createPlanPaymentLink(clinicId: string, planId: string) {
  return createLink(clinicId, "plan", planId);
}

export async function createTopUpPaymentLink(clinicId: string, packId: string) {
  return createLink(clinicId, "top_up", packId);
}
