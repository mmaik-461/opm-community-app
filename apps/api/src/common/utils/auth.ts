import { ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedUser } from '@opm/shared-types';
import { jwtVerify } from 'jose';
import {
  AUTH_DEV_LOGIN_ENV,
  AUTH_SECRET_ENV,
  BEARER_SCHEME,
  JWT_ALGORITHM,
  MIN_AUTH_SECRET_LENGTH,
} from '../constants/auth';

export function extractBearerToken(header: string | undefined): string | null {
  const [scheme, token, ...rest] = header?.trim().split(/\s+/) ?? [];
  if (scheme?.toLowerCase() !== BEARER_SCHEME.toLowerCase() || !token || rest.length > 0) {
    return null;
  }
  return token;
}

export function getAuthSecret(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const secret = env[AUTH_SECRET_ENV]?.trim();
  if (!secret || secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new ServiceUnavailableException(
      `${AUTH_SECRET_ENV} must be configured (at least ${MIN_AUTH_SECRET_LENGTH} characters)`,
    );
  }
  return new TextEncoder().encode(secret);
}

/** Resolves the user a bearer token was issued to; throws when the signature, algorithm or expiry is invalid. */
export async function verifyAccessToken(
  token: string,
  secret: Uint8Array,
): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, secret, { algorithms: [JWT_ALGORITHM] });
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Access token has no subject');
  }
  return { id: payload.sub };
}

/** Quick-login is on outside production, or when explicitly enabled with `AUTH_DEV_LOGIN=true`. */
export function isDevLoginEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[AUTH_DEV_LOGIN_ENV] === 'true' || env.NODE_ENV !== 'production';
}
