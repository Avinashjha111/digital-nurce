-- Milestone 3: patients, scoped to a single clinic.
-- Kept intentionally minimal (not an EMR): name + WhatsApp number only.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  whatsapp_number text not null,
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;

-- Clinic staff (clinic_admin / receptionist) manage patients of their own clinic.
create policy "clinic staff selects own clinic patients"
  on public.patients for select
  using (clinic_id = public.current_user_clinic_id());

create policy "clinic staff inserts own clinic patients"
  on public.patients for insert
  with check (clinic_id = public.current_user_clinic_id());

-- Agency admins can view (read-only) patients across the clinics they own.
create policy "agency admin selects own clinics patients"
  on public.patients for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (
      select id from public.clinics where created_by = auth.uid()
    )
  );
