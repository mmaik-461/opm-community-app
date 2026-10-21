import { SetMetadata } from '@nestjs/common';
import type { Role } from '@opm/shared-types';
import { ROLES_KEY } from '../constants/auth';

/** Restricts a route (or controller) to the given roles; enforced by the global `RolesGuard`. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
