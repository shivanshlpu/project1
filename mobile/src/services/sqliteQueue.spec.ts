import { sqliteQueue } from './sqliteQueue';

describe('Mobile Offline SQLite Queue (Node 14 DoD Verification)', () => {
  beforeEach(() => {
    sqliteQueue.clearSyncedDrafts();
  });

  it('should enqueue offline drafts with UUID and timestamp', async () => {
    const draft = await sqliteQueue.enqueueDraft('visit_drafts', {
      doctor_id: 'doc-01',
      remarks: 'Offline doctor visit in basement clinic',
    });

    expect(draft.id).toBeDefined();
    expect(draft.id.startsWith('offline-')).toBe(true);
    expect(draft.synced).toBe(false);
    expect(draft.created_at).toBeDefined();

    const pending = sqliteQueue.getUnsyncedDrafts();
    expect(pending.some((d) => d.id === draft.id)).toBe(true);
  });

  it('should mark drafts as synced idempotently upon server reconciliation', async () => {
    const draft1 = await sqliteQueue.enqueueDraft('expense_drafts', { amount: 150 });
    const draft2 = await sqliteQueue.enqueueDraft('dcr_drafts', { date: '2026-09-06' });

    expect(sqliteQueue.getUnsyncedDrafts().length).toBeGreaterThanOrEqual(2);

    sqliteQueue.markDraftsAsSynced([draft1.id]);

    const remainingUnsynced = sqliteQueue.getUnsyncedDrafts();
    expect(remainingUnsynced.some((d) => d.id === draft1.id)).toBe(false);
    expect(remainingUnsynced.some((d) => d.id === draft2.id)).toBe(true);
  });
});
