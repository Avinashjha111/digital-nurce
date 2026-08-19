-- Milestone 5: prescription upload + Supabase Storage.
-- Gemini extraction (Milestone 6) and human review (Milestone 7) add more
-- columns/statuses later; this migration only covers upload + storage.

create type prescription_status as enum (
  'uploaded', 'processing', 'review_required', 'approved', 'rejected', 'failed'
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id),
  file_path text not null,
  file_type text not null,
  status prescription_status not null default 'uploaded',
  uploaded_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

alter table public.prescriptions enable row level security;

create policy "clinic staff selects own clinic prescriptions"
  on public.prescriptions for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic prescriptions"
  on public.prescriptions for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics prescriptions"
  on public.prescriptions for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

-- Storage: a private bucket, one folder per clinic (folder name = clinic_id)
-- so the same ownership model applies to file access.
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

create policy "clinic staff uploads to own clinic prescription folder"
  on storage.objects for insert
  with check (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "clinic staff reads own clinic prescription files"
  on storage.objects for select
  using (
    bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = public.current_user_clinic_id()::text
  );

create policy "agency admin reads own clinics prescription files"
  on storage.objects for select
  using (
    bucket_id = 'prescriptions'
    and public.current_user_role() = 'agency_admin'
    and (storage.foldername(name))[1] in (
      select id::text from public.clinics where created_by = auth.uid()
    )
  );
