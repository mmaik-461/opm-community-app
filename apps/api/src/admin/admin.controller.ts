import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  Role,
  type DecideVerificationDto,
  type FeedbackAnalyticsResponse,
  type VerificationDecisionResponse,
  type VerificationsResponse,
} from '@opm/shared-types';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AdminService } from './admin.service';
import { decideVerificationSchema } from './admin.schemas';

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('verifications')
  listVerifications(): Promise<VerificationsResponse> {
    return this.admin.listPending();
  }

  @Get('feedback')
  listFeedback(): Promise<FeedbackAnalyticsResponse> {
    return this.admin.listFeedback();
  }

  @Patch('verifications/:id')
  decide(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(decideVerificationSchema)) body: DecideVerificationDto,
  ): Promise<VerificationDecisionResponse> {
    return this.admin.decide(id, body.decision);
  }
}
