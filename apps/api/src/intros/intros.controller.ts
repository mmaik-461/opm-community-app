import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  CreateIntroDto,
  IntroRequestResponse,
  IntrosResponse,
  UpdateIntroStatusDto,
} from '@opm/shared-types';
import { ZodValidationPipe } from '../matchmaking/zod-validation.pipe';
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
    @Body(new ZodValidationPipe(createIntroSchema)) body: CreateIntroDto,
  ): Promise<IntroRequestResponse> {
    return this.intros.create(body);
  }

  @Get()
  findForUser(
    @Query(new ZodValidationPipe(listIntrosQuerySchema)) query: ListIntrosQuery,
  ): Promise<IntrosResponse> {
    return this.intros.findForUser(query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIntroStatusSchema)) body: UpdateIntroStatusDto,
  ): Promise<IntroRequestResponse> {
    return this.intros.updateStatus(id, body);
  }
}
