import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment_link?: {
      entity?: {
        id?: string;
        notes?: { clinic_id?: string; kind?: "plan" | "top_up"; item_id?: string };
      };
    };
  };
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (payload.event !== "payment_link.paid") {
    return NextResponse.json({ received: true });
  }

  const linkEntity = payload.payload?.payment_link?.entity;
  const razorpayPaymentLinkId = linkEntity?.id;
  const notes = linkEntity?.notes;

  if (!razorpayPaymentLinkId || !notes?.clinic_id || !notes?.kind || !notes?.item_id) {
    return NextResponse.json({ received: true }); // nothing we recognize -- ack anyway
  }

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("payment_links")
    .select("id, status, created_by")
    .eq("razorpay_payment_link_id", razorpayPaymentLinkId)
    .maybeSingle();

  // Unknown link, or a retried webhook for one we already processed --
  // Razorpay resends on any non-2xx, so this idempotency check matters.
  if (!link || link.status === "paid") {
    return NextResponse.json({ received: true });
  }

  await admin
    .from("payment_links")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", link.id);

  const clinicId = notes.clinic_id;

  if (notes.kind === "plan") {
    const { data: plan } = await admin
      .from("plans")
      .select("validity_days, included_messages")
      .eq("id", notes.item_id)
      .single();

    if (plan) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.validity_days);

      // Only one 'active' subscription per clinic (DB-enforced) -- retire
      // whatever's there before the new one can be inserted.
      await admin
        .from("clinic_subscriptions")
        .update({ status: "expired" })
        .eq("clinic_id", clinicId)
        .eq("status", "active");

      await admin.from("clinic_subscriptions").insert({
        clinic_id: clinicId,
        plan_id: notes.item_id,
        expiry_date: expiryDate.toISOString(),
        messages_remaining: plan.included_messages,
        status: "active",
        created_by: link.created_by,
      });
    }
  } else if (notes.kind === "top_up") {
    const { data: pack } = await admin
      .from("top_up_packs")
      .select("messages")
      .eq("id", notes.item_id)
      .single();

    if (pack) {
      const { data: activeSub } = await admin
        .from("clinic_subscriptions")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .maybeSingle();

      await admin.from("top_up_purchases").insert({
        clinic_id: clinicId,
        pack_id: notes.item_id,
        messages_added: pack.messages,
        linked_subscription_id: activeSub?.id ?? null,
        created_by: link.created_by,
      });

      if (activeSub) {
        await admin.rpc("add_clinic_messages", {
          p_clinic_id: clinicId,
          p_amount: pack.messages,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
