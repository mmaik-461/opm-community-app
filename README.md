# OPM Community Hub

A production-grade community platform for OPM alumni, built around one core journey: **Ask the community → get AI-matched alumni → send a ready-to-use icebreaker → track the intro to a response.**

## Value proposition

Alumni networks are valuable but hard to navigate. Instead of browsing a directory, a member describes what they need in plain language ("Visiting London next week — who can connect for a fintech coffee?"). The hub finds the alumni best placed to help, explains _why_ each one is a fit, and drafts a personalised opening message to copy, email, or send via LinkedIn.

The platform is intentionally focused on introductions: the conversation itself continues on the channel members prefer (email, LinkedIn, WhatsApp), while the hub owns discovery, drafting and tracking of every introduction request.

## Features

| Feature                            | What it does                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Two-Way Contextual Matchmaking** | Claude reasons over the requester's own profile (`<requester_profile>`) as well as the candidates. Each match returns a grounded `matchReason`, a structured `mutualSynergy` (the win-win angle: what the requester brings to the candidate), and a tailored `suggestedIcebreaker`. The requester is always excluded from their own results.                  |
| **Intro Request Workflow**         | Closed loop, persisted in Postgres (`IntroRequest`, status `PENDING` / `ACCEPTED` / `DECLINED`). A pre-flight dialog lets the member edit the icebreaker before sending. Self-requests and duplicate pending requests are rejected. Sent and Received tabs are paginated independently, and a persistent badge in the header shows pending incoming requests. |
| **City Travel Mode**               | Pick a destination city and optional dates. Candidates are strictly filtered to that city (case-insensitive), and icebreakers propose an in-person meetup that references the travel dates. If the free-form query is empty or generic, retrieval falls back to the requester's headline, industry, skills and bio.                                           |

## Architecture: two-stage hybrid AI

```
Query ──► OpenAI text-embedding-3-small (1536 dims)
      ──► PostgreSQL + pgvector: ORDER BY embedding <=> query_vector  (cosine distance, top 6 candidates)
      ──► Anthropic Claude: contextual re-ranking → top 3 + matchReason + mutualSynergy + suggestedIcebreaker
      ──► Zod-validated structured output ──► joined with DB profiles ──► MatchResult[]
```

1. **Retrieval (cheap, broad).** The query is embedded and compared with precomputed alumni embeddings using pgvector's cosine distance operator (`<=>`). The requesting user is excluded from candidates. In Travel Mode, an additional `lower(city) = lower(:destination)` predicate is applied, and an empty or generic query is replaced by text built from the requester's profile.
2. **Reasoning (precise, contextual).** Claude receives the request, the requester's profile, an optional `<travel_context>` and the 6 candidates, selects the best 3, and writes a grounded reason, a mutual synergy analysis and an icebreaker for each. In Travel Mode the icebreaker is written for an in-person meetup and the synergy highlights local, offline context. Output uses Anthropic structured outputs (JSON schema) and is re-validated server-side with Zod (`matchmaking.schemas.ts`); only profile IDs present in the candidate set are accepted.

> **Model configuration:** the service defaults to `claude-sonnet-5-5`; set `ANTHROPIC_MODEL` to select a different Claude model.

Shared request/response contracts live in `packages/shared-types` and are used by both apps.

### API surface

| Route                                                                                                                                                                                                             | Purpose |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Every route requires `Authorization: Bearer <access token>` (`401` otherwise) except `GET /health` and `/auth/*`. The acting user is always the token's subject; it is never read from a payload or query string. |

