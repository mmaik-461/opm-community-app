export const WEB_PORT = 3100;
export const API_PORT = 4100;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const API_URL = `http://localhost:${API_PORT}`;

/** Isolated database: `scripts/prepare-db.mjs` truncates and reseeds it on every run. */
export const E2E_DATABASE_URL =
  'postgresql://postgres:postgrespassword@localhost:5438/opm_community_e2e?schema=public';

export const SERVER_START_TIMEOUT_MS = 240_000;
export const SEARCH_DEBOUNCE_MS = 250;
/** Cumulative layout shift tolerated while interacting (Core Web Vitals "good" is 0.1). */
export const MAX_LAYOUT_SHIFT = 0.001;
export const MIN_DIRECTORY_GRID_HEIGHT_PX = 576;

export const MATCH_COUNT = 3;
