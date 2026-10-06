const DELETED_TASKS_KEY = 'ahtri_deleted_task_ids';

const LEGACY_DUMMY_IDS = new Set([
  'task-01',
  'task-02',
  'task-03',
  'task-04',
  'task-05',
]);

export function getDeletedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_TASKS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>(parsed);
    // Legacy dummy tasks should never be displayed
    LEGACY_DUMMY_IDS.forEach((id) => set.add(id));
    return set;
  } catch {
    return new Set(LEGACY_DUMMY_IDS);
  }
}

export function markTaskAsDeleted(taskIdOrIds: string | string[]): void {
  try {
    const current = getDeletedTaskIds();
    if (Array.isArray(taskIdOrIds)) {
      taskIdOrIds.forEach((id) => current.add(id));
    } else {
      current.add(taskIdOrIds);
    }
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

export function isTaskDeleted(taskId: string): boolean {
  return getDeletedTaskIds().has(taskId);
}
