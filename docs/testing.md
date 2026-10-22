# Testing

| Command         | What it runs                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm test`     | Unit + integration tests for `apps/api` and `apps/web` (Turborepo; builds `shared-types` first). |
| `pnpm test:e2e` | Playwright journeys in `apps/e2e`.                                                               |
| `pnpm test:all` | Both of the above.                                                                               |

## API (`apps/api`, Vitest + SWC + Supertest)

Specs live next to the code. Endpoint specs register the real `AuthGuard` (and `RolesGuard` for admin) and call with signed bearer tokens (`src/test/auth.ts`) against a stateful in-memory Prisma fake (`src/test/fake-prisma.ts`). OpenAI and Anthropic SDKs are faked.

- **`intros.spec.ts`**
  - `401` for missing, malformed, expired, foreign-signed and `alg: none` tokens.
  - A spoofed `requesterId` / `userId` is ignored.
  - Self-request `400`, duplicate `409` (both directions), unauthorised status change `403`.
  - Pagination math, independent sent/received pages, pending-incoming count.
- **`matchmaking.spec.ts`**
  - Strict case-insensitive city predicate and requester exclusion.
  - Travel-context injection into the prompt, fallback embedding text for an empty or generic query.
  - Invented and duplicate id handling.
- **`auth.spec.ts`**
  - `POST /auth/login`: uniform `401`, no hash leakage. Dev-login gate.
  - `POST /auth/register`: success with a stubbed embedding, fallback text, duplicate `409`, validation `400`s, no write when embedding fails, `AUTH_AUTO_VERIFY`.
  - The intros and matchmaking specs assert `403` for `PENDING_VERIFICATION` and `REJECTED`.
- **`admin.spec.ts`**
  - `401` anonymous, `403` for members (including pending users approving themselves).
  - Pending list fields and ordering (no secrets), approve/reject transitions, `404` / `409` / `400` cases.
  - Approving flips a user's intro requests from `403` to `201`.
- **`feedback.spec.ts`**
  - `POST /matchmaker/feedback` stores feedback for the token's user (`201`), rejects bad ratings, reasons, over-long comments, spoofed reviewers, self-review and unknown candidates, and answers `403` to unverified reviewers.
  - `GET /admin/feedback`: `401` / `403` / `200`, newest-first rows with reviewer and candidate details, a correct summary.
- Shared helpers (`pagination`, `prompt`, `vector`, `env`, `auth`, `password`, Zod pipe) have their own unit tests.

## Web (`apps/web`, Vitest + jsdom + Testing Library)

Components run with the real providers and API client. Only `fetch` and NextAuth's browser client (`test/next-auth.ts`) are faked. The App Router is faked in `test/next-navigation.ts`.

- **Pages and routing:** `app/not-found.test.tsx` (404 status, copy, home link, loading boundary accessibility), `utils/routes.test.ts` (redirect rules and the open-redirect guard), `app/(marketing)/page.test.tsx` (landing page) and `utils/network-graph.test.ts` (hero graph maths).
- **Matchmaker:** `MatchCard` (mutual synergy callout, copy/email/LinkedIn, request flow, feedback controls with thumbs up payload, thumbs down dialog, cancel, server errors, confirmation) and the intro `Dialog` (edit, submit, server error, cancel/Escape, draft reset).
- **Directory:** filter groups and debounced search.
- **Admin:** `feedback-analytics.test.tsx` (columns, rows, rating badges, summary, loading, empty, error, access denied).
- **Auth:** `lib/auth.test.ts` (NextAuth `authorize` / session callbacks and the signed access token), `login-form.test.tsx`, `auth-nav.test.tsx`, `register-form.test.tsx` (payloads, in-flight state, API errors, redirect after sign-in).
- **App frame:** `app-layout.test.tsx` (server-provided directory, bearer headers, navigation links and badges, sign-out redirect, dev impersonation, verification banners, `/admin` access).
- Tests for `utils/` helpers.

## E2E (`apps/e2e`, Playwright)

Journeys:

- **Landing page:** guest sees it at `/`, both CTAs work, protected pages stay gated, signed-in user is routed to `/matchmaker`.
- **Matchmaker feedback:** rate matches 👍/👎 → switch to admin → both reviews in Feedback Analytics, newest first. Members are denied.
- **Admin verification:** register → admin approves → applicant is verified, banner gone, matchmaking answers. Members are denied at `/admin`.
- **Authentication:** anonymous gate, password sign-in/out, quick login, API `401`s.
- **Registration:** password checklist, weak/mismatching password blocked, show/hide toggle, pending banner, matchmaking `403`, duplicate email.
- **Alumni Directory:** city/industry filters, debounced search, layout-shift budget via `PerformanceObserver`.
- **Matchmaker:** search, Travel Mode, in-person icebreakers.
- **Intro closed loop:** A requests B → switch to B → header badge → accept → A sees `ACCEPTED`.

Setup:

- Playwright starts its own API (`:4100`) and web (`:3100`, built into `.next-e2e`) and prepares the isolated `opm_community_e2e` database (migrate, truncate, seed) on each run, so Docker Postgres (`docker compose up -d`) must be running.
- The run sets `AUTH_SECRET`, enables dev login (`next start` runs with `NODE_ENV=production`) and seeds a shared `SEED_PASSWORD`. Journeys sign in through quick login via `openApp`.
- `ANTHROPIC_API_KEY` is blanked. `OPENAI_API_KEY` is a dummy pointing (via `OPENAI_BASE_URL`) at a local embeddings stub (`scripts/embeddings-stub.mjs`, `:4200`). The seed uses deterministic embeddings, registration embeds through the stub, and `POST /matchmaking` is stubbed at the browser network layer (the LLM pipeline is covered by the API tests).
- First-time setup: `pnpm --filter e2e exec playwright install chromium`.
