import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FeedbackRating,
  ProfileStatus,
  VerificationDecision,
  type FeedbackAnalyticsResponse,
  type VerificationDecisionResponse,
  type VerificationsResponse,
} from '@opm/shared-types';
import { FEEDBACK_LIST_LIMIT, FEEDBACK_PERSON_SELECT } from '../common/constants/feedback';
import {
  VERIFICATION_NOT_FOUND_MESSAGE,
  VERIFICATION_NOT_PENDING_MESSAGE,
  VERIFICATION_SELECT,
} from '../common/constants/profiles';
import { satisfactionRate } from '../common/utils/feedback';
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

  /** Newest reviews first, with the headline numbers computed over all of them. */
  async listFeedback(): Promise<FeedbackAnalyticsResponse> {
    const [rows, positive, negative] = await Promise.all([
      this.prisma.matchFeedback.findMany({
        include: {
          user: { select: FEEDBACK_PERSON_SELECT },
          candidate: { select: FEEDBACK_PERSON_SELECT },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: FEEDBACK_LIST_LIMIT,
      }),
      this.prisma.matchFeedback.count({ where: { rating: FeedbackRating.POSITIVE } }),
      this.prisma.matchFeedback.count({ where: { rating: FeedbackRating.NEGATIVE } }),
    ]);
    const total = positive + negative;
    return {
      summary: { total, positive, negative, satisfactionRate: satisfactionRate(positive, total) },
      data: rows.map((row) => ({
        id: row.id,
        query: row.query,
        rating: row.rating,
        reason: row.reason,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
        user: row.user,
        candidate: row.candidate,
      })),
    };
  }
}
