'use client';

import * as React from 'react';
import type { IntrosResponse, PaginatedIntros } from '@opm/shared-types';
import { EMPTY_INTROS_RESPONSE } from '@/constants/intros';
import { fetchIntros } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import { useUser } from './user-context';

interface IntrosContextValue {
  sent: PaginatedIntros;
  received: PaginatedIntros;
  setReceivedPage: (page: number) => void;
  setSentPage: (page: number) => void;
  pendingIncoming: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const IntrosContext = React.createContext<IntrosContextValue | null>(null);

export function IntrosProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  const [data, setData] = React.useState<IntrosResponse>(EMPTY_INTROS_RESPONSE);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [receivedPage, setReceivedPage] = React.useState(1);
  const [sentPage, setSentPage] = React.useState(1);
  const [attempt, setAttempt] = React.useState(0);

  // Page state belongs to the acting user; reset when switching.
  React.useEffect(() => {
    setReceivedPage(1);
    setSentPage(1);
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      setData(EMPTY_INTROS_RESPONSE);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchIntros({ receivedPage, sentPage }, controller.signal)
      .then((res) => {
        // A page past the end (e.g. data shrank) snaps back to the last page.
        if (res.received.data.length === 0 && receivedPage > res.received.meta.totalPages) {
          setReceivedPage(res.received.meta.totalPages);
          return;
        }
        if (res.sent.data.length === 0 && sentPage > res.sent.meta.totalPages) {
          setSentPage(res.sent.meta.totalPages);
          return;
        }
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, 'Failed to load intros'));
        setLoading(false);
      });
    return () => controller.abort();
  }, [userId, receivedPage, sentPage, attempt]);

  const refresh = React.useCallback(() => setAttempt((a) => a + 1), []);

  const value = React.useMemo<IntrosContextValue>(
    () => ({
      sent: data.sent,
      received: data.received,
      pendingIncoming: data.pendingIncoming,
      setReceivedPage,
      setSentPage,
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
