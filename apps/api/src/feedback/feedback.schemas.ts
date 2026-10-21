import { FEEDBACK_LIMITS, FeedbackRating, FeedbackReason } from '@opm/shared-types';
import { z } from 'zod';
import { FEEDBACK_REASON_MISMATCH_MESSAGE } from '../common/constants/feedback';
import { reasonFitsRating } from '../common/utils/feedback';

export const createFeedbackSchema = z
  .object({
    candidateId: z.string().trim().min(1).max(100),
    query: z.string().trim().min(1).max(FEEDBACK_LIMITS.query),
    rating: z.enum([FeedbackRating.POSITIVE, FeedbackRating.NEGATIVE]),
    reason: z
      .enum([
        FeedbackReason.GREAT_MATCH,
        FeedbackReason.DIFFERENT_INDUSTRY,
        FeedbackReason.SKILL_MISMATCH,
        FeedbackReason.OTHER,
      ])
      .optional(),
    comment: z
      .string()
      .trim()
      .max(FEEDBACK_LIMITS.comment)
      .optional()
      .transform((comment) => comment || undefined),
  })
  .strict()
  .refine((v) => reasonFitsRating(v.rating, v.reason), {
    path: ['reason'],
    message: FEEDBACK_REASON_MISMATCH_MESSAGE,
  });
