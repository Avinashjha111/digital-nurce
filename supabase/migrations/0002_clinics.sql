-- Milestone 2: clinics + doctors, owned by the agency_admin who created them.

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  city text,
  whatsapp_number text,
  whatsapp_status text not null default 'not_connected'
    check (whatsapp_status in ('not_connected', 'connected')),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Now that clinics exists, wire up the FK left dangling in migration 0001.
alter table public.users
  add constraint users_clinic_id_fkey
  foreign key (clinic_id) references public.clinics (id);

alter table public.clinics enable row level security;
alter table public.doctors enable row level security;

-- Agency admins manage only the clinics they created ("their agency").
create policy "agency admin selects own clinics"
  on public.clinics for select
  using (
    public.current_user_role() = 'agency_admin'
    and created_by = auth.uid()
  );

create policy "agency admin inserts own clinics"
  on public.clinics for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and created_by = auth.uid()
  );

create policy "agency admin updates own clinics"
  on public.clinics for update
  using (
    public.current_user_role() = 'agency_admin'
    and created_by = auth.uid()
  )
  with check (
    public.current_user_role() = 'agency_admin'
    and created_by = auth.uid()
  );

create policy "agency admin deletes own clinics"
  on public.clinics for delete
  using (
    public.current_user_role() = 'agency_admin'
    and created_by = auth.uid()
  );

-- Clinic staff can read (only) the single clinic they belong to.
create policy "clinic staff selects own clinic"
  on public.clinics for select
  using (id = public.current_user_clinic_id());

-- Doctors follow the same ownership as their parent clinic.
create policy "agency admin selects own clinic doctors"
  on public.doctors for select
  using (
    exists (
      select 1 from public.clinics c
      where c.id = doctors.clinic_id
        and public.current_user_role() = 'agency_admin'
        and c.created_by = auth.uid()
    )
  );

create policy "agency admin inserts own clinic doctors"
  on public.doctors for insert
  with check (
    exists (
      select 1 from public.clinics c
      where c.id = doctors.clinic_id
        and public.current_user_role() = 'agency_admin'
        and c.created_by = auth.uid()
    )
  );

create policy "agency admin updates own clinic doctors"
  on public.doctors for update
  using (
    exists (
      select 1 from public.clinics c
      where c.id = doctors.clinic_id
        and public.current_user_role() = 'agency_admin'
        and c.created_by = auth.uid()
    )
  );

create policy "agency admin deletes own clinic doctors"
  on public.doctors for delete
  using (
    exists (
      select 1 from public.clinics c
      where c.id = doctors.clinic_id
        and public.current_user_role() = 'agency_admin'
        and c.created_by = auth.uid()
    )
  );

create policy "clinic staff selects own clinic doctors"
  on public.doctors for select
  using (clinic_id = public.current_user_clinic_id());
