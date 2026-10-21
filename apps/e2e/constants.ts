export const WEB_PORT = 3100;
export const API_PORT = 4100;
export const EMBEDDINGS_STUB_PORT = 4200;
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

/** Isolated-run auth config; the secret is shared by the API (verifies) and web (signs). */
export const E2E_AUTH_SECRET = 'e2e-auth-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
/** Every seeded alumnus gets this password so the password sign-in journey is real. */
export const E2E_SEED_PASSWORD = 'e2e-correct-horse-battery';
/** Signed in first by `openApp`; journeys then switch with `actAs`. */
export const DEFAULT_USER = 'Anna Kowalska';
/** Journeys that need a real password account use their own alumnus (shared database). */
export const PASSWORD_USER = {
  fullName: 'Oleksandr Bondarenko',
  email: 'oleksandr.bondarenko@opm-alumni.example',
};

/** Registers through the UI; the shared database is reseeded per run, so the email stays unique. */
export const REGISTRANT = {
  fullName: 'Zoe Registrant',
  email: 'zoe.registrant@example.com',
  password: 'E2e-Registration-Pass1!',
  city: 'Prague',
  industry: 'Fintech',
  graduationYear: '2019',
  diplomaNumber: 'D-2019-0042',
};

/** Seeded administrator (`prisma/seed.ts`); reviews registrations in the verification panel. */
export const ADMIN_USER = 'Community Admin';

/** Distinct from `REGISTRANT`, which stays pending for the registration journey. */
export const APPLICANT = {
  fullName: 'Nadia Applicant',
  email: 'nadia.applicant@example.com',
  password: 'E2e-Applicant-Pass1!',
  city: 'Vienna',
  industry: 'HealthTech',
  graduationYear: '2017',
  diplomaNumber: 'D-2017-0314',
};
