import { PASSWORD_RULES } from '@opm/shared-types';
import { z } from 'zod';
import { PASSWORD_MAX_LENGTH } from '../common/constants/auth';
import { REGISTRATION_LIMITS as LIMITS } from '../common/constants/profiles';
import { requiredText } from '../common/utils/zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const devLoginSchema = z.object({
  profileId: z.string().trim().min(1).max(100),
});

/** One issue per unmet rule, so the 400 lists exactly which criteria failed. */
const strongPassword = PASSWORD_RULES.reduce(
  (schema, rule) => schema.refine(rule.test, rule.label),
  z.string().max(PASSWORD_MAX_LENGTH),
);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(LIMITS.email).pipe(z.email()),
  password: strongPassword,
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
