import { type INestApplication, Logger } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Profile } from '@opm/shared-types';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../common/guards/auth.guard';
import { MIN_BIO_LENGTH_FOR_EMBEDDING } from '../common/constants/profiles';
import { MatchmakingService } from '../matchmaking/matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';
import { bearer } from '../test/auth';
import { createFakePrisma, type FakePrisma, type StoredProfile } from '../test/fake-prisma';
import { makeProfile } from '../test/fixtures';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

const sdk = vi.hoisted(() => ({ embeddingsCreate: vi.fn() }));
vi.mock('openai', () => ({
  default: class {
    embeddings = { create: sdk.embeddingsCreate };
  },
}));

const EMBEDDING = [0.5, 0.25];
const LONG_BIO =
  'Scaled a payments platform across eleven markets and mentors first-time founders.';

const makeStored = (): StoredProfile[] => [
  {
    ...makeProfile({
      id: 'me',
      fullName: 'Mia Member',
      email: 'mia@example.com',
      bio: LONG_BIO,
      headline: 'CEO, PayCo',
      skills: ['payments'],
      cohort: 'Class of 2020',
      graduationYear: 2020,
    }),
    diplomaNumber: 'DIP-1',
    passwordHash: 'scrypt$secret$hash',
  },
  makeProfile({ id: 'other', fullName: 'Otto Other', email: 'otto@example.com' }),
];

