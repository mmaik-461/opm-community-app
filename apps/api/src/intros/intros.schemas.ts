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

export const listIntrosQuerySchema = z.object({
  userId: z.string().trim().min(1).max(100),
});
