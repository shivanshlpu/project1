import { Module } from '@nestjs/common';
import { DcrService } from './dcr.service';
import { DcrController } from './dcr.controller';

@Module({
  controllers: [DcrController],
  providers: [DcrService],
  exports: [DcrService],
})
export class DcrModule {}
