-- Migration 0001's "users can update own profile" policy only checked row
-- ownership (auth.uid() = id), not which columns changed. Since Postgres RLS
-- with no explicit WITH CHECK reuses USING for both, any authenticated user
-- (including receptionist/clinic_admin) could call the REST API directly and
-- set their own `role` to 'agency_admin' or point `clinic_id` at any clinic,
-- fully bypassing the app's UI-level restrictions.
--
-- RLS operates at row granularity, not column granularity, so this is fixed
-- with a trigger that rejects role/clinic_id changes on self-service updates
-- (auth.uid() is not null) while still allowing admin/service-role-driven
-- updates (auth.uid() is null in that context) for future milestones, e.g.
-- an agency assigning a clinic_admin to a clinic.

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.role <> old.role or new.clinic_id is distinct from old.clinic_id)
  then
    raise exception 'Changing role or clinic_id is not permitted through a self-service update.';
  end if;
  return new;
end;
$$;

create trigger prevent_self_role_escalation_trigger
  before update on public.users
  for each row execute function public.prevent_self_role_escalation();
