import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Profile, ProfileFilters } from '@opm/shared-types';
import { PrismaService } from '../prisma/prisma.service';

// `embedding` is an Unsupported() column, so Prisma never returns it; the select keeps that explicit.
export const PROFILE_SELECT = {
  id: true,
  fullName: true,
  headline: true,
  bio: true,
  city: true,
  travelStatus: true,
  cohort: true,
  industry: true,
  skills: true,
  avatarUrl: true,
  linkedinUrl: true,
  email: true,
} satisfies Prisma.ProfileSelect;

const equalsInsensitive = (value?: string) =>
  value ? { equals: value, mode: 'insensitive' as const } : undefined;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: ProfileFilters): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      where: {
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
