import type { IntroStatus, PaginatedIntros, IntrosResponse } from '@opm/shared-types';

export type IntroView = 'received' | 'sent';
export type IntroDecision = Exclude<IntroStatus, 'PENDING'>;

export const INTRO_STATUS_STYLE: Record<IntroStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DECLINED: 'border-zinc-200 bg-zinc-100 text-zinc-600',
};

export const INTRO_STATUS_LABEL: Record<IntroStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

export const INTRO_VIEW_LABEL: Record<IntroView, string> = {
  received: 'Received',
  sent: 'Sent',
};

export const INTRO_VIEWS: IntroView[] = ['received', 'sent'];

export const MAX_ICEBREAKER_LENGTH = 2000;

export const EMPTY_INTRO_PAGE: PaginatedIntros = {
  data: [],
  meta: { total: 0, page: 1, totalPages: 1 },
};

export const EMPTY_INTROS_RESPONSE: IntrosResponse = {
  sent: EMPTY_INTRO_PAGE,
  received: EMPTY_INTRO_PAGE,
  pendingIncoming: 0,
};
