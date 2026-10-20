'use client';

import * as React from 'react';
import { AlertTriangle, Loader2, MapPin, Send } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { createIntro } from '@/lib/api';
import { useIntros } from './intros-context';
import { MAX_ICEBREAKER_LENGTH } from '@/constants/intros';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { errorMessage } from '@/utils/errors';
import { firstName, initials, travelLabel } from '@/utils/profile';
import { useUser } from './user-context';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Profile;
  query: string;
  icebreaker: string;
  onSent: () => void;
}

export function RequestIntroDialog({
  open,
  onOpenChange,
  target,
  query,
  icebreaker,
  onSent,
}: Props) {
  const { currentUser } = useUser();
  const { refresh } = useIntros();
  const [message, setMessage] = React.useState(icebreaker);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the draft each time the dialog is reopened.
  React.useEffect(() => {
    if (open) {
      setMessage(icebreaker);
      setError(null);
    }
  }, [open, icebreaker]);

  const isSelf = currentUser?.id === target.id;
  const canSubmit = !!currentUser && !isSelf && message.trim().length > 0 && !submitting;

  async function submit() {
    if (!currentUser) return;
    setSubmitting(true);
    setError(null);
    try {
      await createIntro({
        requesterId: currentUser.id,
        targetId: target.id,
        query,
        icebreaker: message.trim(),
      });
      refresh();
      onSent();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the intro request'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an intro</DialogTitle>
          <DialogDescription>
            {firstName(target.fullName)} will see your message and can accept or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <Avatar className="size-10">
            {target.avatarUrl && <AvatarImage src={target.avatarUrl} alt="" />}
            <AvatarFallback className="bg-zinc-900 text-xs font-medium text-white">
              {initials(target.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {target.fullName} <span className="font-normal text-zinc-500">({target.cohort})</span>
            </p>
            <p className="truncate text-xs text-zinc-600">{target.headline}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
              <MapPin className="size-3" aria-hidden />
              {travelLabel(target.travelStatus)} {target.city}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="intro-message" className={`${LABEL_CLASS} mb-2 block`}>
            Your message
          </label>
          <Textarea
            id="intro-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_ICEBREAKER_LENGTH}
            rows={6}
            className="resize-none text-sm"
          />
        </div>

        {isSelf && (
          <p className="text-sm text-red-700">You can&apos;t request an intro to yourself.</p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className={PRIMARY_BUTTON_CLASS}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
