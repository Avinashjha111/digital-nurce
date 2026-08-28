"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function dashboardPathForRole(role: string) {
  return role === "agency_admin" ? "/agency/dashboard" : "/clinic/dashboard";
}

export type LoginStep1State = { error: string | null; needsOtp?: boolean; email?: string };

// Step 1 of login: validates the password, but does NOT leave the user
// signed in -- it immediately signs back out and sends a fresh OTP, so a
// correct password alone is never enough to reach a dashboard. This is the
// same generic-error-message approach used by verifyLoginOtp below, kept
// here too: an unknown email and a wrong password return the identical
// message so this can't be used to enumerate registered accounts.
export async function loginStep1(
  _prevState: LoginStep1State,
  formData: FormData
): Promise<LoginStep1State> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  await supabase.auth.signOut();

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    return { error: "Could not send the login code. Please try again." };
  }

  return { error: null, needsOtp: true, email };
}

export type VerifyLoginOtpState = { error: string | null };

// Step 2: the OTP is what actually creates the session -- a correct
// password from step 1 gets you here, nothing more.
export async function verifyLoginOtp(
  _prevState: VerifyLoginOtpState,
  formData: FormData
): Promise<VerifyLoginOtpState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !token) {
    return { error: "Enter the code from your email." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error || !data.user) {
    return { error: "Invalid or expired code." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "Your profile could not be loaded. Please try again." };
  }

  // Force session establishment by calling getUser after verifyOtp
  // This ensures cookies are set before redirect
  await supabase.auth.getUser();

  redirect(dashboardPathForRole(profile.role));
}
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

