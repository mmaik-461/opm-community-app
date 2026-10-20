import { Module } from '@nestjs/common';
import { IntrosController } from './intros.controller';
import { IntrosService } from './intros.service';

@Module({
  controllers: [IntrosController],
  providers: [IntrosService],
})
export class IntrosModule {}
