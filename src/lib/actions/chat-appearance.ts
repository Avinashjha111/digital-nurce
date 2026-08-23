"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { ChatTheme } from "@/lib/types";

const VALID_THEMES: ChatTheme[] = ["default", "teal", "sky", "sand", "mint"];

async function requireClinicId() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;
  return profile.clinic_id;
}

export async function updateChatTheme(theme: ChatTheme) {
  if (!VALID_THEMES.includes(theme)) return { error: "Invalid theme." };

  const clinicId = await requireClinicId();
  if (!clinicId) return { error: "Not signed in to a clinic." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_chat_appearance")
    .upsert(
      { clinic_id: clinicId, theme, wallpaper_url: null, updated_at: new Date().toISOString() },
      { onConflict: "clinic_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/clinic/inbox", "layout");
  return { error: null };
}

export async function saveChatWallpaper(wallpaperUrl: string) {
  const clinicId = await requireClinicId();
  if (!clinicId) return { error: "Not signed in to a clinic." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_chat_appearance")
    .upsert(
      { clinic_id: clinicId, wallpaper_url: wallpaperUrl, updated_at: new Date().toISOString() },
      { onConflict: "clinic_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/clinic/inbox", "layout");
  return { error: null };
}

export async function removeChatWallpaper() {
  const clinicId = await requireClinicId();
  if (!clinicId) return { error: "Not signed in to a clinic." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clinic_chat_appearance")
    .upsert(
      { clinic_id: clinicId, wallpaper_url: null, updated_at: new Date().toISOString() },
      { onConflict: "clinic_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/clinic/inbox", "layout");
  return { error: null };
}
