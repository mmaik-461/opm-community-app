import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { IntrosModule } from './intros/intros.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    HealthModule,
    ProfilesModule,
    MatchmakingModule,
    IntrosModule,
  ],
})
export class AppModule {}
