-- Fixes a cross-tenant leak from migration 0001: "agency admin can view all
-- profiles" let ANY agency_admin read every other agency_admin's profile
-- row (email, full_name), because the policy only checked the caller's own
-- role and not which clinic/agency the target row belongs to.
--
-- Replace it with a policy scoped to staff of clinics this agency_admin
-- actually owns, matching the same ownership model used for clinics/doctors.

drop policy "agency admin can view all profiles" on public.users;

create policy "agency admin views own clinic staff profiles"
  on public.users for select
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (
      select id from public.clinics where created_by = auth.uid()
    )
  );
