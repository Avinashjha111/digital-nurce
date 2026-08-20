-- Milestone 9: follow-up prototype + basic appointment request.
--
-- A follow-up is created once, at the moment a prescription is approved
-- with follow_up_required = true and an explicit follow_up_days_after
-- (see submitPrescriptionReview) -- never guessed, only from what a human
-- confirmed during review. One follow-up per prescription.
--
-- Like reminders, "when due, send a message" means a business-initiated
-- send outside the 24h window, so it always goes out as an approved
-- template -- `clinics.follow_up_template_id`.

create type follow_up_status as enum (
  'upcoming', 'due', 'contacted', 'appointment_requested', 'completed', 'overdue', 'cancelled'
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  follow_up_date date not null,
  status follow_up_status not null default 'upcoming',
  message_sent_at timestamptz,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  unique (prescription_id)
);

-- The scheduler claims due follow-ups with
-- `where status = 'upcoming' and follow_up_date <= current_date`.
create index follow_ups_due_idx on public.follow_ups (status, follow_up_date);

alter table public.follow_ups enable row level security;

create policy "clinic staff selects own clinic follow_ups"
  on public.follow_ups for select
  using (clinic_id = public.current_user_clinic_id());

-- Inserted by submitPrescriptionReview; updated by clinic staff actions
-- (book appointment, mark completed) -- both under the caller's own
-- session, same pattern as reminders/prescriptions.
create policy "clinic staff inserts own clinic follow_ups"
  on public.follow_ups for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "clinic staff updates own clinic follow_ups"
  on public.follow_ups for update
  using (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics follow_ups"
  on public.follow_ups for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

-- Basic appointment request: only enough to prove the follow-up journey
-- (preferred date + a time slot clinic staff picks with the patient),
-- not a real scheduling/availability system.
create table public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  follow_up_id uuid not null references public.follow_ups (id) on delete cascade,
  preferred_date date not null,
  preferred_time text not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.appointment_requests enable row level security;

create policy "clinic staff selects own clinic appointment_requests"
  on public.appointment_requests for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic appointment_requests"
  on public.appointment_requests for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics appointment_requests"
  on public.appointment_requests for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

-- Which approved template the scheduler sends the follow-up nudge with.
alter table public.clinics
  add column follow_up_template_id uuid references public.whatsapp_templates (id);
