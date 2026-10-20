import * as React from 'react';
import { vi } from 'vitest';
import { DEV_PROVIDER_ID } from '@/constants/auth';

/** The mocked session issues one distinct token per user, like the real one. */
export const testAccessToken = (userId: string) => `test-access-token-${userId}`;

interface MockSession {
  accessToken: string;
  user: { id: string };
}

let session: MockSession | null = null;
const listeners = new Set<() => void>();

/** Signs the mocked NextAuth client in as `userId` (or out with null) and notifies subscribers. */
export function setMockSession(userId: string | null) {
  session = userId ? { accessToken: testAccessToken(userId), user: { id: userId } } : null;
  listeners.forEach((notify) => notify());
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

export function useSession() {
  const current = React.useSyncExternalStore(
    subscribe,
    () => session,
    () => session,
  );
  return current
    ? { data: current, status: 'authenticated' as const }
    : { data: null, status: 'unauthenticated' as const };
}

export const getSession = vi.fn(async () => session);

const SIGN_IN_OK = { ok: true, error: undefined, status: 200, url: null };
const SIGN_IN_FAILED = { ok: false, error: 'CredentialsSignin', status: 401, url: null };

/**
 * Behaves like `signIn(..., { redirect: false })`: dev impersonation always succeeds; credential
 * sign-in fails unless a test arranges otherwise via `signIn.mockImplementationOnce`.
 */
export const signIn = vi.fn(async (provider: string, options?: Record<string, string>) => {
  if (provider === DEV_PROVIDER_ID && options?.profileId) {
    setMockSession(options.profileId);
    return SIGN_IN_OK;
  }
  return SIGN_IN_FAILED;
});

export const signOut = vi.fn(async () => {
  setMockSession(null);
  return { url: '' };
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export function resetMockAuth() {
  setMockSession(null);
  getSession.mockClear();
  signIn.mockClear();
  signOut.mockClear();
}
