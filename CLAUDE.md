# OPM Community App — Project Rules

## Tech Stack
- Monorepo: Turborepo + pnpm
- Frontend: Next.js (App Router), Tailwind CSS, shadcn/ui
- Backend: Nest.js, Prisma ORM
- Database: PostgreSQL (pgvector)
- Language: TypeScript (strict mode)

## Architecture & Code Guidelines
- Follow domain-driven modular structure in Nest.js.
- Keep shared DTOs and API interfaces in `packages/shared-types`.
- Never commit secrets or hardcoded API keys.
- Write concise, readable code; prefer minimal dependencies.

## Dev Workflow
- Always verify changes before committing.
- Keep commits small, descriptive, and atomic.
