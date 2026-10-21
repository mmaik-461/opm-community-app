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

export const SIGN_IN_TAB = 'Sign in';
export const SIGN_UP_TAB = 'Sign up';
export const SIGN_UP_TITLE = 'Join the OPM Community Hub';
export const SIGN_UP_SUBTITLE =
  'Create your alumni account. An administrator verifies it before matching unlocks.';
export const AUTH_NAV_LABEL = 'Account';
export const SIGN_UP_SUBMIT_LABEL = 'Create account';
export const SIGN_UP_SIGN_IN_FAILED_MESSAGE =
  'Your account was created, but signing in failed. Please use the Sign in page.';
export const PASSWORD_REQUIREMENTS_LABEL = 'Password requirements';
export const PASSWORD_MISMATCH_MESSAGE = 'Passwords do not match.';
export const PASSWORD_WEAK_MESSAGE = 'Choose a password that meets every requirement.';
export const DIPLOMA_NUMBER_HINT = 'Helps us verify you faster.';

export const GRADUATION_YEAR_MIN = 1980;

export const EMPTY_REGISTER_VALUES = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  city: '',
  industry: '',
  graduationYear: '',
  diplomaNumber: '',
};

export const VERIFICATION_BANNER_TITLE = 'Your account is awaiting alumni verification';
export const VERIFICATION_BANNER_MESSAGE =
  'You can browse the community now. AI matchmaking and intro requests unlock as soon as an administrator verifies your alumni status.';

export const REJECTED_BANNER_TITLE = 'Your alumni verification was not approved';
export const REJECTED_BANNER_MESSAGE =
  'You can still browse the community, but AI matchmaking and intro requests are unavailable. Contact an administrator if you think this is a mistake.';
