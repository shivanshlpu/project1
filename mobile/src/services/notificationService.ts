import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification presentation when app is in foreground
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
  /**
   * Subscribe to in-app notification banners
   */
  subscribe(listener: InAppAlertListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Broadcast an in-app banner to all active screens
   */
  broadcastInAppAlert(alert: InAppAlertPayload): void {
    listeners.forEach((fn) => {
      try {
        fn(alert);
      } catch {}
    });
  },

  /**
   * Request system notification permissions and configure Android channels
   */
  async setupPermissionsAndChannels(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // High-importance channel with sound and vibration (WhatsApp-like)
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

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Web Notification permission
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

  /**
   * Fire a system notification with sound & heads-up banner
   */
  async sendSystemNotification(
    title: string,
    body: string,
    channelId = 'ahtri_tasks',
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      // 1. Android / Native OS Notification via expo-notifications
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

      // 2. Web browser HTML5 Notification
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/assets/logo.png',
          });
        }
      }

      // 3. In-App floating banner
      this.broadcastInAppAlert({
        id: `alert-${Date.now()}`,
        title,
        body,
        type: channelId.includes('update') ? 'UPDATE' : channelId.includes('approval') ? 'LEAVE' : 'TASK',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      // Fallback in-app banner
      this.broadcastInAppAlert({
        id: `alert-${Date.now()}`,
        title,
        body,
        type: 'INFO',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  },

  /**
   * WhatsApp-style notification when a new task is assigned
   */
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

  /**
   * Notification when a leave request is approved or updated by Manager
   */
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

  /**
   * Notification when an app update is broadcasted by Admin
   */
  async notifyAppUpdateAvailable(version: string, downloadUrl?: string): Promise<void> {
    const title = `🚀 New Update Available (v${version})`;
    const body = `A new version of AHTRI FFA Mobile is ready. Tap to download and install now!`;

    await this.sendSystemNotification(title, body, 'ahtri_updates', {
      type: 'APP_UPDATE',
      version,
      downloadUrl,
    });
  },
};
