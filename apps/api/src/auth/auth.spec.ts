import { type INestApplication, Logger } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { LoginResponse, Profile, RegisterDto, RegisterResponse } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../common/guards/auth.guard';
import { hashPassword, verifyPassword } from '../common/utils/password';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { HealthController } from '../health/health.controller';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { createFakePrisma, type FakePrisma, type StoredProfile } from '../test/fake-prisma';
import { verifyAccessToken } from '../common/utils/auth';
import { makeProfile } from '../test/fixtures';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const sdk = vi.hoisted(() => ({ embeddingsCreate: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    embeddings = { create: sdk.embeddingsCreate };
  },
}));

const PASSWORD = 'correct horse battery staple';
const EMBEDDING = [0.5, 0.25];

const registration = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'New.Person@Example.com',
  password: 'Str0ng!Passw0rd',
  fullName: 'New Person',
  city: 'Lisbon',
  industry: 'Fintech',
  graduationYear: 2019,
  ...overrides,
});

describe('Auth API (controller + service + guard over HTTP)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let db: FakePrisma;
  let profiles: StoredProfile[];

  beforeAll(async () => {
    // Only Alice can use a password; Bob has none (e.g. never invited).
    profiles = [
      makeProfile({ id: 'alice', fullName: 'Alice A', email: 'alice@example.com' }),
      makeProfile({ id: 'bob', fullName: 'Bob B', email: 'bob@example.com' }),
    ];
    Object.assign(profiles[0], { passwordHash: await hashPassword(PASSWORD) });
    db = createFakePrisma(profiles);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, HealthController],
      providers: [
        AuthService,
        MatchmakingService,
        { provide: PrismaService, useValue: db },
        { provide: HealthService, useValue: { check: () => ({ status: 'ok' }) } },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());
  beforeEach(() => {
    profiles.length = 2; // drop profiles registered by earlier tests
    vi.stubEnv('OPENAI_API_KEY', 'test-openai');
    sdk.embeddingsCreate.mockReset();
    sdk.embeddingsCreate.mockResolvedValue({ data: [{ embedding: EMBEDDING }] });
  });
  afterEach(() => vi.unstubAllEnvs());

  describe('POST /auth/login', () => {
    const login = (body: object) => http.post('/auth/login').send(body);

    it('returns the public profile for valid credentials, without any secret material', async () => {
      const res = await login({ email: '  Alice@Example.com ', password: PASSWORD }).expect(200);
      const { profile } = res.body as LoginResponse;
      expect(profile).toMatchObject({ id: 'alice', fullName: 'Alice A' });
      expect(JSON.stringify(res.body)).not.toMatch(/scrypt|passwordHash/);
    });

    it('answers a wrong password, an unknown email and a passwordless account identically (401)', async () => {
      const bodies = await Promise.all(
        [
          { email: 'alice@example.com', password: 'wrong' },
          { email: 'nobody@example.com', password: PASSWORD },
          { email: 'bob@example.com', password: PASSWORD },
        ].map(async (creds) => (await login(creds).expect(401)).body),
      );
      expect(new Set(bodies.map((b: { message: string }) => b.message))).toEqual(
        new Set(['Invalid email or password']),
      );
    });

    it('validates the payload shape (400)', async () => {
      await login({ email: 'not-an-email', password: 'x' }).expect(400);
      await login({ email: 'alice@example.com' }).expect(400);
    });
  });

  describe('POST /auth/register', () => {
    const register = (body: object) => http.post('/auth/register').send(body);
    const stored = (email: string) =>
      (
        db.profile as unknown as { findUnique: (a: object) => Promise<Record<string, unknown>> }
      ).findUnique({
        where: { email },
        select: {
          id: true,
          status: true,
          passwordHash: true,
          diplomaNumber: true,
          cohort: true,
          headline: true,
        },
      });

    it('creates a PENDING_VERIFICATION profile, embeds it and returns a usable access token', async () => {
      const res = await register(registration({ diplomaNumber: 'D-123', bio: 'Short.' })).expect(
        201,
      );
      const { accessToken, profile } = res.body as RegisterResponse;

      expect(profile).toMatchObject({
        fullName: 'New Person',
        email: 'new.person@example.com',
        status: 'PENDING_VERIFICATION',
        graduationYear: 2019,
        cohort: 'Class of 2019',
        headline: 'OPM alumnus, Fintech',
      });
      expect(JSON.stringify(res.body)).not.toMatch(/scrypt|passwordHash|diploma|D-123/);
      await expect(
        verifyAccessToken(accessToken, new TextEncoder().encode(process.env.AUTH_SECRET)),
      ).resolves.toEqual({
        id: profile.id,
      });

      const row = await stored('new.person@example.com');
      expect(row.diplomaNumber).toBe('D-123');
      expect(await verifyPassword('Str0ng!Passw0rd', row.passwordHash as string)).toBe(true);
      expect(db.embeddings.get(profile.id)).toBe('[0.5,0.25]');
    });

    it('embeds profile attributes, padding a brief bio with descriptive fallback text', async () => {
      await register(
        registration({ email: 'brief@example.com', bio: 'Short.', skills: ['payments', 'KYC'] }),
      ).expect(201);
      const { input } = sdk.embeddingsCreate.mock.calls[0][0] as { input: string };
      expect(input).toContain('New Person');
      expect(input).toContain('Skills: payments, KYC');
      expect(input).toContain(
        'New Person is an OPM alumnus (class of 2019) working in Fintech in Lisbon.',
      );
      expect(input).toContain('Short.');
    });

    it('uses the bio verbatim once it is long enough to carry signal', async () => {
      const bio = 'Built and sold a payments company, now angel investing in CEE fintech founders.';
      await register(registration({ email: 'long@example.com', bio })).expect(201);
      const { input } = sdk.embeddingsCreate.mock.calls[0][0] as { input: string };
      expect(input).toContain(bio);
      expect(input).not.toContain('is an OPM alumnus');
    });

    it('activates the profile only when AUTH_AUTO_VERIFY=true', async () => {
      vi.stubEnv('AUTH_AUTO_VERIFY', 'true');
      const res = await register(registration({ email: 'auto@example.com' })).expect(201);
      expect((res.body as RegisterResponse).profile.status).toBe('ACTIVE');
    });

    it('rejects an email that is already registered with 409, in any letter case', async () => {
      await register(registration({ email: 'dupe@example.com' })).expect(201);
      const res = await register(registration({ email: 'DUPE@example.com' })).expect(409);
      expect((res.body as { message: string }).message).toBe(
        'An account with this email already exists',
      );
      await register(registration({ email: 'alice@example.com' })).expect(409);
    });

    it('rejects invalid payloads with 400 and creates nothing', async () => {
      const before = sdk.embeddingsCreate.mock.calls.length;
      const invalid: object[] = [
        registration({ email: 'not-an-email' }),
        registration({ password: 'short' }),
        registration({ password: 'str0ng!passw0rd' }),
        registration({ password: 'Strong!Password' }),
        registration({ password: 'Str0ngPassw0rd' }),
        registration({ fullName: '   ' }),
        registration({ city: '' }),
        registration({ industry: undefined }),
        registration({ graduationYear: undefined }),
        registration({ graduationYear: 1850 }),
        registration({ graduationYear: new Date().getFullYear() + 1 }),
        { ...registration(), graduationYear: '2019' },
        registration({ skills: 'payments' as unknown as string[] }),
      ];
      for (const body of invalid) await register(body).expect(400);
      expect(sdk.embeddingsCreate.mock.calls.length).toBe(before);
      expect(await stored('not-an-email')).toBeNull();
    });

    it.each([
      ['uppercase letter', 'str0ng!passw0rd', 'One uppercase letter (A-Z)'],
      ['lowercase letter', 'STR0NG!PASSW0RD', 'One lowercase letter (a-z)'],
      ['number', 'Strong!Password', 'One number (0-9)'],
      ['special character', 'Str0ngPassw0rd', 'One special character (e.g. !@#$%^&*)'],
      ['minimum length', 'Sh0rt!', 'At least 8 characters'],
    ])(
      'names the failed criterion when the password lacks a %s',
      async (_name, password, label) => {
        const res = await register(registration({ email: 'weak@example.com', password })).expect(
          400,
        );
        expect((res.body as { message: string[] }).message).toEqual([`password: ${label}`]);
        expect(await stored('weak@example.com')).toBeNull();
      },
    );

    it('lists every failed criterion at once', async () => {
      const res = await register(registration({ password: 'abc' })).expect(400);
      expect((res.body as { message: string[] }).message).toEqual([
        'password: At least 8 characters',
        'password: One uppercase letter (A-Z)',
        'password: One number (0-9)',
        'password: One special character (e.g. !@#$%^&*)',
      ]);
    });

    it('saves nothing when the embedding service fails', async () => {
      sdk.embeddingsCreate.mockRejectedValue(new Error('boom'));
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await register(registration({ email: 'noembed@example.com' })).expect(502);
      expect(await stored('noembed@example.com')).toBeNull();
    });

    it('lets the new alumnus sign in with the registered password', async () => {
      await register(registration({ email: 'login@example.com' })).expect(201);
      const res = await http
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'Str0ng!Passw0rd' });
      expect(res.status).toBe(200);
      expect((res.body as LoginResponse).profile.status).toBe('PENDING_VERIFICATION');
    });
  });

  describe('development quick login', () => {
    it('lists the directory and signs in as any profile outside production', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      const list = await http.get('/auth/dev/profiles').expect(200);
      expect((list.body as Profile[]).map((p) => p.id)).toEqual(['alice', 'bob']);
      const res = await http.post('/auth/dev/login').send({ profileId: 'bob' }).expect(200);
      expect((res.body as LoginResponse).profile.id).toBe('bob');
      await http.post('/auth/dev/login').send({ profileId: 'ghost' }).expect(404);
    });

    it('is a 404 in production unless AUTH_DEV_LOGIN=true', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      await http.get('/auth/dev/profiles').expect(404);
      await http.post('/auth/dev/login').send({ profileId: 'bob' }).expect(404);

      vi.stubEnv('AUTH_DEV_LOGIN', 'true');
      await http.post('/auth/dev/login').send({ profileId: 'bob' }).expect(200);
    });
  });

  describe('AuthGuard', () => {
    it('keeps /health public', async () => {
      await http.get('/health').expect(200);
    });
  });
});
