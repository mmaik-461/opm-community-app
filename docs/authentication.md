# Authentication, verification and roles

## Flow

```
Browser ──► apps/web (NextAuth, JWT session cookie)
              │  authorize(): POST /auth/login or /auth/dev/login  ──►  apps/api checks the credential
              │  session callback: signs a 5-minute HS256 access token { sub: profileId } with AUTH_SECRET
Browser ──► lib/api.ts reads the session before each call and sends  Authorization: Bearer <token>
        ──► apps/api AuthGuard (global): verifies signature + expiry, sets req.user = { id: sub }
```

## Sign-in

- **Standard sign-in:** email + password. `Profile.passwordHash` stores a salted scrypt hash (null disables password sign-in for that profile). `prisma db seed` sets it for every seeded alumnus only when `SEED_PASSWORD` is provided.
- **Dev quick login:** a second NextAuth provider (`dev-impersonate`) lists seeded alumni on the sign-in screen and powers the "Acting as (Dev)" list in the account menu (it signs in again as the chosen user).
  - On when `NODE_ENV !== 'production'`, or in production only when `AUTH_DEV_LOGIN=true` (API) and `NEXT_PUBLIC_AUTH_DEV_LOGIN=true` (web).
  - Both apps check the flag independently. With it off the API answers `404` and the header shows the signed-in user plus **Sign out**.

## Server side

- `AuthGuard` is registered globally (`APP_GUARD`). Routes opt out with `@Public()`.
- Controllers receive the user via `@CurrentUser()` and pass `user.id` to services.
- Only HS256 tokens signed with `AUTH_SECRET` are accepted (`alg: none` and foreign secrets are rejected). A missing or short secret yields `503`, not `401`.

## Environment

- `AUTH_SECRET`: ≥ 32 chars, identical for web and API.
- `NEXTAUTH_URL`: web, required in production.
- `AUTH_DEV_LOGIN` / `NEXT_PUBLIC_AUTH_DEV_LOGIN`: dev login flags.
- `AUTH_AUTO_VERIFY`: API, optional.
- `SEED_PASSWORD`: seed only.
- `API_URL`: optional, web server-side calls (defaults to `NEXT_PUBLIC_API_URL`).

See `.env.example`.

## Registration and verification

- The sign-in screen has **Sign in** and **Sign up** tabs.
- `POST /auth/register` validates the payload (Zod), rejects an existing email (`409`), hashes the password (scrypt), embeds the profile (OpenAI, with descriptive fallback text when the bio is brief) and stores it with `status = PENDING_VERIFICATION`. The cohort is set to `Class of <graduationYear>`.
- Password rules live in `PASSWORD_RULES` (`packages/shared-types`) and drive both the API schema and the sign-up form: a live checklist, a **Confirm password** field that must match, and a show/hide toggle on both fields.
- The web app then signs in through the regular credentials provider.
- A `PENDING_VERIFICATION` alumnus can browse and sign in and sees an "awaiting alumni verification" banner, but `POST /matchmaking` and `POST /intros` answer `403`. They are also left out of matchmaking candidates.
- Seeded profiles are `ACTIVE`. `AUTH_AUTO_VERIFY=true` (API) skips verification for demos.

## Roles and admin verification

- `Profile.role` is `MEMBER` (default) or `ADMIN`.
- `@Roles('ADMIN')` plus the global `RolesGuard` (registered after `AuthGuard`) protect every `/admin/*` route. The guard reads the role from the database on each request (the token only carries the profile id), so a demotion applies immediately and non-admins get `403`.
- The seed creates one administrator, `admin@alumni.edu` ("Community Admin"; quick login, or password sign-in when `SEED_PASSWORD` is set). To promote someone else, set `"role" = 'ADMIN'` on their profile.
- Admins see a **Verifications** tab (also at `/admin`) with a pending-count badge and a table of applicants (name, email, graduation year, diploma ID, submitted date) with **Approve** / **Reject**. Decisions apply optimistically and roll back on failure.
- Members who open `/admin` get an "Access denied" page.
- Approved users become `ACTIVE` and unlock matchmaking and intros. `REJECTED` users stay blocked (`403`), see a rejection banner and are hidden from the alumni directory.
- Decisions are final (`409` on a second attempt).

## Profile editing

The account menu's **Edit profile** item opens a dialog prefilled with the signed-in alumnus' profile. Saving calls `PATCH /profiles/me`, shows a saving state and inline errors, closes on success and swaps the saved profile into the directory immediately. The API re-embeds the profile whenever a searchable field changes, so matchmaking reflects the latest details. Verification state and identity fields stay read-only.

## Not included

- Rate limiting / lockout on `POST /auth/login` and `POST /auth/register`.
- Email confirmation and password reset.
- Admin tooling beyond the verification panel (role management, re-reviewing rejected applicants).

Put the API behind a gateway that rate-limits before exposing password sign-in publicly.

## Production checklist

Strong unique `AUTH_SECRET`, `NODE_ENV=production`, `NEXTAUTH_URL` set, dev-login flags unset, `SEED_PASSWORD` not used for real data.
