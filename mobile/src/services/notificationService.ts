import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
  type: 'TASK' | 'LEAVE' | 'UPDATE' | 'INFO';
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
        
        await Notifications.setNotificationChannelAsync('ahtri_tasks', {
          name: 'Task Assignments & Calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F8B5A',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('ahtri_updates', {
          name: 'App Updates & Releases',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 200, 200, 200],
          lightColor: '#38BDF8',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('ahtri_approvals', {
          name: 'Leave Approvals & Admin Decisions',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 200, 250],
          lightColor: '#22C55E',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
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

      
      this.broadcastInAppAlert({
        id: `alert-${Date.now()}`,
        title,
        body,
        type: channelId.includes('update') ? 'UPDATE' : channelId.includes('approval') ? 'LEAVE' : 'TASK',
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
      type: 'NEW_TASK',
      taskId: task.id,
    });
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
    });
  },

  
  async notifyAppUpdateAvailable(version: string, downloadUrl?: string): Promise<void> {
    const title = `🚀 New Update Available (v${version})`;
    const body = `A new version of AHTRI FFA Mobile is ready. Tap to download and install now!`;

    await this.sendSystemNotification(title, body, 'ahtri_updates', {
      type: 'APP_UPDATE',
      version,
      downloadUrl,
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '60909a48-8c02-4b10-ba38-404119640394',
      });
      const pushToken = tokenData.data;
      console.log('[NotificationService] Device Push Token obtained:', pushToken);

      
      const baseUrl = await ApiConfig.getBaseUrl();
      const headers = await ApiConfig.getAuthHeaders();
      await fetch(`${baseUrl}/notifications/register-device`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcm_token: pushToken }),
      });

      return pushToken;
    } catch (err: any) {
      console.warn('[NotificationService] Push registration notice:', err?.message);
      return null;
    }
  },
};
