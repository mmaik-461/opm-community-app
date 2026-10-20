'use client';

import * as React from 'react';
import type { IntroRequestResponse, IntrosResponse } from '@opm/shared-types';
import { fetchIntros } from '@/lib/api';
import { useUser } from './user-context';

interface IntrosContextValue {
  sent: IntroRequestResponse[];
  received: IntroRequestResponse[];
  pendingIncoming: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const IntrosContext = React.createContext<IntrosContextValue | null>(null);

const EMPTY: IntrosResponse = { sent: [], received: [] };

export function IntrosProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  const [data, setData] = React.useState<IntrosResponse>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchIntros(userId, controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load intros');
        setLoading(false);
      });
    return () => controller.abort();
  }, [userId, attempt]);

  const refresh = React.useCallback(() => setAttempt((a) => a + 1), []);

  const value = React.useMemo<IntrosContextValue>(
    () => ({
      ...data,
      pendingIncoming: data.received.filter((i) => i.status === 'PENDING').length,
      loading,
      error,
      refresh,
    }),
    [data, loading, error, refresh],
  );

  return <IntrosContext.Provider value={value}>{children}</IntrosContext.Provider>;
}

export function useIntros(): IntrosContextValue {
  const ctx = React.useContext(IntrosContext);
  if (!ctx) throw new Error('useIntros must be used within IntrosProvider');
  return ctx;
}
