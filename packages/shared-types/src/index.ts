export type TravelStatus = 'LIVING_IN' | 'TRAVELING_TO';

export type ProfileStatus = 'ACTIVE' | 'PENDING_VERIFICATION';

export const ProfileStatus = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
} as const satisfies Record<ProfileStatus, ProfileStatus>;

export interface Profile {
  id: string;
  fullName: string;
  headline: string;
  bio: string;
  city: string;
  travelStatus: TravelStatus;
  cohort: string;
  graduationYear: number;
  industry: string;
  skills: string[];
  /** Only ACTIVE (verified) alumni can use matchmaking and request intros. */
  status: ProfileStatus;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

export interface TravelContext {
  city: string;
  dates?: string;
}

export interface MatchmakingRequest {
  /** May be empty when `travelContext` is set; the API then falls back to the requester's profile. */
  query: string;
  targetCity?: string;
  travelContext?: TravelContext;
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

/** The requester is the authenticated user; it is never part of the payload. */
export interface CreateIntroDto {
  targetId: string;
  query: string;
  icebreaker: string;
}

/** The decider is the authenticated user and must be the intro's target. */
export interface UpdateIntroStatusDto {
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

/** The identity the API derives from the bearer token (an HS256 JWT whose `sub` is the profile id, signed with the shared `AUTH_SECRET`). */
export interface AuthenticatedUser {
  id: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

/** Development-only impersonation of a seeded alumnus. */
export interface DevLoginDto {
  profileId: string;
}

export interface LoginResponse {
  profile: Profile;
}

/** Public sign-up. The new profile is PENDING_VERIFICATION unless the API auto-verifies (`AUTH_AUTO_VERIFY=true`). */
export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  city: string;
  industry: string;
  graduationYear: number;
  /** Optional verification identifier; stored but never returned by the API. */
  diplomaNumber?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
}

export interface RegisterResponse {
  /** Short-lived HS256 bearer token (`sub` = profile id) signed with the shared `AUTH_SECRET`. */
  accessToken: string;
  profile: Profile;
}
