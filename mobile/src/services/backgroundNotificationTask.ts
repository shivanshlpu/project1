import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiConfig } from './apiConfig';

export const BACKGROUND_SYNC_TASK_NAME = 'AHTRI_BACKGROUND_SYNC_TASK';

// Define the background task at the module level (required by expo-task-manager)
TaskManager.defineTask(BACKGROUND_SYNC_TASK_NAME, async () => {
  try {
    const rawUser = await AsyncStorage.getItem('@ahtri_user');
    if (!rawUser) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const user = JSON.parse(rawUser);
    const userId = user?.id;
    if (!userId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const baseUrl = await ApiConfig.getBaseUrl();
    const headers = await ApiConfig.getAuthHeaders();

    let foundNewData = false;

    // 1. Check for unread server notifications (Stockage permissions, leave decisions, stock reminders)
    try {
      const notifsRes = await fetch(`${baseUrl}/notifications/my?unread=true`, { headers });
      if (notifsRes.ok) {
        const notifs = await notifsRes.json();
        if (Array.isArray(notifs) && notifs.length > 0) {
          const rawSeen = await AsyncStorage.getItem(`@ahtri_seen_notif_ids_${userId}`);
          const seenIds = new Set(rawSeen ? JSON.parse(rawSeen) : []);

          for (const notif of notifs) {
            if (!seenIds.has(notif.id)) {
              seenIds.add(notif.id);
              foundNewData = true;

              const channelId =
                notif.data_json?.channelId ||
                (notif.type === 'STOCK_REMINDER'
                  ? 'ahtri_stock'
                  : notif.type === 'STOCKAGE_PERMISSION_GRANTED'
                  ? 'ahtri_stock'
                  : notif.type === 'APP_UPDATE'
                  ? 'ahtri_updates'
                  : notif.type === 'LEAVE_DECISION'
                  ? 'ahtri_approvals'
                  : 'ahtri_tasks');

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: notif.title || 'AHTRI Notification',
                  body: notif.body || '',
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.MAX,
                  data: {
                    ...(notif.data_json || {}),
                    notificationId: notif.id,
                    channelId,
                  },
                },
                trigger: null,
              });

              // Mark as read on server
              fetch(`${baseUrl}/notifications/read/${encodeURIComponent(notif.id)}`, {
                method: 'PATCH',
                headers,
              }).catch(() => {});
            }
          }

          await AsyncStorage.setItem(
            `@ahtri_seen_notif_ids_${userId}`,
            JSON.stringify(Array.from(seenIds).slice(-200)),
          );
        }
      }
    } catch (err: any) {
      console.warn('[BackgroundSync] Error syncing notifications:', err?.message);
    }

    // 2. Check for newly assigned tasks
    try {
      const tasksRes = await fetch(`${baseUrl}/tasks?mr_id=${encodeURIComponent(userId)}`, { headers });
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        if (Array.isArray(tasks) && tasks.length > 0) {
          const rawSeenTasks = await AsyncStorage.getItem(`@ahtri_seen_task_ids_${userId}`);
          const seenTaskIds = new Set(rawSeenTasks ? JSON.parse(rawSeenTasks) : []);

          for (const t of tasks) {
            const isPending = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.status !== 'SUSPENDED';
            if (t.assigned_mr_id === userId && isPending && !seenTaskIds.has(t.id)) {
              seenTaskIds.add(t.id);
              foundNewData = true;

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: '📋 New Task Assigned',
                  body: `New visit: ${t.location_name || t.title} scheduled at ${t.time || 'Today'}`,
                  sound: 'default',
                  priority: Notifications.AndroidNotificationPriority.MAX,
                  data: {
                    taskId: t.id,
                    type: 'TASK_ASSIGNED',
                    channelId: 'ahtri_tasks',
                  },
                },
                trigger: null,
              });
            }
          }

          await AsyncStorage.setItem(
            `@ahtri_seen_task_ids_${userId}`,
            JSON.stringify(Array.from(seenTaskIds).slice(-200)),
          );
        }
      }
    } catch (err: any) {
      console.warn('[BackgroundSync] Error syncing tasks:', err?.message);
    }

    return foundNewData
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background fetch task with Android WorkManager / iOS BackgroundFetch
 */
export async function registerBackgroundSyncAsync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK_NAME, {
        minimumInterval: 60 * 15, // 15 minutes minimum per Android WorkManager spec
        stopOnTerminate: false, // Resume even if app process terminates
        startOnBoot: true, // Resume on device boot
      });
      console.log('[BackgroundSync] Background sync task registered successfully');
    }
  } catch (err: any) {
    console.warn('[BackgroundSync] Could not register background fetch task:', err?.message);
  }
}

/**
 * Unregister background fetch task (e.g. on user logout)
 */
export async function unregisterBackgroundSyncAsync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK_NAME);
      console.log('[BackgroundSync] Background sync task unregistered');
    }
  } catch (err: any) {
    console.warn('[BackgroundSync] Error unregistering background task:', err?.message);
  }
}
