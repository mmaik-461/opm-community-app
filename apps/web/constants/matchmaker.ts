export type MatchmakerStatus = 'idle' | 'loading' | 'done' | 'error';

export const STARTER_QUERIES = [
  'Series A Fundraising',
  'Fintech in London',
  'B2B SaaS Growth',
  'CleanTech in Berlin',
];

export const LOADING_STAGES = [
  'Querying semantic community embeddings...',
  'Generating personalized icebreakers with Claude...',
];

export const ANY_CITY = '__any__';
export const STAGE_ADVANCE_DELAY_MS = 1800;
export const MATCH_DISPLAY_LIMIT = 3;
export const MAX_QUERY_LENGTH = 1000;
export const MAX_DATES_LENGTH = 100;
export const COPY_FEEDBACK_MS = 2000;
export const EMAIL_SUBJECT = 'Connecting via OPM Community';
