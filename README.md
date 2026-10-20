# OPM Community Hub

An MVP for the OPM alumni community built around one core journey: **Ask the community → get AI-matched alumni → send a ready-to-use icebreaker.**

## Value proposition

Alumni networks are valuable but hard to navigate. Instead of browsing a directory, a member describes what they need in plain language ("Visiting London next week — who can connect for a fintech coffee?"). The hub finds the alumni best placed to help, explains *why* each one is a fit, and drafts a personalised opening message to copy, email, or send via LinkedIn.

Scope is deliberately tight: no real-time chat, no maps, no real authentication. The next action always happens outside the app.

## Architecture: two-stage hybrid AI

```
Query ──► OpenAI text-embedding-3-small (1536 dims)
      ──► PostgreSQL + pgvector: ORDER BY embedding <=> query_vector  (cosine distance, top 6 candidates)
      ──► Anthropic Claude: contextual re-ranking → top 3 + matchReason + suggestedIcebreaker
      ──► Zod-validated structured output ──► joined with DB profiles ──► MatchResult[]
```

1. **Retrieval (cheap, broad).** The query is embedded and compared with precomputed alumni embeddings using pgvector's cosine distance operator (`<=>`). The requesting user is excluded from candidates.
2. **Reasoning (precise, contextual).** Claude receives the request and the 6 candidates, selects the best 3, and writes a grounded reason and icebreaker for each. Output uses Anthropic structured outputs (JSON schema) and is re-validated server-side with Zod (`matchmaking.schemas.ts`); only profile IDs present in the candidate set are accepted.

> **Model note:** the original brief named Claude 3.5 Sonnet, which Anthropic has retired. The service defaults to `claude-sonnet-5-5` and can be overridden with the `ANTHROPIC_MODEL` environment variable.

Shared request/response contracts live in `packages/shared-types` and are used by both apps.

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
apps/api            NestJS backend (profiles, matchmaking modules)
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
- **Mock user switcher, not auth.** The "Acting as" dropdown sets `currentUserId` in a React context. It is sent with matchmaking requests so the API can exclude that user from their own results. There are no sessions or tokens in this MVP.
- **Prompt-injection defence.** The user query, target city, and candidate profiles are treated as untrusted data: each is encapsulated in delimited tags (`<user_request>`, `<target_city>`, `<candidates>` as JSON), the system prompt instructs the model never to follow instructions found inside them, output is constrained by a JSON schema, and the response is Zod-validated with returned IDs checked against the candidate set. Request payloads are validated (query 3–1000 chars) before use.
- **Mobile-first UI.** Header wraps without overflow, starter chips scroll with snap on small screens, and match cards go from 1 to 2 to 3 columns. See `apps/web/FRONTEND_GUIDELINES.md`.

## End-to-end verification checklist

- [ ] `docker compose up -d` starts Postgres; `prisma migrate dev` and `prisma db seed` succeed (25 profiles).
- [ ] `GET http://localhost:4000/profiles` returns 25 alumni.
- [ ] `pnpm dev` serves the app at http://localhost:3000 with no console errors (favicon loads).
- [ ] **Acting as** dropdown opens under its button, lists all 25 alumni, and switching updates the label.
- [ ] Clicking a starter chip (e.g. "Fintech in London") shows a loading state, then up to 3 match cards with % match, "Why this match", and an icebreaker.
- [ ] **Target city** dropdown opens and filters the search by city.
- [ ] **Copy Message** shows "Copied!"; Email and LinkedIn links open for profiles that have them.
- [ ] Results never include the currently selected user.
- [ ] Alumni Directory: filters and debounced search work; a no-match search shows "No alumni match your filters" at the same width and height as the populated grid.
- [ ] Resize to 375 px, 768 px, and 1280 px: no horizontal scroll; grids use 1 / 2 / 3 columns.
- [ ] `pnpm --filter web typecheck` and `pnpm --filter web build` pass.
