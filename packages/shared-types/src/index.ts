export type TravelStatus = 'LIVING_IN' | 'TRAVELING_TO';

export type ProfileStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'REJECTED';

export const ProfileStatus = {
  ACTIVE: 'ACTIVE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  REJECTED: 'REJECTED',
} as const satisfies Record<ProfileStatus, ProfileStatus>;

export type Role = 'MEMBER' | 'ADMIN';

export const Role = {
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
} as const satisfies Record<Role, Role>;

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
  /** ADMIN unlocks the verification panel (`/admin/*` routes); everyone else is a MEMBER. */
  role: Role;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  email: string | null;
}

/** Length limits for the free-text profile fields, enforced by the API and mirrored by the web forms. */
export const PROFILE_LIMITS = {
  fullName: 120,
  city: 100,
  industry: 100,
  headline: 160,
  bio: 2000,
  skill: 60,
  maxSkills: 20,
} as const;

/**
 * Editable profile fields for `PATCH /profiles/me`; send only what changed. The owner is the
 * authenticated user, and identity/verification fields (id, email, role, status, diplomaNumber,
 * graduationYear) are not editable and rejected with 400.
 */
export interface UpdateProfileDto {
  fullName?: string;
  headline?: string;
  bio?: string;
  city?: string;
  industry?: string;
  skills?: string[];
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

/** An applicant awaiting review. `diplomaNumber` is private and only ever returned to admins. */
export interface PendingVerification {
  id: string;
  fullName: string;
  email: string | null;
  graduationYear: number;
  diplomaNumber: string | null;
  createdAt: string;
}

export interface VerificationsResponse {
  data: PendingVerification[];
}

export type VerificationDecision = 'APPROVE' | 'REJECT';

export const VerificationDecision = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const satisfies Record<VerificationDecision, VerificationDecision>;

/** The reviewing admin is the authenticated user; it is never part of the payload. */
export interface DecideVerificationDto {
  decision: VerificationDecision;
}

export interface VerificationDecisionResponse {
  id: string;
  status: Extract<ProfileStatus, 'ACTIVE' | 'REJECTED'>;
}

export type FeedbackRating = 'POSITIVE' | 'NEGATIVE';

export const FeedbackRating = {
  POSITIVE: 'POSITIVE',
  NEGATIVE: 'NEGATIVE',
} as const satisfies Record<FeedbackRating, FeedbackRating>;

export type FeedbackReason = 'GREAT_MATCH' | 'DIFFERENT_INDUSTRY' | 'SKILL_MISMATCH' | 'OTHER';

export const FeedbackReason = {
  GREAT_MATCH: 'GREAT_MATCH',
  DIFFERENT_INDUSTRY: 'DIFFERENT_INDUSTRY',
  SKILL_MISMATCH: 'SKILL_MISMATCH',
  OTHER: 'OTHER',
} as const satisfies Record<FeedbackReason, FeedbackReason>;

/** Length limits for matchmaker feedback, enforced by the API and mirrored by the web dialog. */
export const FEEDBACK_LIMITS = {
  query: 1000,
  comment: 500,
} as const;

/** The reviewer is the authenticated user; it is never part of the payload. */
export interface CreateMatchFeedbackDto {
  candidateId: string;
  /** The search text the suggestion was made for. */
  query: string;
  rating: FeedbackRating;
  reason?: FeedbackReason;
  comment?: string;
}

export interface MatchFeedbackResponse {
  id: string;
  candidateId: string;
  rating: FeedbackRating;
  createdAt: string;
}

export interface FeedbackPerson {
  id: string;
  fullName: string;
  email: string | null;
}

export interface FeedbackEntry {
  id: string;
  query: string;
  rating: FeedbackRating;
  reason: FeedbackReason | null;
  comment: string | null;
  createdAt: string;
  user: FeedbackPerson;
  candidate: FeedbackPerson;
}

export interface FeedbackSummary {
  total: number;
  positive: number;
  negative: number;
  /** Share of positive reviews, 0-100 rounded to a whole percent; 0 when there are no reviews. */
  satisfactionRate: number;
}

/** `data` is newest first; `summary` covers every review, not only the listed ones. */
export interface FeedbackAnalyticsResponse {
  summary: FeedbackSummary;
  data: FeedbackEntry[];
}

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';

export interface PasswordRule {
  id: PasswordRuleId;
  /** Shown in the web checklist and used as the API's validation message. */
  label: string;
  test: (password: string) => boolean;
}

/** Single source of truth for password strength, shared by the API schema and the sign-up form. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
  {
    id: 'special',
    label: 'One special character (e.g. !@#$%^&*)',
    test: (p) => /[^A-Za-z0-9\s]/.test(p),
  },
];

/** Labels of the rules the password fails; empty when it is strong enough. */
export function failedPasswordRules(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);
}
