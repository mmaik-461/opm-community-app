import { defineConfig, devices } from '@playwright/test';
import {
  API_PORT,
  API_URL,
  E2E_DATABASE_URL,
  SERVER_START_TIMEOUT_MS,
  WEB_PORT,
  WEB_URL,
} from './constants';

// The AI keys are blanked on purpose: the seed then uses deterministic embeddings and the
// API can never reach OpenAI/Anthropic from a test run (the matchmaker journey stubs /matchmaking).
const aiOff = { OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' };

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
      command: 'node scripts/prepare-db.mjs && pnpm --filter api build && pnpm --filter api start',
      url: `${API_URL}/profiles`,
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: {
        ...aiOff,
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: String(API_PORT),
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      command: `pnpm --filter web build && pnpm --filter web start -p ${WEB_PORT}`,
      url: WEB_URL,
      timeout: SERVER_START_TIMEOUT_MS,
      reuseExistingServer: false,
      env: { NEXT_PUBLIC_API_URL: API_URL, NEXT_DIST_DIR: '.next-e2e' },
    },
  ],
});
