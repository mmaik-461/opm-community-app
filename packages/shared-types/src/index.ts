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
