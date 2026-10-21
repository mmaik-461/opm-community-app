import { FeedbackRating, FeedbackReason } from '@opm/shared-types';

/** Whole-percent share of positive reviews; 0 when nobody has reviewed yet. */
export function satisfactionRate(positive: number, total: number): number {
  return total === 0 ? 0 : Math.round((positive / total) * 100);
}

/** "Great match" only describes a positive review; the other reasons only explain a negative one. */
export function reasonFitsRating(rating: FeedbackRating, reason: FeedbackReason | undefined) {
  if (reason === undefined || reason === FeedbackReason.OTHER) return true;
  return (reason === FeedbackReason.GREAT_MATCH) === (rating === FeedbackRating.POSITIVE);
}
