import { ProfileStatus, type UpdateProfileDto } from '@opm/shared-types';
import {
  EMBEDDED_PROFILE_FIELDS,
  MIN_BIO_LENGTH_FOR_EMBEDDING,
  PENDING_VERIFICATION_MESSAGE,
  REJECTED_MESSAGE,
} from '../constants/profiles';

export function cohortLabel(graduationYear: number): string {
  return `Class of ${graduationYear}`;
}

export function defaultHeadline(industry: string): string {
  return `OPM alumnus, ${industry}`;
}

interface EmbeddingSource {
  fullName: string;
  headline: string;
  bio: string;
  city: string;
  cohort: string;
  industry: string;
  skills: string[];
  graduationYear: number;
}

/** Same shape as the seed script's text; a brief bio is replaced by a descriptive fallback sentence. */
export function buildProfileEmbeddingText(p: EmbeddingSource): string {
  const bio =
    p.bio.trim().length >= MIN_BIO_LENGTH_FOR_EMBEDDING
      ? p.bio.trim()
      : `${p.fullName} is an OPM alumnus (class of ${p.graduationYear}) working in ${p.industry} in ${p.city}.${p.bio.trim() ? ` ${p.bio.trim()}` : ''}`;
  return `${p.fullName}. ${p.headline}. Industry: ${p.industry}. City: ${p.city}. ${p.cohort}. Skills: ${p.skills.join(', ')}. ${bio}`;
}

/** Why a profile may not use matchmaking or intros, or null when it is verified. */
export function inactiveStatusMessage(status: ProfileStatus): string | null {
  if (status === ProfileStatus.PENDING_VERIFICATION) return PENDING_VERIFICATION_MESSAGE;
  if (status === ProfileStatus.REJECTED) return REJECTED_MESSAGE;
  return null;
}

/** True when the patch actually changes a field the embedding is built from. */
export function changesEmbeddedText(
  current: Pick<EmbeddingSource, (typeof EMBEDDED_PROFILE_FIELDS)[number]>,
  patch: UpdateProfileDto,
): boolean {
  return EMBEDDED_PROFILE_FIELDS.some((field) => {
    const next = patch[field];
    return next !== undefined && JSON.stringify(next) !== JSON.stringify(current[field]);
  });
}
