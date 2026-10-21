import { Prisma } from '@prisma/client';
import type { Profile } from '@opm/shared-types';

type Row = Record<string, unknown>;
type Where = Record<string, unknown> & { OR?: Where[]; id?: unknown };

interface StoredIntro {
  id: string;
  requesterId: string;
  targetId: string;
  query: string;
  icebreaker: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFeedback {
  id: string;
  userId: string;
  candidateId: string;
  query: string;
  rating: 'POSITIVE' | 'NEGATIVE';
  reason: string | null;
  comment: string | null;
  createdAt: Date;
}

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true; // Prisma ignores undefined filters
    if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
    if (cond && typeof cond === 'object' && 'not' in cond) {
      return row[key] !== (cond as { not: unknown }).not;
    }
    if (cond && typeof cond === 'object' && 'in' in cond) {
      return (cond as { in: unknown[] }).in.includes(row[key]);
    }
    return row[key] === cond;
  });
}

/**
 * Stateful in-memory stand-in for the slice of PrismaService that IntrosService uses.
 * It applies where/orderBy/skip/take for real, so tests assert behaviour against data
 * instead of against canned return values.
 */
export type StoredProfile = Profile & {
  passwordHash?: string | null;
  diplomaNumber?: string | null;
  createdAt?: Date;
};

function applySelect<T extends Row>(row: T, select?: Record<string, boolean>): Row {
  if (!select) return row;
  return Object.fromEntries(
    Object.keys(select)
      .filter((k) => select[k])
      .map((k) => [k, row[k]]),
  );
}

