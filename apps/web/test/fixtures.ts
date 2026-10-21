import type { IntroRequestResponse, IntrosResponse, MatchResult, Profile } from '@opm/shared-types';

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    fullName: 'Anna Kowalska',
    headline: 'Co-founder & CEO, PayLoop',
    bio: 'Payments founder.',
    city: 'Warsaw',
    travelStatus: 'LIVING_IN',
    cohort: 'OPM 48',
    graduationYear: 2019,
    industry: 'Fintech',
    skills: ['payments', 'fundraising'],
    status: 'ACTIVE',
    avatarUrl: null,
    linkedinUrl: 'https://www.linkedin.com/in/anna',
    email: 'anna@example.com',
    ...overrides,
  };
}

export function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    profile: makeProfile(),
    similarityScore: 0.874,
    matchReason: 'Raised a Series A in the same space.',
    mutualSynergy: 'You bring product depth; she brings fundraising playbooks.',
    suggestedIcebreaker: 'Hi Anna, I would love to hear how you raised your Series A.',
    ...overrides,
  };
}

export function makeIntro(overrides: Partial<IntroRequestResponse> = {}): IntroRequestResponse {
  const requester = makeProfile({ id: 'me', fullName: 'Me Myself' });
  const target = makeProfile();
  return {
    id: 'intro-1',
    requesterId: requester.id,
    requester,
    targetId: target.id,
    target,
    query: 'Series A',
    icebreaker: 'Hello!',
    status: 'PENDING',
    createdAt: '2026-03-05T10:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
    ...overrides,
  };
}

export function emptyIntros(overrides: Partial<IntrosResponse> = {}): IntrosResponse {
  const page = { data: [], meta: { total: 0, page: 1, totalPages: 1 } };
  return { sent: page, received: page, pendingIncoming: 0, ...overrides };
}
