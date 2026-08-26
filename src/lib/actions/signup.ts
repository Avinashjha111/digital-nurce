"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { sendBrevoEmail } from "@/lib/brevo";

const ADMIN_NOTIFY_EMAIL = "vyaparwallah111@gmail.com";

export type SignUpState = { error: string | null };

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Your name is required"),
  clinicName: z.string().trim().min(1, "Clinic name is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .transform(normalizePhone)
    .refine((v) => v.length >= 10, "Enter a valid phone number with country code"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Public self-signup: no session exists yet, so the clinic row is created
// with the service-role client. The clinic must exist BEFORE the auth user
// so `clinic_id` can be set in signUp's metadata and picked up immediately
// by the handle_new_user trigger -- if signUp then fails, the clinic row is
// rolled back so a flood of bad attempts can't leave orphaned rows behind.
export async function signUpClinic(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const masterAgencyId = process.env.MASTER_AGENCY_ID;
  if (!masterAgencyId) {
    return { error: "Sign-up is not configured yet. Please try again later." };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    clinicName: formData.get("clinicName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fullName, clinicName, phone, email, password } = parsed.data;

  const admin = createAdminClient();

  // Two separate .eq() lookups rather than building an .or() filter string
  // out of user input -- avoids any risk of the raw value breaking
  // PostgREST's filter syntax.
  const [{ data: byPhone }, { data: byEmail }] = await Promise.all([
    admin
      .from("clinics")
      .select("id")
      .eq("phone", phone)
      .in("activation_status", ["pending_activation", "active"])
      .maybeSingle(),
    admin
      .from("clinics")
      .select("id")
      .eq("email", email)
      .in("activation_status", ["pending_activation", "active"])
      .maybeSingle(),
  ]);
  if (byPhone || byEmail) {
    return { error: "An account with this phone or email already exists." };
  }

  const { data: clinic, error: clinicError } = await admin
    .from("clinics")
    .insert({
      name: clinicName,
      phone,
      email,
      created_by: masterAgencyId,
      activation_status: "pending_activation",
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    return { error: clinicError?.message ?? "Failed to create your clinic." };
  }

  const supabase = await createClient();
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "clinic_admin", full_name: fullName, clinic_id: clinic.id },
    },
  });

  if (signUpError) {
    // Roll back the orphaned clinic row -- this account never got created.
    await admin.from("clinics").delete().eq("id", clinic.id);
    return {
      error: signUpError.message.toLowerCase().includes("already registered")
        ? "An account with this email already exists."
        : "Could not create your account. Please try again.",
    };
  }

  const notifyResult = await sendBrevoEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New clinic signed up: ${clinicName}`,
    html: `
      <p>A new clinic just signed up on Digital Nurse.</p>
      <ul>
        <li><strong>Clinic:</strong> ${clinicName}</li>
        <li><strong>Contact person:</strong> ${fullName}</li>
        <li><strong>Phone:</strong> +${phone}</li>
        <li><strong>Email:</strong> ${email}</li>
      </ul>
      <p>It's pending activation until they complete payment.</p>
    `,
  });
  if (!notifyResult.ok) {
    console.error("Failed to send admin signup notification:", notifyResult.error);
  }

  redirect(`/signup/verify?email=${encodeURIComponent(email)}`);
}

export type VerifySignupOtpState = { error: string | null };

export async function verifySignupOtp(
  _prevState: VerifySignupOtpState,
  formData: FormData
): Promise<VerifySignupOtpState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !token) {
    return { error: "Enter the code from your email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });

  if (error) {
    return { error: "Invalid or expired code." };
  }

  // Verifying does sign them in -- but the requested flow is verify, then
  // land on the normal login page (which itself now requires a second OTP
  // step), not skip straight into the dashboard.
  await supabase.auth.signOut();
  redirect("/login?verified=1");
}

export async function resendSignupOtp(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: "Could not resend the code. Please try again shortly." };
  return { error: null };
}
