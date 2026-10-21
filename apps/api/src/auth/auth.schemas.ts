import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../common/constants/auth';
import { REGISTRATION_LIMITS as LIMITS } from '../common/constants/profiles';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const devLoginSchema = z.object({
  profileId: z.string().trim().min(1).max(100),
});

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(LIMITS.email).pipe(z.email()),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  fullName: requiredText(LIMITS.fullName),
  city: requiredText(LIMITS.city),
  industry: requiredText(LIMITS.industry),
  graduationYear: z
    .number()
    .int()
    .min(LIMITS.minGraduationYear)
    .refine((year) => year <= new Date().getFullYear(), 'must not be in the future'),
  diplomaNumber: z.string().trim().min(1).max(LIMITS.diplomaNumber).optional(),
  headline: z.string().trim().min(1).max(LIMITS.headline).optional(),
  bio: z.string().trim().max(LIMITS.bio).optional(),
  skills: z.array(requiredText(LIMITS.skill)).max(LIMITS.maxSkills).optional(),
});
