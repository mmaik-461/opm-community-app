import type { TravelContext } from '@opm/shared-types';

/** Wraps untrusted JSON data in a delimited tag so the model treats it as data. */
export function dataTag(tag: string, value: unknown): string {
  return `\n<${tag}>${JSON.stringify(value)}</${tag}>`;
}

export function travelContextTag(travel?: TravelContext): string {
  return travel
    ? dataTag('travel_context', { city: travel.city, dates: travel.dates ?? null })
    : '';
}
