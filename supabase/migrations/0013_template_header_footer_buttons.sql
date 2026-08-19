-- Header/Footer/Buttons support for WhatsApp templates, matching what
-- Meta's own template UI offers. Media headers (image/video/document) need
-- a sample uploaded to Meta first via the Resumable Upload API, which
-- needs the Meta App ID -- not previously stored.

alter table public.whatsapp_credentials
  add column meta_app_id text;

alter table public.whatsapp_templates
  add column header_type text not null default 'none'
    check (header_type in ('none', 'text', 'image', 'video', 'document', 'location')),
  add column header_text text,
  add column header_media_path text,
  add column footer_text text,
  add column buttons jsonb not null default '[]'::jsonb;

-- Private bucket for header media samples submitted with a template.
-- Agency-admin only, same as template management itself.
insert into storage.buckets (id, name, public)
values ('template-media', 'template-media', false)
on conflict (id) do nothing;

create policy "agency admin uploads own clinic template media"
  on storage.objects for insert
  with check (
    bucket_id = 'template-media'
    and public.current_user_role() = 'agency_admin'
    and (storage.foldername(name))[1] in (
      select id::text from public.clinics where created_by = auth.uid()
    )
  );

create policy "agency admin reads own clinic template media"
  on storage.objects for select
  using (
    bucket_id = 'template-media'
    and public.current_user_role() = 'agency_admin'
    and (storage.foldername(name))[1] in (
      select id::text from public.clinics where created_by = auth.uid()
    )
  );
