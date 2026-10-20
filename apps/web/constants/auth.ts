export const CREDENTIALS_PROVIDER_ID = 'credentials';
export const DEV_PROVIDER_ID = 'dev-impersonate';

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
/** Short on purpose: `lib/api.ts` reads a fresh session (and token) before every request. */
export const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;
export const JWT_ALGORITHM = 'HS256';
export const MIN_AUTH_SECRET_LENGTH = 32;
export const BEARER_SCHEME = 'Bearer';

export const AUTH_SECRET_MISSING_MESSAGE = `AUTH_SECRET must be set (at least ${MIN_AUTH_SECRET_LENGTH} characters) and match the API's value`;

export const SIGN_IN_TITLE = 'Sign in to the OPM Community Hub';
export const SIGN_IN_SUBTITLE = 'Use your alumni account to find and meet the right people.';
export const SIGN_IN_FAILED_MESSAGE = 'Invalid email or password.';
export const DEV_LOGIN_FAILED_MESSAGE =
  'Quick login failed. Is the API running with dev login enabled?';
export const DEV_LOGIN_HEADING = 'Development quick login';
export const DEV_LOGIN_HINT = 'Visible outside production only. Pick any alumnus to act as.';
