'use client';

import * as React from 'react';
import { AlertTriangle, Check, Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  FEEDBACK_LIMITS,
  FeedbackRating,
  type FeedbackReason,
  type Profile,
} from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  FEEDBACK_COMMENT_LABEL,
  FEEDBACK_DIALOG_DESCRIPTION,
  FEEDBACK_DIALOG_TITLE,
  FEEDBACK_PROMPT,
  FEEDBACK_RATING_LABELS,
  FEEDBACK_REASON_LABELS,
  FEEDBACK_SUBMIT_FAILED,
  FEEDBACK_THANKS,
  NEGATIVE_FEEDBACK_REASONS,
} from '@/constants/feedback';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { submitMatchFeedback } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import { feedbackReasonFor } from '@/utils/feedback';
import { useUser } from './user-context';

interface Props {
  candidate: Profile;
  /** The search the candidate was suggested for. */
  query: string;
}

/** Thumbs up/down on a suggested candidate; a thumbs down asks for a quick reason first. */
export function MatchFeedback({ candidate, query }: Props) {
  const { currentUser } = useUser();
  const [sent, setSent] = React.useState<FeedbackRating | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reason, setReason] = React.useState<FeedbackReason | null>(null);
  const [comment, setComment] = React.useState('');

  async function submit(rating: FeedbackRating) {
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = comment.trim();
      await submitMatchFeedback({
        candidateId: candidate.id,
        query,
        rating,
        reason: feedbackReasonFor(rating, reason),
        comment: rating === FeedbackRating.NEGATIVE && trimmed ? trimmed : undefined,
      });
      setSent(rating);
      setDialogOpen(false);
    } catch (err) {
      setError(errorMessage(err, FEEDBACK_SUBMIT_FAILED));
    } finally {
      setSubmitting(false);
    }
  }

  function openNegative() {
    setError(null);
    setReason(null);
    setComment('');
    setDialogOpen(true);
  }

  if (sent) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <Check className="size-4" aria-hidden />
        {FEEDBACK_THANKS}
        <span className="font-normal text-zinc-500">
          ({FEEDBACK_RATING_LABELS[sent].toLowerCase()})
        </span>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={LABEL_CLASS}>{FEEDBACK_PROMPT}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!currentUser || submitting}
        onClick={() => void submit(FeedbackRating.POSITIVE)}
      >
        {submitting && !dialogOpen ? <Loader2 className="animate-spin" /> : <ThumbsUp />}
        {FEEDBACK_RATING_LABELS.POSITIVE}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!currentUser || submitting}
        onClick={openNegative}
      >
        <ThumbsDown />
        {FEEDBACK_RATING_LABELS.NEGATIVE}
      </Button>
      {error && !dialogOpen && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !submitting && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{FEEDBACK_DIALOG_TITLE}</DialogTitle>
            <DialogDescription>{FEEDBACK_DIALOG_DESCRIPTION}</DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-2">
            <legend className={`${LABEL_CLASS} mb-2`}>Reason</legend>
            {NEGATIVE_FEEDBACK_REASONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="radio"
                  name={`feedback-reason-${candidate.id}`}
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="size-4 accent-zinc-900"
                />
                {FEEDBACK_REASON_LABELS[value]}
              </label>
            ))}
          </fieldset>

          <div>
            <label
              htmlFor={`feedback-comment-${candidate.id}`}
              className={`${LABEL_CLASS} mb-2 block`}
            >
              {FEEDBACK_COMMENT_LABEL}
            </label>
            <Textarea
              id={`feedback-comment-${candidate.id}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={FEEDBACK_LIMITS.comment}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit(FeedbackRating.NEGATIVE)}
              disabled={submitting}
              className={PRIMARY_BUTTON_CLASS}
            >
              {submitting && <Loader2 className="animate-spin" />}
              Submit feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
