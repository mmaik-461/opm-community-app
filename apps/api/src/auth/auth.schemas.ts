import { z } from 'zod';
import { PASSWORD_MAX_LENGTH } from '../common/constants/auth';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const devLoginSchema = z.object({
  profileId: z.string().trim().min(1).max(100),
});
