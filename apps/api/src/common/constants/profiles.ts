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
  industry: true,
  skills: true,
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
