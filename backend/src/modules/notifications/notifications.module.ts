import { Injectable, Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Module } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Notification } from '../../database/database.types';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  fcm_token: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async registerDevice(userId: string, token: string) {
    if (!token || !userId) return { message: 'Invalid token or user id' };
    this.db.fcmTokens.set(userId, token);
    this.db.persistToDisk();
    console.log(`[Push] Device token registered successfully for user ${userId}: ${token.substring(0, 20)}...`);
    return { message: 'FCM / Expo device token registered successfully' };
  }

  async getMyNotifications(userId: string, unreadOnly = false) {
    let list = this.db.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (unreadOnly) {
      list = list.filter((n) => !n.read_at);
    }

    return list.slice(0, 100);
  }

  async markAsRead(userId: string, notifId?: string) {
    const now = new Date().toISOString();
    if (notifId && notifId !== 'all') {
      const n = this.db.notifications.find((item) => item.id === notifId && item.user_id === userId);
      if (n) {
        n.read_at = now;
      }
    } else {
      this.db.notifications
        .filter((item) => item.user_id === userId && !item.read_at)
        .forEach((n) => {
          n.read_at = now;
        });
    }
    this.db.persistToDisk();
    return { success: true, timestamp: now };
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    // 1. Authoritative in-database record (persisted across reboots)
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      type: data?.type || 'GENERAL',
      title,
      body,
      data_json: data || {},
      created_at: new Date().toISOString(),
    };
    this.db.notifications.unshift(notif);
    if (this.db.notifications.length > 500) {
      this.db.notifications.pop();
    }
    this.db.persistToDisk();

    // 2. Resolve appropriate Android Notification Channel
    const channelId =
      data?.channelId ||
      (data?.type === 'STOCK_REMINDER'
        ? 'ahtri_stock'
        : data?.type === 'APP_UPDATE'
        ? 'ahtri_updates'
        : data?.type === 'LEAVE_DECISION'
        ? 'ahtri_approvals'
        : 'ahtri_tasks');

    // 3. Dispatch to remote mobile device via Expo Push Gateway (delivers to Android Notification Bar)
    const token = this.db.fcmTokens.get(userId);
    if (!token) {
      console.log(`[Push] No push token registered yet for user ${userId}; notification stored in database.`);
      return notif;
    }

    try {
      const payload = {
        to: token,
        sound: 'default',
        title,
        body,
        channelId,
        priority: 'high',
        _displayInForeground: true,
        data: {
          ...(data || {}),
          channelId,
          notificationId: notif.id,
        },
      };

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      console.log(`[Push] Dispatched push notification to ${userId} [channel: ${channelId}]:`, result);
    } catch (err: any) {
      console.warn(`[Push] Error dispatching push notification to ${userId}:`, err?.message);
    }

    return notif;
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
  async getMyNotifications(@CurrentUser() user: any, @Query('unread') unread?: string) {
    return this.notificationsService.getMyNotifications(user.id, unread === 'true');
  }

  @Patch('read/:id')
  async markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: any) {
    return this.notificationsService.markAsRead(user.id, 'all');
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