| Route                            | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/login`               | Public. `{ email, password }` → `{ profile }`; `401` for any bad credential (same message for unknown email, wrong password, no password set).                                                                                                                                                                                                                                                                                 |
| `POST /auth/register`            | Public. `{ email, password (≥ 8), fullName, city, industry, graduationYear, diplomaNumber?, headline?, bio?, skills? }` → `201 { accessToken, profile }`. Creates a `PENDING_VERIFICATION` profile (`ACTIVE` when the API runs with `AUTH_AUTO_VERIFY=true`) with an embedding; `409` if the email exists, `400` on validation errors, `502` (nothing saved) if embedding fails. `diplomaNumber` is stored but never returned. |
| `GET /auth/dev/profiles`         | Public, **dev login only** (`404` in production unless `AUTH_DEV_LOGIN=true`): the quick-login list.                                                                                                                                                                                                                                                                                                                           |
| `POST /auth/dev/login`           | Public, **dev login only**: `{ profileId }` → `{ profile }`.                                                                                                                                                                                                                                                                                                                                                                   |
| `GET /profiles`                  | Alumni directory (filters: `city`, `cohort`, `industry`).                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /matchmaking`              | `{ query, targetCity?, travelContext?: { city, dates? } }` → top 3 `MatchResult` for the authenticated user (verified alumni only; `403` while the requester is `PENDING_VERIFICATION`). `query` may be empty only with `travelContext`.                                                                                                                                                                                       |
| `POST /intros`                   | `{ targetId, query, icebreaker }` → intro request from the authenticated user (`PENDING`). `400` for self-requests, `409` for a duplicate pending request, `403` while the requester is `PENDING_VERIFICATION`.                                                                                                                                                                                                                |
| `GET /intros`                    | The authenticated user's sent and received intros: `PaginatedIntros` per direction (`receivedPage`, `sentPage`, `limit`) plus `pendingIncoming`.                                                                                                                                                                                                                                                                               |
| `PATCH /intros/:id/status`       | `{ status }`. Only the intro's target (the authenticated user) may accept or decline; `403` otherwise, `409` if already answered.                                                                                                                                                                                                                                                                                              |
| `GET /admin/verifications`       | **Admin only** (`403` for members). Pending applicants (`status = PENDING_VERIFICATION`), oldest first: `{ data: [{ id, fullName, email, graduationYear, diplomaNumber, createdAt }] }`. `diplomaNumber` is only exposed here.                                                                                                                                                                                                 |
| `PATCH /admin/verifications/:id` | **Admin only.** `{ decision: 'APPROVE' \| 'REJECT' }` → `{ id, status }`. `APPROVE` sets `ACTIVE`, `REJECT` sets `REJECTED`. `404` for an unknown id, `409` if the application was already reviewed, `400` for an invalid decision.                                                                                                                                                                                            |

### Authentication

```
Browser ──► apps/web (NextAuth, JWT session cookie)
              │  authorize(): POST /auth/login or /auth/dev/login  ──►  apps/api checks the credential
              │  session callback: signs a 5-minute HS256 access token { sub: profileId } with AUTH_SECRET
Browser ──► lib/api.ts reads the session before each call and sends  Authorization: Bearer <token>
        ──► apps/api AuthGuard (global): verifies signature + expiry, sets req.user = { id: sub }
```

