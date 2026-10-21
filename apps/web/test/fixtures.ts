import type {
  FeedbackAnalyticsResponse,
  FeedbackEntry,
  IntroRequestResponse,
  IntrosResponse,
  MatchResult,
  PendingVerification,
  Profile,
} from '@opm/shared-types';

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
    role: 'MEMBER',
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

export function makeVerification(
  overrides: Partial<PendingVerification> = {},
): PendingVerification {
  return {
    id: 'v1',
    fullName: 'Nina Newbie',
    email: 'nina@example.com',
    graduationYear: 2019,
    diplomaNumber: 'DIP-42',
    createdAt: '2026-03-02T10:00:00.000Z',
    ...overrides,
  };
}

export function makeFeedback(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: 'fb-1',
    query: 'Series A',
    rating: 'POSITIVE',
    reason: 'GREAT_MATCH',
    comment: null,
    createdAt: '2026-03-05T10:00:00.000Z',
    user: { id: 'me', fullName: 'Me Myself', email: 'me@example.com' },
    candidate: { id: 'p1', fullName: 'Anna Kowalska', email: 'anna@example.com' },
    ...overrides,
  };
}

export function makeFeedbackAnalytics(
  data: FeedbackEntry[],
  summary: Partial<FeedbackAnalyticsResponse['summary']> = {},
): FeedbackAnalyticsResponse {
  const positive = data.filter((f) => f.rating === 'POSITIVE').length;
  const negative = data.length - positive;
  return {
    summary: {
      total: data.length,
      positive,
      negative,
      satisfactionRate: data.length ? Math.round((positive / data.length) * 100) : 0,
      ...summary,
    },
    data,
  };
}
