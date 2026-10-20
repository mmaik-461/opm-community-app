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
export function createFakePrisma(profiles: Profile[]) {
  const intros: StoredIntro[] = [];
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
    findMany: async ({ where }: { where: Where }) =>
      profiles.filter((p) => matches(p as unknown as Row, where)).map(({ id }) => ({ id })),
  };

  return { introRequest, profile, intros };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
