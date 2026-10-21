import { Body, Controller, Post } from '@nestjs/common';
import type {
  AuthenticatedUser,
  CreateMatchFeedbackDto,
  MatchFeedbackResponse,
} from '@opm/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FeedbackService } from './feedback.service';
import { createFeedbackSchema } from './feedback.schemas';

@Controller('matchmaker/feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createFeedbackSchema)) body: CreateMatchFeedbackDto,
  ): Promise<MatchFeedbackResponse> {
    return this.feedback.create(user.id, body);
  }
}