- **Standard sign-in:** email + password. `Profile.passwordHash` stores a salted scrypt hash (null disables password sign-in for that profile). `prisma db seed` sets it for every seeded alumnus only when `SEED_PASSWORD` is provided.
- **Dev impersonation / quick login:** a second NextAuth provider (`dev-impersonate`) lists seeded alumni on the sign-in screen and powers the header "Acting as" switcher (it signs in again as the chosen user). It is on when `NODE_ENV !== 'production'`, or in production only when `AUTH_DEV_LOGIN=true` (API) / `NEXT_PUBLIC_AUTH_DEV_LOGIN=true` (web) are set. Both apps check the flag independently; with it off the API answers `404` and the header shows the signed-in user plus **Sign out**.
- **Server side:** `AuthGuard` is registered globally (`APP_GUARD`); routes opt out with `@Public()`. Controllers receive the user via `@CurrentUser()`. Only HS256 tokens signed with `AUTH_SECRET` are accepted (`alg: none` and foreign secrets are rejected); a missing or short secret yields `503`, not `401`.
- **Environment:** `AUTH_SECRET` (≥ 32 chars, identical for web and API), `NEXTAUTH_URL` (web, required in production), `AUTH_DEV_LOGIN` / `NEXT_PUBLIC_AUTH_DEV_LOGIN`, `AUTH_AUTO_VERIFY` (API, optional), `SEED_PASSWORD`, and optionally `API_URL` (web server-side calls; defaults to `NEXT_PUBLIC_API_URL`). See `.env.example`.
- **Registration & verification:** the sign-in screen has **Sign in** and **Sign up** tabs. `POST /auth/register` validates the payload (Zod), rejects an existing email (`409`), hashes the password (scrypt), embeds the profile (OpenAI, with descriptive fallback text when the bio is brief) and stores it with `status = PENDING_VERIFICATION`; the cohort is set to `Class of <graduationYear>`. The web app then signs in through the regular credentials provider. A `PENDING_VERIFICATION` alumnus can browse and sign in, sees an "awaiting alumni verification" banner, but `POST /matchmaking` and `POST /intros` answer `403`; they are also left out of matchmaking candidates. Seeded profiles are `ACTIVE`. Verification is done by an administrator in the **Verifications** panel (see below); `AUTH_AUTO_VERIFY=true` (API) skips it for demos.
- **Roles & admin verification:** `Profile.role` is `MEMBER` (default) or `ADMIN`. `@Roles('ADMIN')` plus the global `RolesGuard` (registered after `AuthGuard`) protect every `/admin/*` route; the guard reads the role from the database on each request (the bearer token only carries the profile id), so a demotion applies immediately and non-admins get `403`. The seed creates one administrator, `admin@alumni.edu` ("Community Admin"; quick login, or password sign-in when `SEED_PASSWORD` is set). To promote someone else, set `"role" = 'ADMIN'` on their profile. Admins see a **Verifications** tab (also at `/admin`) with a pending-count badge and a table of applicants (name, email, graduation year, diploma ID, submitted date) with **Approve** / **Reject**; decisions apply optimistically and roll back on failure. Members who open `/admin` get an "Access denied" page. Approved users become `ACTIVE` and unlock matchmaking and intros; rejected users (`REJECTED`) stay blocked (`403`), see a rejection banner and are hidden from the alumni directory. Decisions are final (`409` on a second attempt).
- **Not included:** rate limiting / lockout on `POST /auth/login` and `POST /auth/register`, email confirmation, password reset and admin tooling beyond the verification panel (role management, re-reviewing rejected applicants). Put the API behind a gateway that rate-limits before exposing password sign-in publicly.

> Production checklist: strong unique `AUTH_SECRET`, `NODE_ENV=production`, `NEXTAUTH_URL` set, dev-login flags unset, `SEED_PASSWORD` not used for real data.

### Data model

```
Profile 1 ──< IntroRequest >── 1 Profile
 (requester: SentIntros)         (target: ReceivedIntros)

Profile { ..., cohort, graduationYear, status: ProfileStatus(ACTIVE | PENDING_VERIFICATION | REJECTED, default PENDING_VERIFICATION),
          role: Role(MEMBER | ADMIN, default MEMBER),
          diplomaNumber? (private), passwordHash?, embedding }

IntroRequest { id, requesterId, targetId, query, icebreaker,
               status: IntroStatus(PENDING | ACCEPTED | DECLINED),
               createdAt, updatedAt }
indexes: (requesterId), (targetId, status)
```

`Profile` also carries a pgvector `embedding` column used for retrieval, and an optional `passwordHash` (scrypt) for email/password sign-in; neither is ever returned by the API.

## Tech stack

| Layer    | Choice                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Monorepo | Turborepo, pnpm workspaces                                                                      |
| Web      | Next.js 14 (App Router), React 18, Tailwind CSS v4, Radix UI (shadcn/ui components)             |
| API      | NestJS, Prisma ORM, Zod validation pipes                                                        |
| Database | PostgreSQL 16 + pgvector (Docker Compose)                                                       |
| AI       | OpenAI `text-embedding-3-small`, Anthropic Claude                                               |
| Language | TypeScript (strict)                                                                             |
| Testing  | Vitest (+ SWC, Supertest) for the API, Vitest + Testing Library for the web, Playwright for e2e |

