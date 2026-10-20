import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Profile } from '@opm/shared-types';
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

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Profile> {
    return this.profiles.findOne(id);
  }
}
