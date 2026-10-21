import { Module } from '@nestjs/common';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [MatchmakingModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
