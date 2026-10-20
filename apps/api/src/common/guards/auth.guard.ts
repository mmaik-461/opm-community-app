import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INVALID_TOKEN_MESSAGE, IS_PUBLIC_KEY, MISSING_TOKEN_MESSAGE } from '../constants/auth';
import { extractBearerToken, getAuthSecret, verifyAccessToken } from '../utils/auth';
import type { AuthenticatedRequest } from '../types/request';

/** Registered globally: every route needs a valid bearer token unless it is marked `@Public()`. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException(MISSING_TOKEN_MESSAGE);

    const secret = getAuthSecret(); // misconfiguration is a 503, not a 401
    try {
      request.user = await verifyAccessToken(token, secret);
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
    return true;
  }
}
