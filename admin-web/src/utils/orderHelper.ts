import { TaskOrderItem } from '../types';

export function parseSafeOrders(rawOrders: any): TaskOrderItem[] {
  if (!rawOrders) return [];
  if (Array.isArray(rawOrders)) return rawOrders;
  if (typeof rawOrders === 'string') {
    try {
      const parsed = JSON.parse(rawOrders);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function calculateOrderRevenue(rawOrders: any): number {
  const orders = parseSafeOrders(rawOrders);
  return orders.reduce((sum, o) => {
    const amt =
      typeof o.total_amount === 'number'
        ? o.total_amount
        : typeof o.unit_price === 'number' && typeof o.quantity === 'number'
        ? o.unit_price * o.quantity
        : 0;
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);
}

export function calculateOrderUnits(rawOrders: any): number {
  const orders = parseSafeOrders(rawOrders);
  return orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
}
