# Reservation sync setup

This change is local until the project migration and Edge Functions are deployed. Do not place server or email secrets in `dist/`, Render Static Site environment variables, or the browser bundle.

## Database

Run the existing foundation migrations first if the project has not applied them. Then apply:

`supabase/migrations/20261017010000_reservation_decisions.sql`

The migration extends `public.reservations` in place. It adds decision and email state, allows `not_available`, grants active `administrator` and `reservation_staff` read access through RLS, and adds checked decision and email-claim RPCs. It does not create another reservations table or an updated-at trigger.

If the project is linked to the local Supabase CLI, review pending migrations before running `supabase db push`. To apply only this SQL manually, paste the file into the project's SQL Editor and run it once. It is safe to rerun after a completed application.

## Edge Functions

From the project root, with the target project selected:

```sh
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy create-reservation --project-ref <PROJECT_REF>
supabase functions deploy reservation-email --project-ref <PROJECT_REF>
supabase secrets set RESEND_API_KEY=<RESEND_API_KEY> RESERVATION_EMAIL_FROM='Aquapoint Beach Resort <reservations@example.com>' --project-ref <PROJECT_REF>
```

Replace the placeholder sender with a verified Resend domain. Supabase provides its URL and API keys to hosted functions. The booking function has `verify_jwt = false` so guests can submit requests; it validates input and uses a server-only key to read the current database room rate. The email function requires an authenticated user JWT and checks the active staff role in the database.

Render Static Site still needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` at **build time**. Its build command remains `npm run build` and its publish directory remains `dist`. The required loader order is preserved in generated `dist/index.html`.

If the project uses a custom Content Security Policy, allow connections to the Supabase project URL. If Realtime is disabled, admin data refreshes correctly on page reload; enabling Postgres Changes for `public.reservations` adds live refreshes.

## Verification after deployment

Submit a booking with a test guest address. Confirm its database-generated reservation number and pending state. Sign in as active reservation staff, verify the new row and counts, confirm it, and check both the database email state and the Resend delivery record. Repeat with `not_available` using another test booking. Test an inactive or content-manager account and a second staff decision against an already decided row. Resend acceptance means the provider accepted the request; final inbox delivery can still depend on the recipient mail system.

The existing Worker `/api/reservations` path remains available for the local mock preview and non-Render Worker deployments. The Render frontend uses `create-reservation` when the browser Supabase client is configured.
