import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { IntrosModule } from './intros/intros.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    HealthModule,
    ProfilesModule,
    MatchmakingModule,
    IntrosModule,
    AdminModule,
  ],
})
export class AppModule {}
