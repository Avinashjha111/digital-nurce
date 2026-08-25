-- Lets the agency's message log say WHAT kind of message each row is
-- (a patient's own message in, a manual staff reply, an agency template
-- send, an automated reminder, or an automated follow-up nudge) instead
-- of just "outbound"/"inbound" -- needed to build a per-clinic delivery
-- report an agency can hand to their client.

create type public.message_source as enum ('inbound', 'manual', 'template', 'reminder', 'follow_up');

alter table public.messages add column source public.message_source;

-- Backfill existing rows with a reasonable best guess (can't know for
-- certain which outbound rows were manual vs template retroactively).
update public.messages
set source = (case when direction = 'inbound' then 'inbound' else 'manual' end)::public.message_source
where source is null;

alter table public.messages alter column source set not null;
alter table public.messages alter column source set default 'manual';
