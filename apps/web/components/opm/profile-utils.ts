import type { Profile } from '@opm/shared-types';

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function travelLabel(status: Profile['travelStatus']): string {
  return status === 'TRAVELING_TO' ? 'Traveling to' : 'Living in';
}

export const labelClass = 'text-xs font-semibold tracking-wider uppercase text-zinc-500';
