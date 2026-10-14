import { TaskOrderItem } from '../types';

/**
 * Safely normalizes orders whether coming from Supabase/PostgreSQL as an array,
 * stringified JSON string, or null/undefined.
 */
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

/**
 * Calculate total order revenue safely
 */
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

/**
 * Calculate total order quantity units safely
 */
export function calculateOrderUnits(rawOrders: any): number {
  const orders = parseSafeOrders(rawOrders);
  return orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
}
