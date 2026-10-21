import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateMatchFeedbackDto, MatchFeedbackResponse } from '@opm/shared-types';
import {
  FEEDBACK_CANDIDATE_NOT_FOUND_MESSAGE,
  FEEDBACK_SELF_MESSAGE,
} from '../common/constants/feedback';
import { inactiveStatusMessage } from '../common/utils/profile';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMatchFeedbackDto): Promise<MatchFeedbackResponse> {
    if (userId === dto.candidateId) throw new BadRequestException(FEEDBACK_SELF_MESSAGE);

    const found = await this.prisma.profile.findMany({
      where: { id: { in: [userId, dto.candidateId] } },
      select: { id: true, status: true },
    });
    const reviewer = found.find((p) => p.id === userId);
    if (!reviewer) throw new NotFoundException('Reviewer profile not found');
    if (!found.some((p) => p.id === dto.candidateId)) {
      throw new NotFoundException(FEEDBACK_CANDIDATE_NOT_FOUND_MESSAGE);
    }
    const blocked = inactiveStatusMessage(reviewer.status);
    if (blocked) throw new ForbiddenException(blocked);

    const row = await this.prisma.matchFeedback.create({
      data: {
        userId,
        candidateId: dto.candidateId,
        query: dto.query,
        rating: dto.rating,
        reason: dto.reason,
        comment: dto.comment,
      },
    });
    return {
      id: row.id,
      candidateId: row.candidateId,
      rating: row.rating,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
