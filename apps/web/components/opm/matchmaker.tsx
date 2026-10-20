'use client';

import * as React from 'react';
import { AlertTriangle, Check, Loader2, MapPin, Plane, SearchX, Sparkles } from 'lucide-react';
import type { MatchResult } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchMatches } from '@/lib/api';
import { MatchCard } from './match-card';
import {
  ANY_CITY,
  LOADING_STAGES,
  MATCH_DISPLAY_LIMIT,
  MAX_DATES_LENGTH,
  MAX_QUERY_LENGTH,
  STAGE_ADVANCE_DELAY_MS,
  STARTER_QUERIES,
  type MatchmakerStatus,
} from '@/constants/matchmaker';
import { LABEL_CLASS } from '@/constants/ui';
import { errorMessage } from '@/utils/errors';
import { useUser } from './user-context';

function LoadingState({ stage }: { stage: number }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <ol className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
        {LOADING_STAGES.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 ${i <= stage ? 'text-zinc-900' : 'text-zinc-400'}`}
          >
            {i < stage ? (
              <Check className="size-4 text-emerald-600" />
            ) : i === stage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="size-4 rounded-full border border-zinc-300" />
            )}
            {label}
          </li>
        ))}
      </ol>
      <div className="flex w-full flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Card
            key={i}
            className="gap-4 border border-zinc-200 bg-white p-6 shadow-none ring-0"
            style={{ opacity: 1 - i * 0.2 }}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full" />
            {stage >= 1 && <Skeleton className="h-12 w-full" />}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Matchmaker() {
  const { profiles, currentUser } = useUser();
  const [query, setQuery] = React.useState('');
  const [city, setCity] = React.useState(ANY_CITY);
  const [travelMode, setTravelMode] = React.useState(false);
  const [dates, setDates] = React.useState('');
  const [status, setStatus] = React.useState<MatchmakerStatus>('idle');
  const [stage, setStage] = React.useState(0);
  const [matches, setMatches] = React.useState<MatchResult[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [searched, setSearched] = React.useState('');
  const controller = React.useRef<AbortController>();
  const stageTimer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(
    () => () => {
      controller.current?.abort();
      clearTimeout(stageTimer.current);
    },
    [],
  );

  const cities = React.useMemo(
    () => Array.from(new Set(profiles.map((p) => p.city))).sort((a, b) => a.localeCompare(b)),
    [profiles],
  );

  const travelCity = travelMode && city !== ANY_CITY ? city : null;

  function toggleTravel() {
    const next = !travelMode;
    setTravelMode(next);
    // Travel mode needs a concrete destination.
    if (next && city === ANY_CITY && cities.length > 0) setCity(cities[0]);
    if (!next) setCity(ANY_CITY);
  }

  async function search(text: string) {
    const q = text.trim();
    if (!q && !travelCity) return;
    controller.current?.abort();
    clearTimeout(stageTimer.current);
    const ctrl = new AbortController();
    controller.current = ctrl;

    setStatus('loading');
    setStage(0);
    setError(null);
    setSearched(q || `Meetups in ${travelCity}`);
    stageTimer.current = setTimeout(() => setStage(1), STAGE_ADVANCE_DELAY_MS);

    try {
      const res = await fetchMatches(
        {
          query: q,
          currentUserId: currentUser?.id,
          targetCity: city === ANY_CITY ? undefined : city,
          travelContext: travelCity
            ? { city: travelCity, dates: dates.trim() || undefined }
            : undefined,
        },
        ctrl.signal,
      );
      const list = Array.isArray(res?.matches) ? res.matches : null;
      if (!list) {
        console.error('[matchmaker] Unexpected /matchmaking response shape', res);
        throw new Error('Received an unexpected response from the matchmaking service.');
      }
      if (ctrl.signal.aborted) return;
      setMatches(list.slice(0, MATCH_DISPLAY_LIMIT));
      setStatus('done');
    } catch (err) {
      if (ctrl.signal.aborted) return;
      console.error('[matchmaker] Matchmaking request failed', err);
      setError(errorMessage(err, 'Something went wrong'));
      setStatus('error');
    } finally {
      clearTimeout(stageTimer.current);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void search(query);
  }

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-3xl text-center">
        <p className={LABEL_CLASS}>AI Matchmaker</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Ask the community
        </h2>
        <p className="mt-3 text-sm text-zinc-600 sm:text-base">
          Describe who you need to meet. We&apos;ll find the right alumni and draft the opening
          message.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-xl border border-zinc-200 bg-white p-3 text-left sm:p-4 shadow-sm"
        >
          <label htmlFor="mm-query" className="sr-only">
            What are you looking for?
          </label>
          <Textarea
            id="mm-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void search(query);
              }
            }}
            maxLength={MAX_QUERY_LENGTH}
            rows={4}
            placeholder={
              travelCity
                ? `What are you looking to explore in ${travelCity}? (optional)`
                : 'Visiting London next week — who can connect for a fintech coffee?'
            }
            className="min-h-28 resize-none border-0 text-base shadow-none focus-visible:ring-0"
          />
          <div
            className={`mt-3 flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs ${
              travelMode ? 'bg-sky-50 text-sky-900' : 'bg-zinc-50 text-zinc-500'
            }`}
          >
            <Plane className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {travelMode
                ? `Travel Mode: matching alumni living in ${city === ANY_CITY ? 'your destination' : city} for an in-person meetup.`
                : 'Heading somewhere? Turn on Travel Mode to meet alumni in person.'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant={travelMode ? 'default' : 'outline'}
                size="sm"
                aria-pressed={travelMode}
                onClick={toggleTravel}
                disabled={cities.length === 0}
                className={travelMode ? 'bg-sky-600 text-white hover:bg-sky-700' : undefined}
              >
                <Plane />
                Travel Mode
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={cities.length === 0}>
                    <MapPin />
                    {travelMode ? 'Destination' : 'Target city'}: {city === ANY_CITY ? 'Any' : city}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  <DropdownMenuRadioGroup value={city} onValueChange={setCity}>
                    {!travelMode && (
                      <DropdownMenuRadioItem value={ANY_CITY}>Any city</DropdownMenuRadioItem>
                    )}
                    {cities.map((c) => (
                      <DropdownMenuRadioItem key={c} value={c}>
                        {c}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                maxLength={MAX_DATES_LENGTH}
                aria-label="Travel dates (optional)"
                placeholder="Dates, e.g. Next week or Nov 14-18"
                tabIndex={travelMode ? 0 : -1}
                className={`h-8 sm:w-64 ${travelMode ? '' : 'invisible max-sm:hidden'}`}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={(!query.trim() && !travelCity) || status === 'loading'}
              className="w-full bg-zinc-900 px-4 text-white hover:bg-zinc-800 sm:w-auto"
            >
              {status === 'loading' ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {travelCity ? 'Find local alumni' : 'Find matches'}
            </Button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap justify-center gap-2 max-sm:-mx-4 max-sm:flex-nowrap max-sm:justify-start max-sm:snap-x max-sm:overflow-x-auto max-sm:px-4 max-sm:pb-2">
          {STARTER_QUERIES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={status === 'loading'}
              onClick={() => {
                setQuery(s);
                void search(s);
              }}
              className="shrink-0 snap-start rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 hover:shadow-sm disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl" aria-live="polite">
        {status === 'loading' && <LoadingState stage={stage} />}

        {status === 'error' && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center"
          >
            <AlertTriangle className="size-5 shrink-0 text-red-600" aria-hidden />
            <div className="flex-1 text-sm text-red-900">
              <p className="font-semibold">Matchmaking failed</p>
              <p className="text-red-800">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void search(searched)}>
              Try again
            </Button>
          </div>
        )}

        {status === 'done' && matches.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <SearchX className="size-8 text-zinc-400" aria-hidden />
            <p className="mt-3 font-semibold text-zinc-900">No matches found</p>
            <p className="mt-1 text-sm text-zinc-600">
              {travelMode
                ? `No alumni found in ${city} yet. Try another destination.`
                : `Try broader wording${city !== ANY_CITY ? ' or remove the city filter' : ''}.`}
            </p>
          </div>
        )}

        {status === 'done' && matches.length > 0 && (
          <div className="space-y-4">
            <p className={`${LABEL_CLASS} break-words`}>
              Top {matches.length} for &ldquo;{searched}&rdquo;
            </p>
            <div className="flex w-full flex-col gap-4">
              {matches.map((m, i) => (
                <MatchCard key={m.profile?.id ?? i} match={m} rank={i + 1} query={searched} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
