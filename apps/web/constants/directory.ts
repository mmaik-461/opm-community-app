export type FilterKey = 'city' | 'cohort' | 'industry';
export type Filters = Record<FilterKey, string | null>;

export const FILTER_GROUPS: { key: FilterKey; label: string }[] = [
  { key: 'city', label: 'City' },
  { key: 'cohort', label: 'Cohort' },
  { key: 'industry', label: 'Industry' },
];

export const EMPTY_FILTERS: Filters = { city: null, cohort: null, industry: null };

export const SEARCH_DEBOUNCE_MS = 250;
export const DIRECTORY_SKELETON_COUNT = 6;
