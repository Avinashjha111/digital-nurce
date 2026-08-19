# Digital Nurse — Demo MVP

Clinic-focused patient communication and follow-up system. See
[`digital-nurse-demo.md`](./digital-nurse-demo.md) for the full product spec.

Built milestone by milestone — see that spec's "Vibe Coding Rules" section for
the milestone list and completion criteria.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Storage)
- Google Gemini (prescription extraction)
- Meta WhatsApp Cloud API, connected directly per-clinic (Phone Number ID +
  access token entered through the "Connect WhatsApp" UI, not Meta Embedded
  Signup)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Project Settings → API
     (Supabase's newer publishable-key system; the publishable key is safe for the browser)
   - `SUPABASE_SECRET_KEY` — Project Settings → API (server-only; never expose to the browser,
     never prefix with `NEXT_PUBLIC_`, only import it from server-only code)
   - `GEMINI_API_KEY` — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - `WHATSAPP_WEBHOOK_SECRET` — any string you pick; it's the "Verify Token" you
     set when registering the webhook URL in the Meta App dashboard
   - `WHATSAPP_APP_SECRET` — optional in dev; the Meta App's secret, used to
     verify incoming webhook signatures. Skipped (not enforced) if unset.
   - Per-clinic WhatsApp credentials (Phone Number ID, WhatsApp Business Account
     ID, access token) are entered through the app's "Connect WhatsApp" dialog,
     not `.env` — see "WhatsApp connection" below.

4. Apply database migrations: open the Supabase SQL Editor and run each file in
   `supabase/migrations/` in order (or use the Supabase CLI if you have it linked).

5. Create the first agency admin user. In the Supabase Dashboard → Authentication →
   Users → Add user, set email/password, and under "User Metadata" add:

   ```json
   { "role": "agency_admin", "full_name": "Your Name" }
   ```

   The `handle_new_user` trigger (migration `0001_users_and_roles.sql`) copies this
   into `public.users` automatically.

6. Run the dev server:

   ```bash
   npm run dev
   ```

   Sign in at `/login`. Agency admins land on `/agency/dashboard`; clinic users
   land on `/clinic/dashboard`.

## WhatsApp connection

Each clinic connects its own WhatsApp Cloud API test/business number from its
detail page (`/agency/clinics/[id]` → "Connect WhatsApp"): Phone Number ID,
WhatsApp Business Account ID, and access token, all verified against Meta
before saving. The Meta App must be subscribed to that WhatsApp Business
Account (`POST /{waba-id}/subscribed_apps` via
[Graph API Explorer](https://developers.facebook.com/tools/explorer/)) or
inbound webhooks silently never arrive even though the URL verifies fine.

To receive real inbound messages locally, tunnel the dev server (`ngrok http
3000`) and register `https://<tunnel>/api/webhooks/whatsapp` as the webhook
Callback URL in the Meta App dashboard, with `WHATSAPP_WEBHOOK_SECRET` as the
Verify Token, subscribed to the `messages` field.

Outside the 24-hour customer-service window (i.e. the patient hasn't messaged
recently), WhatsApp only allows sending pre-approved **template** messages —
create these from the clinic's "Manage Templates" page once connected.

## Project structure

- `src/app/agency/*` — Agency Dashboard (agency_admin only)
- `src/app/clinic/*` — Clinic web app (clinic_admin / receptionist)
- `src/app/login` — Supabase Auth email/password login
- `src/lib/supabase/` — browser/server/admin Supabase clients + session refresh
- `src/lib/actions/` — server actions
- `supabase/migrations/` — SQL migrations, applied in order
- `scripts/` — server-only Node scripts (never bundled into the app). These use
  `SUPABASE_SECRET_KEY` for admin tasks only:
  - `verify-milestone2-rls.mjs` — creates disposable users, exercises the clinic
    RLS policies as real signed-in sessions (not via the secret key), reports
    pass/fail, and deletes the users/data it created.
  - `create-browser-test-users.mjs` / `delete-browser-test-users.mjs` — spin up
    and tear down throwaway accounts for manual UI testing.

## Multi-tenancy model

Each clinic has a `created_by` owner (the `agency_admin` who created it). RLS
enforces that an agency_admin can only see/edit clinics (and their doctors)
where `created_by = auth.uid()` — this is what "an agency" maps to, since the
schema has no separate `agencies` table. Clinic staff (`clinic_admin` /
`receptionist`) can only read the single clinic referenced by their own
`users.clinic_id`. See `supabase/migrations/0002_clinics.sql` and
`0003_fix_agency_admin_profile_visibility.sql`.