```
apps/web                Next.js frontend
  components/opm        Feature components (JSX and component state only)
  constants/            Static options, copy, class tokens and limits
  utils/                Pure helper functions
  lib/                  API client (attaches the bearer token), NextAuth config, shadcn `cn` helper
  app/api/auth          NextAuth route handler
apps/e2e                Playwright end-to-end journeys (own API + web servers, isolated database)
apps/api                NestJS backend (auth, profiles, matchmaking, intros modules)
  src/common/constants  Limits, prompts, Prisma selects
  src/common/utils      Shared helpers (pagination, prompt tags, vectors, env)
  src/common/pipes      Zod validation pipe
  src/common/guards     Global AuthGuard (bearer token verification)
  src/common/decorators @Public() and @CurrentUser()
packages/shared-types   DTOs and API contracts
packages/tsconfig       Shared TypeScript configs
```

## Quickstart

Prerequisites: Node 20+, pnpm, Docker.

```bash
pnpm install

# 1. Database (Postgres 16 + pgvector on localhost:5438)
docker compose up -d

# 2. Environment: apps/api/.env
#    DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5438/opm_community?schema=public"
#    ANTHROPIC_API_KEY=...      (required for matchmaking)
#    OPENAI_API_KEY=...         (required for query embeddings; used by the seed when present)
#    PORT=4000
#    ANTHROPIC_MODEL=...        (optional override)
#    AUTH_SECRET=...            (required, >= 32 chars; the SAME value in apps/web/.env.local)
#    SEED_PASSWORD=...          (optional: enables email/password sign-in for seeded alumni)
#    apps/web/.env.local: AUTH_SECRET=..., NEXTAUTH_URL=http://localhost:3000

# 3. Schema and data
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed   # 25 alumni profiles with precomputed embeddings

# 4. Run everything
pnpm dev                           # web on :3000, API on :4000
```

Sign in at http://localhost:3000: in development, pick any alumnus under **Development quick login** (or use email/password if you seeded with `SEED_PASSWORD`, e.g. `anna.kowalska@opm-alumni.example`). The frontend reads the API from `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). The API allows CORS from `http://localhost:3000` only.

**Seed embeddings:** with `OPENAI_API_KEY` set, the seed stores real `text-embedding-3-small` vectors. Without it, it falls back to a deterministic hashed bag-of-words vector (same 1536 dims) so the database is always populated. Query embeddings come from OpenAI, so seed with `OPENAI_API_KEY` set for semantically comparable vectors.

**Git hooks (Husky):** enabled automatically by `pnpm install` (the root `prepare` script). `pre-commit` runs `lint-staged` (ESLint `--fix` + Prettier on staged code, Prettier on JSON/MD/CSS) and `pnpm typecheck`; `pre-push` runs `pnpm test` and `pnpm build`.

Quality gates: `pnpm --filter web typecheck`, `pnpm --filter api typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test` and (for user-facing changes) `pnpm test:e2e`.

The API reads `WEB_ORIGIN` (default `http://localhost:3000`) for its CORS allow-list; the web build reads `NEXT_DIST_DIR` (default `.next`) so the e2e build never clobbers a running dev server.

## Testing

