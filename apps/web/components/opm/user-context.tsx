'use client';

import * as React from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import type { Profile } from '@opm/shared-types';
import { DEV_PROVIDER_ID } from '@/constants/auth';
import { fetchProfiles } from '@/lib/api';
import { isDevLoginEnabled } from '@/utils/auth';
import { errorMessage } from '@/utils/errors';

interface UserContextValue {
  authenticated: boolean;
  profiles: Profile[];
  currentUser: Profile | null;
  /** Development impersonation: re-signs in as another alumnus. A no-op when dev login is off. */
  setCurrentUserId: (id: string) => void;
  devLoginEnabled: boolean;
  signOut: () => void;
  /** True while the session or the directory is still being read. */
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Swaps a freshly saved profile into the directory so every view shows it immediately. */
  replaceProfile: (profile: Profile) => void;
}

const UserContext = React.createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const authenticated = status === 'authenticated';
  const sessionUserId = session?.user.id ?? null;
  const devLoginEnabled = isDevLoginEnabled();

  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  // Re-read on every acting-user change so verification status and role are never stale.
  React.useEffect(() => {
    if (!authenticated) {
      setProfiles([]);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoadingProfiles(true);
    setError(null);
    fetchProfiles(controller.signal)
      .then((data) => {
        setProfiles(data);
        setLoadingProfiles(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, 'Failed to load alumni'));
        setLoadingProfiles(false);
      });
    return () => controller.abort();
  }, [authenticated, sessionUserId, attempt]);

  const setCurrentUserId = React.useCallback(
    (id: string) => {
      if (!devLoginEnabled) return;
      void signIn(DEV_PROVIDER_ID, { profileId: id, redirect: false });
    },
    [devLoginEnabled],
  );

  const handleSignOut = React.useCallback(() => void signOut({ redirect: false }), []);
  const reload = React.useCallback(() => setAttempt((a) => a + 1), []);
  const replaceProfile = React.useCallback(
    (updated: Profile) =>
      setProfiles((list) => list.map((p) => (p.id === updated.id ? updated : p))),
    [],
  );

  const value = React.useMemo<UserContextValue>(
    () => ({
      authenticated,
      profiles,
      currentUser: profiles.find((p) => p.id === sessionUserId) ?? null,
      setCurrentUserId,
      devLoginEnabled,
      signOut: handleSignOut,
      loading: status === 'loading' || loadingProfiles,
      error,
      reload,
      replaceProfile,
    }),
    [
      authenticated,
      profiles,
      sessionUserId,
      setCurrentUserId,
      devLoginEnabled,
      handleSignOut,
      status,
      loadingProfiles,
      error,
      reload,
      replaceProfile,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
