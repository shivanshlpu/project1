import { sqliteQueue } from './sqliteQueue';

export class OfflineSyncService {
  /**
   * Section 4.4: Push queued drafts on reconnect to /sync/push
   */
  static async pushPendingQueue(apiBaseUrl: string, token: string) {
    const unsynced = sqliteQueue.getUnsyncedDrafts();
    if (unsynced.length === 0) {
      return { message: 'No drafts pending sync', count: 0 };
    }

    const payload = {
      visit_drafts: unsynced
        .filter((d) => d.table_name === 'visit_drafts')
        .map((d) => d.payload),
      dcr_drafts: unsynced
        .filter((d) => d.table_name === 'dcr_drafts')
        .map((d) => d.payload),
      expense_drafts: unsynced
        .filter((d) => d.table_name === 'expense_drafts')
        .map((d) => d.payload),
    };

    try {
      const response = await fetch(`${apiBaseUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed with HTTP ${response.status}`);
      }

      const result = await response.json();
      const allSynced = [
        ...(result.synced_ids?.visits || []),
        ...(result.synced_ids?.dcrs || []),
        ...(result.synced_ids?.expenses || []),
      ];

      sqliteQueue.markDraftsAsSynced(allSynced);
      sqliteQueue.lastSyncTimestamp = result.server_timestamp;

      return {
        message: 'Sync pushed successfully',
        syncedCount: allSynced.length,
        serverTimestamp: result.server_timestamp,
      };
    } catch (err: any) {
      console.warn('Sync push network error (will retry when online):', err.message);
      return { message: 'Sync queued offline', error: err.message, pending: unsynced.length };
    }
  }

  /**
   * Section 4.4: Pull latest read caches to mirror tasks and doctors locally
   */
  static async pullLatestCaches(apiBaseUrl: string, token: string) {
    try {
      const sinceParam = sqliteQueue.lastSyncTimestamp
        ? `?since=${encodeURIComponent(sqliteQueue.lastSyncTimestamp)}`
        : '';
      const response = await fetch(`${apiBaseUrl}/sync/pull${sinceParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sync pull failed with HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.tasks) sqliteQueue.cachedTasks = data.tasks;
      if (data.doctors) sqliteQueue.cachedDoctors = data.doctors;
      sqliteQueue.lastSyncTimestamp = data.server_timestamp;

      return {
        success: true,
        tasksCount: data.tasks?.length || 0,
        doctorsCount: data.doctors?.length || 0,
      };
    } catch (err: any) {
      console.warn('Sync pull error:', err.message);
      return { success: false, error: err.message };
    }
  }
}