| Command         | What it runs                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm test`     | Unit + integration tests for `apps/api` and `apps/web` (Turborepo; builds `shared-types` first). |
| `pnpm test:e2e` | Playwright journeys in `apps/e2e`.                                                               |
| `pnpm test:all` | Both of the above.                                                                               |

- **API (`apps/api`, Vitest + SWC + Supertest).** `intros.spec.ts` drives `IntrosController` and `IntrosService` behind the real `AuthGuard` over HTTP with signed bearer tokens (`src/test/auth.ts`) against a stateful in-memory Prisma fake (`src/test/fake-prisma.ts`): `401` for missing/malformed/expired/foreign-signed/`alg: none` tokens, a spoofed `requesterId`/`userId` being ignored, self-request `400`, duplicate `409` (both directions), unauthorised status change `403`, pagination math and independent sent/received pages, and the pending-incoming count. `matchmaking.spec.ts` covers `MatchmakingService` with the OpenAI/Anthropic SDKs faked: strict case-insensitive city predicate, requester exclusion, travel-context injection into the prompt, fallback embedding text for an empty or generic query, and invented/duplicate id handling. `auth.spec.ts` covers `POST /auth/login` (uniform `401`, no hash leakage), the dev-login gate and `POST /auth/register` (success with a stubbed embedding, fallback embedding text, duplicate `409`, validation `400`s, no write when embedding fails, `AUTH_AUTO_VERIFY`); the intros and matchmaking specs assert the `403` for `PENDING_VERIFICATION` and `REJECTED` requesters. `admin.spec.ts` drives `AdminController` behind the real `AuthGuard` and `RolesGuard`: `401` anonymous, `403` for members (including pending users approving themselves), the pending list's fields and ordering (no secrets), approve/reject transitions, `404`/`409`/`400` cases, and that approving flips a user's intro requests from `403` to `201`. Shared helpers (`pagination`, `prompt`, `vector`, `env`, `auth`, `password`, Zod pipe) have their own unit tests.
- **Web (`apps/web`, Vitest + jsdom + Testing Library).** Tests for `utils/`, the `Directory` filter groups and debounced search, `MatchCard` (mutual synergy callout, copy/email/LinkedIn actions, request flow) and the intro `Dialog` (edit, submit, server error, cancel/Escape, draft reset). `lib/auth.test.ts` covers the NextAuth `authorize`/session callbacks and the signed access token; `AppShell` and `SignIn` tests cover the sign-in gate, bearer headers, dev impersonation and the verification banner; `register-form.test.tsx` covers the Sign up form (payload, in-flight state, API errors, sign-in after registration). Components run with the real providers and API client; only `fetch` and NextAuth's browser client (`test/next-auth.ts`) are faked.
- **E2E (`apps/e2e`, Playwright).** Journeys: Admin verification (register → switch to the admin → approve in the panel → the applicant is verified, banner gone, matchmaking answers; members are denied at `/admin`), Authentication (anonymous gate, password sign-in/out, quick login, API `401`s), Registration (sign up → pending banner → matchmaking `403`, duplicate email), Alumni Directory (city/industry filters, debounced search, layout-shift budget via `PerformanceObserver`), Matchmaker (search, Travel Mode, in-person icebreakers) and the Intro closed loop (A requests B → switch to B → header badge → accept → back to A sees `ACCEPTED`). Playwright starts its own API (`:4100`) and web (`:3100`, built into `.next-e2e`) and prepares the isolated `opm_community_e2e` database (migrate, truncate, seed) on each run, so Docker Postgres (`docker compose up -d`) must be running. The run sets `AUTH_SECRET`, enables dev login (`next start` runs with `NODE_ENV=production`) and seeds a shared `SEED_PASSWORD`; journeys sign in through quick login via `openApp`. `ANTHROPIC_API_KEY` is blanked and `OPENAI_API_KEY` is a dummy pointing (via `OPENAI_BASE_URL`) at a local embeddings stub (`scripts/embeddings-stub.mjs`, `:4200`): the seed uses deterministic embeddings, registration embeds through the stub, and `POST /matchmaking` is stubbed at the browser network layer (the LLM pipeline is covered by the API tests). First-time setup: `pnpm --filter e2e exec playwright install chromium`.

## Engineering highlights

- **React 18 `forwardRef` slot compatibility.** shadcn templates assume React 19 (`ref` as a prop). `Button` is wrapped in `React.forwardRef` so Radix `asChild` triggers (dropdowns) receive the DOM ref and anchor their popper correctly. Without it, menus mount but are positioned off-screen.
- **Zero layout shift in the directory.** Results always render inside a persistent `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with a reserved minimum height. The empty state is a `col-span-full` card inside that grid, and `<main>` is `w-full` so `mx-auto` in a flex column cannot shrink the page. Search input is debounced (250 ms) and the "Clear filters" slot reserves its height.
- **Zero layout shift in Travel Mode.** The Travel Mode banner, destination control and dates input occupy reserved space in both states (the dates field is `invisible` rather than unmounted on desktop), so toggling never moves the form or results.
- **Intros tab follows the acting user.** Switching the acting user always returns My Intros to the Received tab (and page 1 for both lists), so the pending badge and the visible list always describe the same user.
- **Stable intros dashboard.** Sent/Received lists render in a fixed minimum-height container; during page changes the existing list is dimmed (`opacity-60`) rather than replaced by a loader, so pagination does not jump. The 3-column directory grid is preserved.
- **Acting-as user switcher (development).** The "Acting as" dropdown signs in again as the chosen alumnus through the dev-impersonation provider, so the session, and therefore the bearer token the API trusts, always matches the user on screen. The API derives the requester from that token to exclude them from their own results and load their profile as matching context.
- **Prompt-injection defence.** The user query, target city, travel context, requester profile and candidate profiles are treated as untrusted data: each is encapsulated in delimited tags (`<user_request>`, `<target_city>`, `<travel_context>`, `<requester_profile>`, `<candidates>` as JSON), the system prompt instructs the model never to follow instructions found inside them, output is constrained by a JSON schema, and the response is Zod-validated with returned IDs checked against the candidate set. Request payloads are validated (query 3–1000 chars, or empty with a `travelContext`) before use.
- **Mobile-first UI.** Header wraps without overflow, starter chips scroll with snap on small screens, and match cards go from 1 to 2 to 3 columns. See `apps/web/FRONTEND_GUIDELINES.md`.

