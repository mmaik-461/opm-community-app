import { defineConfig, devices } from '@playwright/test';
import {
  API_PORT,
  EMBEDDINGS_STUB_PORT,
  E2E_AUTH_SECRET,
  E2E_SEED_PASSWORD,
  API_URL,
  E2E_DATABASE_URL,
  SERVER_START_TIMEOUT_MS,
  WEB_PORT,
  WEB_URL,
} from './constants';

// No real AI key is ever used: the seed runs keyless (deterministic embeddings), registration embeds
// through a local OpenAI-compatible stub, and the matchmaker journey stubs /matchmaking.
const aiOff = {
  ANTHROPIC_API_KEY: '',
  OPENAI_API_KEY: 'e2e-embeddings-stub-key',
  OPENAI_BASE_URL: `http://localhost:${EMBEDDINGS_STUB_PORT}/v1`,
};

export default defineConfig({
  testDir: './tests',
  // One shared database, so journeys run serially against distinct alumni.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node scripts/embeddings-stub.mjs',
      url: `http://localhost:${EMBEDDINGS_STUB_PORT}`,
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: { EMBEDDINGS_STUB_PORT: String(EMBEDDINGS_STUB_PORT) },
    },
    {
      command:
        'OPENAI_API_KEY= node scripts/prepare-db.mjs && pnpm --filter api build && pnpm --filter api start',
      url: `${API_URL}/health`,
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: {
        ...aiOff,
        DATABASE_URL: E2E_DATABASE_URL,
        AUTH_SECRET: E2E_AUTH_SECRET,
        AUTH_DEV_LOGIN: 'true',
        SEED_PASSWORD: E2E_SEED_PASSWORD,
        PORT: String(API_PORT),
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      command: `pnpm --filter web build && pnpm --filter web start -p ${WEB_PORT}`,
      url: WEB_URL,
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_AUTH_DEV_LOGIN: 'true', // `next start` runs with NODE_ENV=production
        NEXTAUTH_URL: WEB_URL,
        AUTH_SECRET: E2E_AUTH_SECRET,
        NEXT_DIST_DIR: '.next-e2e',
      },
    },
  ],
});
