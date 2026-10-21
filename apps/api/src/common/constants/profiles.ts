import type { Prisma } from '@prisma/client';
import { PROFILE_LIMITS } from '@opm/shared-types';

// `embedding` is an Unsupported() column, so Prisma never returns it; the select keeps that explicit.
export const PROFILE_SELECT = {
  id: true,
  fullName: true,
  headline: true,
  bio: true,
  city: true,
  travelStatus: true,
  cohort: true,
  graduationYear: true,
  industry: true,
  skills: true,
  status: true,
  role: true,
  avatarUrl: true,
  linkedinUrl: true,
  email: true,
} satisfies Prisma.ProfileSelect;

/** Everything the embedding text is built from. */
export const EMBEDDING_SOURCE_SELECT = {
  fullName: true,
  headline: true,
  bio: true,
  city: true,
  cohort: true,
  industry: true,
  skills: true,
  graduationYear: true,
} satisfies Prisma.ProfileSelect;

export const REQUESTER_CONTEXT_SELECT = {
  fullName: true,
  headline: true,
  cohort: true,
  industry: true,
  city: true,
  skills: true,
  bio: true,
} satisfies Prisma.ProfileSelect;

export const REGISTRATION_LIMITS = {
  ...PROFILE_LIMITS,
  email: 254,
  diplomaNumber: 64,
  /** First graduating year accepted at sign-up. */
  minGraduationYear: 1980,
} as const;

/** A bio shorter than this adds little signal, so the embedding text is padded with profile attributes. */
export const MIN_BIO_LENGTH_FOR_EMBEDDING = 40;

/** Profile fields that feed the embedding text; changing one of them invalidates the stored vector. */
export const EMBEDDED_PROFILE_FIELDS = [
  'fullName',
  'headline',
  'bio',
  'city',
  'industry',
  'skills',
] as const;

export const EMPTY_PROFILE_UPDATE_MESSAGE = 'Provide at least one field to update';

export const PENDING_VERIFICATION_MESSAGE =
  'Your account is awaiting alumni verification. Matchmaking and intro requests unlock once you are verified.';

export const REJECTED_MESSAGE =
  'Your alumni verification was not approved, so matchmaking and intro requests are unavailable.';

export const VERIFICATION_NOT_PENDING_MESSAGE = 'This application has already been reviewed';
export const VERIFICATION_NOT_FOUND_MESSAGE = 'Verification request not found';

export const VERIFICATION_SELECT = {
  id: true,
  fullName: true,
  email: true,
  graduationYear: true,
  diplomaNumber: true,
  createdAt: true,
} satisfies Prisma.ProfileSelect;
