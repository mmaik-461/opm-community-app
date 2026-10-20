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
  - `pnpm lint`
- Database & Prisma:
  - Start DB container: `docker compose up -d`
  - Generate client: `pnpm --filter api prisma generate`
  - Migrate dev: `pnpm --filter api prisma migrate dev`
  - Seed DB: `pnpm --filter api prisma db seed`

## Architecture Principles (Strict)
1. **Scope Boundaries:**
   - Conversations continue on external channels (LinkedIn / WhatsApp / Email); the platform owns discovery, AI icebreaker generation and intro-request tracking. No real-time chat/WebSockets.
   - Identity is provided by the frontend acting-as user switcher; the selected `currentUserId` is sent with matchmaking and intro requests.
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

## Testing & Quality Gate
- Run `typecheck` and `lint` on modified packages before finalizing any feature.
- Ensure the seed script generates 20-30 realistic alumni profiles with precalculated embeddings.

## Code Style & Architecture Guidelines
- **Utilities:** all shared helper functions MUST live in `utils/` (`apps/web/utils/`, `apps/api/src/common/utils/`). Never define formatters, query builders, URL/string helpers or style helpers inline in components or services.
- **Constants:** static constants, options, copy, class tokens, limits, prompts and configuration arrays MUST live in `constants/` (`apps/web/constants/`, `apps/api/src/common/constants/`).
- **Components:** components focus strictly on JSX rendering and component-level reactive state. Data shaping, formatting and configuration are imported.
- **No dead code:** never leave dead files, unused exports or inline magic constants. Delete what is no longer referenced.
- **DRY and modular:** keep code reusable; extract any logic needed in more than one place instead of duplicating it.
- **Imports:** web code uses the `@/` alias (`@/utils/...`, `@/constants/...`, `@/lib/...`).
