import { FeedbackReason, type FeedbackRating } from '@opm/shared-types';

export const FEEDBACK_PROMPT = 'Was this a good match?';
export const FEEDBACK_THANKS = 'Thanks for your feedback';
export const FEEDBACK_SUBMIT_FAILED = 'Could not send your feedback';

export const FEEDBACK_DIALOG_TITLE = 'What was off about this match?';
export const FEEDBACK_DIALOG_DESCRIPTION =
  'Your answer helps the matchmaker find better people next time. The comment is optional.';
export const FEEDBACK_COMMENT_LABEL = 'Comment (optional)';

/** Shown for every reason; the negative dialog offers all but GREAT_MATCH. */
export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  GREAT_MATCH: 'Great match',
  DIFFERENT_INDUSTRY: 'Different industry',
  SKILL_MISMATCH: 'Skill mismatch',
  OTHER: 'Other',
};

export const NEGATIVE_FEEDBACK_REASONS = [
  FeedbackReason.DIFFERENT_INDUSTRY,
  FeedbackReason.SKILL_MISMATCH,
  FeedbackReason.OTHER,
] as const;

export const FEEDBACK_RATING_LABELS: Record<FeedbackRating, string> = {
  POSITIVE: 'Relevant',
  NEGATIVE: 'Not relevant',
};

export const FEEDBACK_ANALYTICS_TITLE = 'Feedback analytics';
export const FEEDBACK_ANALYTICS_SUBTITLE =
  'How alumni rate the matches the AI Matchmaker suggests, newest first.';
export const FEEDBACK_LOAD_FAILED = 'Failed to load feedback';
export const FEEDBACK_EMPTY_TITLE = 'No feedback yet';
export const FEEDBACK_EMPTY_MESSAGE =
  'Ratings from the AI Matchmaker will show up here once alumni start reviewing matches.';
export const FEEDBACK_NO_DETAILS_LABEL = '—';

export const FEEDBACK_COLUMNS = [
  'Date',
  'Reviewer',
  'Search query',
  'Recommended candidate',
  'Rating',
  'Reason & comment',
] as const;

export const FEEDBACK_METRIC_LABELS = {
  total: 'Total reviews',
  satisfaction: 'Satisfaction rate',
} as const;
