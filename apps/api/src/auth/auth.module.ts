import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [MatchmakingModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    // Registered after AuthGuard: it needs `request.user`.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
