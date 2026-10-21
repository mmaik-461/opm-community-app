import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { VerificationDecisionResponse, VerificationsResponse } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { IntrosController } from '../intros/intros.controller';
import { IntrosService } from '../intros/intros.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { ProfilesController } from '../profiles/profiles.controller';
import { ProfilesService } from '../profiles/profiles.service';
import { PrismaService } from '../prisma/prisma.service';
import { bearer } from '../test/auth';
import { createFakePrisma, type FakePrisma, type StoredProfile } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

const admin = makeProfile({ id: 'admin', fullName: 'Ada Admin', role: 'ADMIN' });
const member = makeProfile({ id: 'member', fullName: 'Mia Member' });
const target = makeProfile({ id: 'target', fullName: 'Tom Target' });

const applicant = (overrides: Partial<StoredProfile>): StoredProfile => ({
  ...makeProfile({ status: 'PENDING_VERIFICATION', graduationYear: 2018 }),
  diplomaNumber: 'DIP-1',
  createdAt: new Date('2026-03-01T10:00:00.000Z'),
  passwordHash: 'scrypt$secret$hash',
  ...overrides,
});

describe('Admin verification API (controller + service + guards over HTTP)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let profiles: StoredProfile[];
  let http: ReturnType<typeof request>;
  let auth: Record<string, [string, string]>;

  beforeAll(async () => {
    profiles = [];
    db = createFakePrisma(profiles);
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController, IntrosController, ProfilesController],
      providers: [
        AdminService,
        IntrosService,
        ProfilesService,
        MatchmakingService,
        { provide: PrismaService, useValue: db },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
    auth = {
      admin: await bearer('admin'),
      member: await bearer('member'),
      newbie: await bearer('newbie'),
      ghost: await bearer('ghost'),
    };
  });

  afterAll(() => app.close());
  beforeEach(() => {
    profiles.length = 0;
    profiles.push(
      { ...admin },
      { ...member },
      { ...target },
      applicant({
        id: 'newbie',
        fullName: 'Nina Newbie',
        email: 'nina@example.com',
        graduationYear: 2019,
        diplomaNumber: 'DIP-42',
        createdAt: new Date('2026-03-02T10:00:00.000Z'),
      }),
      applicant({ id: 'older', fullName: 'Oscar Older', email: 'oscar@example.com' }),
    );
    db.intros.length = 0;
  });

  const list = (who: string) => http.get('/admin/verifications').set(...auth[who]);
  const decide = (who: string, id: string, body: object) =>
    http
      .patch(`/admin/verifications/${id}`)
      .set(...auth[who])
      .send(body);
  const statusOf = (id: string) => profiles.find((p) => p.id === id)?.status;

  describe('access control', () => {
    it('answers 401 without a token', async () => {
      await http.get('/admin/verifications').expect(401);
      await http.patch('/admin/verifications/newbie').send({ decision: 'APPROVE' }).expect(401);
    });

    it('answers 403 to members (including pending ones) on every /admin route and changes nothing', async () => {
      await list('member').expect(403);
      await list('newbie').expect(403);
      await decide('member', 'newbie', { decision: 'APPROVE' }).expect(403);
      await decide('newbie', 'newbie', { decision: 'APPROVE' }).expect(403); // cannot self-approve
      expect(statusOf('newbie')).toBe('PENDING_VERIFICATION');
    });

    it('answers 403 when the token belongs to a profile that no longer exists', async () => {
      await list('ghost').expect(403);
    });
  });

  describe('GET /admin/verifications', () => {
    it('returns only pending applicants, oldest first, with the review fields', async () => {
      const res = await list('admin').expect(200);
      expect((res.body as VerificationsResponse).data).toEqual([
        {
          id: 'older',
          fullName: 'Oscar Older',
          email: 'oscar@example.com',
          graduationYear: 2018,
          diplomaNumber: 'DIP-1',
          createdAt: '2026-03-01T10:00:00.000Z',
        },
        {
          id: 'newbie',
          fullName: 'Nina Newbie',
          email: 'nina@example.com',
          graduationYear: 2019,
          diplomaNumber: 'DIP-42',
          createdAt: '2026-03-02T10:00:00.000Z',
        },
      ]);
      expect(JSON.stringify(res.body)).not.toMatch(/scrypt|passwordHash/);
    });

    it('drops an applicant from the queue once they are reviewed', async () => {
      await decide('admin', 'older', { decision: 'APPROVE' }).expect(200);
      const ids = ((await list('admin')).body as VerificationsResponse).data.map((r) => r.id);
      expect(ids).toEqual(['newbie']);
    });
  });

  describe('PATCH /admin/verifications/:id', () => {
    it('APPROVE activates the profile', async () => {
      const res = await decide('admin', 'newbie', { decision: 'APPROVE' }).expect(200);
      expect(res.body as VerificationDecisionResponse).toEqual({ id: 'newbie', status: 'ACTIVE' });
      expect(statusOf('newbie')).toBe('ACTIVE');
      expect(statusOf('older')).toBe('PENDING_VERIFICATION');
    });

    it('REJECT marks the profile REJECTED and hides it from the directory', async () => {
      const res = await decide('admin', 'newbie', { decision: 'REJECT' }).expect(200);
      expect(res.body as VerificationDecisionResponse).toEqual({
        id: 'newbie',
        status: 'REJECTED',
      });
      const directory = (
        await http
          .get('/profiles')
          .set(...auth.member)
          .expect(200)
      ).body as {
        id: string;
      }[];
      expect(directory.map((p) => p.id)).not.toContain('newbie');
      expect(directory.map((p) => p.id)).toContain('older'); // pending alumni stay browsable
    });

    it('answers 404 for an unknown id and 409 for an already-reviewed one', async () => {
      await decide('admin', 'nobody', { decision: 'APPROVE' }).expect(404);
      await decide('admin', 'target', { decision: 'REJECT' }).expect(409); // ACTIVE already
      expect(statusOf('target')).toBe('ACTIVE');
      await decide('admin', 'newbie', { decision: 'REJECT' }).expect(200);
      await decide('admin', 'newbie', { decision: 'APPROVE' }).expect(409); // decisions are final
      expect(statusOf('newbie')).toBe('REJECTED');
    });

    it('validates the decision (400)', async () => {
      await decide('admin', 'newbie', { decision: 'MAYBE' }).expect(400);
      await decide('admin', 'newbie', {}).expect(400);
      expect(statusOf('newbie')).toBe('PENDING_VERIFICATION');
    });
  });

  describe('effect on intros', () => {
    const intro = (who: string) =>
      http
        .post('/intros')
        .set(...auth[who])
        .send({ targetId: 'target', query: 'Series A', icebreaker: 'Hi Tom!' });

    it('approving a pending user unlocks intro requests (403 -> 201)', async () => {
      await intro('newbie').expect(403);
      await decide('admin', 'newbie', { decision: 'APPROVE' }).expect(200);
      await intro('newbie').expect(201);
      expect(db.intros).toHaveLength(1);
    });

    it('a rejected user stays blocked from intro requests', async () => {
      await decide('admin', 'newbie', { decision: 'REJECT' }).expect(200);
      const res = await intro('newbie').expect(403);
      expect((res.body as { message: string }).message).toMatch(/not approved/);
      expect(db.intros).toHaveLength(0);
    });
  });
});
