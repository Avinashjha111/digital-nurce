-- Sending a WhatsApp template to a patient is moving from clinic staff to
-- the agency: the agency manages template creation/approval already
-- (migration 0011), and now sends them too, so clinic staff no longer need
-- write access here -- only read access to stay visible in their inbox.
--
-- Mirrors the clinic-staff insert policies from migrations 0007/0012, but
-- scoped to clinics the agency admin owns (same ownership model used
-- throughout: clinics.created_by = auth.uid()).

create policy "agency admin inserts own clinics conversations"
  on public.conversations for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin inserts own clinics messages"
  on public.messages for insert
  with check (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );

create policy "agency admin updates own clinics conversations"
  on public.conversations for update
  using (
    public.current_user_role() = 'agency_admin'
    and clinic_id in (select id from public.clinics where created_by = auth.uid())
  );
