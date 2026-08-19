-- Milestone 1: users/roles foundation for Supabase Auth.
-- clinic_id has no FK yet: the clinics table is created in migration 0002.

create type user_role as enum ('agency_admin', 'clinic_admin', 'receptionist');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'clinic_admin',
  clinic_id uuid,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Every authenticated user can read/update their own profile row.
create policy "users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Helper used by later RLS policies (clinics, patients, etc.) to check role
-- without recursive lookups against public.users from within its own policies.
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_user_clinic_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select clinic_id from public.users where id = auth.uid();
$$;

-- agency_admin can view every profile (needed for the Agency Dashboard).
create policy "agency admin can view all profiles"
  on public.users for select
  using (public.current_user_role() = 'agency_admin');

-- Auto-create a public.users row whenever a new auth.users row is created.
-- role/full_name/clinic_id can be passed via signUp options.data metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, clinic_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'clinic_admin'),
    nullif(new.raw_user_meta_data ->> 'clinic_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
