import { z } from 'zod';

export const travelContextSchema = z.object({
  city: z.string().trim().min(1).max(100),
  dates: z.string().trim().max(100).optional(),
});

export const matchmakingRequestSchema = z
  .object({
    query: z.string().trim().max(1000),
    targetCity: z.string().trim().min(1).max(100).optional(),
    travelContext: travelContextSchema.optional(),
  })
  .refine((v) => v.travelContext || v.query.length >= 3, {
    path: ['query'],
    message: 'query must be at least 3 characters',
  });

/** What Claude returns; the service joins it with DB profiles to build `MatchResult`. */
export const llmMatchesSchema = z.object({
  matches: z
    .array(
      z.object({
        profileId: z.string(),
        matchReason: z.string().min(1),
        mutualSynergy: z.string().min(1),
        suggestedIcebreaker: z.string().min(1),
      }),
    )
    .min(1),
});

export type LlmMatches = z.infer<typeof llmMatchesSchema>;

/** JSON schema sent to Anthropic structured outputs (mirrors `llmMatchesSchema`). */
export const llmMatchesJsonSchema = {
  type: 'object',
  properties: {
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          profileId: { type: 'string' },
          matchReason: { type: 'string' },
          mutualSynergy: { type: 'string' },
          suggestedIcebreaker: { type: 'string' },
        },
        required: ['profileId', 'matchReason', 'mutualSynergy', 'suggestedIcebreaker'],
        additionalProperties: false,
      },
    },
  },
  required: ['matches'],
  additionalProperties: false,
} as const;
