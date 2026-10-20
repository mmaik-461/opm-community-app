import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DEFAULT_PORT, WEB_ORIGIN } from './common/constants/app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: WEB_ORIGIN });
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}
void bootstrap();
