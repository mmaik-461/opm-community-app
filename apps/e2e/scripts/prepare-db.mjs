// Prepares the isolated e2e database: migrate, wipe, seed. Refuses to touch any other database.
import { execFileSync } from 'node:child_process';

const url = process.env.DATABASE_URL ?? '';
if (!/\/[^/?]*_e2e(\?|$)/.test(url)) {
  throw new Error('prepare-db: DATABASE_URL must point at a database whose name ends in "_e2e"');
}

const prisma = (args, input) =>
  execFileSync('pnpm', ['--filter', 'api', 'exec', 'prisma', ...args], {
    stdio: ['pipe', 'inherit', 'inherit'],
    input,
    env: process.env,
  });

prisma(['migrate', 'deploy']);
prisma(
  ['db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
  'TRUNCATE "IntroRequest", "Profile" CASCADE;',
);
prisma(['db', 'seed']);
