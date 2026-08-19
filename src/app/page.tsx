import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  redirect(profile.role === "agency_admin" ? "/agency/dashboard" : "/clinic/dashboard");
}
