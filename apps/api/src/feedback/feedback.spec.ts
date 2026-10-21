import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { FeedbackAnalyticsResponse, MatchFeedbackResponse } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { bearer } from '../test/auth';
import { createFakePrisma, type FakePrisma } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

const admin = makeProfile({ id: 'admin', fullName: 'Ada Admin', role: 'ADMIN' });
const alice = makeProfile({ id: 'alice', fullName: 'Alice A', email: 'alice@example.com' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob B', email: 'bob@example.com' });
const pending = makeProfile({ id: 'pending', status: 'PENDING_VERIFICATION' });

const positive = { candidateId: 'bob', query: 'Series A', rating: 'POSITIVE' };
const negative = {
  candidateId: 'bob',
  query: 'Series A',
  rating: 'NEGATIVE',
  reason: 'DIFFERENT_INDUSTRY',
  comment: 'Works in biotech',
};

describe('Matchmaker feedback API (controllers + services + guards over HTTP)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let http: ReturnType<typeof request>;
  let auth: Record<string, [string, string]>;

  beforeAll(async () => {
    db = createFakePrisma([admin, alice, bob, pending]);
    const moduleRef = await Test.createTestingModule({
      controllers: [FeedbackController, AdminController],
      providers: [
        FeedbackService,
        AdminService,
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
      alice: await bearer('alice'),
      bob: await bearer('bob'),
      pending: await bearer('pending'),
      ghost: await bearer('ghost'),
    };
  });

  afterAll(() => app.close());
  beforeEach(() => {
    db.feedback.length = 0;
  });

  const send = (who: string, body: object) =>
    http
      .post('/matchmaker/feedback')
      .set(...auth[who])
      .send(body);
  const listFeedback = (who: string) => http.get('/admin/feedback').set(...auth[who]);

  describe('POST /matchmaker/feedback', () => {
    it('answers 401 without a token and stores nothing', async () => {
      await http.post('/matchmaker/feedback').send(positive).expect(401);
      expect(db.feedback).toHaveLength(0);
    });

    it('stores positive feedback for the authenticated user', async () => {
      const res = await send('alice', positive).expect(201);
      const body = res.body as MatchFeedbackResponse;
      expect(body).toMatchObject({ candidateId: 'bob', rating: 'POSITIVE' });
      expect(db.feedback).toEqual([
        expect.objectContaining({
          id: body.id,
          userId: 'alice',
          candidateId: 'bob',
          query: 'Series A',
          rating: 'POSITIVE',
          reason: null,
          comment: null,
        }),
      ]);
    });

    it('stores a negative review with its reason and trimmed comment', async () => {
      await send('alice', { ...negative, comment: '  Works in biotech  ' }).expect(201);
      expect(db.feedback[0]).toMatchObject({
        rating: 'NEGATIVE',
        reason: 'DIFFERENT_INDUSTRY',
        comment: 'Works in biotech',
      });
    });

    it('rejects a payload that tries to name the reviewer (identity comes from the token)', async () => {
      await send('alice', { ...positive, userId: 'bob' }).expect(400); // strict schema
      expect(db.feedback).toHaveLength(0);
    });

    it.each([
      ['a missing candidate', { ...positive, candidateId: undefined }],
      ['an empty query', { ...positive, query: '   ' }],
      ['an unknown rating', { ...positive, rating: 'MEH' }],
      ['an unknown reason', { ...negative, reason: 'BORING' }],
      ['a too long comment', { ...negative, comment: 'x'.repeat(501) }],
      ['GREAT_MATCH on a negative review', { ...negative, reason: 'GREAT_MATCH' }],
      ['SKILL_MISMATCH on a positive review', { ...positive, reason: 'SKILL_MISMATCH' }],
    ])('rejects %s with 400', async (_name, body) => {
      await send('alice', body).expect(400);
      expect(db.feedback).toHaveLength(0);
    });

    it('accepts GREAT_MATCH on a positive review and OTHER on either rating', async () => {
      await send('alice', { ...positive, reason: 'GREAT_MATCH' }).expect(201);
      await send('alice', { ...positive, reason: 'OTHER' }).expect(201);
      await send('alice', { ...negative, reason: 'OTHER' }).expect(201);
      expect(db.feedback).toHaveLength(3);
    });

    it('answers 400 for self-review and 404 for an unknown candidate', async () => {
      await send('alice', { ...positive, candidateId: 'alice' }).expect(400);
      await send('alice', { ...positive, candidateId: 'nobody' }).expect(404);
      await send('ghost', positive).expect(404);
      expect(db.feedback).toHaveLength(0);
    });

    it('answers 403 while the reviewer is not verified', async () => {
      const res = await send('pending', positive).expect(403);
      expect((res.body as { message: string }).message).toMatch(/awaiting alumni verification/);
      expect(db.feedback).toHaveLength(0);
    });
  });

  describe('GET /admin/feedback', () => {
    it('answers 401 anonymous and 403 to members', async () => {
      await http.get('/admin/feedback').expect(401);
      await listFeedback('alice').expect(403);
      await listFeedback('pending').expect(403);
    });

    it('answers 200 to admins with an empty summary when nothing was reviewed', async () => {
      const res = await listFeedback('admin').expect(200);
      expect(res.body as FeedbackAnalyticsResponse).toEqual({
        summary: { total: 0, positive: 0, negative: 0, satisfactionRate: 0 },
        data: [],
      });
    });

    it('lists reviews newest first with reviewer and candidate details', async () => {
      await send('alice', positive).expect(201);
      await send('bob', { ...negative, candidateId: 'alice', query: 'Fintech' }).expect(201);

      const res = await listFeedback('admin').expect(200);
      const body = res.body as FeedbackAnalyticsResponse;
      expect(body.data.map((f) => f.query)).toEqual(['Fintech', 'Series A']);
      expect(body.data[0]).toEqual({
        id: expect.any(String),
        query: 'Fintech',
        rating: 'NEGATIVE',
        reason: 'DIFFERENT_INDUSTRY',
        comment: 'Works in biotech',
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
        user: { id: 'bob', fullName: 'Bob B', email: 'bob@example.com' },
        candidate: { id: 'alice', fullName: 'Alice A', email: 'alice@example.com' },
      });
      expect(body.data[1]).toMatchObject({ rating: 'POSITIVE', reason: null, comment: null });
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|diplomaNumber/);
    });

    it('summarises totals, positives, negatives and the satisfaction rate', async () => {
      await send('alice', positive).expect(201);
      await send('alice', positive).expect(201);
      await send('bob', { ...negative, candidateId: 'alice' }).expect(201);

      const { summary } = (await listFeedback('admin').expect(200))
        .body as FeedbackAnalyticsResponse;
      expect(summary).toEqual({ total: 3, positive: 2, negative: 1, satisfactionRate: 67 });
    });
  });
});
