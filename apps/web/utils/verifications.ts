import type { PendingVerification } from '@opm/shared-types';

/** Puts a row back where the API would list it (oldest application first). */
export function insertByCreatedAt(
  rows: PendingVerification[],
  row: PendingVerification,
): PendingVerification[] {
  return [...rows, row].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
