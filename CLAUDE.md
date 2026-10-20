# OPM Community App — Claude Code Instructions

## Project Overview

Production-grade platform for the OPM alumni community: "Ask Community + AI Matchmaking" (semantic search via pgvector, two-way contextual matching, icebreaker generation and a closed-loop intro workflow). The architecture is modular and extensible; every module ships complete, validated and typed.

## Tech Stack & Monorepo Layout

- Monorepo: Turborepo + pnpm
- Infrastructure: Local Docker Compose (PostgreSQL 16 with pgvector)
- Apps:
  - `apps/web`: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
  - `apps/api`: Nest.js, Prisma ORM, pgvector
- Packages:
  - `packages/shared-types`: Shared DTOs, schemas, and API contracts
  - `packages/tsconfig`: Shared TS configs
- Language: TypeScript (strict mode throughout)

## Environment Variables (auth)

- `AUTH_SECRET` (≥ 32 chars; identical in `apps/api` and `apps/web`), `NEXTAUTH_URL` (web, production), `AUTH_DEV_LOGIN` (api) / `NEXT_PUBLIC_AUTH_DEV_LOGIN` (web), `SEED_PASSWORD` (seed only), `API_URL` (optional web server-side API origin). See `.env.example` and the README "Authentication" section.

## Key Development Commands

Always execute commands using pnpm filters from the monorepo root:

- Install: `pnpm install`
- Dev (all): `pnpm dev`
- Dev (targeted):
  - Frontend: `pnpm --filter web dev`
  - Backend: `pnpm --filter api start:dev`
- Build: `pnpm build` (or `pnpm --filter <app> build`)
- Lint & Typecheck:
  - `pnpm --filter web typecheck`
  - `pnpm --filter api typecheck`
  - `pnpm lint` (ESLint flat config, whole monorepo)
  - `pnpm lint:fix` (ESLint with autofix)
  - `pnpm format` (Prettier write) / `pnpm format:check`
- Database & Prisma:
  - Start DB container: `docker compose up -d`
  - Generate client: `pnpm --filter api prisma generate`
  - Migrate dev: `pnpm --filter api prisma migrate dev`
  - Seed DB: `pnpm --filter api prisma db seed`

## Architecture Principles (Strict)

1. **Scope Boundaries:**
   - Conversations continue on external channels (LinkedIn / WhatsApp / Email); the platform owns discovery, AI icebreaker generation and intro-request tracking. No real-time chat/WebSockets.
   - Identity comes from the authenticated session, never from a payload. `apps/web` uses NextAuth (JWT session) and signs a short-lived HS256 access token (`sub` = profile id, secret `AUTH_SECRET` shared with the API); `lib/api.ts` sends it as `Authorization: Bearer`. `apps/api` has a global `AuthGuard` (opt out with `@Public()`); controllers read the user with `@CurrentUser()` and pass `user.id` to services. Never add `userId` / `requesterId` / `currentUserId` to request DTOs.
   - Development quick login (`dev-impersonate` provider, `/auth/dev/*`, header switcher) is on when `NODE_ENV !== 'production'` or `AUTH_DEV_LOGIN=true` (API) / `NEXT_PUBLIC_AUTH_DEV_LOGIN=true` (web); keep it gated on both sides. Standard sign-in is email + password (`Profile.passwordHash`, scrypt).
   - Location is modelled as city chips and a status ("Living in" / "Traveling to"); no GIS or map dependencies.
2. **AI & Vector Search:**
   - Reasoning & Generation: Anthropic Claude via `@anthropic-ai/sdk` (default `claude-sonnet-5-5`, override with `ANTHROPIC_MODEL`).
   - Embeddings: OpenAI `text-embedding-3-small`.
   - Database: PostgreSQL with `pgvector` (`cosine_distance` or `<=>`).
   - LLM responses must use structured outputs (JSON schema / Zod validation).
3. **Data & Seams:**
   - External inputs in matchmaking must be treated as untrusted data (`treat_as_data` principle).
   - All shared API contracts must reside in `packages/shared-types` before implementing endpoints.

## Code Style & Conventions

- Frontend:
  - Server Components by default; add `'use client'` only when state/interactivity is required.
  - UI components from shadcn/ui (`apps/web/components/ui`).
