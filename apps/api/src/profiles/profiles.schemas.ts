import { z } from 'zod';
import {
  EMPTY_PROFILE_UPDATE_MESSAGE,
  REGISTRATION_LIMITS as LIMITS,
} from '../common/constants/profiles';
import { requiredText } from '../common/utils/zod';

/**
 * Strict on purpose: id, email, role, status, diplomaNumber and graduationYear are not editable,
 * so sending any of them is a 400 instead of being silently ignored.
 */
export const updateProfileSchema = z
  .strictObject({
    fullName: requiredText(LIMITS.fullName).optional(),
    headline: requiredText(LIMITS.headline).optional(),
    bio: z.string().trim().max(LIMITS.bio).optional(),
    city: requiredText(LIMITS.city).optional(),
    industry: requiredText(LIMITS.industry).optional(),
    skills: z.array(requiredText(LIMITS.skill)).max(LIMITS.maxSkills).optional(),
  })
  .refine((patch) => Object.values(patch).some((v) => v !== undefined), {
    message: EMPTY_PROFILE_UPDATE_MESSAGE,
  });
