-- Media attachments on messages (images/documents), matching real WhatsApp:
-- staff can send a photo/document from the inbox, and media a patient
-- sends in gets downloaded from Meta and stored the same way.

alter table public.messages
  add column media_url text,
  add column media_type text check (media_type in ('image', 'document', 'video', 'audio')),
  add column media_filename text;

-- Storage bucket for chat media. Public read: our own inbox renders
-- images/document links directly without signed-URL plumbing, and (for
-- outbound sends) Meta's servers must be able to fetch the file over an
-- unauthenticated link to deliver it.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- Objects live under `${clinic_id}/...` -- outbound uploads go through the
-- caller's own session (RLS-scoped by folder); inbound downloads from the
-- webhook use the service-role client, which bypasses these policies.
create policy "clinic staff uploads own clinic chat media"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "public reads chat media"
  on storage.objects for select
  using (bucket_id = 'chat-media');