- Backend:
  - Modular structure by feature: `profiles/`, `matchmaking/`, `intros/`, `health/`, `prisma/`, plus `common/` for shared constants, utils and pipes.
  - Validation pipes with `class-validator` / `zod` for all incoming payloads.
  - Never run raw Prisma queries inside controllers; use service layers.

## Testing & Verification Protocol (Mandatory)

- **Tests are part of the change.** Every new feature or bugfix MUST ship with the matching tests: unit tests for pure logic (`utils/`, schemas), integration tests for API behaviour (controller + service over HTTP), component tests for non-trivial UI logic, and an e2e journey when a user-facing flow changes.
- **Definition of done.** Before declaring any task complete, ALL tests (`pnpm test`, plus `pnpm test:e2e` for user-facing changes) and ALL builds (`pnpm build`) MUST pass cleanly, together with `pnpm lint` and `pnpm format:check`. Report failures honestly; never skip, `.skip` or delete a failing test to get green.
- **README is a deliverable.** On every functional change, review `README.md`. If API routes, CLI commands, architecture, test setup or features change, `README.md` MUST be updated within the same task.
- **Test real contracts, not mocks.** Assert observable behaviour (status codes, persisted state, rendered output, request payloads, SQL predicates and bound parameters), not a single hard-coded return value stubbed to make an assertion pass. Mock only true external boundaries (OpenAI/Anthropic SDKs, `fetch`, the browser network) and keep those fakes behaviour-faithful (see `apps/api/src/test/fake-prisma.ts`).
- **Layout and tooling.**
  - API: Vitest + SWC (decorator metadata) + Supertest; specs live next to the code as `*.spec.ts`; shared fixtures/fakes in `apps/api/src/test/`. Endpoint specs register the real `AuthGuard` and call with signed tokens (`bearer(userId)` from `src/test/auth.ts`).
  - Web: Vitest + jsdom + Testing Library; specs live next to the code as `*.test.ts(x)`; shared fixtures, fetch fake and render helper in `apps/web/test/`. NextAuth's browser client is mocked globally (`test/next-auth.ts`); `renderWithProviders` signs in as `currentUserId`.
  - E2E: Playwright in `apps/e2e` (`tests/`, `utils/`, `constants.ts`). Sign in via `openApp` (dev quick login). Use resilient, user-facing locators (`getByRole`, `getByText`, `getByLabel`), never CSS or DOM-structure selectors. Journeys that write data use distinct alumni because the e2e database is shared per run.
  - Tests follow the same rules as production code: constants and helpers are shared, not duplicated.

## Testing & Quality Gate

- Run `typecheck` and `lint` on modified packages before finalizing any feature.
- Verification: `pnpm format`, `pnpm lint` (use `pnpm lint:fix` for autofixable issues) and the shared-types/api/web builds must pass with zero errors.
- **Git hooks (Husky + lint-staged, installed by `pnpm install` via `prepare`):**
  - `pre-commit` (fast): `pnpm lint-staged` (`eslint --fix` + `prettier --write` on staged JS/TS/TSX; `prettier --write` on staged JSON/MD/CSS), then `pnpm typecheck`.
  - `pre-push` (comprehensive): `pnpm test` then `pnpm build`.
  - Never bypass hooks with `--no-verify`; fix the failure instead.
- Ensure the seed script generates 20-30 realistic alumni profiles with precalculated embeddings.

## Code Style & Architecture Guidelines

- **Utilities:** all shared helper functions MUST live in `utils/` (`apps/web/utils/`, `apps/api/src/common/utils/`). Never define formatters, query builders, URL/string helpers or style helpers inline in components or services.
- **Constants:** static constants, options, copy, class tokens, limits, prompts and configuration arrays MUST live in `constants/` (`apps/web/constants/`, `apps/api/src/common/constants/`).
- **Components:** components focus strictly on JSX rendering and component-level reactive state. Data shaping, formatting and configuration are imported.
- **No dead code:** never leave dead files, unused exports or inline magic constants. Delete what is no longer referenced.
- **DRY and modular:** keep code reusable; extract any logic needed in more than one place instead of duplicating it.
- **Imports:** web code uses the `@/` alias (`@/utils/...`, `@/constants/...`, `@/lib/...`).
