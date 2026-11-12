# Sarthak Clinic

A mobile-first Next.js app for a local clinic. The public page shows doctor and
availability details; the private doctor area manages appointments, patients,
visits, and a transaction-based ledger.

## What is implemented

- Hindi-first public homepage with an English switch, configurable contact
  details, today’s scheduled sessions, a privacy notice, and visit-request form.
- Supabase RPC booking submission with server-side Zod validation, normalized
  Indian mobile numbers, idempotency, date/session rechecks, and atomic capacity
  enforcement. No SMS or WhatsApp messages are sent.
- Supabase Auth doctor login, recovery, explicit authorized-doctor checks,
  private dashboard, patient records, dated availability, appointment status,
  and auditable visit notes.
- Integer-paise ledger with immutable entries, idempotent writes, explicit
  overpayment confirmation, linked reversals, signed corrections, patient
  credits, and derived balances.
- Row Level Security, narrowly scoped public views/RPCs, SQL migration, and
  fictional local-only public fixtures.
- Fictional public preview content is kept in
  `src/lib/sample-public-content.ts`; actual saved profile details and schedules
  take precedence. Preview-only sample timings never accept bookings.
- The additive `202611020002_doctor_ledger_workspace.sql` migration adds
  authorized, paginated ledger queries and net totals that account for linked
  reversals without rewriting existing financial entries.

This is not production-ready until Supabase is configured, migrations and
database tests are applied, an authorized doctor is provisioned, and deployment
specific abuse controls and backups are arranged. No real patient or financial
data is included.

## Windows / VS Code setup

Requirements: Node.js 22 LTS (or a compatible supported Node version) and npm.

1. Open this folder in VS Code and run:

   ```powershell
   npm install
   Copy-Item .env.example .env.local
   ```

2. To preview the public UI without Supabase credentials, leave
   `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` and run:

   ```powershell
   npm run dev
   ```

   The clearly labelled demo uses fictional locations and hours, disables
   booking, does not persist data, and does not provide a fake doctor login.
   Demo mode is always disabled when `NODE_ENV=production`.

3. For real data, create a Supabase project and set these values in
   `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_DEMO_MODE=false
   ```

   Use the project’s public/anon key only. Never put a service-role key in the
   browser or this repository, and do not paste secrets into chat. Restart the
   dev server after changing environment variables.

4. Apply the migrations using the Supabase CLI. The additive
   `202611020001_public_clinic_speciality.sql` migration adds the doctor
   speciality field without replacing existing profile or clinic data. For an
   isolated local Supabase stack, install and start Docker Desktop, initialize
   the CLI configuration once, and use only the local database:

   ```powershell
   npx supabase init
   npx supabase start
   npx supabase db reset
   npx supabase test db
   npx supabase status
   ```

   `db reset` applies `supabase/migrations` and runs the SQL tests. Copy the
   local API URL and anon key reported by `supabase status` into `.env.local`.
   For an existing hosted project, initialize the CLI config if it is absent,
   authenticate and link the existing project, then compare migration history
   before applying anything:

   ```powershell
   npx supabase init
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase migration list --linked
   npx supabase db push --dry-run
   ```

   Back up the database and review the dry-run output first. Apply only pending,
   reviewed migrations with `npx supabase db push`. If the schema was created
   manually or the migration is absent from remote history, stop and reconcile
   migration history before pushing. Never run `db reset` against a hosted
   project. Do not commit database passwords or CLI credentials.

5. In Supabase Auth, create or invite the one doctor account privately. Disable
   public sign-ups. Copy that user’s UUID from the Auth dashboard, then run this
   statement in the project’s SQL editor, replacing the placeholder locally:

   ```sql
   insert into public.authorized_doctors (user_id)
   values ('DOCTOR_AUTH_USER_UUID');
   ```

   Only that explicitly authorized account passes the app checks and RLS.
   Configure Supabase Auth’s redirect allow-list to include
   `http://localhost:3000/auth/callback` for local work. For deployment, set the
   Supabase Auth Site URL to the production origin and add
   `https://YOUR_PRODUCTION_HOST/auth/callback` to the redirect allow-list.
   Password recovery uses Supabase email delivery; the app itself does not send
   messages.

6. Run the application and checks:

   ```powershell
   npm run dev
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

## Optional demo ledger seed

The fictional ledger seed is an explicit manual operation. It is not part of
application startup or a production migration. It requires `psql`, an isolated
test database, a doctor user already authorized by the existing RLS policy, and
one controlled test phone number because `patients.mobile` is required.

Check the seed data without connecting to a database:

```powershell
npm run seed:demo-ledger -- --check
```

For an actual seed, run this from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-demo-ledger-seed.ps1
```

