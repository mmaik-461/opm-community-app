'use client';

import * as React from 'react';
import { Role, type PendingVerification, type VerificationDecision } from '@opm/shared-types';
import { VERIFICATION_DECISION_FAILED, VERIFICATIONS_LOAD_FAILED } from '@/constants/admin';
import { decideVerification, fetchVerifications } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import { insertByCreatedAt } from '@/utils/verifications';
import { useUser } from './user-context';

interface VerificationsContextValue {
  pending: PendingVerification[];
  loading: boolean;
  /** Load failure for the list. */
  error: string | null;
  /** Failure of the last approve/reject; the row was put back. */
  actionError: string | null;
  /** Applicants with a decision in flight. */
  deciding: ReadonlySet<string>;
  /** Removes the row immediately, then confirms with the API; rolls back on failure. */
  decide: (id: string, decision: VerificationDecision) => Promise<boolean>;
  refresh: () => void;
}

const VerificationsContext = React.createContext<VerificationsContextValue | null>(null);

/** Only admins fetch anything; for everyone else the queue stays empty and no request is made. */
export function VerificationsProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();
  const userId = currentUser?.id ?? null;
  const isAdmin = currentUser?.role === Role.ADMIN;
  const [pending, setPending] = React.useState<PendingVerification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [deciding, setDeciding] = React.useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    setPending([]);
    setActionError(null);
    if (!isAdmin) {
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchVerifications(controller.signal)
      .then((res) => {
        setPending(res.data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, VERIFICATIONS_LOAD_FAILED));
        setLoading(false);
      });
    return () => controller.abort();
  }, [isAdmin, userId, attempt]);

  const decide = React.useCallback(
    async (id: string, decision: VerificationDecision) => {
      const row = pending.find((p) => p.id === id);
      if (!row) return false;
      setActionError(null);
      setPending((rows) => rows.filter((p) => p.id !== id));
      setDeciding((ids) => new Set(ids).add(id));
      try {
        await decideVerification(id, { decision });
        return true;
      } catch (err) {
        setPending((rows) => insertByCreatedAt(rows, row));
        setActionError(errorMessage(err, VERIFICATION_DECISION_FAILED));
        return false;
      } finally {
        setDeciding((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
      }
    },
    [pending],
  );

  const refresh = React.useCallback(() => setAttempt((a) => a + 1), []);

  const value = React.useMemo<VerificationsContextValue>(
    () => ({ pending, loading, error, actionError, deciding, decide, refresh }),
    [pending, loading, error, actionError, deciding, decide, refresh],
  );

  return <VerificationsContext.Provider value={value}>{children}</VerificationsContext.Provider>;
}

export function useVerifications(): VerificationsContextValue {
  const ctx = React.useContext(VerificationsContext);
  if (!ctx) throw new Error('useVerifications must be used within VerificationsProvider');
  return ctx;
}
