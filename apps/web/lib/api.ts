import type {
  CreateIntroDto,
  IntroRequestResponse,
  IntrosResponse,
  UpdateIntroStatusDto,
  MatchmakingRequest,
  MatchmakingResponse,
  Profile,
} from '@opm/shared-types';
import { getSession } from 'next-auth/react';
import { DEFAULT_API_URL } from '@/constants/api';
import { bearerHeader } from '@/utils/auth';
import { buildQueryString, isAbortError } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Sessions are re-read per request so the bearer token is always fresh and always the acting user's. */
async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return session?.accessToken ? { Authorization: bearerHeader(session.accessToken) } : {};
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    const headers = { ...init?.headers, ...(await authHeaders()) };
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError(`Cannot reach the API at ${API_URL}. Is the backend running?`);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      detail = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? '');
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail || `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export function fetchProfiles(signal?: AbortSignal): Promise<Profile[]> {
  return request<Profile[]>('/profiles', undefined, signal);
}

export function fetchMatches(
  body: MatchmakingRequest,
  signal?: AbortSignal,
): Promise<MatchmakingResponse> {
  return request<MatchmakingResponse>(
    '/matchmaking',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    signal,
  );
}

/** Public: lists the quick-login choices; the API answers 404 when dev login is disabled. */
export function fetchDevProfiles(signal?: AbortSignal): Promise<Profile[]> {
  return request<Profile[]>('/auth/dev/profiles', undefined, signal);
}

export function fetchIntros(
  pages: { receivedPage: number; sentPage: number },
  signal?: AbortSignal,
): Promise<IntrosResponse> {
  const qs = buildQueryString({
    receivedPage: pages.receivedPage,
    sentPage: pages.sentPage,
  });
  return request<IntrosResponse>(`/intros?${qs}`, undefined, signal);
}

export function createIntro(body: CreateIntroDto): Promise<IntroRequestResponse> {
  return request<IntroRequestResponse>('/intros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateIntroStatus(
  id: string,
  body: UpdateIntroStatusDto,
): Promise<IntroRequestResponse> {
  return request<IntroRequestResponse>(`/intros/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
