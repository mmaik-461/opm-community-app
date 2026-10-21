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

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Where[]).some((w) => matches(row, w));
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

  const profile = {
    findMany: async ({
      where,
      select,
      orderBy,
    }: {
      where?: Where;
      select?: Record<string, boolean>;
      orderBy?: { fullName: 'asc' };
    } = {}) => {
      const hits = profiles.filter((p) => matches(p as unknown as Row, where));
      if (orderBy) hits.sort((a, b) => a.fullName.localeCompare(b.fullName));
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

  const db = { introRequest, profile, intros, embeddings, $executeRaw };
  const $transaction = async <T>(fn: (tx: typeof db) => Promise<T>) => {
    const snapshot = profiles.length;
    try {
      return await fn(db);
    } catch (err) {
      profiles.length = snapshot; // roll back
      throw err;
    }
  };
  return { ...db, $transaction };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
