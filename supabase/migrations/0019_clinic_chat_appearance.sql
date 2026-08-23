-- Per-clinic WhatsApp-style chat appearance: a preset color theme, or a
-- custom wallpaper photo (like real WhatsApp's own chat wallpaper picker).
-- One row per clinic, shared by every staff member who opens the inbox.

create table public.clinic_chat_appearance (
  clinic_id uuid primary key references public.clinics (id) on delete cascade,
  theme text not null default 'default'
    check (theme in ('default', 'teal', 'sky', 'sand', 'mint')),
  wallpaper_url text,
  updated_at timestamptz not null default now()
);

alter table public.clinic_chat_appearance enable row level security;

-- Same convention as conversations/messages/patients: any clinic staff
-- member (clinic_admin or receptionist) of the clinic can read and write,
-- scoped purely by clinic_id -- no role check.
create policy "clinic staff selects own clinic chat appearance"
  on public.clinic_chat_appearance for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic chat appearance"
  on public.clinic_chat_appearance for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "clinic staff updates own clinic chat appearance"
  on public.clinic_chat_appearance for update
  using (clinic_id = public.current_user_clinic_id())
  with check (clinic_id = public.current_user_clinic_id());

-- Agency admins: read-only, across the clinics they own (matches the
-- read-only pattern already used for patients/conversations/messages).
create policy "agency admin selects own clinics chat appearance"
  on public.clinic_chat_appearance for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

-- Storage bucket for wallpaper photos. Public read (it's just a decorative
-- background image, not patient data) so it can be used directly as a CSS
-- background-image URL without signed-URL plumbing.
insert into storage.buckets (id, name, public)
values ('chat-wallpapers', 'chat-wallpapers', true)
on conflict (id) do nothing;

-- Objects are stored under `${clinic_id}/...`; the folder segment is what
-- scopes read/write access per clinic.
create policy "clinic staff uploads own clinic wallpaper"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-wallpapers'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "clinic staff updates own clinic wallpaper"
  on storage.objects for update
  using (
    bucket_id = 'chat-wallpapers'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "clinic staff deletes own clinic wallpaper"
  on storage.objects for delete
  using (
    bucket_id = 'chat-wallpapers'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "public reads chat wallpapers"
  on storage.objects for select
  using (bucket_id = 'chat-wallpapers');
