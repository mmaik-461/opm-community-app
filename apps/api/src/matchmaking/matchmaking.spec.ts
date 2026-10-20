import type { Sql } from '@prisma/client/runtime/library';
import { BadGatewayException, Logger } from '@nestjs/common';
import type { MatchmakingRequest } from '@opm/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CANDIDATE_LIMIT, MATCH_LIMIT } from '../common/constants/matchmaking';
import { makeProfile } from '../test/fixtures';
import { MatchmakingService } from './matchmaking.service';

const sdk = vi.hoisted(() => ({
  embeddingsCreate: vi.fn(),
  messagesCreate: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: sdk.embeddingsCreate };
  },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: sdk.messagesCreate };
  },
}));

const requester = {
  fullName: 'Rita Requester',
  headline: 'CTO, ClimateStack',
  cohort: 'OPM 49',
  industry: 'CleanTech',
  city: 'Warsaw',
  skills: ['battery storage', 'hiring'],
  bio: 'Scaling an energy-storage startup.',
};

const row = (id: string, city: string, distance: number) => ({
  ...makeProfile({ id, fullName: `Person ${id}`, city }),
  distance,
});

function llmReply(ids: string[]) {
  return {
    stop_reason: 'end_turn',
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          matches: ids.map((profileId) => ({
            profileId,
            matchReason: `reason ${profileId}`,
            mutualSynergy: `synergy ${profileId}`,
            suggestedIcebreaker: `icebreaker ${profileId}`,
          })),
        }),
      },
    ],
  };
}

