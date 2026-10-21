export const BEARER_SCHEME = 'Bearer';
export const JWT_ALGORITHM = 'HS256';

export const AUTH_SECRET_ENV = 'AUTH_SECRET';
export const AUTH_DEV_LOGIN_ENV = 'AUTH_DEV_LOGIN';
export const MIN_AUTH_SECRET_LENGTH = 32;

export const AUTH_AUTO_VERIFY_ENV = 'AUTH_AUTO_VERIFY';
/** Matches the web app's access-token lifetime (`ACCESS_TOKEN_TTL_SECONDS`). */
export const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

export const IS_PUBLIC_KEY = 'isPublic';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;
export const SCRYPT_KEY_LENGTH = 64;
export const SCRYPT_SALT_BYTES = 16;
export const PASSWORD_HASH_PREFIX = 'scrypt';
/** Verified against when the email is unknown, so unknown accounts cost the same as wrong passwords. */
export const DUMMY_PASSWORD_HASH = `${PASSWORD_HASH_PREFIX}$${'0'.repeat(SCRYPT_SALT_BYTES * 2)}$${'0'.repeat(SCRYPT_KEY_LENGTH * 2)}`;

export const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';
export const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists';
export const MISSING_TOKEN_MESSAGE = 'Authentication required';
export const INVALID_TOKEN_MESSAGE = 'Invalid or expired access token';

export const ROLES_KEY = 'roles';
export const FORBIDDEN_ROLE_MESSAGE = 'You do not have permission to perform this action';
