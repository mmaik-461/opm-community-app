import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { AuthenticatedUser, MatchmakingRequest, MatchmakingResponse } from '@opm/shared-types';
import { MatchmakingService } from './matchmaking.service';
import { matchmakingRequestSchema } from './matchmaking.schemas';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmaking: MatchmakingService) {}

  @Post()
  @HttpCode(200)
  match(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(matchmakingRequestSchema)) body: MatchmakingRequest,
  ): Promise<MatchmakingResponse> {
    return this.matchmaking.match(user.id, body);
  }
}
