# End-to-end verification checklist

Manual smoke test of the running app.

## Setup

- [ ] `docker compose up -d` starts Postgres; `prisma migrate dev` and `prisma db seed` succeed (26 profiles, incl. the admin).
- [ ] `GET http://localhost:4000/auth/dev/profiles` returns 26 profiles (dev only); `GET /profiles` needs a bearer token.
- [ ] `pnpm dev` serves the app at http://localhost:3000 with no console errors (favicon loads).
- [ ] `curl -i localhost:4000/intros` answers `401`.

## Access and accounts

- [ ] Anonymous visitors land on the public marketing page at `/` with access to `/login` and `/register`. Protected routes redirect guests to `/login?callbackUrl=...`; quick login (dev) and email/password both lead into the app, and **Sign out** returns to it.
- [ ] **Sign up** creates an account, signs in and shows the "awaiting alumni verification" banner; matchmaking and intro requests answer `403` until an admin approves the account (`Profile.status` becomes `ACTIVE`).
- [ ] **Admin:** as Community Admin the **Verifications** tab shows the pending count; approving a registration removes the row at once, and the applicant (switch to them) loses the banner and can use matchmaking. As a member the tab is absent and `/admin` shows "Access denied".
- [ ] The circular avatar menu opens under its button and closes on Escape or an outside click; it shows name, email and role (plus a status badge while unverified), **Edit profile**, **Sign out**, and, in dev only, an **Acting as (Dev)** list of all 26 alumni where switching updates the avatar label.

## Matchmaking

- [ ] Clicking a starter chip (e.g. "Fintech in London") shows a loading state, then up to 3 match cards with % match, "Why this match", and an icebreaker.
- [ ] **Target city** dropdown opens and filters the search by city.
- [ ] **Copy Message** shows "Copied!"; Email and LinkedIn links open for profiles that have them.
- [ ] Results never include the currently selected user, and each card shows a "mutual synergy" note.
- [ ] **Travel Mode:** toggle it on, pick a destination and enter dates ("Nov 14-18"); every result lives in that city and the icebreaker proposes an in-person coffee. An empty query still returns matches. Toggling causes no layout shift.
- [ ] **Feedback:** rate a match with 👍 and another with 👎 (reason + comment) and see the confirmation; as Community Admin open **Verifications → Feedback Analytics** and find both rows, newest first, with the summary updated.

## Intros and directory

- [ ] **Intro requests:** "Request intro" opens an editable dialog; sending creates a `PENDING` request; a second request to the same person or to yourself is rejected.
- [ ] Switch to the target user: the header badge shows the pending count; accept/decline updates both users' tabs; Sent/Received paginate independently.
- [ ] Alumni Directory: filters and debounced search work; a no-match search shows "No alumni match your filters" at the same width and height as the populated grid.

## Quality

- [ ] Resize to 375 px, 768 px, and 1280 px: no horizontal scroll; grids use 1 / 2 / 3 columns.
- [ ] `pnpm --filter web typecheck` and `pnpm --filter web build` pass.
- [ ] `pnpm test` and `pnpm test:e2e` pass.
