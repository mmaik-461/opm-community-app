import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@opm/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import { FORBIDDEN_ROLE_MESSAGE, ROLES_KEY } from '../constants/auth';
import type { AuthenticatedRequest } from '../types/request';

/**
 * Registered globally after `AuthGuard`. The role is read from the database on every guarded
 * request (the bearer token only carries the profile id), so demotions apply immediately.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const profile = await this.prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!profile || !required.includes(profile.role)) {
      throw new ForbiddenException(FORBIDDEN_ROLE_MESSAGE);
    }
    return true;
  }
}
