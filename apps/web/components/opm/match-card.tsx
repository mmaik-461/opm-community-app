'use client';

import * as React from 'react';
import { Check, Copy, ExternalLink, Lightbulb, Handshake, Mail, MapPin, Send, Sparkles } from 'lucide-react';
import type { MatchResult } from '@opm/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { COPY_FEEDBACK_MS } from '@/constants/matchmaker';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { toPercent } from '@/utils/format';
import { initials, travelLabel } from '@/utils/profile';
import { buildMailto, safeHttpUrl } from '@/utils/url';
import { RequestIntroDialog } from './request-intro-dialog';
import { useUser } from './user-context';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      setFailed(true);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, COPY_FEEDBACK_MS);
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? 'default' : 'outline'}
      onClick={copy}
      className={copied ? 'bg-emerald-600 text-white hover:bg-emerald-600' : undefined}
      aria-live="polite"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied!' : failed ? 'Copy failed' : 'Copy Message'}
    </Button>
  );
}

export function MatchCard({ match, rank, query }: { match: MatchResult; rank: number; query: string }) {
  const { profile } = match;
  const { currentUser } = useUser();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [requested, setRequested] = React.useState(false);
  const isSelf = currentUser?.id === profile.id;
  const pct = toPercent(match.similarityScore);
  const linkedin = safeHttpUrl(profile.linkedinUrl);
  const mailto = buildMailto(profile.email, match.suggestedIcebreaker);

  return (
    <Card className="gap-5 border border-zinc-200 bg-white p-5 shadow-none ring-0 transition-all duration-200 hover:border-zinc-300 hover:shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar className="size-12">
          {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
          <AvatarFallback className="bg-zinc-900 text-sm font-medium text-white">
            {initials(profile.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={LABEL_CLASS}>#{rank}</span>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
              {profile.fullName}
            </h3>
            <Badge variant="outline" className="border-zinc-300 text-zinc-700">
              {profile.cohort}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-zinc-600">{profile.headline}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500">
            <MapPin className="size-3.5" aria-hidden />
            {travelLabel(profile.travelStatus)} {profile.city}
            <span aria-hidden>·</span>
            {profile.industry}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {pct}% Match
        </span>
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 p-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-indigo-700 uppercase">
          <Sparkles className="size-3.5" aria-hidden /> Why this match
        </p>
        <p className="text-sm leading-relaxed text-zinc-800">{match.matchReason}</p>
      </div>

      {match.mutualSynergy && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-700 uppercase">
            <Handshake className="size-3.5" aria-hidden /> Mutual synergy
          </p>
          <p className="text-sm leading-relaxed text-zinc-800">{match.mutualSynergy}</p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className={`${LABEL_CLASS} flex items-center gap-1.5`}>
            <Lightbulb className="size-3.5" aria-hidden /> Suggested icebreaker
          </p>
        </div>
        <blockquote className="border-l-2 border-zinc-900 bg-zinc-50 py-3 pr-4 pl-4 text-sm leading-relaxed text-zinc-700 italic">
          {match.suggestedIcebreaker}
        </blockquote>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={requested || isSelf || !currentUser}
          onClick={() => setDialogOpen(true)}
          className={PRIMARY_BUTTON_CLASS}
        >
          {requested ? <Check /> : <Send />}
          {requested ? 'Intro Requested' : 'Request Intro'}
        </Button>
        <CopyButton text={match.suggestedIcebreaker} />
        {mailto && (
            <Button asChild variant="outline" size="sm">
              <a href={mailto}>
                <Mail /> Email
              </a>
            </Button>
          )}
          {linkedin && (
            <Button asChild variant="outline" size="sm">
              <a href={linkedin} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> LinkedIn
              </a>
            </Button>
          )}
      </div>
      <RequestIntroDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={profile}
        query={query}
        icebreaker={match.suggestedIcebreaker}
        onSent={() => setRequested(true)}
      />
    </Card>
  );
}
