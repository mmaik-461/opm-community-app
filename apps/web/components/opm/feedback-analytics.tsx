'use client';

import { AlertTriangle, Inbox, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FeedbackRating, type FeedbackEntry } from '@opm/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FEEDBACK_ANALYTICS_SUBTITLE,
  FEEDBACK_ANALYTICS_TITLE,
  FEEDBACK_COLUMNS,
  FEEDBACK_EMPTY_MESSAGE,
  FEEDBACK_EMPTY_TITLE,
  FEEDBACK_METRIC_LABELS,
  FEEDBACK_NO_DETAILS_LABEL,
  FEEDBACK_RATING_LABELS,
  FEEDBACK_REASON_LABELS,
} from '@/constants/feedback';
import { LABEL_CLASS } from '@/constants/ui';
import { useFeedbackAnalytics } from '@/hooks/use-feedback-analytics';
import { formatDate } from '@/utils/format';
import { formatPercent } from '@/utils/feedback';
import { AdminGate } from './admin-gate';

const RATING_BADGE = {
  [FeedbackRating.POSITIVE]: {
    Icon: ThumbsUp,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  [FeedbackRating.NEGATIVE]: {
    Icon: ThumbsDown,
    className: 'border-red-200 bg-red-50 text-red-800',
  },
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 border border-zinc-200 bg-white p-5 shadow-none ring-0">
      <p className={LABEL_CLASS}>{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </Card>
  );
}

function Person({ name, email }: { name: string; email: string | null }) {
  return (
    <div>
      <p className="font-medium">{name}</p>
      {email && <p className="text-xs text-zinc-500">{email}</p>}
    </div>
  );
}

function RatingBadge({ rating }: { rating: FeedbackEntry['rating'] }) {
  const { Icon, className } = RATING_BADGE[rating];
  return (
    <Badge variant="outline" className={className}>
      <Icon aria-hidden />
      {FEEDBACK_RATING_LABELS[rating]}
    </Badge>
  );
}

function ReasonAndComment({ entry }: { entry: FeedbackEntry }) {
  if (!entry.reason && !entry.comment) return <>{FEEDBACK_NO_DETAILS_LABEL}</>;
  return (
    <div className="space-y-0.5">
      {entry.reason && <p className="font-medium">{FEEDBACK_REASON_LABELS[entry.reason]}</p>}
      {entry.comment && <p className="text-zinc-600">{entry.comment}</p>}
    </div>
  );
}

export function FeedbackAnalytics() {
  return (
    <AdminGate>
      <FeedbackPanel />
    </AdminGate>
  );
}

function FeedbackPanel() {
  const { analytics, loading, error, refresh } = useFeedbackAnalytics();

  return (
    <section className="space-y-6" aria-labelledby="feedback-heading">
      <div>
        <h2 id="feedback-heading" className="text-xl font-semibold tracking-tight">
          {FEEDBACK_ANALYTICS_TITLE}
        </h2>
        <p className="text-sm text-zinc-600">{FEEDBACK_ANALYTICS_SUBTITLE}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          <AlertTriangle className="size-4 shrink-0 text-red-600" aria-hidden />
          <span className="flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      {loading && (
        <div role="status" aria-label="Loading feedback" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label={FEEDBACK_METRIC_LABELS.total} value={String(analytics.summary.total)} />
            <Metric
              label={FEEDBACK_METRIC_LABELS.satisfaction}
              value={
                analytics.summary.total === 0
                  ? FEEDBACK_NO_DETAILS_LABEL
                  : formatPercent(analytics.summary.satisfactionRate)
              }
            />
          </div>

          {analytics.data.length === 0 ? (
            <Card className="items-center gap-2 border border-dashed border-zinc-300 bg-white p-10 text-center shadow-none ring-0">
              <Inbox className="size-6 text-zinc-400" aria-hidden />
              <p className="font-medium">{FEEDBACK_EMPTY_TITLE}</p>
              <p className="text-sm text-zinc-600">{FEEDBACK_EMPTY_MESSAGE}</p>
            </Card>
          ) : (
            <Card className="border border-zinc-200 bg-white p-0 shadow-none ring-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {FEEDBACK_COLUMNS.map((column) => (
                      <TableHead key={column} className={LABEL_CLASS}>
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Person name={entry.user.fullName} email={entry.user.email} />
                      </TableCell>
                      <TableCell className="max-w-56 break-words whitespace-normal">
                        {entry.query}
                      </TableCell>
                      <TableCell>
                        <Person name={entry.candidate.fullName} email={entry.candidate.email} />
                      </TableCell>
                      <TableCell>
                        <RatingBadge rating={entry.rating} />
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-normal">
                        <ReasonAndComment entry={entry} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
