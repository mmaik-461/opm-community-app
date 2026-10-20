# OPM Community App — Claude Code Instructions

## Project Overview
MVP for OPM alumni community focused on: "Ask Community + AI Matchmaking" (Semantic search via pgvector + Icebreaker generation).
Timebox: 3 days. Focus on Core User Journey, avoid over-engineering.

## Tech Stack & Monorepo Layout
- Monorepo: Turborepo + pnpm
- Infrastructure: Local Docker Compose (PostgreSQL 16 with pgvector)
- Apps:
  - `apps/web`: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
  - `apps/api`: Nest.js, Prisma ORM, pgvector
- Packages:
  - `packages/shared-types`: Shared DTOs, schemas, and API contracts
  - `packages/tsconfig`: Shared TS configs
  - `packages/eslint-config`: Shared linter configs
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

## Architecture & MVP Constraints (Strict)
1. **Scope Boundaries:**
   - NO real-time chat/WebSockets. Next action is external (LinkedIn / WhatsApp / Email) + AI Icebreaker generator.
   - NO complex auth. Use a lightweight Mock User Switcher on the frontend.
   - NO complex maps/GIS. Simple location chips and status ("Living in" / "Traveling to").
2. **AI & Vector Search:**
   - Reasoning & Generation: Anthropic Claude 3.5 Sonnet (via `@anthropic-ai/sdk` or Vercel AI SDK).
   - Embeddings: OpenAI `text-embedding-3-small` (or local equivalent).
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
  - Modular structure (`modules/users`, `modules/matchmaking`, `modules/ai`).
  - Validation pipes with `class-validator` / `zod` for all incoming payloads.
  - Never run raw Prisma queries inside controllers; use service layers.

## Testing & Quality Gate
- Run `typecheck` and `lint` on modified packages before finalizing any feature.
- Ensure the seed script generates 20-30 realistic alumni profiles with precalculated embeddings.