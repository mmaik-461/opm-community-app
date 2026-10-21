import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ProfileStatus,
  type LoginDto,
  type LoginResponse,
  type Profile,
  type RegisterDto,
  type RegisterResponse,
} from '@opm/shared-types';
import {
  DUMMY_PASSWORD_HASH,
  EMAIL_TAKEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
} from '../common/constants/auth';
import { PROFILE_SELECT } from '../common/constants/profiles';
import {
  getAuthSecret,
  isAutoVerifyEnabled,
  isDevLoginEnabled,
  signAccessToken,
} from '../common/utils/auth';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { buildProfileEmbeddingText, cohortLabel, defaultHeadline } from '../common/utils/profile';
import { toVectorLiteral } from '../common/utils/vector';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchmaking: MatchmakingService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const secret = getAuthSecret(); // fail on misconfiguration before any account is created
    const taken = await this.prisma.profile.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (taken) throw new ConflictException(EMAIL_TAKEN_MESSAGE);

    const cohort = cohortLabel(dto.graduationYear);
    const headline = dto.headline ?? defaultHeadline(dto.industry);
    const bio = dto.bio ?? '';
    const skills = dto.skills ?? [];
    // Embed before writing so an embedding outage never leaves a profile that matchmaking cannot see.
    const [passwordHash, embedding] = await Promise.all([
      hashPassword(dto.password),
      this.matchmaking.embed(buildProfileEmbeddingText({ ...dto, headline, bio, skills, cohort })),
    ]);

    const profile = await this.createProfile(
      {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        city: dto.city,
        industry: dto.industry,
        graduationYear: dto.graduationYear,
        diplomaNumber: dto.diplomaNumber,
        cohort,
        headline,
        bio,
        skills,
        status: isAutoVerifyEnabled() ? ProfileStatus.ACTIVE : ProfileStatus.PENDING_VERIFICATION,
      },
      toVectorLiteral(embedding),
    );
    return { accessToken: await signAccessToken(profile.id, secret), profile };
  }

  private async createProfile(data: Prisma.ProfileCreateInput, vector: string): Promise<Profile> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const profile = await tx.profile.create({ data, select: PROFILE_SELECT });
        // `embedding` is an Unsupported() column, so Prisma can only write it through raw SQL.
        await tx.$executeRaw`UPDATE "Profile" SET "embedding" = ${vector}::vector WHERE "id" = ${profile.id}`;
        return profile;
      });
    } catch (err) {
      // Lost a race with a concurrent sign-up for the same email.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(EMAIL_TAKEN_MESSAGE);
      }
      throw err;
    }
  }

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
