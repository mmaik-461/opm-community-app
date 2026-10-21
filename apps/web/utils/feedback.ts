import { FeedbackRating, FeedbackReason } from '@opm/shared-types';
import { NEGATIVE_FEEDBACK_REASONS } from '@/constants/feedback';

/** Reason sent with a verdict: "Great match" for a thumbs up, the chosen one (if valid) for a thumbs down. */
export function feedbackReasonFor(
  rating: FeedbackRating,
  chosen: FeedbackReason | null,
): FeedbackReason | undefined {
  if (rating === FeedbackRating.POSITIVE) return FeedbackReason.GREAT_MATCH;
  return chosen && (NEGATIVE_FEEDBACK_REASONS as readonly FeedbackReason[]).includes(chosen)
    ? chosen
    : undefined;
}

export function formatPercent(value: number): string {
  return `${value}%`;
}
