import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileStatus, type Profile, type ProfileFilters } from '@opm/shared-types';
import { PROFILE_SELECT } from '../common/constants/profiles';
import { equalsInsensitive } from '../common/utils/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
