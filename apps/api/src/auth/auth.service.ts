import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { LoginDto, LoginResponse, Profile } from '@opm/shared-types';
import { DUMMY_PASSWORD_HASH, INVALID_CREDENTIALS_MESSAGE } from '../common/constants/auth';
import { PROFILE_SELECT } from '../common/constants/profiles';
import { isDevLoginEnabled } from '../common/utils/auth';
import { verifyPassword } from '../common/utils/password';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const account = await this.prisma.profile.findUnique({
      where: { email: dto.email },
      select: { ...PROFILE_SELECT, passwordHash: true },
    });
    // Always run one hash comparison so unknown emails and wrong passwords look alike.
    const valid = await verifyPassword(dto.password, account?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!account?.passwordHash || !valid)
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);

    const { passwordHash: _passwordHash, ...profile } = account;
    return { profile };
  }

  async devProfiles(): Promise<Profile[]> {
    this.assertDevLogin();
    return this.prisma.profile.findMany({ select: PROFILE_SELECT, orderBy: { fullName: 'asc' } });
  }

  async devLogin(profileId: string): Promise<LoginResponse> {
    this.assertDevLogin();
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: PROFILE_SELECT,
    });
    if (!profile) throw new NotFoundException(`Profile ${profileId} not found`);
    return { profile };
  }

  /** Looks like a missing route in production so the feature is not discoverable. */
  private assertDevLogin() {
    if (!isDevLoginEnabled()) throw new NotFoundException();
  }
}
