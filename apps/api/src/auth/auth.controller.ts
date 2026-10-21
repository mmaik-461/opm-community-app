import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type {
  DevLoginDto,
  LoginDto,
  LoginResponse,
  Profile,
  RegisterDto,
  RegisterResponse,
} from '@opm/shared-types';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { devLoginSchema, loginSchema, registerSchema } from './auth.schemas';

/**
 * Credential checks only: these routes tell the web app WHO is signing in. The web app then
 * issues the bearer token that every other route requires.
 */
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto): Promise<LoginResponse> {
    return this.auth.login(body);
  }

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
  ): Promise<RegisterResponse> {
    return this.auth.register(body);
  }

  @Get('dev/profiles')
  devProfiles(): Promise<Profile[]> {
    return this.auth.devProfiles();
  }

  @Post('dev/login')
  @HttpCode(200)
  devLogin(@Body(new ZodValidationPipe(devLoginSchema)) body: DevLoginDto): Promise<LoginResponse> {
    return this.auth.devLogin(body.profileId);
  }
}
