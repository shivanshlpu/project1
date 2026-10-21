const DELETED_ORDERS_KEY = 'ahtri_deleted_order_ids';

const LEGACY_DUMMY_ORDER_IDS = new Set([
  'ord-b03eb79b',
  'ord-a800818a',
  'ord-shd-01',
  'ord-amb-01',
  'ord-task-e4014a4a',
  'ord-task-0ff44e9b',
  'ORD-20261014-4a4a',
  'ORD-20261015-4e9b',
]);

export function getDeletedOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ORDERS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    // Ensure active valid order numbers are never treated as deleted
    const sanitized = parsed.filter(
      (id) => !id.startsWith('ORD-2026-000') && id !== 'ORD-2026-0001' && id !== 'ORD-2026-0002',
    );
    const set = new Set<string>(sanitized);

    LEGACY_DUMMY_ORDER_IDS.forEach((id) => set.add(id));
    return set;
  } catch {
    return new Set(LEGACY_DUMMY_ORDER_IDS);
  }
}

export function markOrderAsDeleted(orderIdOrIds: string | string[]): void {
  try {
    const current = getDeletedOrderIds();
    if (Array.isArray(orderIdOrIds)) {
      orderIdOrIds.forEach((id) => {
        if (id) current.add(id);
      });
    } else if (orderIdOrIds) {
      current.add(orderIdOrIds);
    }
    localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
}

export function isOrderDeleted(orderIdOrNum?: string): boolean {
  if (!orderIdOrNum) return false;
  return getDeletedOrderIds().has(orderIdOrNum);
}
