import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ProfileStatus,
  type Profile,
  type ProfileFilters,
  type UpdateProfileDto,
} from '@opm/shared-types';
import { EMBEDDING_SOURCE_SELECT, PROFILE_SELECT } from '../common/constants/profiles';
import { buildProfileEmbeddingText, changesEmbeddedText } from '../common/utils/profile';
import { equalsInsensitive } from '../common/utils/prisma';
import { toVectorLiteral } from '../common/utils/vector';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchmaking: MatchmakingService,
  ) {}

  findAll(filters: ProfileFilters): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      where: {
        status: { not: ProfileStatus.REJECTED },
        city: equalsInsensitive(filters.city),
        cohort: equalsInsensitive(filters.cohort),
        industry: equalsInsensitive(filters.industry),
      },
      select: PROFILE_SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: string): Promise<Profile> {
    const profile = await this.prisma.profile.findUnique({ where: { id }, select: PROFILE_SELECT });
    if (!profile) throw new NotFoundException(`Profile ${id} not found`);
    return profile;
  }

  /**
   * Updates the editable fields. When any of them feeds the embedding text the vector is regenerated
   * first (an embedding outage fails the request before anything is written) and then saved together
   * with the attributes in one transaction, so a profile never carries a stale or half-written vector.
   */
  async updateMe(id: string, patch: UpdateProfileDto): Promise<Profile> {
    const current = await this.prisma.profile.findUnique({
      where: { id },
      select: EMBEDDING_SOURCE_SELECT,
    });
    if (!current) throw new NotFoundException(`Profile ${id} not found`);

    const vector = changesEmbeddedText(current, patch)
      ? toVectorLiteral(
          await this.matchmaking.embed(buildProfileEmbeddingText({ ...current, ...patch })),
        )
      : null;

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { id },
        data: patch,
        select: PROFILE_SELECT,
      });
      // `embedding` is an Unsupported() column, so Prisma can only write it through raw SQL.
      if (vector)
        await tx.$executeRaw`UPDATE "Profile" SET "embedding" = ${vector}::vector WHERE "id" = ${id}`;
      return profile;
    });
  }
}
