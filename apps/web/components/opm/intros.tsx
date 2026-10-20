'use client';

import * as React from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Inbox, Loader2, Send, X } from 'lucide-react';
import type { IntroRequestResponse, IntroStatus, PaginationMeta, Profile } from '@opm/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { updateIntroStatus } from '@/lib/api';
import { useIntros } from './intros-context';
import {
  INTRO_STATUS_LABEL,
  INTRO_STATUS_STYLE,
  INTRO_VIEW_LABEL,
  INTRO_VIEWS,
  type IntroDecision,
  type IntroView,
} from '@/constants/intros';
import { LABEL_CLASS } from '@/constants/ui';
import { errorMessage } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import { initials } from '@/utils/profile';
import { useUser } from './user-context';

function StatusBadge({ status }: { status: IntroStatus }) {
  return (
    <Badge variant="outline" className={INTRO_STATUS_STYLE[status]}>
      {INTRO_STATUS_LABEL[status]}
    </Badge>
  );
}

function IntroCard({
  intro,
  counterpart,
  direction,
}: {
  intro: IntroRequestResponse;
  counterpart: Profile;
  direction: IntroView;
}) {
  const { currentUser } = useUser();
  const { refresh } = useIntros();
  const [busy, setBusy] = React.useState<IntroDecision | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function decide(status: IntroDecision) {
    if (!currentUser) return;
    setBusy(status);
    setError(null);
    try {
      await updateIntroStatus(intro.id, { userId: currentUser.id, status });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the intro'));
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <Card className="gap-4 border border-zinc-200 bg-white p-5 shadow-none ring-0">
      <div className="flex items-start gap-4">
        <Avatar className="size-11">
          {counterpart.avatarUrl && <AvatarImage src={counterpart.avatarUrl} alt="" />}
          <AvatarFallback className="bg-zinc-900 text-sm font-medium text-white">
            {initials(counterpart.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold tracking-tight text-zinc-900">{counterpart.fullName}</h3>
            <Badge variant="outline" className="border-zinc-300 text-zinc-700">
              {counterpart.cohort}
            </Badge>
          </div>
          <p className="text-sm text-zinc-600">{counterpart.headline}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {INTRO_VIEW_LABEL[direction]} {formatDate(intro.createdAt)}
          </p>
        </div>
        {direction === 'sent' && <StatusBadge status={intro.status} />}
        {direction === 'received' && intro.status !== 'PENDING' && (
          <StatusBadge status={intro.status} />
        )}
      </div>

      <div>
        <p className={`${LABEL_CLASS} mb-1.5`}>Looking for</p>
        <p className="text-sm text-zinc-700 break-words">{intro.query}</p>
      </div>

      <blockquote className="border-l-2 border-zinc-900 bg-zinc-50 py-3 pr-4 pl-4 text-sm leading-relaxed whitespace-pre-line text-zinc-700 italic break-words">
        {intro.icebreaker}
      </blockquote>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      {direction === 'received' && intro.status === 'PENDING' && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={() => void decide('ACCEPTED')}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy === 'ACCEPTED' ? <Loader2 className="animate-spin" /> : <Check />} Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void decide('DECLINED')}
          >
            {busy === 'DECLINED' ? <Loader2 className="animate-spin" /> : <X />} Decline
          </Button>
        </div>
      )}
    </Card>
  );
}

function Empty({ view }: { view: IntroView }) {
  const Icon = view === 'received' ? Inbox : Send;
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      <Icon className="size-8 text-zinc-400" aria-hidden />
      <p className="mt-3 font-semibold text-zinc-900">
        {view === 'received' ? 'No intro requests yet' : 'You haven’t requested any intros'}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {view === 'received'
          ? 'When someone asks to connect with you, it will show up here.'
          : 'Use “Request Intro” on an AI Matchmaker result to get started.'}
      </p>
    </div>
  );
}

function PaginationFooter({
  meta,
  loading,
  onPage,
}: {
  meta: PaginationMeta;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
      <p className="text-sm text-zinc-600" aria-live="polite">
        Page {meta.page} of {meta.totalPages}
        <span className="text-zinc-400"> · </span>
        {meta.total} {meta.total === 1 ? 'intro' : 'intros'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1 || loading}
          onClick={() => onPage(meta.page - 1)}
        >
          <ChevronLeft /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages || loading}
          onClick={() => onPage(meta.page + 1)}
        >
          Next <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function Intros() {
  const { currentUser } = useUser();
  const { sent, received, setReceivedPage, setSentPage, pendingIncoming, loading, error, refresh } =
    useIntros();
  const [view, setView] = React.useState<IntroView>('received');

  const current = view === 'received' ? received : sent;
  const list = current.data;
  const setPage = view === 'received' ? setReceivedPage : setSentPage;


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="text-center">
        <p className={LABEL_CLASS}>My Intros</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">Your introductions</h2>
        {currentUser && (
          <p className="mt-2 text-sm text-zinc-600">Showing intros for {currentUser.fullName}.</p>
        )}
      </section>

      <div role="tablist" aria-label="Intro direction" className="mx-auto flex w-fit gap-1 rounded-lg bg-zinc-100 p-[3px]">
        {INTRO_VIEWS.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`inline-flex h-8 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors ${
              view === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {INTRO_VIEW_LABEL[id]}
            <span className="text-xs text-zinc-500">
              {id === 'received' ? received.meta.total : sent.meta.total}
            </span>
            {id === 'received' && pendingIncoming > 0 ? (
              <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
                {pendingIncoming} new
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="size-5 shrink-0 text-red-600" aria-hidden />
          <span className="flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Fixed min-height keeps the footer from jumping between pages. */}
      <div
        className={`min-h-[44rem] transition-opacity ${loading && list.length > 0 ? 'opacity-60' : ''}`}
        aria-busy={loading}
      >
        {loading && list.length === 0 ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : list.length === 0 && !error ? (
          <Empty view={view} />
        ) : (
          <div className="flex flex-col gap-4">
            {list.map((i) => (
              <IntroCard
                key={i.id}
                intro={i}
                direction={view}
                counterpart={view === 'received' ? i.requester : i.target}
              />
            ))}
          </div>
        )}
      </div>

      {current.meta.total > 0 && (
        <PaginationFooter meta={current.meta} loading={loading} onPage={setPage} />
      )}
    </div>
  );
}
