import { z } from 'zod';

export const createIntroSchema = z.object({
  requesterId: z.string().trim().min(1).max(100),
  targetId: z.string().trim().min(1).max(100),
  query: z.string().trim().min(1).max(1000),
  icebreaker: z.string().trim().min(1).max(2000),
});

export const updateIntroStatusSchema = z.object({
  userId: z.string().trim().min(1).max(100),
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

export const DEFAULT_INTROS_LIMIT = 5;

export const listIntrosQuerySchema = z.object({
  userId: z.string().trim().min(1).max(100),
  receivedPage: z.coerce.number().int().min(1).default(1),
  sentPage: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(DEFAULT_INTROS_LIMIT),
});

export type ListIntrosQuery = z.infer<typeof listIntrosQuerySchema>;
