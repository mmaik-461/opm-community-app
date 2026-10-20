import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { LoginResponse, Profile } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../common/guards/auth.guard';
import { hashPassword } from '../common/utils/password';
import { HealthController } from '../health/health.controller';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { createFakePrisma } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const PASSWORD = 'correct horse battery staple';

describe('Auth API (controller + service + guard over HTTP)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const db = createFakePrisma([
      makeProfile({ id: 'alice', fullName: 'Alice A', email: 'alice@example.com' }),
      makeProfile({ id: 'bob', fullName: 'Bob B', email: 'bob@example.com' }),
    ]);
    // Only Alice can use a password; Bob has none (e.g. never invited).
    const withHash = [{ id: 'alice', passwordHash: await hashPassword(PASSWORD) }];
    const original = db.profile.findUnique;
    db.profile.findUnique = async (args) => {
      const row = await original(args);
      const extra = withHash.find((h) => h.id === row?.id);
      return row && args.select?.passwordHash
        ? { ...row, passwordHash: extra?.passwordHash ?? null }
        : row;
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, HealthController],
      providers: [
        AuthService,
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
