-- Prerna Milestone 1: clinic/doctor information schema.
--
-- This is the verified-facts store Prerna reads from -- never invents.
-- No new RLS policies needed on clinics/doctors themselves: these are
-- just more columns on tables that already have the right policies
-- (agency admin manages own clinics/doctors, clinic staff read-only) from
-- migration 0002. Only the new clinic_faqs table needs its own policies.

alter table public.clinics
  add column google_maps_link text,
  add column email text,
  add column opening_days text[],
  add column opening_time time,
  add column closing_time time,
  add column break_start_time time,
  add column break_end_time time,
  add column weekly_off text[],
  add column emergency_instructions text,
  add column appointment_process text,
  add column consultation_fee numeric,
  add column follow_up_fee numeric,
  add column payment_methods text[],
  add column services text[],
  add column departments text[];

alter table public.doctors
  add column specialization text,
  add column experience_years int,
  add column bio text,
  add column consultation_fee numeric,
  add column consultation_days text[],
  add column morning_start time,
  add column morning_end time,
  add column evening_start time,
  add column evening_end time,
  add column services text[];

create table public.clinic_faqs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

alter table public.clinic_faqs enable row level security;

-- Same ownership model as templates/reminder config: the agency curates
-- verified facts, clinic staff can read them (useful for their own
-- reference, and later for Prerna's own lookups run under a service-role
-- context).
create policy "agency admin selects own clinics faqs"
  on public.clinic_faqs for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics faqs"
  on public.clinic_faqs for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin updates own clinics faqs"
  on public.clinic_faqs for update
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin deletes own clinics faqs"
  on public.clinic_faqs for delete
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "clinic staff selects own clinic faqs"
  on public.clinic_faqs for select
  using (clinic_id = public.current_user_clinic_id());
