import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type {
  MatchmakingRequest,
  MatchmakingResponse,
  MatchResult,
  Profile,
} from '@opm/shared-types';
import {
  CANDIDATE_LIMIT,
  DEFAULT_CLAUDE_MODEL,
  EMBEDDING_MODEL,
  GENERIC_TRAVEL_QUERY,
  LLM_EFFORT,
  LLM_MAX_TOKENS,
  MATCH_LIMIT,
  MATCHMAKER_SYSTEM_PROMPT,
  SIMILARITY_PRECISION,
} from '../common/constants/matchmaking';
import { REQUESTER_CONTEXT_SELECT } from '../common/constants/profiles';
import { requireEnvKey } from '../common/utils/env';
import { dataTag, travelContextTag } from '../common/utils/prompt';
import { toSimilarityScore, toVectorLiteral } from '../common/utils/vector';
import { PrismaService } from '../prisma/prisma.service';
import { llmMatchesJsonSchema, llmMatchesSchema } from './matchmaking.schemas';

type Candidate = Profile & { similarityScore: number };

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor(private readonly prisma: PrismaService) {}

  async match(userId: string, req: MatchmakingRequest): Promise<MatchmakingResponse> {
    const requester = await this.findRequester(userId);
    const candidates = await this.findCandidates(userId, req, requester);
    if (candidates.length === 0) return { matches: [] };

    const picks = await this.rankWithClaude(req, candidates, requester);
    const byId = new Map(candidates.map((c) => [c.id, c]));

    const matches: MatchResult[] = [];
    for (const pick of picks) {
      const found = byId.get(pick.profileId);
      if (!found) continue; // ignore ids Claude invented
      byId.delete(pick.profileId); // no duplicates
      const { similarityScore, ...profile } = found;
      matches.push({
        profile,
        similarityScore,
        matchReason: pick.matchReason,
        mutualSynergy: pick.mutualSynergy,
        suggestedIcebreaker: pick.suggestedIcebreaker,
      });
      if (matches.length === MATCH_LIMIT) break;
    }
    return { matches };
  }

  private async findRequester(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
      select: REQUESTER_CONTEXT_SELECT,
    });
  }

  // Step 1: embed the query, then pgvector cosine-distance top-N.
  private async findCandidates(
    userId: string,
    req: MatchmakingRequest,
    requester: Awaited<ReturnType<MatchmakingService['findRequester']>>,
  ): Promise<Candidate[]> {
    const vector = toVectorLiteral(await this.embed(this.effectiveQuery(req, requester)));
    const exclude = Prisma.sql`AND "id" <> ${userId}`;
    const cityFilter = req.travelContext
      ? Prisma.sql`AND lower("city") = lower(${req.travelContext.city})`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<(Profile & { distance: number })[]>(Prisma.sql`
      SELECT "id", "fullName", "headline", "bio", "city", "travelStatus", "cohort", "industry",
             "skills", "avatarUrl", "linkedinUrl", "email",
             ("embedding" <=> ${vector}::vector) AS "distance"
      FROM "Profile"
      WHERE "embedding" IS NOT NULL ${exclude} ${cityFilter}
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${CANDIDATE_LIMIT}
    `);

    return rows.map(({ distance, ...profile }) => ({
      ...profile,
      similarityScore: toSimilarityScore(distance, SIMILARITY_PRECISION),
    }));
  }

  /** In travel mode an empty/generic query falls back to the requester's own background. */
  private effectiveQuery(
    req: MatchmakingRequest,
    requester: Awaited<ReturnType<MatchmakingService['findRequester']>>,
  ): string {
    const query = req.query.trim();
    if (!req.travelContext) return query;
    if (query && !GENERIC_TRAVEL_QUERY.test(query)) return query;
    if (!requester) return query || `Alumni based in ${req.travelContext.city}`;
    return [requester.headline, requester.industry, requester.skills.join(', '), requester.bio]
      .filter(Boolean)
      .join('. ');
  }

  private async embed(text: string): Promise<number[]> {
    this.openai ??= requireEnvKey('OPENAI_API_KEY', (apiKey) => new OpenAI({ apiKey }));
    try {
      const res = await this.openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
      return res.data[0].embedding;
    } catch (err) {
      this.logger.error(`Embedding failed: ${(err as Error).message}`);
      throw new BadGatewayException('Embedding service failed');
    }
  }

  // Step 2: Claude picks the top 3 and writes reasons + icebreakers (structured output).
  private async rankWithClaude(
    req: MatchmakingRequest,
    candidates: Candidate[],
    requester: Awaited<ReturnType<MatchmakingService['findRequester']>>,
  ) {
    this.anthropic ??= requireEnvKey('ANTHROPIC_API_KEY', (apiKey) => new Anthropic({ apiKey }));

    const candidateData = candidates.map(({ similarityScore: _similarityScore, ...p }) => ({
      profileId: p.id,
      fullName: p.fullName,
      headline: p.headline,
      bio: p.bio,
      city: p.city,
      travelStatus: p.travelStatus,
      cohort: p.cohort,
      industry: p.industry,
      skills: p.skills,
    }));
    const cityLine = req.targetCity ? `\n<target_city>${req.targetCity}</target_city>` : '';
    const travelLine = travelContextTag(req.travelContext);
    const requesterLine = requester ? dataTag('requester_profile', requester) : '';

    try {
      const res = await this.anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        system: MATCHMAKER_SYSTEM_PROMPT,
        output_config: {
          effort: LLM_EFFORT,
          format: { type: 'json_schema', schema: llmMatchesJsonSchema },
        },
        messages: [
          {
            role: 'user',
            content: `<user_request>${req.query}</user_request>${cityLine}${travelLine}${requesterLine}${dataTag('candidates', candidateData)}`,
          },
        ],
      });

      if (res.stop_reason === 'refusal') throw new Error('Model refused the request');
      const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
      if (!text) throw new Error('Model returned no text');
      return llmMatchesSchema.parse(JSON.parse(text)).matches;
    } catch (err) {
      this.logger.error(`Claude ranking failed: ${(err as Error).message}`);
      throw new BadGatewayException('AI matchmaking failed');
    }
  }
}
