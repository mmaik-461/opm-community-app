# OPM Community Hub

An MVP for the OPM alumni community built around one core journey: **Ask the community → get AI-matched alumni → send a ready-to-use icebreaker → track the intro to a response.**

## Value proposition

Alumni networks are valuable but hard to navigate. Instead of browsing a directory, a member describes what they need in plain language ("Visiting London next week — who can connect for a fintech coffee?"). The hub finds the alumni best placed to help, explains *why* each one is a fit, and drafts a personalised opening message to copy, email, or send via LinkedIn.

Scope is deliberately tight: no real-time chat, no maps, no real authentication. The conversation itself always happens outside the app; the hub tracks the introduction request.

## Features

| Feature | What it does |
|---|---|
| **Two-Way Contextual Matchmaking** | Claude reasons over the requester's own profile (`<requester_profile>`) as well as the candidates. Each match returns a grounded `matchReason`, a structured `mutualSynergy` (the win-win angle: what the requester brings to the candidate), and a tailored `suggestedIcebreaker`. The requester is always excluded from their own results. |
| **Intro Request Workflow** | Closed loop, persisted in Postgres (`IntroRequest`, status `PENDING` / `ACCEPTED` / `DECLINED`). A pre-flight dialog lets the member edit the icebreaker before sending. Self-requests and duplicate pending requests are rejected. Sent and Received tabs are paginated independently, and a persistent badge in the header shows pending incoming requests. |
| **City Travel Mode** | Pick a destination city and optional dates. Candidates are strictly filtered to that city (case-insensitive), and icebreakers propose an in-person meetup that references the travel dates. If the free-form query is empty or generic, retrieval falls back to the requester's headline, industry, skills and bio. |

## Architecture: two-stage hybrid AI

```
Query ──► OpenAI text-embedding-3-small (1536 dims)
      ──► PostgreSQL + pgvector: ORDER BY embedding <=> query_vector  (cosine distance, top 6 candidates)
      ──► Anthropic Claude: contextual re-ranking → top 3 + matchReason + mutualSynergy + suggestedIcebreaker
      ──► Zod-validated structured output ──► joined with DB profiles ──► MatchResult[]
```

1. **Retrieval (cheap, broad).** The query is embedded and compared with precomputed alumni embeddings using pgvector's cosine distance operator (`<=>`). The requesting user is excluded from candidates. In Travel Mode, an additional `lower(city) = lower(:destination)` predicate is applied, and an empty or generic query is replaced by text built from the requester's profile.
2. **Reasoning (precise, contextual).** Claude receives the request, the requester's profile, an optional `<travel_context>` and the 6 candidates, selects the best 3, and writes a grounded reason, a mutual synergy analysis and an icebreaker for each. In Travel Mode the icebreaker is written for an in-person meetup and the synergy highlights local, offline context. Output uses Anthropic structured outputs (JSON schema) and is re-validated server-side with Zod (`matchmaking.schemas.ts`); only profile IDs present in the candidate set are accepted.

> **Model note:** the original brief named Claude 3.5 Sonnet, which Anthropic has retired. The service defaults to `claude-sonnet-5-5` and can be overridden with the `ANTHROPIC_MODEL` environment variable.

Shared request/response contracts live in `packages/shared-types` and are used by both apps.

### API surface

| Route | Purpose |
|---|---|
| `GET /profiles` | Alumni directory (filters: `city`, `cohort`, `industry`). |
| `POST /matchmaking` | `{ query, currentUserId?, targetCity?, travelContext?: { city, dates? } }` → top 3 `MatchResult`. `query` may be empty only when `travelContext` is set. |
| `POST /intros` | Create an intro request (`PENDING`). `400` for self-requests, `409` for a duplicate pending request. |
| `GET /intros` | Sent and received intros for a user: `PaginatedIntros` per direction (`receivedPage`, `sentPage`, `limit`) plus `pendingIncoming` for the header badge. |
| `PATCH /intros/:id/status` | Target accepts or declines. `409` if already answered. |

### Data model

