import type { Prisma } from '@prisma/client';

export const FEEDBACK_CANDIDATE_NOT_FOUND_MESSAGE = 'Candidate profile not found';
export const FEEDBACK_SELF_MESSAGE = 'You cannot review your own profile';
export const FEEDBACK_REASON_MISMATCH_MESSAGE = 'The reason does not fit the rating';

/** Newest reviews listed in the admin analytics; the summary always covers every review. */
export const FEEDBACK_LIST_LIMIT = 200;

export const FEEDBACK_PERSON_SELECT = {
  id: true,
  fullName: true,
  email: true,
} satisfies Prisma.ProfileSelect;
