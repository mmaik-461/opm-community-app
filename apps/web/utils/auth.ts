import { BEARER_SCHEME } from '@/constants/auth';

/**
 * Quick login is on outside production, or when `NEXT_PUBLIC_AUTH_DEV_LOGIN=true`.
 * Both variables are read literally so Next inlines them into the client bundle.
 */
export function isDevLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_DEV_LOGIN === 'true' || process.env.NODE_ENV !== 'production';
}

export function bearerHeader(accessToken: string): string {
  return `${BEARER_SCHEME} ${accessToken}`;
}
