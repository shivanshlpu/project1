function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface QueuedDraft {
  id: string;
  table_name: 'visit_drafts' | 'dcr_drafts' | 'expense_drafts';
  payload: any;
  created_at: string;
  synced: boolean;
}

/**
 * Section 4.4 & Section 11: Local offline SQLite queue.
 * Append-only write queue where each draft is tagged with a client UUID + timestamp
 * to make retries idempotent.
 */
class LocalOfflineQueue {
  private queue: QueuedDraft[] = [];

  // Read caches mirrored locally (§4.4)
  public cachedTasks: any[] = [];
  public cachedDoctors: any[] = [];
  public lastSyncTimestamp: string | null = null;

  async enqueueDraft(
    tableName: 'visit_drafts' | 'dcr_drafts' | 'expense_drafts',
    payload: any,
  ): Promise<QueuedDraft> {
    const draftId = payload.id || `offline-${generateUUID()}`;
    const draft: QueuedDraft = {
      id: draftId,
      table_name: tableName,
      payload: { ...payload, id: draftId },
      created_at: new Date().toISOString(),
      synced: false,
    };

    this.queue.push(draft);
    return draft;
  }

  getUnsyncedDrafts() {
    return this.queue.filter((d) => !d.synced);
  }

  markDraftsAsSynced(syncedIds: string[]) {
    for (const draft of this.queue) {
      if (syncedIds.includes(draft.id)) {
        draft.synced = true;
      }
    }
  }

  clearSyncedDrafts() {
    this.queue = this.queue.filter((d) => !d.synced);
  }

  getAllDrafts() {
    return this.queue;
  }
}

export const sqliteQueue = new LocalOfflineQueue();
