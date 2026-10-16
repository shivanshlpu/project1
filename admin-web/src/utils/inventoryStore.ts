

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
    name: 'AHTRI-S',
    code: 'AHT-001',
    quantity: 50,
    unit: '200 ML',
    status: 'Available',
  },
  {
    id: 'med-02',
    name: 'AHTRI-A2Z',
    code: 'AHT-002',
    quantity: 30,
    unit: '200 ML',
    status: 'Available',
  },
  {
    id: 'med-03',
    name: 'AHTYME',
    code: 'AHT-003',
    quantity: 15,
    unit: '200 ML',
    status: 'Low Stock',
  },
  {
    id: 'med-04',
    name: 'ATHRIMOX CV 625',
    code: 'AHT-004',
    quantity: 70,
    unit: '10*1*10',
    status: 'Available',
  },
  {
    id: 'med-05',
    name: 'AHTRI-P',
    code: 'AHT-005',
    quantity: 75,
    unit: '20*10',
    status: 'Available',
  },
  {
    id: 'med-06',
    name: 'TRIPAN DSR',
    code: 'AHT-006',
    quantity: 80,
    unit: '10*10',
    status: 'Available',
  },
  {
    id: 'med-07',
    name: 'AHTRI SP',
    code: 'AHT-007',
    quantity: 85,
    unit: '10*10',
    status: 'Available',
  },
  {
    id: 'med-08',
    name: 'TRIZOLE OC',
    code: 'AHT-008',
    quantity: 90,
    unit: '30 GM',
    status: 'Available',
  },
  {
    id: 'med-09',
    name: 'TRIZOLE 200',
    code: 'AHT-009',
    quantity: 95,
    unit: '10*10',
    status: 'Available',
  },
  {
    id: 'med-10',
    name: 'AHTRI K27',
    code: 'AHT-010',
    quantity: 100,
    unit: '10*1*10',
    status: 'Available',
  },
  {
    id: 'med-11',
    name: 'TRIDIC GEL',
    code: 'AHT-011',
    quantity: 105,
    unit: '30 GM',
    status: 'Available',
  },
  {
    id: 'med-12',
    name: 'AHTRI STRETCH MARK CREAM',
    code: 'AHT-012',
    quantity: 110,
    unit: '50 GM',
    status: 'Available',
  },
  {
    id: 'med-13',
    name: 'AHTRI 5G SYP',
    code: 'AHT-013',
    quantity: 115,
    unit: '200 ML',
    status: 'Available',
  },
  {
    id: 'med-14',
    name: 'TRIRAB DSR',
    code: 'AHT-014',
    quantity: 120,
    unit: '10*10',
    status: 'Available',
  },
  {
    id: 'med-15',
    name: 'AHTRIMOX CV SUSPENSION',
    code: 'AHT-015',
    quantity: 125,
    unit: '30 ML',
    status: 'Available',
  },
  {
    id: 'med-16',
    name: 'MAFTRI P',
    code: 'AHT-016',
    quantity: 130,
    unit: '60 ML',
    status: 'Available',
  },
  {
    id: 'med-17',
    name: 'AHTRI 9G',
    code: 'AHT-017',
    quantity: 135,
    unit: '200 ML',
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

    
    const medUrl = hqId ? `${apiUrl}/inventory/medicines?hqId=${encodeURIComponent(hqId)}` : `${apiUrl}/inventory/medicines`;
    const medRes = await fetch(medUrl, { headers });
    let medicines: any[] = [];
    if (medRes.ok) {
      medicines = await medRes.json();
    }

    
    const stkRes = await fetch(`${apiUrl}/inventory/stockers`, { headers });
    let stockers: any[] = [];
    if (stkRes.ok) {
      stockers = await stkRes.json();
    }

    const medicineQtyMap = new Map<string, number>();

    
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