describe('Profile editing API (controller + service + guard over HTTP)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let db: FakePrisma;
  let profiles: StoredProfile[];

  beforeAll(async () => {
    profiles = makeStored();
    db = createFakePrisma(profiles);
    const moduleRef = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        ProfilesService,
        MatchmakingService,
        { provide: PrismaService, useValue: db },
        { provide: APP_GUARD, useClass: AuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());
  beforeEach(() => {
    profiles.splice(0, profiles.length, ...makeStored());
    db.embeddings.clear();
    vi.stubEnv('OPENAI_API_KEY', 'test-openai');
    sdk.embeddingsCreate.mockReset();
    sdk.embeddingsCreate.mockResolvedValue({ data: [{ embedding: EMBEDDING }] });
  });
  afterEach(() => vi.restoreAllMocks());

  const patchMe = async (body: unknown, userId = 'me') =>
    http
      .patch('/profiles/me')
      .set(...(await bearer(userId)))
      .send(body as object);
  const embeddedText = () => (sdk.embeddingsCreate.mock.calls[0][0] as { input: string }).input;

  describe('GET /profiles/me', () => {
    it('returns the authenticated user, not another profile and never private fields', async () => {
      const res = await http
        .get('/profiles/me')
        .set(...(await bearer('me')))
        .expect(200);
      const body = res.body as Profile & Record<string, unknown>;
      expect(body).toMatchObject({ id: 'me', fullName: 'Mia Member', email: 'mia@example.com' });
      expect(body).not.toHaveProperty('diplomaNumber');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('is not shadowed by GET /profiles/:id', async () => {
      const res = await http
        .get('/profiles/me')
        .set(...(await bearer('other')))
        .expect(200);
      expect((res.body as Profile).id).toBe('other');
    });

    it('answers 401 without a token and with an invalid one', async () => {
      await http.get('/profiles/me').expect(401);
      await http.get('/profiles/me').set('Authorization', 'Bearer nope').expect(401);
    });

    it('answers 404 when the token belongs to a deleted profile', async () => {
      await http
        .get('/profiles/me')
        .set(...(await bearer('ghost')))
        .expect(404);
    });
  });

  describe('PATCH /profiles/me', () => {
    it('answers 401 when unauthenticated and changes nothing', async () => {
      await http.patch('/profiles/me').send({ bio: 'Hacked' }).expect(401);
      expect(profiles[0].bio).toBe(LONG_BIO);
      expect(sdk.embeddingsCreate).not.toHaveBeenCalled();
    });

    it('updates the editable fields, re-embeds and stores the new vector', async () => {
      const res = await patchMe({
        fullName: '  Mia M. Member ',
        headline: 'Founder, NewCo',
        bio: 'Now building climate fintech and advising seed-stage founders across Europe.',
        city: 'Berlin',
        industry: 'Climate',
        skills: ['climate', ' fintech '],
      }).then((r) => {
        expect(r.status).toBe(200);
        return r;
      });

      expect(res.body).toMatchObject({
        id: 'me',
        fullName: 'Mia M. Member',
        headline: 'Founder, NewCo',
        city: 'Berlin',
        industry: 'Climate',
        skills: ['climate', 'fintech'],
      });
      expect(profiles[0]).toMatchObject({ city: 'Berlin', skills: ['climate', 'fintech'] });

      expect(sdk.embeddingsCreate).toHaveBeenCalledTimes(1);
      expect(embeddedText()).toBe(
        'Mia M. Member. Founder, NewCo. Industry: Climate. City: Berlin. Class of 2020. Skills: climate, fintech. Now building climate fintech and advising seed-stage founders across Europe.',
      );
      expect(db.embeddings.get('me')).toBe('[0.5,0.25]');
      expect(db.embeddings.has('other')).toBe(false);
    });

    it('merges a partial patch with the stored profile when building the embedding text', async () => {
      await patchMe({ skills: ['payments', 'fundraising'] }).then((r) =>
        expect(r.status).toBe(200),
      );
      expect(embeddedText()).toContain('Mia Member. CEO, PayCo.');
      expect(embeddedText()).toContain('Skills: payments, fundraising.');
      expect(embeddedText()).toContain(LONG_BIO);
      expect(db.embeddings.get('me')).toBe('[0.5,0.25]');
    });

    it('pads a brief bio with the descriptive fallback text', async () => {
      await patchMe({ bio: 'Hi' }).then((r) => expect(r.status).toBe(200));
      expect('Hi'.length).toBeLessThan(MIN_BIO_LENGTH_FOR_EMBEDDING);
      expect(embeddedText()).toContain(
        'Mia Member is an OPM alumnus (class of 2020) working in Fintech in London. Hi',
      );
    });

    it('allows clearing the bio', async () => {
      const res = await patchMe({ bio: '' });
      expect(res.status).toBe(200);
      expect((res.body as Profile).bio).toBe('');
      expect(embeddedText()).toContain('Mia Member is an OPM alumnus');
    });

    it('does not call the embedding service when nothing embedded actually changed', async () => {
      const res = await patchMe({ headline: 'CEO, PayCo', skills: ['payments'] });
      expect(res.status).toBe(200);
      expect(sdk.embeddingsCreate).not.toHaveBeenCalled();
      expect(db.embeddings.has('me')).toBe(false);
    });

    it('rejects immutable fields with 400 and leaves the profile untouched', async () => {
      for (const field of [
        'id',
        'email',
        'role',
        'status',
        'diplomaNumber',
        'graduationYear',
        'cohort',
        'passwordHash',
      ]) {
        const res = await patchMe({
          bio: 'Changed bio that is long enough to matter',
          [field]: 'X',
        });
        expect(res.status, field).toBe(400);
      }
      expect(profiles[0]).toMatchObject({
        id: 'me',
        email: 'mia@example.com',
        role: 'MEMBER',
        status: 'ACTIVE',
        graduationYear: 2020,
        diplomaNumber: 'DIP-1',
        bio: LONG_BIO,
      });
      expect(sdk.embeddingsCreate).not.toHaveBeenCalled();
    });

    it('edits only the caller, whoever the body claims to be', async () => {
      await patchMe({ city: 'Oslo' }, 'other').then((r) => expect(r.status).toBe(200));
      expect(profiles.find((p) => p.id === 'other')?.city).toBe('Oslo');
      expect(profiles.find((p) => p.id === 'me')?.city).toBe('London');
    });

    it.each([
      ['an empty body', {}],
      ['a blank name', { fullName: '   ' }],
      ['a blank city', { city: '' }],
      ['an oversized bio', { bio: 'x'.repeat(2001) }],
      ['too many skills', { skills: Array.from({ length: 21 }, (_, i) => `s${i}`) }],
      ['a blank skill', { skills: ['ok', ' '] }],
      ['skills that are not a list', { skills: 'a,b' }],
    ])('rejects %s with 400', async (_name, body) => {
      const res = await patchMe(body);
      expect(res.status).toBe(400);
      expect(sdk.embeddingsCreate).not.toHaveBeenCalled();
      expect(profiles[0].bio).toBe(LONG_BIO);
    });

    it('saves nothing when the embedding service fails', async () => {
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      sdk.embeddingsCreate.mockRejectedValue(new Error('boom'));
      await patchMe({ city: 'Madrid' }).then((r) => expect(r.status).toBe(502));
      expect(profiles[0].city).toBe('London');
      expect(db.embeddings.has('me')).toBe(false);
    });

    it('rolls back the attributes when writing the vector fails', async () => {
      const failing = vi
        .spyOn(db, '$executeRaw')
        .mockRejectedValueOnce(new Error('vector write failed'));
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      await patchMe({ city: 'Madrid' }).then((r) => expect(r.status).toBe(500));
      expect(failing).toHaveBeenCalledTimes(1);
      expect(profiles[0].city).toBe('London');
    });

    it('answers 404 for a token whose profile no longer exists', async () => {
      await patchMe({ city: 'Madrid' }, 'ghost').then((r) => expect(r.status).toBe(404));
    });
  });
});
