'use client';

import * as React from 'react';
import type { FeedbackAnalyticsResponse } from '@opm/shared-types';
import { FEEDBACK_LOAD_FAILED } from '@/constants/feedback';
import { fetchFeedback } from '@/lib/api';
import { errorMessage } from '@/utils/errors';

/** Loads the admin feedback analytics once, and again on `refresh`. */
export function useFeedbackAnalytics() {
  const [analytics, setAnalytics] = React.useState<FeedbackAnalyticsResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchFeedback(controller.signal)
      .then(setAnalytics)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err, FEEDBACK_LOAD_FAILED));
      });
    return () => controller.abort();
  }, [attempt]);

  const refresh = React.useCallback(() => setAttempt((a) => a + 1), []);
  return { analytics, loading: analytics === null && error === null, error, refresh };
}
