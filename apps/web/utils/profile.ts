import type { Profile } from '@opm/shared-types';
import type { FilterKey } from '@/constants/directory';
import { ACCOUNT_MENU_LABEL } from '@/constants/user-menu';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** "Account menu, Anna K": the avatar button's accessible name, so assistive tech announces who is signed in. */
export function accountMenuLabel(profile: Profile | null): string {
  return profile ? `${ACCOUNT_MENU_LABEL}, ${profile.fullName}` : ACCOUNT_MENU_LABEL;
}

export function travelLabel(status: Profile['travelStatus']): string {
  return status === 'TRAVELING_TO' ? 'Traveling to' : 'Living in';
}

export function firstName(fullName: string): string {
  return fullName.split(' ')[0];
}

export function uniqueValues(profiles: Profile[], key: FilterKey): string[] {
  return Array.from(new Set(profiles.map((p) => p[key]))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function matchesSearch(profile: Profile, query: string): boolean {
  return [
    profile.fullName,
    profile.headline,
    profile.city,
    profile.cohort,
    profile.industry,
    ...profile.skills,
  ].some((v) => v.toLowerCase().includes(query));
}
