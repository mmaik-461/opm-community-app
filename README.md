# OPM Community Hub

A production-grade community platform for OPM alumni, built around one core journey: **Ask the community → get AI-matched alumni → send a ready-to-use icebreaker → track the intro to a response.**

## Value proposition

Alumni networks are valuable but hard to navigate. Instead of browsing a directory, a member describes what they need in plain language ("Visiting London next week — who can connect for a fintech coffee?"). The hub finds the alumni best placed to help, explains _why_ each one is a fit, and drafts a personalised opening message to copy, email, or send via LinkedIn.

The platform is intentionally focused on introductions: the conversation itself continues on the channel members prefer (email, LinkedIn, WhatsApp), while the hub owns discovery, drafting and tracking of every introduction request.

## Features

- **Two-way contextual matchmaking.** Claude reasons over the requester's own profile as well as the candidates. Each match returns a grounded `matchReason`, a `mutualSynergy` (what the requester brings to the candidate) and a tailored `suggestedIcebreaker`. The requester is always excluded.
- **Intro request workflow.** A persisted closed loop (`PENDING` / `ACCEPTED` / `DECLINED`) with an editable icebreaker, rejection of self-requests and duplicates, independently paginated Sent / Received tabs and a header badge for pending incoming requests.
- **City Travel Mode.** Pick a destination and optional dates. Candidates are strictly filtered to that city and icebreakers propose an in-person meetup. An empty or generic query falls back to the requester's own profile.
- **Match feedback loop.** A 👍 / 👎 control on every match (a thumbs down asks for a reason and optional comment), reviewed by admins in Feedback Analytics.
- **Registration and admin verification.** New accounts are `PENDING_VERIFICATION` until an admin approves them; only `ACTIVE` alumni can match and request intros.
- **Profile editing.** Members edit their own searchable fields; the embedding is regenerated in the same transaction.
- **Alumni directory** with city, cohort and industry filters, and a public landing page for guests.

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

## AI-Assisted Engineering Workflow

- **Implementation & coding agent:** Claude Code CLI powered by **Claude 5.5 Sonnet** for autonomous feature building, full-stack migrations (such as the Next.js App Router file-based routing migration) and comprehensive Playwright/Vitest test suites.
- **Architectural planning & strategy:** **Claude 5.5 Opus** for high-level system decomposition, data modelling and domain boundary design.
- **Technical advisory & code review:** **Gemini 2.5 Pro** as a sparring partner for architectural auditing, security review and pitch preparation.
- **Methodology:** Spec-Driven & Test-First Development: strict TypeScript contracts in shared packages (`packages/shared-types`), transactional Prisma operations, and verification through `pnpm test` + `pnpm test:e2e`, enforced locally by Husky pre-commit and pre-push hooks.

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
  app/not-found.tsx     Styled 404 page (renders inside the root layout, links back to `/`)
  app/loading.tsx       Root loading boundary: accessible skeleton (`role="status"`, `aria-busy`)
apps/e2e                Playwright end-to-end journeys (own API + web servers, isolated database)
apps/api                NestJS backend (auth, profiles, matchmaking, intros, feedback, admin modules)
  src/common/constants  Limits, prompts, Prisma selects
  src/common/utils      Shared helpers (pagination, prompt tags, vectors, env)
  src/common/pipes      Zod validation pipe
  src/common/guards     Global AuthGuard (bearer token verification)
  src/common/decorators @Public() and @CurrentUser()
packages/shared-types   DTOs and API contracts
packages/tsconfig       Shared TypeScript configs
```

## Testing

| Command         | What it runs                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm test`     | Unit + integration tests for `apps/api` and `apps/web` (Turborepo; builds `shared-types` first). |
| `pnpm test:e2e` | Playwright journeys in `apps/e2e`.                                                               |
| `pnpm test:all` | Both of the above.                                                                               |

API tests use Vitest + Supertest against the real auth guards and an in-memory Prisma fake; web tests use Vitest + Testing Library; e2e uses Playwright with its own API, web server and database. Only external boundaries (OpenAI, Anthropic, `fetch`, NextAuth's browser client) are faked. Details and the list of covered scenarios: [docs/testing.md](docs/testing.md).

## Documentation

- [API reference](docs/api.md): every route, payload and status code.
- [Authentication, verification and roles](docs/authentication.md): token flow, dev login, registration, admin verification, production checklist.
- [Web routes and data model](docs/web-and-data.md)
- [Testing](docs/testing.md)
- [Manual verification checklist](docs/verification-checklist.md)
- `apps/web/FRONTEND_GUIDELINES.md`: frontend conventions.

## Engineering highlights

- **React 18 `forwardRef` slot compatibility.** shadcn templates assume React 19 (`ref` as a prop). `Button` is wrapped in `React.forwardRef` so Radix `asChild` triggers (dropdowns) receive the DOM ref and anchor their popper correctly. Without it, menus mount but are positioned off-screen.
- **Zero layout shift in the directory.** Results always render inside a persistent `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with a reserved minimum height. The empty state is a `col-span-full` card inside that grid, and `<main>` is `w-full` so `mx-auto` in a flex column cannot shrink the page. Search input is debounced (250 ms) and the "Clear filters" slot reserves its height.
- **Zero layout shift in Travel Mode.** The Travel Mode banner, destination control and dates input occupy reserved space in both states (the dates field is `invisible` rather than unmounted on desktop), so toggling never moves the form or results.
- **Intros tab follows the acting user.** Switching the acting user always returns My Intros to the Received tab (and page 1 for both lists), so the pending badge and the visible list always describe the same user.
- **Stable intros dashboard.** Sent/Received lists render in a fixed minimum-height container; during page changes the existing list is dimmed (`opacity-60`) rather than replaced by a loader, so pagination does not jump. The 3-column directory grid is preserved.
- **Acting-as user switcher (development).** The "Acting as (Dev)" list in the account menu signs in again as the chosen alumnus through the dev-impersonation provider, so the session, and therefore the bearer token the API trusts, always matches the user on screen. The API derives the requester from that token to exclude them from their own results and load their profile as matching context.
- **Prompt-injection defence.** The user query, target city, travel context, requester profile and candidate profiles are treated as untrusted data: each is encapsulated in delimited tags (`<user_request>`, `<target_city>`, `<travel_context>`, `<requester_profile>`, `<candidates>` as JSON), the system prompt instructs the model never to follow instructions found inside them, output is constrained by a JSON schema, and the response is Zod-validated with returned IDs checked against the candidate set. Request payloads are validated (query 3–1000 chars, or empty with a `travelContext`) before use.
- **Mobile-first UI.** Header wraps without overflow, starter chips scroll with snap on small screens, and match cards go from 1 to 2 to 3 columns. See `apps/web/FRONTEND_GUIDELINES.md`.
