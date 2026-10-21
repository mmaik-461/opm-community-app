import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { AuthenticatedUser, Profile, UpdateProfileDto } from '@opm/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { updateProfileSchema } from './profiles.schemas';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  findAll(
    @Query('city') city?: string,
    @Query('cohort') cohort?: string,
    @Query('industry') industry?: string,
  ): Promise<Profile[]> {
    return this.profiles.findAll({ city, cohort, industry });
  }

  // Declared before `:id` so "me" is never read as a profile id.
  @Get('me')
  findMe(@CurrentUser() user: AuthenticatedUser): Promise<Profile> {
    return this.profiles.findOne(user.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ): Promise<Profile> {
    return this.profiles.updateMe(user.id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Profile> {
    return this.profiles.findOne(id);
  }
}
