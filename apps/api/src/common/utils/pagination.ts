import type { PaginationMeta } from '@opm/shared-types';

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function pageOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
