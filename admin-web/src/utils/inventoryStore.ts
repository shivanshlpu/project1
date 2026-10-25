

export interface InStockProduct {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  unit?: string;
  status: 'Available' | 'Low Stock' | 'Out of Stock';
  is_out_of_stock?: boolean;
  is_low_stock?: boolean;
}

export const DEFAULT_IN_STOCK_PRODUCTS: InStockProduct[] = [];

export function getApiUrl(): string {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3000';
  }
  return (
    (import.meta as any).env?.VITE_API_URL ||
    localStorage.getItem('ahtri_backend_url') ||
    'http://localhost:3000'
  );
}

const STORAGE_KEY = 'ahtri_in_stock_medicines';

export function getStoredInStockProducts(): InStockProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((p) => p && typeof p.quantity === 'number');
      }
    }
  } catch {}
  return [];
}

export function persistInStockProducts(products: InStockProduct[]) {
  try {
    const validInStock = products.filter((p) => p && typeof p.quantity === 'number');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validInStock));
    window.dispatchEvent(
      new CustomEvent('ahtri_inventory_updated', {
        detail: validInStock,
      }),
    );
  } catch {}
}

export function syncInStockFromInventoryItems(
  items: Array<{
    medicine_id: string;
    medicine_name: string;
    medicine_code?: string;
    quantity: number;
    unit?: string;
    status?: string;
  }>
) {
  if (!Array.isArray(items)) return;
  const inStockList: InStockProduct[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (item && item.quantity > 0 && !seenIds.has(item.medicine_id)) {
      seenIds.add(item.medicine_id);
      inStockList.push({
        id: item.medicine_id,
        name: item.medicine_name,
        code: item.medicine_code,
        quantity: item.quantity,
        unit: item.unit || 'Units',
        status: item.quantity <= 15 ? 'Low Stock' : 'Available',
      });
    }
  }

  if (inStockList.length > 0) {
    persistInStockProducts(inStockList);
  }
}

export async function syncInStockProductsWithBackend(hqId?: string): Promise<InStockProduct[]> {
  try {
    const apiUrl = getApiUrl();
    const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const effectiveHq = hqId && hqId !== 'ALL'
      ? hqId
      : (typeof localStorage !== 'undefined' ? (localStorage.getItem('ahtri_active_hq') || 'HQ-SHD-001') : 'HQ-SHD-001');

    const targetUrl = `${apiUrl}/inventory/hq-stock?hq_id=${encodeURIComponent(effectiveHq)}`;

    const res = await fetch(targetUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      let medicines: any[] = [];
      if (Array.isArray(data)) {
        medicines = data;
      } else if (data && Array.isArray(data.medicines)) {
        medicines = data.medicines;
      }

      if (medicines.length > 0) {
        const fullList: InStockProduct[] = [];
        for (const med of medicines) {
          if (med.status === 'INACTIVE' || med.is_active === false) continue;
          const id = med.id || med.medicine_id;
          const name = med.name || med.medicine_name;
          const code = med.code || med.product_code || med.medicine_code;
          const qty = typeof med.available_stock === 'number' ? med.available_stock : 0;
          const unit = med.unit || med.packing || 'Units';
          const threshold = med.low_stock_threshold || 10;
          const isOut = qty <= 0;
          const isLow = qty > 0 && qty <= threshold;
          const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Available';

          fullList.push({
            id,
            name,
            code,
            quantity: qty,
            unit,
            status,
            is_out_of_stock: isOut,
            is_low_stock: isLow,
          });
        }

        if (fullList.length > 0) {
          persistInStockProducts(fullList);
          return fullList;
        }
      }
    }
  } catch (err) {
    console.warn('Backend stock sync error:', err);
  }

  return getStoredInStockProducts();
}

