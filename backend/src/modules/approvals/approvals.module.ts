import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController, LeaveController } from './approvals.controller';

@Module({
  controllers: [ApprovalsController, LeaveController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
