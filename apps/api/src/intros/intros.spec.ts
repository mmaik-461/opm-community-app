import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { IntroRequestResponse, IntrosResponse } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { IntrosController } from './intros.controller';
import { IntrosService } from './intros.service';

const alice = makeProfile({ id: 'alice', fullName: 'Alice A' });
const bob = makeProfile({ id: 'bob', fullName: 'Bob B' });
const carol = makeProfile({ id: 'carol', fullName: 'Carol C' });

const payload = (requesterId: string, targetId: string) => ({
  requesterId,
  targetId,
  query: 'Series A fundraising',
  icebreaker: 'Hi! Could we chat?',
});

describe('Intros API (controller + service over HTTP)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    db = createFakePrisma([alice, bob, carol]);
    const moduleRef = await Test.createTestingModule({
      controllers: [IntrosController],
      providers: [IntrosService, { provide: PrismaService, useValue: db }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());
  beforeEach(() => {
    db.intros.length = 0;
  });

  const send = (requesterId: string, targetId: string) =>
    http.post('/intros').send(payload(requesterId, targetId));

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
      await http
        .patch(`/intros/${first.id}/status`)
        .send({ userId: 'bob', status: 'DECLINED' })
        .expect(200);
      await send('alice', 'bob').expect(201);
    });

    it('returns 404 when either profile does not exist', async () => {
      await send('alice', 'ghost').expect(404);
      await send('ghost', 'bob').expect(404);
    });

    it('validates the payload shape with 400', async () => {
      await http.post('/intros').send({ requesterId: 'alice' }).expect(400);
      await http
        .post('/intros')
        .send({ ...payload('alice', 'bob'), icebreaker: '   ' })
        .expect(400);
    });
  });

  describe('PATCH /intros/:id/status', () => {
    async function pendingIntro() {
      return (await send('alice', 'bob').expect(201)).body as IntroRequestResponse;
    }

    it('lets the target accept and persists the new status', async () => {
      const intro = await pendingIntro();
      const res = await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'bob', status: 'ACCEPTED' })
        .expect(200);
      expect(res.body.status).toBe('ACCEPTED');
      expect(db.intros[0].status).toBe('ACCEPTED');
    });

    it('forbids the requester from deciding on their own intro (403)', async () => {
      const intro = await pendingIntro();
      await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'alice', status: 'ACCEPTED' })
        .expect(403);
      expect(db.intros[0].status).toBe('PENDING');
    });

    it('forbids an unrelated user (403)', async () => {
      const intro = await pendingIntro();
      await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'carol', status: 'DECLINED' })
        .expect(403);
      expect(db.intros[0].status).toBe('PENDING');
    });

    it('returns 409 when the intro was already answered and keeps the first decision', async () => {
      const intro = await pendingIntro();
      await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'bob', status: 'ACCEPTED' })
        .expect(200);
      await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'bob', status: 'DECLINED' })
        .expect(409);
      expect(db.intros[0].status).toBe('ACCEPTED');
    });

    it('returns 404 for an unknown intro and 400 for an invalid status', async () => {
      await http
        .patch('/intros/nope/status')
        .send({ userId: 'bob', status: 'ACCEPTED' })
        .expect(404);
      const intro = await pendingIntro();
      await http
        .patch(`/intros/${intro.id}/status`)
        .send({ userId: 'bob', status: 'PENDING' })
        .expect(400);
    });
  });

  describe('GET /intros', () => {
    const list = async (query: Record<string, string | number>) =>
      (await http.get('/intros').query(query).expect(200)).body as IntrosResponse;

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

      const page1 = await list({ userId: 'bob', limit: 3 });
      expect(page1.received.meta).toEqual({ total: 7, page: 1, totalPages: 3 });
      expect(page1.received.data).toHaveLength(3);

      const page3 = await list({ userId: 'bob', limit: 3, receivedPage: 3 });
      expect(page3.received.meta).toEqual({ total: 7, page: 3, totalPages: 3 });
      expect(page3.received.data).toHaveLength(1);
    });

    it('returns newest first and never repeats an item across pages', async () => {
      await receiveFromDistinctSenders(5);
      const p1 = await list({ userId: 'bob', limit: 2, receivedPage: 1 });
      const p2 = await list({ userId: 'bob', limit: 2, receivedPage: 2 });
      const p3 = await list({ userId: 'bob', limit: 2, receivedPage: 3 });
      const ids = [...p1.received.data, ...p2.received.data, ...p3.received.data].map((i) => i.id);
      expect(ids).toEqual(['seed-4', 'seed-3', 'seed-2', 'seed-1', 'seed-0']);
    });

    it('paginates sent and received independently', async () => {
      await receiveFromDistinctSenders(4);
      for (const target of ['alice', 'carol']) await send('bob', target).expect(201);

      const res = await list({ userId: 'bob', limit: 1, receivedPage: 4, sentPage: 2 });
      expect(res.received.meta).toEqual({ total: 4, page: 4, totalPages: 4 });
      expect(res.sent.meta).toEqual({ total: 2, page: 2, totalPages: 2 });
      expect(res.sent.data).toHaveLength(1);
      expect(res.received.data).toHaveLength(1);
    });

    it('reports totalPages 1 for an empty list', async () => {
      const res = await list({ userId: 'carol' });
      expect(res.sent).toEqual({ data: [], meta: { total: 0, page: 1, totalPages: 1 } });
      expect(res.received.meta.totalPages).toBe(1);
      expect(res.pendingIncoming).toBe(0);
    });

    it('counts pending incoming across all pages and drops answered ones', async () => {
      await receiveFromDistinctSenders(6);
      const before = await list({ userId: 'bob', limit: 2 });
      expect(before.received.data).toHaveLength(2);
      expect(before.pendingIncoming).toBe(6);

      await http
        .patch('/intros/seed-0/status')
        .send({ userId: 'bob', status: 'ACCEPTED' })
        .expect(200);
      await http
        .patch('/intros/seed-1/status')
        .send({ userId: 'bob', status: 'DECLINED' })
        .expect(200);

      const after = await list({ userId: 'bob', limit: 2 });
      expect(after.pendingIncoming).toBe(4);
      expect(after.received.meta.total).toBe(6);
    });

    it('does not count sent intros towards the sender pending badge', async () => {
      await send('alice', 'bob').expect(201);
      expect((await list({ userId: 'alice' })).pendingIncoming).toBe(0);
      expect((await list({ userId: 'bob' })).pendingIncoming).toBe(1);
    });

    it('validates query params (missing user, limit above the maximum, page 0)', async () => {
      await http.get('/intros').expect(400);
      await http.get('/intros').query({ userId: 'bob', limit: 51 }).expect(400);
      await http.get('/intros').query({ userId: 'bob', receivedPage: 0 }).expect(400);
    });
  });
});
