import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  AuthenticatedUser,
  CreateIntroDto,
  IntroRequestResponse,
  IntrosResponse,
  UpdateIntroStatusDto,
} from '@opm/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { IntrosService } from './intros.service';
import {
  createIntroSchema,
  type ListIntrosQuery,
  listIntrosQuerySchema,
  updateIntroStatusSchema,
} from './intros.schemas';

@Controller('intros')
export class IntrosController {
  constructor(private readonly intros: IntrosService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createIntroSchema)) body: CreateIntroDto,
  ): Promise<IntroRequestResponse> {
    return this.intros.create(user.id, body);
  }

  @Get()
  findForUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listIntrosQuerySchema)) query: ListIntrosQuery,
  ): Promise<IntrosResponse> {
    return this.intros.findForUser(user.id, query);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIntroStatusSchema)) body: UpdateIntroStatusDto,
  ): Promise<IntroRequestResponse> {
    return this.intros.updateStatus(user.id, id, body);
  }
}
