import type { AuthenticatedUser } from '@opm/shared-types';

/** The slice of the Express request the auth layer reads and writes. */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user: AuthenticatedUser;
}
