import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IntroStatus, type Prisma } from '@prisma/client';
import type {
  CreateIntroDto,
  IntroRequestResponse,
  IntrosResponse,
  PaginatedIntros,
  UpdateIntroStatusDto,
} from '@opm/shared-types';
import { ListIntrosQuery } from './intros.schemas';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_SELECT } from '../common/constants/profiles';
import { inactiveStatusMessage } from '../common/utils/profile';
import { buildPaginationMeta, pageOffset } from '../common/utils/pagination';

const INTRO_INCLUDE = {
  requester: { select: PROFILE_SELECT },
  target: { select: PROFILE_SELECT },
} satisfies Prisma.IntroRequestInclude;

@Injectable()
export class IntrosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, dto: CreateIntroDto): Promise<IntroRequestResponse> {
    if (requesterId === dto.targetId) {
      throw new BadRequestException('You cannot request an intro to yourself');
    }

    const found = await this.prisma.profile.findMany({
      where: { id: { in: [requesterId, dto.targetId] } },
      select: { id: true, status: true },
    });
    if (found.length !== 2) throw new NotFoundException('Requester or target profile not found');
    const blocked = inactiveStatusMessage(found.find((p) => p.id === requesterId)!.status);
    if (blocked) throw new ForbiddenException(blocked);

    const duplicate = await this.prisma.introRequest.findFirst({
      where: {
        status: IntroStatus.PENDING,
        OR: [
          { requesterId, targetId: dto.targetId },
          { requesterId: dto.targetId, targetId: requesterId },
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('A pending intro already exists between these two people');
    }

    return this.prisma.introRequest.create({
      data: {
        requesterId,
        targetId: dto.targetId,
        query: dto.query,
        icebreaker: dto.icebreaker,
      },
      include: INTRO_INCLUDE,
    }) as unknown as Promise<IntroRequestResponse>;
  }

  async findForUser(userId: string, q: ListIntrosQuery): Promise<IntrosResponse> {
    const [sent, received, pendingIncoming] = await Promise.all([
      this.paginate({ requesterId: userId }, q.sentPage, q.limit),
      this.paginate({ targetId: userId }, q.receivedPage, q.limit),
      this.prisma.introRequest.count({
        where: { targetId: userId, status: IntroStatus.PENDING },
      }),
    ]);
    return { sent, received, pendingIncoming };
  }

  private async paginate(
    where: Prisma.IntroRequestWhereInput,
    page: number,
    limit: number,
  ): Promise<PaginatedIntros> {
    const [total, data] = await Promise.all([
      this.prisma.introRequest.count({ where }),
      this.prisma.introRequest.findMany({
        where,
        include: INTRO_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pageOffset(page, limit),
        take: limit,
      }),
    ]);
    return {
      data: data as unknown as IntroRequestResponse[],
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateIntroStatusDto,
  ): Promise<IntroRequestResponse> {
    const intro = await this.prisma.introRequest.findUnique({
      where: { id },
      select: { targetId: true, status: true },
    });
    if (!intro) throw new NotFoundException(`Intro ${id} not found`);
    if (intro.targetId !== userId) {
      throw new ForbiddenException('Only the intro target can accept or decline');
    }
    if (intro.status !== IntroStatus.PENDING) {
      throw new ConflictException(`Intro was already ${intro.status.toLowerCase()}`);
    }

    // Conditional update guards against a concurrent decision.
    const { count } = await this.prisma.introRequest.updateMany({
      where: { id, status: IntroStatus.PENDING },
      data: { status: dto.status },
    });
    if (count === 0) throw new ConflictException('Intro was already answered');

    return this.prisma.introRequest.findUniqueOrThrow({
      where: { id },
      include: INTRO_INCLUDE,
    }) as unknown as Promise<IntroRequestResponse>;
  }
}
