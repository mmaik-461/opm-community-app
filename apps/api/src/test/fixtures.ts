import type { Profile } from '@opm/shared-types';

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p-default',
    fullName: 'Default Person',
    headline: 'Founder, Example Co',
    bio: 'Builds things.',
    city: 'London',
    travelStatus: 'LIVING_IN',
    cohort: 'OPM 50',
    industry: 'Fintech',
    skills: ['payments'],
    avatarUrl: null,
    linkedinUrl: null,
    email: null,
    ...overrides,
  };
}
