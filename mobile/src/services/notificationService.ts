import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from './apiConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface InAppAlertPayload {
  id: string;
  title: string;
  body: string;
  type: 'TASK' | 'LEAVE' | 'UPDATE' | 'STOCK' | 'INFO';
  timestamp: string;
}

type InAppAlertListener = (alert: InAppAlertPayload) => void;
const listeners: Set<InAppAlertListener> = new Set();

export const NotificationService = {
  subscribe(listener: InAppAlertListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  broadcastInAppAlert(alert: InAppAlertPayload): void {
    listeners.forEach((fn) => {
      try {
        fn(alert);
      } catch {}
    });
  },

  async setupPermissionsAndChannels(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // 1. High-priority Task Assignments Channel
        await Notifications.setNotificationChannelAsync('ahtri_tasks', {
          name: 'Task Assignments & Field Visits',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F8B5A',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });

        // 2. High-priority Stock Reminders Channel
        await Notifications.setNotificationChannelAsync('ahtri_stock', {
          name: 'Stock Updates & Inventory Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 200, 300],
          lightColor: '#F59E0B',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });

        // 3. App Updates & Release Channel
        await Notifications.setNotificationChannelAsync('ahtri_updates', {
          name: 'App Updates & Releases',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#38BDF8',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // 4. Approvals & Decisions Channel
        await Notifications.setNotificationChannelAsync('ahtri_approvals', {
          name: 'Leave Approvals & Admin Decisions',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 200, 250],
          lightColor: '#22C55E',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }

      // Schedule background recurring daily alarms for stock checking
      this.scheduleDailyStockReminders().catch(() => {});

      return finalStatus === 'granted';
    } catch {
      return false;
    }
  },

  async sendSystemNotification(
    title: string,
    body: string,
    channelId = 'ahtri_tasks',
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data,
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(Platform.OS === 'android' ? { channelId } : {}),
        },
        trigger: null, // null = immediate
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/assets/logo.png',
          });
        }
      }

      const typeKey: 'TASK' | 'LEAVE' | 'UPDATE' | 'STOCK' | 'INFO' = channelId.includes('stock')
        ? 'STOCK'
        : channelId.includes('update')
        ? 'UPDATE'
        : channelId.includes('approval')
        ? 'LEAVE'
        : 'TASK';

      this.broadcastInAppAlert({
        id: `alert-${Date.now()}`,
        title,
        body,
        type: typeKey,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      this.broadcastInAppAlert({
        id: `alert-${Date.now()}`,
        title,
        body,
        type: 'INFO',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  },

  async notifyTaskAssigned(task: {
    id: string;
    title: string;
    location_name?: string;
    address?: string;
    time?: string;
    priority?: string;
  }): Promise<void> {
    const loc = task.location_name || task.address || 'Designated Clinic';
    const timeStr = task.time ? `Scheduled at ${task.time}` : 'Scheduled for today';
    const title = `📋 New Task Assigned: ${task.title}`;
    const body = `📍 ${loc} • ${timeStr}\nTap to open your call agenda.`;

    await this.sendSystemNotification(title, body, 'ahtri_tasks', {
      type: 'TASK_ASSIGNED',
      taskId: task.id,
      channelId: 'ahtri_tasks',
    });
  },

  async notifyStockReminder(
    title = '📦 Stock Update Reminder',
    body = 'Please verify and update stock levels for your assigned headquarters/stockers.',
    data: Record<string, any> = {}
  ): Promise<void> {
    await this.sendSystemNotification(title, body, 'ahtri_stock', {
      type: 'STOCK_REMINDER',
      channelId: 'ahtri_stock',
      ...data,
    });
  },

  async scheduleDailyStockReminders(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      // Cancel previous scheduled stock reminders to prevent duplicates
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content?.data?.type === 'STOCK_REMINDER') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // 1. Morning Stock Check (10:00 AM daily)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 Daily Stock Check Reminder',
          body: 'Good morning! Please verify and update stock levels for your assigned headquarters.',
          sound: 'default',
          data: { type: 'STOCK_REMINDER', channelId: 'ahtri_stock' },
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' ? { channelId: 'ahtri_stock' } : {}),
        },
        trigger: {
          hour: 10,
          minute: 0,
          repeats: true,
        },
      });

      // 2. Evening Closing Stock Check (5:30 PM daily)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Evening Closing Stock Reminder',
          body: 'Field duties closing: Please review today’s orders and submit pending stock updates.',
          sound: 'default',
          data: { type: 'STOCK_REMINDER', channelId: 'ahtri_stock' },
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' ? { channelId: 'ahtri_stock' } : {}),
        },
        trigger: {
          hour: 17,
          minute: 30,
          repeats: true,
        },
      });
      console.log('[NotificationService] Scheduled daily stock reminders for 10:00 AM and 5:30 PM');
    } catch (err: any) {
      console.warn('[NotificationService] Failed to schedule daily stock reminders:', err?.message);
    }
  },

  async notifyLeaveDecision(leave: {
    id: string;
    status: 'APPROVED' | 'REJECTED' | string;
    start_date: string;
    end_date: string;
    leave_type?: string;
    admin_comment?: string;
  }): Promise<void> {
    const isApproved = leave.status === 'APPROVED';
    const title = isApproved ? '🎉 Leave Request Approved!' : '⚠️ Leave Request Update';
    const body = isApproved
      ? `Your ${leave.leave_type || 'Leave'} from ${leave.start_date} to ${leave.end_date} has been Approved by Management.`
      : `Your leave request for ${leave.start_date} was not approved.${leave.admin_comment ? ` Reason: "${leave.admin_comment}"` : ''}`;

    await this.sendSystemNotification(title, body, 'ahtri_approvals', {
      type: 'LEAVE_DECISION',
      leaveId: leave.id,
      status: leave.status,
      channelId: 'ahtri_approvals',
    });
  },

  async notifyAppUpdateAvailable(version: string, downloadUrl?: string): Promise<void> {
    const title = `🚀 New Update Available (v${version})`;
    const body = `A new version of AHTRI FFA Mobile is ready. Tap to download and install now!`;

    await this.sendSystemNotification(title, body, 'ahtri_updates', {
      type: 'APP_UPDATE',
      version,
      downloadUrl,
      channelId: 'ahtri_updates',
    });
  },

  async registerForRemotePushNotifications(userId: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return null;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Notification permission not granted');
        return null;
      }

      let pushToken = '';
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '60909a48-8c02-4b10-ba38-404119640394',
        });
        pushToken = tokenData.data;
      } catch (expoTokenErr: any) {
        console.warn('[NotificationService] Expo push token fetch notice, trying device token:', expoTokenErr?.message);
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceToken.data;
        } catch {}
      }

      if (!pushToken) {
        console.log('[NotificationService] Could not acquire device push token on this device.');
        return null;
      }

      console.log('[NotificationService] Device Push Token obtained:', pushToken);

      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      const res = await fetch(`${baseUrl}/notifications/register-device`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: pushToken }),
      });

      if (res.ok) {
        await AsyncStorage.setItem(`@ahtri_registered_push_token_${userId}`, pushToken).catch(() => {});
      }

      return pushToken;
    } catch (err: any) {
      console.warn('[NotificationService] Push registration notice:', err?.message);
      return null;
    }
  },
};