describe('MatchmakingService', () => {
  const findUnique = vi.fn();
  const queryRaw = vi.fn();
  let service: MatchmakingService;

  const sqlOf = (): Sql => queryRaw.mock.calls[0][0] as Sql;
  const userMessage = () =>
    (sdk.messagesCreate.mock.calls[0][0] as { messages: { content: string }[] }).messages[0]
      .content;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    vi.stubEnv('OPENAI_API_KEY', 'test-openai');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic');
    sdk.embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.5, 0.25] }] });
    sdk.messagesCreate.mockResolvedValue(llmReply(['a']));
    queryRaw.mockResolvedValue([row('a', 'London', 0.1)]);
    findUnique.mockResolvedValue(requester);
    service = new MatchmakingService({
      profile: { findUnique },
      $queryRaw: queryRaw,
    } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('retrieval SQL', () => {
    it('excludes the requester by id and passes the id as a bound parameter', async () => {
      await service.match('me', { query: 'fintech mentor' });
      const sql = sqlOf();
      expect(sql.sql).toContain('"id" <> ?');
      expect(sql.values).toContain('me');
      expect(sql.sql).not.toContain("'me'");
    });

    it('strictly filters by city (case-insensitive) in travel mode, using a bound parameter', async () => {
      await service.match('me', {
        query: 'coffee',
        travelContext: { city: 'BeRLiN' },
      });
      const sql = sqlOf();
      expect(sql.sql).toContain('lower("city") = lower(?)');
      expect(sql.values).toContain('BeRLiN');
    });

    it('does not apply the city predicate outside travel mode (targetCity only steers the LLM)', async () => {
      await service.match('me', { query: 'fintech mentor', targetCity: 'London' });
      expect(sqlOf().sql).not.toContain('lower("city")');
    });

    it('orders by cosine distance and caps candidates', async () => {
      await service.match('me', { query: 'fintech mentor' });
      const sql = sqlOf();
      expect(sql.sql).toMatch(/ORDER BY "embedding" <=> \?::vector/);
      expect(sql.values).toContain(CANDIDATE_LIMIT);
      expect(sql.values).toContain('[0.5,0.25]');
    });
  });

  describe('query embedding', () => {
    it('embeds the trimmed user query when there is no travel context', async () => {
      await service.match('me', { query: '  fintech mentor  ' });
      expect(sdk.embeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'fintech mentor' }),
      );
    });

    it('falls back to the requester background when travel mode has an empty query', async () => {
      await service.match('me', { query: '', travelContext: { city: 'Berlin' } });
      const { input } = sdk.embeddingsCreate.mock.calls[0][0] as { input: string };
      expect(input).toBe(
        [requester.headline, requester.industry, requester.skills.join(', '), requester.bio].join(
          '. ',
        ),
      );
    });

    it.each(['anyone', 'Surprise me', 'meet people!', 'coffee'])(
      'treats the generic travel query %j as empty',
      async (query) => {
        await service.match('me', { query, travelContext: { city: 'Berlin' } });
        const { input } = sdk.embeddingsCreate.mock.calls[0][0] as { input: string };
        expect(input).toContain(requester.headline);
      },
    );

    it('keeps a specific travel query instead of the fallback', async () => {
      await service.match('me', {
        query: 'battery storage investors',
        travelContext: { city: 'Berlin' },
      });
      expect(sdk.embeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'battery storage investors' }),
      );
    });

    it('uses a city-based query when travel mode has nothing to fall back on', async () => {
      findUnique.mockResolvedValue(null);
      await service.match('ghost', { query: '', travelContext: { city: 'Berlin' } });
      expect(sdk.embeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'Alumni based in Berlin' }),
      );
    });
  });

  describe('LLM prompt', () => {
    it('injects travel context, target city and requester profile as data tags', async () => {
      await service.match('me', {
        query: 'coffee chat',
        targetCity: 'Berlin',
        travelContext: { city: 'Berlin', dates: 'Nov 14-18' },
      });
      const msg = userMessage();
      expect(msg).toContain('<user_request>coffee chat</user_request>');
      expect(msg).toContain('<target_city>Berlin</target_city>');
      expect(msg).toContain(
        '<travel_context>{"city":"Berlin","dates":"Nov 14-18"}</travel_context>',
      );
      expect(msg).toContain(`<requester_profile>${JSON.stringify(requester)}</requester_profile>`);
      expect(msg).toContain('<candidates>');
    });

    it('sends no travel_context outside travel mode', async () => {
      await service.match('me', { query: 'fintech mentor' });
      expect(userMessage()).not.toContain('<travel_context>');
    });

    it('never leaks similarity scores or contact details to the model', async () => {
      queryRaw.mockResolvedValue([
        { ...row('a', 'London', 0.1), email: 'secret@example.com', linkedinUrl: 'https://l.in/a' },
      ]);
      await service.match('me', { query: 'fintech mentor' });
      expect(userMessage()).not.toContain('secret@example.com');
      expect(userMessage()).not.toContain('similarityScore');
    });
  });

  describe('result assembly', () => {
    it('returns an empty list without calling the LLM when nothing is retrieved', async () => {
      queryRaw.mockResolvedValue([]);
      await expect(service.match('me', { query: 'nobody here' })).resolves.toEqual({ matches: [] });
      expect(sdk.messagesCreate).not.toHaveBeenCalled();
    });

    it('joins picks with DB profiles, rounds similarity and drops invented / duplicate ids', async () => {
      queryRaw.mockResolvedValue([row('a', 'London', 0.1234), row('b', 'London', 0.3)]);
      sdk.messagesCreate.mockResolvedValue(llmReply(['ghost', 'b', 'b', 'a']));
      const { matches } = await service.match('me', { query: 'fintech mentor' });
      expect(matches.map((m) => m.profile.id)).toEqual(['b', 'a']);
      expect(matches[1].similarityScore).toBe(0.877);
      expect(matches[0]).toMatchObject({
        matchReason: 'reason b',
        mutualSynergy: 'synergy b',
        suggestedIcebreaker: 'icebreaker b',
      });
      expect(matches[0].profile).not.toHaveProperty('distance');
    });

    it('returns at most MATCH_LIMIT matches', async () => {
      const ids = ['a', 'b', 'c', 'd', 'e'];
      queryRaw.mockResolvedValue(ids.map((id, i) => row(id, 'London', i / 10)));
      sdk.messagesCreate.mockResolvedValue(llmReply(ids));
      const { matches } = await service.match('me', { query: 'fintech mentor' });
      expect(matches).toHaveLength(MATCH_LIMIT);
    });
  });

  describe('failure handling', () => {
    const req: MatchmakingRequest = { query: 'fintech mentor' };

    it('maps embedding failures to 502', async () => {
      sdk.embeddingsCreate.mockRejectedValue(new Error('rate limited'));
      await expect(service.match('me', req)).rejects.toThrow(BadGatewayException);
    });

    it('maps malformed model output to 502', async () => {
      sdk.messagesCreate.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: '{"matches": []}' }],
      });
      await expect(service.match('me', req)).rejects.toThrow(BadGatewayException);
    });

    it('maps a model refusal to 502', async () => {
      sdk.messagesCreate.mockResolvedValue({ stop_reason: 'refusal', content: [] });
      await expect(service.match('me', req)).rejects.toThrow(BadGatewayException);
    });
  });
});
