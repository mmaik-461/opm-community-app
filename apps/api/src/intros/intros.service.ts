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
  UpdateIntroStatusDto,
} from '@opm/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { PROFILE_SELECT } from '../profiles/profiles.service';

const INTRO_INCLUDE = {
  requester: { select: PROFILE_SELECT },
  target: { select: PROFILE_SELECT },
} satisfies Prisma.IntroRequestInclude;

@Injectable()
export class IntrosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIntroDto): Promise<IntroRequestResponse> {
    if (dto.requesterId === dto.targetId) {
      throw new BadRequestException('You cannot request an intro to yourself');
    }

    const found = await this.prisma.profile.findMany({
      where: { id: { in: [dto.requesterId, dto.targetId] } },
      select: { id: true },
    });
    if (found.length !== 2) throw new NotFoundException('Requester or target profile not found');

    const duplicate = await this.prisma.introRequest.findFirst({
      where: {
        status: IntroStatus.PENDING,
        OR: [
          { requesterId: dto.requesterId, targetId: dto.targetId },
          { requesterId: dto.targetId, targetId: dto.requesterId },
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('A pending intro already exists between these two people');
    }

    return this.prisma.introRequest.create({
      data: {
        requesterId: dto.requesterId,
        targetId: dto.targetId,
        query: dto.query,
        icebreaker: dto.icebreaker,
      },
      include: INTRO_INCLUDE,
    }) as unknown as Promise<IntroRequestResponse>;
  }

  async findForUser(userId: string): Promise<IntrosResponse> {
    const [sent, received] = await Promise.all([
      this.prisma.introRequest.findMany({
        where: { requesterId: userId },
        include: INTRO_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.introRequest.findMany({
        where: { targetId: userId },
        include: INTRO_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { sent, received } as unknown as IntrosResponse;
  }

  async updateStatus(id: string, dto: UpdateIntroStatusDto): Promise<IntroRequestResponse> {
    const intro = await this.prisma.introRequest.findUnique({
      where: { id },
      select: { targetId: true, status: true },
    });
    if (!intro) throw new NotFoundException(`Intro ${id} not found`);
    if (intro.targetId !== dto.userId) {
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
