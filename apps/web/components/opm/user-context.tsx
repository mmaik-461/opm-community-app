'use client';

import * as React from 'react';
import type { Profile } from '@opm/shared-types';
import { fetchProfiles } from '@/lib/api';

const STORAGE_KEY = 'opm.currentUserId';

interface UserContextValue {
  profiles: Profile[];
  currentUser: Profile | null;
  setCurrentUserId: (id: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const UserContext = React.createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [currentUserId, setId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchProfiles(controller.signal)
      .then((data) => {
        setProfiles(data);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch {
          /* storage unavailable */
        }
        setId(data.find((p) => p.id === stored)?.id ?? data[0]?.id ?? null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load alumni');
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const setCurrentUserId = React.useCallback((id: string) => {
    setId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const reload = React.useCallback(() => setAttempt((a) => a + 1), []);

  const value = React.useMemo<UserContextValue>(
    () => ({
      profiles,
      currentUser: profiles.find((p) => p.id === currentUserId) ?? null,
      setCurrentUserId,
      loading,
      error,
      reload,
    }),
    [profiles, currentUserId, setCurrentUserId, loading, error, reload],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
