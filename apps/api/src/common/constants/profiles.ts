import type { Prisma } from '@prisma/client';

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
  avatarUrl: true,
  linkedinUrl: true,
  email: true,
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
  email: 254,
  fullName: 120,
  city: 100,
  industry: 100,
  headline: 160,
  bio: 2000,
  diplomaNumber: 64,
  skill: 60,
  maxSkills: 20,
  /** First graduating year accepted at sign-up. */
  minGraduationYear: 1980,
} as const;

/** A bio shorter than this adds little signal, so the embedding text is padded with profile attributes. */
export const MIN_BIO_LENGTH_FOR_EMBEDDING = 40;

export const PENDING_VERIFICATION_MESSAGE =
  'Your account is awaiting alumni verification. Matchmaking and intro requests unlock once you are verified.';
