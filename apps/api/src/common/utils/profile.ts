import { MIN_BIO_LENGTH_FOR_EMBEDDING } from '../constants/profiles';

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
