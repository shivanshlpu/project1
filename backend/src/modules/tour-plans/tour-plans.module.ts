import { Module } from '@nestjs/common';
import { TourPlansController } from './tour-plans.controller';
import { TourPlansService } from './tour-plans.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [TourPlansController],
  providers: [TourPlansService],
  exports: [TourPlansService],
})
export class TourPlansModule {}