The runner prompts for an explicit test-target confirmation, PostgreSQL host
and database name, authorized doctor UUID, and controlled phone number. It asks
for the test-only PostgreSQL connection URI using hidden input, verifies the
URI matches the separately entered host and database, and prints no
credentials. Use only a verified test target; do not provide a production
connection string. The seed uses the authenticated database role, the existing
`post_ledger_entry` function, stable patient IDs and idempotency keys, and one
transaction for all writes and in-transaction checks, followed by a read-only
post-commit verification. It does not create appointments or visits.

The supplied row data recomputes to opening dues INR 53,900.00, charges INR
9,375.25, payments INR 23,900.25, and outstanding INR 39,375.00. These differ
from the aggregate figures in the original request; the seed validates the row
data and its per-patient balances.

## Production deployment preparation

There is no provider-specific deployment manifest in this repository. Use a
host that supports this Next.js App Router application on Node.js 22.

Configure these environment variables in the hosting provider before building
and starting the app:

| Name | Production value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key only |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS site origin, with no path |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

`NEXT_PUBLIC_` values are included in browser-visible app code. Never use a
Supabase service-role key for these variables. The app deliberately has no
service-role credential.

Before accepting real requests:

1. Link the existing Supabase project and verify migration history. Back up
   first, review `npx supabase db push --dry-run`, and apply only migrations
   that are actually pending. Do not reset a hosted database.
2. Confirm the application schema and access-control tests against a separate
   local/test database before relying on them for live records. The test suite
   must use fictional data and must not write to the live clinic project.
3. In Supabase Auth URL Configuration, set the production Site URL and allow
   `https://YOUR_PRODUCTION_HOST/auth/callback`. Keep the local callback URL
   only for development. Disable public sign-ups and provision the authorized
   doctor account privately.
4. Add the doctor’s Auth user UUID to `public.authorized_doctors` only after
   the migration is verified. Complete the public clinic profile and schedule
   in the dashboard, then perform a supervised end-to-end check using a
   separate test project.
5. Configure the provider’s database backup retention and verify an encrypted
   export/restore into a separate project. GitHub stores source, not patient
   records.

Build and run commands:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin. Recovery links are
rejected in production when this URL is missing or is not HTTPS; changing an
environment variable requires a new deployment/restart. Do not consider the
app ready for real patients until database connectivity, migration state,
doctor authorization, booking persistence, ledger writes, backups, and restore
have been verified.

## Project map

```text
src/app/                         Public site, booking API, Auth, doctor routes
src/components/                  Public booking and private dashboard UI
src/lib/                         Validation, Supabase clients, data and ledger helpers
supabase/migrations/             Versioned schema, RPCs, constraints and RLS
supabase/tests/                  Database access-control tests (pgTAP)
tests/                           Local domain tests
.env.example                     Placeholder environment values only
```

## Database/security notes

- Public reads go through explicit public views. Patient, appointment, visit,
  ledger, and audit tables have no anonymous read grants. Private views use
  invoker security and RLS.
- Public bookings use a single narrowly scoped database function; the database
  serializes session capacity checks, reserves requested/confirmed visits, and
  releases capacity only on cancellation. The function limits active requests
  per mobile number per day. Before internet-facing deployment, also configure
  a trusted edge/WAF rate limit and bot/abuse controls for the deployment.
- Doctor database actions check both Supabase Auth identity and the
  `authorized_doctors` table. Elevated service-role credentials are not used.
- Public messages and contact actions never include medical or financial
  details. User-entered patient names/notes are not put in URLs.
- Local demo fixtures contain no real clinic or patient data. Patient and
  financial data are never stored in browser localStorage.

## Backup and restore

Git stores application source and migrations; it is **not** a database backup.
This project does not configure or claim automated database backups. Review the
backup retention and recovery options available for the chosen Supabase plan.

For an additional manual database export, use a secured machine with PostgreSQL
client tools and an encrypted, access-controlled backup volume. Set
`SUPABASE_DB_URL` locally in PowerShell (do not put it in a command transcript,
`.env.local`, Git, or chat), and keep the backup outside this workspace and
un-synced folders:

```powershell
$backup = 'E:\EncryptedBackups\sarthak-clinic-data.dump'
pg_dump --format=custom --data-only --no-owner --no-acl --schema=public `
  --file=$backup $env:SUPABASE_DB_URL
```

Protect and retain the encrypted dump and connection credentials separately.
Verify each export and periodically test restoration into a separate,
non-production project that already has the matching schema/migrations:

```powershell
pg_restore --data-only --no-owner --no-acl --schema=public `
  --dbname=$env:SUPABASE_RESTORE_DB_URL $backup
```

Inspect the restored records and application before considering recovery
complete. Auth users are managed by Supabase Auth and need a separate,
documented account recovery/provisioning plan. Never restore an unverified dump
over the live database.
