/**
 * Live Synchronized Inventory & In-Stock Medicines Store
 * Bridges StockerManagementView and TasksView detailing focus in real-time.
 * Only medicines that have stock > 0 in store are considered in-stock.
 */

export interface InStockProduct {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  unit?: string;
  status: 'Available' | 'Low Stock';
}

export const DEFAULT_IN_STOCK_PRODUCTS: InStockProduct[] = [
  {
    id: 'med-01',
    name: 'CardioFix-50 (Telmisartan 50mg)',
    code: 'CF-50',
    quantity: 50,
    unit: 'Strip of 10',
    status: 'Available',
  },
  {
    id: 'med-02',
    name: 'CardioFix-AM (Telmisartan + Amlodipine)',
    code: 'CF-AM',
    quantity: 10,
    unit: 'Box of 10x10',
    status: 'Low Stock',
  },
  {
    id: 'med-04',
    name: 'Glucotrol-M (Metformin 500mg)',
    code: 'GM-500',
    quantity: 85,
    unit: 'Box of 10x10',
    status: 'Available',
  },
  {
    id: 'med-05',
    name: 'AhtriCef-O 200mg (Cefixime)',
    code: 'ACO-200',
    quantity: 40,
    unit: 'Strip of 10',
    status: 'Available',
  },
];

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
        return parsed.filter((p) => p && typeof p.quantity === 'number' && p.quantity > 0);
      }
    }
  } catch {}
  return DEFAULT_IN_STOCK_PRODUCTS;
}

export function persistInStockProducts(products: InStockProduct[]) {
  try {
    const validInStock = products.filter((p) => p && typeof p.quantity === 'number' && p.quantity > 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validInStock));
    window.dispatchEvent(
      new CustomEvent('ahtri_inventory_updated', {
        detail: validInStock,
      }),
    );
  } catch {}
}

/**
 * Synchronize in-stock medicines directly from StockerManagement inventory array
 */
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

    // 1. Fetch medicines (with optional hqId to prevent cross-HQ visibility per §1.4)
    const medUrl = hqId ? `${apiUrl}/inventory/medicines?hqId=${encodeURIComponent(hqId)}` : `${apiUrl}/inventory/medicines`;
    const medRes = await fetch(medUrl, { headers });
    let medicines: any[] = [];
    if (medRes.ok) {
      medicines = await medRes.json();
    }

    // 2. Fetch stockers to get aggregated inventory
    const stkRes = await fetch(`${apiUrl}/inventory/stockers`, { headers });
    let stockers: any[] = [];
    if (stkRes.ok) {
      stockers = await stkRes.json();
    }

    const medicineQtyMap = new Map<string, number>();

    // If stockers exist, sum up inventory quantities
    if (Array.isArray(stockers) && stockers.length > 0) {
      for (const stk of stockers.slice(0, 10)) {
        try {
          const invRes = await fetch(`${apiUrl}/inventory/stockers/${stk.id}/inventory`, { headers });
          if (invRes.ok) {
            const invList: any[] = await invRes.json();
            if (Array.isArray(invList)) {
              for (const item of invList) {
                const current = medicineQtyMap.get(item.medicine_id) || 0;
                medicineQtyMap.set(item.medicine_id, current + (item.quantity || 0));
              }
            }
          }
        } catch {}
      }
    }

    if (Array.isArray(medicines) && medicines.length > 0) {
      const inStockList: InStockProduct[] = [];
      for (const med of medicines) {
        if (med.status === 'INACTIVE' || med.is_active === false) continue;
        const totalQty = medicineQtyMap.get(med.id) ?? 0;
        // Only include if store has stock > 0
        if (totalQty > 0) {
          inStockList.push({
            id: med.id,
            name: med.name,
            code: med.code || med.product_code,
            quantity: totalQty,
            unit: med.unit || 'Units',
            status: totalQty <= (med.low_stock_threshold || 15) ? 'Low Stock' : 'Available',
          });
        }
      }

      if (inStockList.length > 0) {
        persistInStockProducts(inStockList);
        return inStockList;
      }
    }
  } catch (err) {
    console.warn('Backend in-stock sync error:', err);
  }

  return getStoredInStockProducts();
}