## End-to-end verification checklist

- [ ] `docker compose up -d` starts Postgres; `prisma migrate dev` and `prisma db seed` succeed (26 profiles, incl. the admin).
- [ ] `GET http://localhost:4000/auth/dev/profiles` returns 26 profiles (dev only); `GET /profiles` needs a bearer token.
- [ ] `pnpm dev` serves the app at http://localhost:3000 with no console errors (favicon loads).
- [ ] Anonymous visitors see only the sign-in screen; quick login (dev) and email/password both lead into the app, and **Sign out** returns to it.
- [ ] `curl -i localhost:4000/intros` answers `401`.
- [ ] **Sign up** creates an account, signs in and shows the "awaiting alumni verification" banner; matchmaking and intro requests answer `403` until an admin approves the account (`Profile.status` becomes `ACTIVE`).
- [ ] **Admin:** as Community Admin the **Verifications** tab shows the pending count; approving a new registration removes the row at once, and the applicant (switch to them) loses the banner and can use matchmaking. As a member the tab is absent and `/admin` shows "Access denied".
- [ ] **Acting as** dropdown opens under its button, lists all 26 alumni, and switching updates the label.
- [ ] Clicking a starter chip (e.g. "Fintech in London") shows a loading state, then up to 3 match cards with % match, "Why this match", and an icebreaker.
- [ ] **Target city** dropdown opens and filters the search by city.
- [ ] **Copy Message** shows "Copied!"; Email and LinkedIn links open for profiles that have them.
- [ ] Results never include the currently selected user, and each card shows a "mutual synergy" note.
- [ ] **Travel Mode:** toggle it on, pick a destination and enter dates ("Nov 14-18"); every result lives in that city and the icebreaker proposes an in-person coffee. Submitting with an empty query still returns matches. Toggling causes no layout shift.
- [ ] **Intro requests:** "Request intro" opens an editable dialog; sending creates a `PENDING` request; a second request to the same person or to yourself is rejected.
- [ ] Switch to the target user: the header badge shows the pending count; accept/decline updates both users' tabs; Sent/Received paginate independently.
- [ ] Alumni Directory: filters and debounced search work; a no-match search shows "No alumni match your filters" at the same width and height as the populated grid.
- [ ] Resize to 375 px, 768 px, and 1280 px: no horizontal scroll; grids use 1 / 2 / 3 columns.
- [ ] `pnpm --filter web typecheck` and `pnpm --filter web build` pass.
- [ ] `pnpm test` and `pnpm test:e2e` pass.
