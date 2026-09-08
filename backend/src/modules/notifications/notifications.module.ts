import { Injectable, Controller, Post, Get, Body, UseGuards, Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcm_token: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async registerDevice(userId: string, token: string) {
    this.db.fcmTokens.set(userId, token);
    return { message: 'FCM device token registered successfully' };
  }

  async getMyNotifications(userId: string) {
    const list = this.db.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Mark as read
    const now = new Date().toISOString();
    list.forEach((n) => {
      if (!n.read_at) n.read_at = now;
    });

    return list;
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  async registerDevice(@CurrentUser() user: any, @Body() dto: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(user.id, dto.fcm_token);
  }

  @Get('my')
  async getMyNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getMyNotifications(user.id);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
