-- Milestone 8: reminder schedule + scheduler + WhatsApp reminder.
--
-- Reminders are generated once, at the moment a prescription is approved
-- (see submitPrescriptionReview), from that prescription's medicines --
-- one row per (medicine, day, timing) combination, using ONLY the
-- explicit `timings` the human confirmed during review. If a medicine has
-- no explicit timings or duration, no reminders are created for it (never
-- guess a schedule).
--
-- A reminder must be sent outside WhatsApp's 24h free-text window (it's a
-- business-initiated message on a schedule, not a reply), so it always
-- goes out as an approved template -- the clinic picks which approved
-- template to use via `clinics.reminder_template_id`.

create type reminder_status as enum (
  'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'skipped'
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medicine_id uuid not null references public.prescription_medicines (id) on delete cascade,
  scheduled_at timestamptz not null,
  status reminder_status not null default 'scheduled',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

-- The scheduler claims due reminders with
-- `where status = 'scheduled' and scheduled_at <= now()`, so this is the
-- index that matters for it.
create index reminders_due_idx on public.reminders (status, scheduled_at);

alter table public.reminders enable row level security;

create policy "clinic staff selects own clinic reminders"
  on public.reminders for select
  using (clinic_id = public.current_user_clinic_id());

-- Inserted by submitPrescriptionReview under the approving clinic staff
-- member's own session (same pattern as prescription_medicines) --
-- everything past this point (claiming + sending) is the service-role
-- scheduler, which bypasses RLS entirely.
create policy "clinic staff inserts own clinic reminders"
  on public.reminders for insert
  with check (clinic_id = public.current_user_clinic_id());

create policy "agency admin selects own clinics reminders"
  on public.reminders for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

-- Which approved template the scheduler sends reminders with. Set by the
-- agency (same ownership model as clinics.whatsapp_status), since the
-- agency already manages template creation/approval/sending.
alter table public.clinics
  add column reminder_template_id uuid references public.whatsapp_templates (id);