export function createFakePrisma(profiles: StoredProfile[]) {
  const intros: StoredIntro[] = [];
  const feedback: StoredFeedback[] = [];
  /** Profile id -> vector literal written by the raw `embedding` UPDATE. */
  const embeddings = new Map<string, string>();
  let clock = Date.UTC(2026, 0, 1);
  let seq = 0;

  const hydrate = (intro: StoredIntro) => ({
    ...intro,
    requester: profiles.find((p) => p.id === intro.requesterId),
    target: profiles.find((p) => p.id === intro.targetId),
  });

  const introRequest = {
    findFirst: async ({ where }: { where: Where }) =>
      intros.find((i) => matches(i as unknown as Row, where)) ?? null,
    create: async ({
      data,
    }: {
      data: Omit<StoredIntro, 'id' | 'status' | 'createdAt' | 'updatedAt'>;
    }) => {
      const at = new Date((clock += 1000));
      const intro: StoredIntro = {
        ...data,
        id: `intro-${++seq}`,
        status: 'PENDING',
        createdAt: at,
        updatedAt: at,
      };
      intros.push(intro);
      return hydrate(intro);
    },
    count: async ({ where }: { where: Where }) =>
      intros.filter((i) => matches(i as unknown as Row, where)).length,
    findMany: async ({ where, skip = 0, take }: { where: Where; skip?: number; take?: number }) =>
      intros
        .filter((i) => matches(i as unknown as Row, where))
        // orderBy: createdAt desc, id desc
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
        .slice(skip, take === undefined ? undefined : skip + take)
        .map(hydrate),
    findUnique: async ({ where }: { where: { id: string } }) =>
      intros.find((i) => i.id === where.id) ?? null,
    findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
      const intro = intros.find((i) => i.id === where.id);
      if (!intro) throw new Error('not found');
      return hydrate(intro);
    },
    updateMany: async ({ where, data }: { where: Where; data: Partial<StoredIntro> }) => {
      const hits = intros.filter((i) => matches(i as unknown as Row, where));
      hits.forEach((i) => Object.assign(i, data, { updatedAt: new Date((clock += 1000)) }));
      return { count: hits.length };
    },
  };

  const selectProfile = (id: string, select: Record<string, boolean>) =>
    applySelect(profiles.find((p) => p.id === id)! as unknown as Row, select);

  const matchFeedback = {
    create: async ({
      data,
    }: {
      data: Pick<StoredFeedback, 'userId' | 'candidateId' | 'query' | 'rating'> &
        Partial<Pick<StoredFeedback, 'reason' | 'comment' | 'createdAt'>>;
    }) => {
      // Prisma stores a missing optional as NULL.
      const row: StoredFeedback = {
        userId: data.userId,
        candidateId: data.candidateId,
        query: data.query,
        rating: data.rating,
        reason: data.reason ?? null,
        comment: data.comment ?? null,
        id: `fb-${++seq}`,
        createdAt: data.createdAt ?? new Date((clock += 1000)),
      };
      feedback.push(row);
      return row;
    },
    count: async ({ where }: { where?: Where } = {}) =>
      feedback.filter((f) => matches(f as unknown as Row, where)).length,
    findMany: async ({
      where,
      include,
      take,
    }: {
      where?: Where;
      include?: Record<'user' | 'candidate', { select: Record<string, boolean> }>;
      take?: number;
    } = {}) =>
      feedback
        .filter((f) => matches(f as unknown as Row, where))
        // orderBy: createdAt desc, id desc
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))
        .slice(0, take)
        .map((f) => ({
          ...f,
          user: include && selectProfile(f.userId, include.user.select),
          candidate: include && selectProfile(f.candidateId, include.candidate.select),
        })),
  };

  const profile = {
    findMany: async ({
      where,
      select,
      orderBy,
    }: {
      where?: Where;
      select?: Record<string, boolean>;
      orderBy?: { fullName: 'asc' } | { createdAt: 'asc' };
    } = {}) => {
      const hits = profiles.filter((p) => matches(p as unknown as Row, where));
      if (orderBy && 'fullName' in orderBy) {
        hits.sort((a, b) => a.fullName.localeCompare(b.fullName));
      } else if (orderBy) {
        hits.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
      }
      return hits.map((p) => applySelect(p as unknown as Row, select ?? { id: true }));
    },
    findUnique: async ({
      where,
      select,
    }: {
      where: { id?: string; email?: string };
      select?: Record<string, boolean>;
    }) => {
      const hit = profiles.find((p) => matches(p as unknown as Row, where));
      return hit ? applySelect(hit as unknown as Row, select) : null;
    },
    updateMany: async ({ where, data }: { where: Where; data: Partial<StoredProfile> }) => {
      const hits = profiles.filter((p) => matches(p as unknown as Row, where));
      hits.forEach((p) => Object.assign(p, data));
      return { count: hits.length };
    },
    update: async ({
      where,
      data,
      select,
    }: {
      where: { id: string };
      data: Partial<StoredProfile>;
      select?: Record<string, boolean>;
    }) => {
      const hit = profiles.find((p) => p.id === where.id);
      if (!hit) {
        throw new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: 'test',
        });
      }
      Object.assign(hit, data);
      return applySelect(hit as unknown as Row, select);
    },
    create: async ({
      data,
      select,
    }: {
      data: Partial<StoredProfile>;
      select?: Record<string, boolean>;
    }) => {
      if (data.email && profiles.some((p) => p.email === data.email)) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed on email', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      const created = { avatarUrl: null, linkedinUrl: null, travelStatus: 'LIVING_IN', ...data };
      const stored = { ...created, id: `new-${profiles.length + 1}` } as StoredProfile;
      profiles.push(stored);
      return applySelect(stored as unknown as Row, select);
    },
  };

  /** Only the embedding UPDATE is raw SQL in the code under test: (vector, id) are its bound values. */
  const $executeRaw = async (_sql: TemplateStringsArray, vector: string, id: string) => {
    embeddings.set(id, vector);
    return 1;
  };

  const db = { introRequest, matchFeedback, profile, intros, feedback, embeddings, $executeRaw };
  const $transaction = async <T>(fn: (tx: typeof db) => Promise<T>) => {
    const snapshot = profiles.map((p) => ({ ...p }));
    const embeddingsBefore = new Map(embeddings);
    try {
      return await fn(api);
    } catch (err) {
      // roll back inserts, updates and embedding writes
      profiles.length = snapshot.length;
      snapshot.forEach((before, i) => Object.assign(profiles[i], before));
      embeddings.clear();
      embeddingsBefore.forEach((v, k) => embeddings.set(k, v));
      throw err;
    }
  };
  // Transactions run against the returned object so tests can spy on any of its methods.
  const api = { ...db, $transaction };
  return api;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
