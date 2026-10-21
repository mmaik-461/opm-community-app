import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { IntroRequestResponse, IntrosResponse } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../common/guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { bearer } from '../test/auth';
import { createFakePrisma, type FakePrisma } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { IntrosController } from './intros.controller';
import { IntrosService } from './intros.service';

const alice = makeProfile({ id: 'alice', fullName: 'Alice A' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob B' });
const carol = makeProfile({ id: 'carol', fullName: 'Carol C' });
const pending = makeProfile({
  id: 'pending',
  fullName: 'Paula Pending',
  status: 'PENDING_VERIFICATION',
});

const payload = (targetId: string) => ({
  targetId,
  query: 'Series A fundraising',
  icebreaker: 'Hi! Could we chat?',
});

describe('Intros API (controller + service over HTTP)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let http: ReturnType<typeof request>;
  let auth: Record<string, [string, string]>;

  beforeAll(async () => {
    db = createFakePrisma([alice, bob, carol, pending]);
    const moduleRef = await Test.createTestingModule({
      controllers: [IntrosController],
      providers: [
        IntrosService,
        { provide: PrismaService, useValue: db },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
    auth = {
      alice: await bearer('alice'),
      bob: await bearer('bob'),
      carol: await bearer('carol'),
      pending: await bearer('pending'),
      ghost: await bearer('ghost'),
    };
  });

  afterAll(() => app.close());
  beforeEach(() => {
    db.intros.length = 0;
  });

  /** POST /intros as `requesterId` (the authenticated user). */
  const send = (requesterId: string, targetId: string) =>
    http
      .post('/intros')
      .set(...auth[requesterId])
      .send(payload(targetId));

  const list = async (userId: string, query: Record<string, string | number> = {}) =>
    (
      await http
        .get('/intros')
        .set(...auth[userId])
        .query(query)
        .expect(200)
    ).body as IntrosResponse;

  /** PATCH /intros/:id/status as `userId` (the authenticated user). */
  const decide = (userId: string, id: string, status: string) =>
    http
      .patch(`/intros/${id}/status`)
      .set(...auth[userId])
      .send({ status });

  describe('POST /intros', () => {
    it('creates a PENDING intro with both profiles embedded', async () => {
      const res = await send('alice', 'bob').expect(201);
      const body = res.body as IntroRequestResponse;
      expect(body).toMatchObject({
        requesterId: 'alice',
        targetId: 'bob',
        status: 'PENDING',
        query: 'Series A fundraising',
        requester: { id: 'alice' },
        target: { id: 'bob' },
      });
      expect(db.intros).toHaveLength(1);
    });

    it('blocks a PENDING_VERIFICATION requester with 403 and a clear message', async () => {
      const res = await send('pending', 'bob').expect(403);
      expect(res.body.message).toMatch(/awaiting alumni verification/i);
      expect(db.intros).toHaveLength(0);
    });

    it('lets a verified alumnus request an intro to a pending one', async () => {
      await send('alice', 'pending').expect(201);
    });

    it('rejects a self-request with 400 and stores nothing', async () => {
      const res = await send('alice', 'alice').expect(400);
      expect(res.body.message).toMatch(/yourself/i);
      expect(db.intros).toHaveLength(0);
    });

    it('rejects a duplicate pending request with 409', async () => {
      await send('alice', 'bob').expect(201);
      await send('alice', 'bob').expect(409);
      expect(db.intros).toHaveLength(1);
    });

    it('treats a pending request in the opposite direction as a duplicate', async () => {
      await send('alice', 'bob').expect(201);
      await send('bob', 'alice').expect(409);
    });

    it('allows a new request once the previous one was answered', async () => {
      const first = (await send('alice', 'bob').expect(201)).body as IntroRequestResponse;
      await decide('bob', first.id, 'DECLINED').expect(200);
      await send('alice', 'bob').expect(201);
    });

    it('returns 404 when either profile does not exist', async () => {
      await send('alice', 'ghost').expect(404);
      await send('ghost', 'bob').expect(404);
    });

    it('validates the payload shape with 400', async () => {
      await http
        .post('/intros')
        .set(...auth.alice)
        .send({})
        .expect(400);
      await http
        .post('/intros')
        .set(...auth.alice)
        .send({ ...payload('bob'), icebreaker: '   ' })
        .expect(400);
    });
  });

  describe('PATCH /intros/:id/status', () => {
    async function pendingIntro() {
      return (await send('alice', 'bob').expect(201)).body as IntroRequestResponse;
    }

    it('lets the target accept and persists the new status', async () => {
      const intro = await pendingIntro();
      const res = await decide('bob', intro.id, 'ACCEPTED').expect(200);
      expect(res.body.status).toBe('ACCEPTED');
      expect(db.intros[0].status).toBe('ACCEPTED');
    });

    it('forbids the requester from deciding on their own intro (403)', async () => {
      const intro = await pendingIntro();
      await decide('alice', intro.id, 'ACCEPTED').expect(403);
      expect(db.intros[0].status).toBe('PENDING');
    });

    it('forbids an unrelated user (403)', async () => {
      const intro = await pendingIntro();
      await decide('carol', intro.id, 'DECLINED').expect(403);
      expect(db.intros[0].status).toBe('PENDING');
    });

    it('returns 409 when the intro was already answered and keeps the first decision', async () => {
      const intro = await pendingIntro();
      await decide('bob', intro.id, 'ACCEPTED').expect(200);
      await decide('bob', intro.id, 'DECLINED').expect(409);
      expect(db.intros[0].status).toBe('ACCEPTED');
    });

    it('returns 404 for an unknown intro and 400 for an invalid status', async () => {
      await decide('bob', 'nope', 'ACCEPTED').expect(404);
      const intro = await pendingIntro();
      await decide('bob', intro.id, 'PENDING').expect(400);
    });
  });

  describe('GET /intros', () => {
    async function receiveFromDistinctSenders(count: number) {
      // Each sender is a separate profile so no duplicate-pending rule interferes.
      for (let i = 0; i < count; i++) {
        const id = `sender-${i}`;
        db.intros.push({
          id: `seed-${i}`,
          requesterId: id,
          targetId: 'bob',
          query: 'q',
          icebreaker: 'hi',
          status: 'PENDING',
          createdAt: new Date(Date.UTC(2026, 5, 1, 0, 0, i)),
          updatedAt: new Date(Date.UTC(2026, 5, 1, 0, 0, i)),
        });
      }
    }

    it('computes totals, totalPages and page slices from the data', async () => {
      await receiveFromDistinctSenders(7);

      const page1 = await list('bob', { limit: 3 });
      expect(page1.received.meta).toEqual({ total: 7, page: 1, totalPages: 3 });
      expect(page1.received.data).toHaveLength(3);

      const page3 = await list('bob', { limit: 3, receivedPage: 3 });
      expect(page3.received.meta).toEqual({ total: 7, page: 3, totalPages: 3 });
      expect(page3.received.data).toHaveLength(1);
    });

    it('returns newest first and never repeats an item across pages', async () => {
      await receiveFromDistinctSenders(5);
      const p1 = await list('bob', { limit: 2, receivedPage: 1 });
      const p2 = await list('bob', { limit: 2, receivedPage: 2 });
      const p3 = await list('bob', { limit: 2, receivedPage: 3 });
      const ids = [...p1.received.data, ...p2.received.data, ...p3.received.data].map((i) => i.id);
      expect(ids).toEqual(['seed-4', 'seed-3', 'seed-2', 'seed-1', 'seed-0']);
    });

    it('paginates sent and received independently', async () => {
      await receiveFromDistinctSenders(4);
      for (const target of ['alice', 'carol']) await send('bob', target).expect(201);

      const res = await list('bob', { limit: 1, receivedPage: 4, sentPage: 2 });
      expect(res.received.meta).toEqual({ total: 4, page: 4, totalPages: 4 });
      expect(res.sent.meta).toEqual({ total: 2, page: 2, totalPages: 2 });
      expect(res.sent.data).toHaveLength(1);
      expect(res.received.data).toHaveLength(1);
    });

    it('reports totalPages 1 for an empty list', async () => {
      const res = await list('carol');
      expect(res.sent).toEqual({ data: [], meta: { total: 0, page: 1, totalPages: 1 } });
      expect(res.received.meta.totalPages).toBe(1);
      expect(res.pendingIncoming).toBe(0);
    });

    it('counts pending incoming across all pages and drops answered ones', async () => {
      await receiveFromDistinctSenders(6);
      const before = await list('bob', { limit: 2 });
      expect(before.received.data).toHaveLength(2);
      expect(before.pendingIncoming).toBe(6);

      await decide('bob', 'seed-0', 'ACCEPTED').expect(200);
      await decide('bob', 'seed-1', 'DECLINED').expect(200);

      const after = await list('bob', { limit: 2 });
      expect(after.pendingIncoming).toBe(4);
      expect(after.received.meta.total).toBe(6);
    });

    it('does not count sent intros towards the sender pending badge', async () => {
      await send('alice', 'bob').expect(201);
      expect((await list('alice')).pendingIncoming).toBe(0);
      expect((await list('bob')).pendingIncoming).toBe(1);
    });

    it('validates query params (limit above the maximum, page 0)', async () => {
      await http
        .get('/intros')
        .set(...auth.bob)
        .query({ limit: 51 })
        .expect(400);
      await http
        .get('/intros')
        .set(...auth.bob)
        .query({ receivedPage: 0 })
        .expect(400);
    });
  });

  describe('authentication', () => {
    const wrongSecret = 'another-secret-0123456789-abcdefghijklmnopqrstuv';
    const protectedCalls: [string, () => request.Test][] = [
      ['POST /intros', () => http.post('/intros').send(payload('bob'))],
      ['GET /intros', () => http.get('/intros')],
      [
        'PATCH /intros/:id/status',
        () => http.patch('/intros/x/status').send({ status: 'ACCEPTED' }),
      ],
    ];

    it.each(protectedCalls)('%s requires a bearer token (401)', async (_name, call) => {
      await call().expect(401);
      expect(db.intros).toHaveLength(0);
    });

    it('rejects malformed, foreign-signed and expired tokens (401)', async () => {
      const bad = [
        'Bearer not-a-jwt',
        'Basic abc',
        (await bearer('alice', { secret: wrongSecret }))[1],
        (await bearer('alice', { expiresIn: '-1m' }))[1],
      ];
      for (const header of bad) {
        await http.get('/intros').set('Authorization', header).expect(401);
      }
    });

    it('rejects an unsigned token (alg none) (401)', async () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'alice' })}.`;
      await http.get('/intros').set('Authorization', `Bearer ${forged}`).expect(401);
    });

    it('answers 503 rather than 401 when AUTH_SECRET is not configured', async () => {
      const header = await bearer('alice');
      vi.stubEnv('AUTH_SECRET', 'short');
      try {
        await http
          .get('/intros')
          .set(...header)
          .expect(503);
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('takes the requester from the token and ignores a spoofed requesterId in the body', async () => {
      const res = await http
        .post('/intros')
        .set(...auth.alice)
        .send({ ...payload('bob'), requesterId: 'carol' })
        .expect(201);
      expect(res.body).toMatchObject({ requesterId: 'alice', targetId: 'bob' });
      expect(db.intros[0].requesterId).toBe('alice');
    });

    it('lists only the token owner’s intros and ignores a spoofed userId query', async () => {
      await send('alice', 'bob').expect(201);
      const res = await list('carol', { userId: 'bob' });
      expect(res.received.meta.total).toBe(0);
      expect(res.pendingIncoming).toBe(0);
    });

    it('decides as the token owner: a spoofed userId in the body cannot impersonate the target', async () => {
      const intro = (await send('alice', 'bob').expect(201)).body as IntroRequestResponse;
      await http
        .patch(`/intros/${intro.id}/status`)
        .set(...auth.alice)
        .send({ userId: 'bob', status: 'ACCEPTED' })
        .expect(403);
      expect(db.intros[0].status).toBe('PENDING');
    });
  });
});
