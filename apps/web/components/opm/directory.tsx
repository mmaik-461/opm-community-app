'use client';

import * as React from 'react';
import { Search, UsersRound, X } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileCard } from './profile-card';
import { labelClass } from './profile-utils';
import { useUser } from './user-context';

type FilterKey = 'city' | 'cohort' | 'industry';
type Filters = Record<FilterKey, string | null>;

const GROUPS: { key: FilterKey; label: string }[] = [
  { key: 'city', label: 'City' },
  { key: 'cohort', label: 'Cohort' },
  { key: 'industry', label: 'Industry' },
];

function unique(profiles: Profile[], key: FilterKey): string[] {
  return Array.from(new Set(profiles.map((p) => p[key]))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

export function Directory() {
  const { profiles, loading, error } = useUser();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [filters, setFilters] = React.useState<Filters>({
    city: null,
    cohort: null,
    industry: null,
  });

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return profiles.filter((p) => {
      if (GROUPS.some(({ key }) => filters[key] && p[key] !== filters[key])) return false;
      if (!q) return true;
      return [p.fullName, p.headline, p.city, p.cohort, p.industry, ...p.skills].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [profiles, debouncedSearch, filters]);

  const active = GROUPS.some(({ key }) => filters[key]) || search !== '';

  function toggle(key: FilterKey, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  }

  function reset() {
    setSearch('');
    setDebouncedSearch('');
    setFilters({ city: null, cohort: null, industry: null });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className={labelClass}>Alumni Directory</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {loading ? 'Loading…' : `${filtered.length} of ${profiles.length} alumni`}
        </h2>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, skill…"
            aria-label="Search alumni"
            className="h-10 pl-9"
          />
        </div>
        {GROUPS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className={`${labelClass} pt-1.5 sm:w-20 sm:shrink-0`}>{label}</span>
            <div className="flex flex-wrap gap-1.5">
              {unique(profiles, key).map((v) => {
                const on = filters[key] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key, v)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-all duration-200 ${
                      on
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {active && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X /> Clear filters
          </Button>
        )}
      </div>

      <div className="flex min-h-[540px] w-full flex-col">
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <UsersRound className="size-8 text-zinc-400" aria-hidden />
          <p className="mt-3 font-semibold text-zinc-900">
            {error || profiles.length === 0 ? 'No alumni available' : 'No alumni match your filters'}
          </p>
          {active && (
            <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
