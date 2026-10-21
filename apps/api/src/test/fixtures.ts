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
    graduationYear: 2020,
    industry: 'Fintech',
    skills: ['payments'],
    status: 'ACTIVE',
    role: 'MEMBER',
    avatarUrl: null,
    linkedinUrl: null,
    email: null,
    ...overrides,
  };
}