```
Profile 1 ──< IntroRequest >── 1 Profile
 (requester: SentIntros)         (target: ReceivedIntros)

IntroRequest { id, requesterId, targetId, query, icebreaker,
               status: IntroStatus(PENDING | ACCEPTED | DECLINED),
               createdAt, updatedAt }
indexes: (requesterId), (targetId, status)
```

`Profile` also carries a pgvector `embedding` column used for retrieval.

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo, pnpm workspaces |
| Web | Next.js 14 (App Router), React 18, Tailwind CSS v4, Radix UI (shadcn/ui components) |
| API | NestJS, Prisma ORM, Zod validation pipes |
| Database | PostgreSQL 16 + pgvector (Docker Compose) |
| AI | OpenAI `text-embedding-3-small`, Anthropic Claude |
| Language | TypeScript (strict) |

```
apps/web            Next.js frontend
apps/api            NestJS backend (profiles, matchmaking, intros modules)
packages/shared-types   DTOs and API contracts
packages/tsconfig, packages/eslint-config
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

# 3. Schema and data
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed   # 25 alumni profiles with precomputed embeddings

# 4. Run everything
pnpm dev                           # web on :3000, API on :4000
```

The frontend reads the API from `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). The API allows CORS from `http://localhost:3000` only.

**Seed embeddings:** with `OPENAI_API_KEY` set, the seed stores real `text-embedding-3-small` vectors. Without it, it falls back to a deterministic hashed bag-of-words vector (same 1536 dims) so the app still runs, but query embeddings from OpenAI will not be directly comparable, so seed with a key for meaningful results.

Quality gates: `pnpm --filter web typecheck`, `pnpm --filter api typecheck`, `pnpm lint`, `pnpm build`.

## Engineering highlights

- **React 18 `forwardRef` slot compatibility.** shadcn templates assume React 19 (`ref` as a prop). `Button` is wrapped in `React.forwardRef` so Radix `asChild` triggers (dropdowns) receive the DOM ref and anchor their popper correctly. Without it, menus mount but are positioned off-screen.
- **Zero layout shift in the directory.** Results always render inside a persistent `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with a reserved minimum height. The empty state is a `col-span-full` card inside that grid, and `<main>` is `w-full` so `mx-auto` in a flex column cannot shrink the page. Search input is debounced (250 ms) and the "Clear filters" slot reserves its height.
- **Zero layout shift in Travel Mode.** The Travel Mode banner, destination control and dates input occupy reserved space in both states (the dates field is `invisible` rather than unmounted on desktop), so toggling never moves the form or results.
- **Stable intros dashboard.** Sent/Received lists render in a fixed minimum-height container; during page changes the existing list is dimmed (`opacity-60`) rather than replaced by a loader, so pagination does not jump. The 3-column directory grid is preserved.
- **Mock user switcher, not auth.** The "Acting as" dropdown sets `currentUserId` in a React context. It is sent with matchmaking and intro requests so the API can exclude that user from their own results and load their profile as matching context. There are no sessions or tokens in this MVP.
- **Prompt-injection defence.** The user query, target city, travel context, requester profile and candidate profiles are treated as untrusted data: each is encapsulated in delimited tags (`<user_request>`, `<target_city>`, `<travel_context>`, `<requester_profile>`, `<candidates>` as JSON), the system prompt instructs the model never to follow instructions found inside them, output is constrained by a JSON schema, and the response is Zod-validated with returned IDs checked against the candidate set. Request payloads are validated (query 3–1000 chars, or empty with a `travelContext`) before use.
- **Mobile-first UI.** Header wraps without overflow, starter chips scroll with snap on small screens, and match cards go from 1 to 2 to 3 columns. See `apps/web/FRONTEND_GUIDELINES.md`.

## End-to-end verification checklist

- [ ] `docker compose up -d` starts Postgres; `prisma migrate dev` and `prisma db seed` succeed (25 profiles).
- [ ] `GET http://localhost:4000/profiles` returns 25 alumni.
- [ ] `pnpm dev` serves the app at http://localhost:3000 with no console errors (favicon loads).
- [ ] **Acting as** dropdown opens under its button, lists all 25 alumni, and switching updates the label.
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
