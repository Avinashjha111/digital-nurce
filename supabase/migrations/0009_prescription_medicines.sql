-- Milestone 6: Gemini extraction output storage.
-- prescriptions gains extracted (not-yet-approved) fields; prescription_medicines
-- holds the extracted medicine list. Human review/approval (Milestone 7)
-- edits these same rows rather than creating a parallel "approved" copy --
-- prescriptions.status is what gates whether reminders (Milestone 8) may be
-- created from this data.

alter table public.prescriptions
  add column extracted_patient_name text,
  add column patient_name_needs_review boolean not null default false,
  add column follow_up_required boolean,
  add column follow_up_days_after int,
  add column follow_up_instruction text,
  add column follow_up_needs_review boolean not null default false,
  add column extraction_error text;

create table public.prescription_medicines (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  dosage text,
  frequency text,
  duration_days int,
  timings text[],
  instruction text,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.prescription_medicines enable row level security;

create policy "clinic staff selects own clinic prescription medicines"
  on public.prescription_medicines for select
  using (clinic_id = public.current_user_clinic_id());

-- Inserted only by the server-only extraction pipeline (service-role) and
-- edited only during human review (Milestone 7) -- for now, no insert/update
-- policy for regular sessions; the pipeline runs with the uploader's own
-- session for everything except the Gemini call itself, so writes here go
-- through the server action using that same session once review lands.
create policy "clinic staff updates own clinic prescription medicines"
  on public.prescription_medicines for update
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic prescription medicines"
  on public.prescription_medicines for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics prescription medicines"
  on public.prescription_medicines for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );
