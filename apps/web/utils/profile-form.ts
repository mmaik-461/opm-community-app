import type { Profile, UpdateProfileDto } from '@opm/shared-types';
import { SKILLS_JOIN, SKILLS_SEPARATOR } from '@/constants/profile-edit';

export interface ProfileFormValues {
  fullName: string;
  headline: string;
  bio: string;
  city: string;
  industry: string;
  /** Comma-separated. */
  skills: string;
}

export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    bio: profile.bio,
    city: profile.city,
    industry: profile.industry,
    skills: profile.skills.join(SKILLS_JOIN),
  };
}

/** Splits a comma-separated line into trimmed, non-empty skills without case-insensitive duplicates. */
export function parseSkills(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(SKILLS_SEPARATOR)
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLowerCase();
      if (!skill || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildUpdatePayload(values: ProfileFormValues): UpdateProfileDto {
  return {
    fullName: values.fullName.trim(),
    headline: values.headline.trim(),
    bio: values.bio.trim(),
    city: values.city.trim(),
    industry: values.industry.trim(),
    skills: parseSkills(values.skills),
  };
}

/** Name, headline, city and industry are required by the API; the bio and skills may be empty. */
export function isProfileFormValid(values: ProfileFormValues): boolean {
  const { fullName, headline, city, industry } = buildUpdatePayload(values);
  return [fullName, headline, city, industry].every(Boolean);
}

export function hasProfileChanges(profile: Profile, values: ProfileFormValues): boolean {
  const next = buildUpdatePayload(values);
  return (
    next.fullName !== profile.fullName ||
    next.headline !== profile.headline ||
    next.bio !== profile.bio ||
    next.city !== profile.city ||
    next.industry !== profile.industry ||
    next.skills?.join(SKILLS_SEPARATOR) !== profile.skills.join(SKILLS_SEPARATOR)
  );
}
