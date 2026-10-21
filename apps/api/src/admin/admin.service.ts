import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProfileStatus,
  VerificationDecision,
  type VerificationDecisionResponse,
  type VerificationsResponse,
} from '@opm/shared-types';
import {
  VERIFICATION_NOT_FOUND_MESSAGE,
  VERIFICATION_NOT_PENDING_MESSAGE,
  VERIFICATION_SELECT,
} from '../common/constants/profiles';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Oldest applications first, so nobody waits behind newer sign-ups. */
  async listPending(): Promise<VerificationsResponse> {
    const rows = await this.prisma.profile.findMany({
      where: { status: ProfileStatus.PENDING_VERIFICATION },
      select: VERIFICATION_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return { data: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) };
  }

  async decide(id: string, decision: VerificationDecision): Promise<VerificationDecisionResponse> {
    const status =
      decision === VerificationDecision.APPROVE ? ProfileStatus.ACTIVE : ProfileStatus.REJECTED;
    // Conditional on PENDING so two admins cannot overwrite each other's decision.
    const { count } = await this.prisma.profile.updateMany({
      where: { id, status: ProfileStatus.PENDING_VERIFICATION },
      data: { status },
    });
    if (count === 0) {
      const exists = await this.prisma.profile.findUnique({ where: { id }, select: { id: true } });
      throw exists
        ? new ConflictException(VERIFICATION_NOT_PENDING_MESSAGE)
        : new NotFoundException(VERIFICATION_NOT_FOUND_MESSAGE);
    }
    return { id, status };
  }
}
