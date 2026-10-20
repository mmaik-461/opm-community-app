export type TravelStatus = 'LIVING_IN' | 'TRAVELING_TO';

export interface Profile {
  id: string;
  fullName: string;
  headline: string;
  bio: string;
  city: string;
  travelStatus: TravelStatus;
  cohort: string;
  industry: string;
  skills: string[];
  avatarUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

export interface MatchmakingRequest {
  query: string;
  currentUserId?: string;
  targetCity?: string;
  intent?: string;
}

export interface MatchResult {
  profile: Profile;
  similarityScore: number;
  matchReason: string;
  mutualSynergy?: string;
  suggestedIcebreaker: string;
}

export interface MatchmakingResponse {
  matches: MatchResult[];
}

export interface ProfileFilters {
  city?: string;
  cohort?: string;
  industry?: string;
}

export type IntroStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export const IntroStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const satisfies Record<IntroStatus, IntroStatus>;

export interface CreateIntroDto {
  requesterId: string;
  targetId: string;
  query: string;
  icebreaker: string;
}

export interface UpdateIntroStatusDto {
  /** The acting user; must be the intro's target. */
  userId: string;
  status: 'ACCEPTED' | 'DECLINED';
}

export interface IntroRequestResponse {
  id: string;
  requesterId: string;
  requester: Profile;
  targetId: string;
  target: Profile;
  query: string;
  icebreaker: string;
  status: IntroStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedIntros {
  data: IntroRequestResponse[];
  meta: PaginationMeta;
}

export interface IntrosResponse {
  sent: PaginatedIntros;
  received: PaginatedIntros;
  /** Pending incoming intros across all pages (drives the header badge). */
  pendingIncoming: number;
}
