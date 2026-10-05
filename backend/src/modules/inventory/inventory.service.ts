import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import {
  CreateHqDto,
  UpdateHqDto,
  CreateHqAreaDto,
  UpdateHqAreaDto,
  BatchHqAreasDto,
  CreateStockerDto,
  UpdateStockerDto,
  CreateMedicineDto,
  UpdateMedicineDto,
  AdjustStockDto,
  CreateMonthlyStockEntryDto,
  BatchMonthlyStockEntryDto,
} from './inventory.dto';
import {
  Headquarter,
  HqArea,
  Stocker,
  Medicine,
  StockerInventory,
  InventoryTransaction,
  MonthlyStockEntry,
} from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class InventoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // === 1. HEADQUARTERS ===
  async getHeadquarters(): Promise<Headquarter[]> {
    return this.db.headquarters.filter((h) => h.status === 'ACTIVE');
  }

  async createHeadquarter(dto: CreateHqDto): Promise<Headquarter> {
    const existing = this.db.headquarters.find(
      (h) => h.name.toLowerCase() === dto.name.toLowerCase(),
    );
    if (existing) {
      throw new BadRequestException(`Headquarter "${dto.name}" already exists`);
    }

    const hq: Headquarter = {
      id: `hq-${uuidv4().substring(0, 8)}`,
      name: dto.name,
      code: dto.code.toUpperCase(),
      state: dto.state || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.headquarters.push(hq);
    return hq;
  }

  async updateHeadquarter(id: string, dto: UpdateHqDto): Promise<Headquarter> {
    const hq = this.db.headquarters.find((h) => h.id === id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    if (dto.name) {
      const existing = this.db.headquarters.find(
        (h) => h.id !== id && h.name.toLowerCase() === dto.name!.trim().toLowerCase(),
      );
      if (existing) {
        throw new BadRequestException(`Headquarter "${dto.name}" already exists`);
      }
      hq.name = dto.name.trim();
    }
    if (dto.code) hq.code = dto.code.trim().toUpperCase();
    if (dto.state !== undefined) hq.state = dto.state.trim();
    if (dto.status) hq.status = dto.status;

    return hq;
  }

  async deleteHeadquarter(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.headquarters.findIndex((h) => h.id === id);
    if (index === -1) throw new NotFoundException('Headquarter not found');

    this.db.headquarters.splice(index, 1);
    this.db.stockers = this.db.stockers.filter((s) => s.hq_id !== id);
    this.db.hqAreas = this.db.hqAreas.filter((a) => a.hq_id !== id);
    return { success: true, message: 'Headquarter deleted successfully' };
  }

  // === 2. HQ AREAS ===
  async getHqAreas(hqId?: string): Promise<HqArea[]> {
    if (hqId) {
      return this.db.hqAreas.filter((a) => a.hq_id === hqId && a.status === 'ACTIVE');
    }
    return this.db.hqAreas.filter((a) => a.status === 'ACTIVE');
  }

  async createHqArea(dto: CreateHqAreaDto): Promise<HqArea> {
    const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const area: HqArea = {
      id: `area-${uuidv4().substring(0, 8)}`,
      hq_id: dto.hq_id,
      name: dto.name,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.db.hqAreas.push(area);
    return area;
  }

  async updateHqArea(id: string, dto: UpdateHqAreaDto): Promise<HqArea> {
    const area = this.db.hqAreas.find((a) => a.id === id);
    if (!area) throw new NotFoundException('Area not found');
    if (dto.name) area.name = dto.name.trim();
    if (dto.hq_id) {
      const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
      if (!hq) throw new NotFoundException('Target headquarter not found');
      area.hq_id = dto.hq_id;
    }
    if (dto.status) area.status = dto.status;
    return area;
  }

  async deleteHqArea(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.hqAreas.findIndex((a) => a.id === id);
    if (index === -1) throw new NotFoundException('Area not found');
    this.db.hqAreas.splice(index, 1);
    return { success: true, message: 'Area deleted successfully' };
  }

  async syncHqAreas(dto: BatchHqAreasDto): Promise<HqArea[]> {
    const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const cleanNames = Array.from(
      new Set(
        (dto.areas || [])
          .map((n) => (typeof n === 'string' ? n.trim() : ''))
          .filter((n) => n.length > 0)
      )
    );

    // Keep existing areas for this HQ, or add missing
    const existing = this.db.hqAreas.filter((a) => a.hq_id === dto.hq_id);
    const existingNames = new Set(existing.map((a) => a.name.toLowerCase()));

    for (const name of cleanNames) {
      if (!existingNames.has(name.toLowerCase())) {
        this.db.hqAreas.push({
          id: `area-${uuidv4().substring(0, 8)}`,
          hq_id: dto.hq_id,
          name,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        });
      }
    }

    return this.db.hqAreas.filter((a) => a.hq_id === dto.hq_id && a.status === 'ACTIVE');
  }

  // === 3. STOCKERS ===
  async getStockers(hqId?: string, subArea?: string): Promise<any[]> {
    let list = this.db.stockers;
    if (hqId && hqId !== 'ALL') {
      list = list.filter((s) => s.hq_id === hqId);
    }
    if (subArea && subArea !== 'ALL') {
      list = list.filter((s) => s.sub_area && s.sub_area.toLowerCase() === subArea.toLowerCase());
    }

    return list.map((s) => {
      const hq = this.db.headquarters.find((h) => h.id === s.hq_id);
      return {
        ...s,
        hq_name: hq?.name || 'Unknown HQ',
      };
    });
  }

  async createStocker(dto: CreateStockerDto): Promise<Stocker> {
    const hq = this.db.headquarters.find((h) => h.id === dto.hq_id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const stocker: Stocker = {
      id: `stk-${uuidv4().substring(0, 8)}`,
      hq_id: dto.hq_id,
      name: dto.name,
      sub_area: dto.sub_area || '',
      contact_person: dto.contact_person || '',
      phone: dto.phone || '',
      address: dto.address || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.stockers.push(stocker);

    // Initialize inventory records for all active medicines with 0 stock
    for (const med of this.db.medicines.filter((m) => m.status === 'ACTIVE')) {
      this.db.stockerInventory.push({
        id: `inv-${stocker.id}-${med.id}`,
        hq_id: dto.hq_id,
        stocker_id: stocker.id,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      });
    }

    return stocker;
  }

  async updateStocker(id: string, dto: UpdateStockerDto): Promise<Stocker> {
    const stocker = this.db.stockers.find((s) => s.id === id);
    if (!stocker) throw new NotFoundException('Stocker not found');

    if (dto.name) stocker.name = dto.name;
    if (dto.sub_area !== undefined) stocker.sub_area = dto.sub_area;
    if (dto.contact_person !== undefined) stocker.contact_person = dto.contact_person;
    if (dto.phone !== undefined) stocker.phone = dto.phone;
    if (dto.address !== undefined) stocker.address = dto.address;
    if (dto.status) stocker.status = dto.status;

    return stocker;
  }

  async deleteStocker(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.stockers.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundException('Stocker not found');

    this.db.stockers.splice(index, 1);
    this.db.stockerInventory = this.db.stockerInventory.filter((inv) => inv.stocker_id !== id);
    return { success: true, message: 'Stocker deleted successfully' };
  }

  // === 4. MEDICINES MASTER ===
  async getMedicines(includeInactive = false, hqId?: string): Promise<any[]> {
    let list = includeInactive ? this.db.medicines : this.db.medicines.filter((m) => m.status === 'ACTIVE');

    // Strict HQ-Stockist Relationship (§1.4)
    // Only medicines available in the selected HQ's stocker(s) are visible
    if (hqId && hqId !== 'ALL') {
      const hqStockers = this.db.stockers.filter((s) => s.hq_id === hqId);
      const stockerIds = new Set(hqStockers.map((s) => s.id));
      const validMedicineIds = new Set(
        this.db.stockerInventory
          .filter((inv) => stockerIds.has(inv.stocker_id) && inv.quantity > 0)
          .map((inv) => inv.medicine_id),
      );
      list = list.filter((m) => validMedicineIds.has(m.id));
    }

    return list.map((m) => ({
      ...m,
      product_code: m.code,
      is_active: m.status === 'ACTIVE',
      low_stock_threshold: m.low_stock_threshold || 10,
    }));
  }

  async createMedicine(dto: CreateMedicineDto): Promise<any> {
    const rawCode = dto.code || dto.product_code || `MED-${Math.random().toString(36).substring(2, 6)}`;
    const code = rawCode.toUpperCase();
    const threshold = Number(dto.low_stock_threshold) || 10;

    const med: Medicine = {
      id: `med-${uuidv4().substring(0, 8)}`,
      name: dto.name.trim(),
      code,
      unit: dto.unit || 'Units',
      base_price: Number(dto.base_price) || 0,
      low_stock_threshold: threshold,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.medicines.push(med);

    // Initialize stock records across all existing active stockers
    for (const stk of this.db.stockers) {
      this.db.stockerInventory.push({
        id: `inv-${stk.id}-${med.id}`,
        hq_id: stk.hq_id,
        stocker_id: stk.id,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      });
    }

    return {
      ...med,
      product_code: med.code,
      is_active: true,
    };
  }

  async updateMedicine(id: string, dto: UpdateMedicineDto): Promise<Medicine> {
    const med = this.db.medicines.find((m) => m.id === id);
    if (!med) throw new NotFoundException('Medicine not found');

    if (dto.name) med.name = dto.name;
    if (dto.code) med.code = dto.code.toUpperCase();
    if (dto.unit) med.unit = dto.unit;
    if (dto.base_price !== undefined) med.base_price = dto.base_price;
    if (dto.status) med.status = dto.status;

    return med;
  }

  async deleteMedicine(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.medicines.findIndex((m) => m.id === id);
    if (index === -1) throw new NotFoundException('Medicine not found');

    this.db.medicines.splice(index, 1);
    this.db.stockerInventory = this.db.stockerInventory.filter((inv) => inv.medicine_id !== id);
    return { success: true, message: 'Medicine deleted successfully' };
  }

  // === 5. STOCKER INVENTORY & STOCK ISOLATION ===
  async getStockerInventory(stockerId: string): Promise<any[]> {
    const stocker = this.db.stockers.find((s) => s.id === stockerId);
    if (!stocker) throw new NotFoundException('Stocker not found');

    const hq = this.db.headquarters.find((h) => h.id === stocker.hq_id);

    // Ensure all active medicines have an entry for this stocker
    for (const med of this.db.medicines.filter((m) => m.status === 'ACTIVE')) {
      const exists = this.db.stockerInventory.find(
        (inv) => inv.stocker_id === stockerId && inv.medicine_id === med.id,
      );
      if (!exists) {
        this.db.stockerInventory.push({
          id: `inv-${stockerId}-${med.id}`,
          hq_id: stocker.hq_id,
          stocker_id: stockerId,
          medicine_id: med.id,
          quantity: 0,
          low_stock_threshold: 10,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const items = this.db.stockerInventory.filter((inv) => inv.stocker_id === stockerId);

    return items.map((inv) => {
      const med = this.db.medicines.find((m) => m.id === inv.medicine_id);
      let status: 'Available' | 'Low Stock' | 'Out of Stock' = 'Available';
      if (inv.quantity <= 0) {
        status = 'Out of Stock';
      } else if (inv.quantity <= inv.low_stock_threshold) {
        status = 'Low Stock';
      }

      return {
        ...inv,
        medicine_name: med?.name || 'Unknown Product',
        medicine_code: med?.code || '',
        unit: med?.unit || 'Units',
        price: med?.base_price || 0,
        status,
        stocker_name: stocker.name,
        hq_name: hq?.name || '',
      };
    });
  }

  async adjustStock(stockerId: string, dto: AdjustStockDto, userId: string): Promise<any> {
    const stocker = this.db.stockers.find((s) => s.id === stockerId);
    if (!stocker) throw new NotFoundException('Stocker not found');

    const med = this.db.medicines.find((m) => m.id === dto.medicine_id);
    if (!med) throw new NotFoundException('Medicine not found');

    let inventory = this.db.stockerInventory.find(
      (inv) => inv.stocker_id === stockerId && inv.medicine_id === dto.medicine_id,
    );

    if (!inventory) {
      inventory = {
        id: `inv-${stockerId}-${med.id}`,
        hq_id: stocker.hq_id,
        stocker_id: stockerId,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: 10,
        updated_at: new Date().toISOString(),
      };
      this.db.stockerInventory.push(inventory);
    }

    const previousStock = inventory.quantity;
    inventory.quantity += dto.quantity;
    inventory.updated_at = new Date().toISOString();

    // Create Audit Transaction record (§19)
    const tx: InventoryTransaction = {
      id: `tx-${uuidv4().substring(0, 8)}`,
      hq_id: stocker.hq_id,
      stocker_id: stockerId,
      medicine_id: med.id,
      quantity: dto.quantity,
      balance_after: inventory.quantity,
      transaction_type: dto.transaction_type,
      user_id: userId,
      reason: dto.reason || `Stock adjustment by admin (${dto.transaction_type})`,
      timestamp: new Date().toISOString(),
    };
    this.db.inventoryTransactions.push(tx);

    return {
      message: 'Stock updated successfully',
      inventory,
      transaction: tx,
      previous_quantity: previousStock,
      current_quantity: inventory.quantity,
    };
  }

  /**
   * AUTOMATIC STOCK DEDUCTION WITH OUT-OF-STOCK/BACKORDER TOLERANCE (§16 & §17)
   * Deducts items for an order within an isolated stocker and HQ scope.
   * If stock reaches 0 or negative, order is allowed and stock becomes negative (shortage representation).
   */
  async deductStockForOrder(
    hqId: string,
    stockerId: string,
    items: Array<{ product_id?: string; product_name: string; quantity: number }>,
    orderId: string,
    taskId: string,
    userId: string,
  ): Promise<any[]> {
    const stocker = this.db.stockers.find((s) => s.id === stockerId);
    if (!stocker) {
      console.warn(`[Inventory] Stocker ${stockerId} not found, proceeding with fallback`);
    }

    const results: any[] = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) continue;

      // Locate medicine either by product_id or by exact product_name
      let med = item.product_id
        ? this.db.medicines.find((m) => m.id === item.product_id)
        : null;

      if (!med) {
        med = this.db.medicines.find(
          (m) => m.name.toLowerCase() === item.product_name.toLowerCase(),
        );
      }

      if (!med) {
        // Auto-create medicine master entry if not registered
        med = {
          id: `med-${uuidv4().substring(0, 8)}`,
          name: item.product_name,
          code: item.product_name.slice(0, 4).toUpperCase(),
          unit: 'Units',
          base_price: 150,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        };
        this.db.medicines.push(med);
      }

      // Locate stocker inventory record scoped to this stocker & HQ (§13)
      let inv = this.db.stockerInventory.find(
        (i) => i.stocker_id === stockerId && i.medicine_id === med!.id,
      );

      if (!inv) {
        inv = {
          id: `inv-${stockerId}-${med.id}`,
          hq_id: hqId,
          stocker_id: stockerId,
          medicine_id: med.id,
          quantity: 0,
          low_stock_threshold: 10,
          updated_at: new Date().toISOString(),
        };
        this.db.stockerInventory.push(inv);
      }

      const prevQuantity = inv.quantity;
      // Deduct quantity (supports negative backorders per §17)
      inv.quantity -= item.quantity;
      inv.updated_at = new Date().toISOString();

      // Record Audit Transaction (§19)
      const tx: InventoryTransaction = {
        id: `tx-${uuidv4().substring(0, 8)}`,
        hq_id: hqId,
        stocker_id: stockerId,
        medicine_id: med.id,
        quantity: -item.quantity,
        balance_after: inv.quantity,
        transaction_type: 'ORDER_DEDUCTION',
        order_id: orderId,
        task_id: taskId,
        user_id: userId,
        reason: `Order deduction for Task ${taskId} (${item.quantity} units of ${med.name})`,
        timestamp: new Date().toISOString(),
      };
      this.db.inventoryTransactions.push(tx);

      // Trigger Stock Alert if stock reaches zero, becomes negative, or falls below threshold (§18)
      if (inv.quantity <= 0 || inv.quantity <= inv.low_stock_threshold) {
        const severity = inv.quantity < 0 ? 'CRITICAL SHORTAGE' : inv.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
        const msg = `${med.name} at ${stocker?.name || 'Stocker'} is ${severity} (Balance: ${inv.quantity}). Action Required: Replenish Stock.`;

        // Notify admins
        const admins = this.db.users.filter(
          (u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !u.deleted_at,
        );
        admins.forEach((admin) => {
          this.notificationsService.sendPushNotification(
            admin.id,
            `⚠️ Inventory Alert: ${severity}`,
            msg,
            { medicineId: med!.id, stockerId, quantity: inv.quantity, type: 'STOCK_ALERT' },
          );
        });
      }

      results.push({
        medicine_id: med.id,
        medicine_name: med.name,
        deducted: item.quantity,
        previous_balance: prevQuantity,
        new_balance: inv.quantity,
        is_shortage: inv.quantity < 0,
      });
    }

    return results;
  }

  // === 6. STOCK ALERTS (§18) ===
  async getStockAlerts(hqId?: string): Promise<any[]> {
    const alerts: any[] = [];

    const inventories = hqId
      ? this.db.stockerInventory.filter((i) => i.hq_id === hqId)
      : this.db.stockerInventory;

    for (const inv of inventories) {
      if (inv.quantity <= inv.low_stock_threshold) {
        const stocker = this.db.stockers.find((s) => s.id === inv.stocker_id);
        const med = this.db.medicines.find((m) => m.id === inv.medicine_id);
        const hq = this.db.headquarters.find((h) => h.id === inv.hq_id);

        alerts.push({
          id: inv.id,
          hq_id: inv.hq_id,
          hq_name: hq?.name || 'Unknown HQ',
          stocker_id: inv.stocker_id,
          stocker_name: stocker?.name || 'Unknown Stocker',
          medicine_id: inv.medicine_id,
          medicine_name: med?.name || 'Unknown Medicine',
          quantity: inv.quantity,
          threshold: inv.low_stock_threshold,
          alert_type: inv.quantity < 0 ? 'CRITICAL_SHORTAGE' : inv.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
          message:
            inv.quantity < 0
              ? `Backordered by ${Math.abs(inv.quantity)} units`
              : inv.quantity === 0
              ? 'Zero inventory remaining'
              : `Stock below threshold of ${inv.low_stock_threshold}`,
        });
      }
    }

    return alerts.sort((a, b) => a.quantity - b.quantity);
  }

  // === 7. AUDIT TRAIL (§19) ===
  async getTransactions(filter: { hq_id?: string; stocker_id?: string; medicine_id?: string }): Promise<any[]> {
    return this.db.inventoryTransactions
      .filter((tx) => (filter.hq_id ? tx.hq_id === filter.hq_id : true))
      .filter((tx) => (filter.stocker_id ? tx.stocker_id === filter.stocker_id : true))
      .filter((tx) => (filter.medicine_id ? tx.medicine_id === filter.medicine_id : true))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .map((tx) => {
        const med = this.db.medicines.find((m) => m.id === tx.medicine_id);
        const stocker = this.db.stockers.find((s) => s.id === tx.stocker_id);
        const hq = this.db.headquarters.find((h) => h.id === tx.hq_id);
        const user = this.db.users.find((u) => u.id === tx.user_id);

        return {
          ...tx,
          medicine_name: med?.name || 'Unknown Medicine',
          stocker_name: stocker?.name || 'Unknown Stocker',
          hq_name: hq?.name || 'Unknown HQ',
          user_name: user?.name || 'System / Admin',
        };
      });
  }

  // === 8. MONTHLY MEDICINE STOCK INWARD ENTRIES ===
  async getMonthlyStockEntries(filter: { hq_id?: string; stocker_id?: string; month?: string }): Promise<MonthlyStockEntry[]> {
    return this.db.monthlyStockEntries
      .filter((e) => (filter.hq_id ? e.hq_id === filter.hq_id : true))
      .filter((e) => (filter.stocker_id ? e.stocker_id === filter.stocker_id : true))
      .filter((e) => (filter.month ? e.month === filter.month : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createMonthlyStockEntry(dto: CreateMonthlyStockEntryDto, userId: string): Promise<any> {
    const stocker = this.db.stockers.find((s) => s.id === dto.stocker_id);
    if (!stocker) throw new NotFoundException('Stocker not found');

    const hq = this.db.headquarters.find((h) => h.id === dto.hq_id || h.id === stocker.hq_id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const med = this.db.medicines.find((m) => m.id === dto.medicine_id);
    if (!med) throw new NotFoundException('Medicine not found in catalog');

    const user = this.db.users.find((u) => u.id === userId);

    // 1. Update or create stocker inventory
    let inventory = this.db.stockerInventory.find(
      (inv) => inv.stocker_id === dto.stocker_id && inv.medicine_id === dto.medicine_id,
    );

    if (!inventory) {
      inventory = {
        id: `inv-${stocker.id}-${med.id}`,
        hq_id: stocker.hq_id,
        stocker_id: stocker.id,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: med.low_stock_threshold || 10,
        updated_at: new Date().toISOString(),
      };
      this.db.stockerInventory.push(inventory);
    }

    const previousStock = inventory.quantity;
    inventory.quantity += Number(dto.quantity);
    inventory.updated_at = new Date().toISOString();

    // 2. Create Audit Transaction record
    const reasonText = `[Monthly Inward ${dto.month}] Inflow: +${dto.quantity} ${med.unit}${
      dto.batch_no ? ` | Batch: ${dto.batch_no}` : ''
    }${dto.invoice_no ? ` | Inv: ${dto.invoice_no}` : ''}${dto.notes ? ` (${dto.notes})` : ''}`;

    const tx: InventoryTransaction = {
      id: `tx-${uuidv4().substring(0, 8)}`,
      hq_id: stocker.hq_id,
      stocker_id: stocker.id,
      medicine_id: med.id,
      quantity: Number(dto.quantity),
      balance_after: inventory.quantity,
      transaction_type: 'RESTOCK',
      user_id: userId,
      reason: reasonText,
      timestamp: new Date().toISOString(),
    };
    this.db.inventoryTransactions.push(tx);

    // 3. Create Monthly Stock Entry record
    const entry: MonthlyStockEntry = {
      id: `entry-${uuidv4().substring(0, 8)}`,
      hq_id: stocker.hq_id,
      hq_name: hq.name,
      stocker_id: stocker.id,
      stocker_name: stocker.name,
      month: dto.month,
      entry_date: dto.entry_date || new Date().toISOString().split('T')[0],
      invoice_no: dto.invoice_no || '',
      medicine_id: med.id,
      medicine_name: med.name,
      medicine_code: med.code,
      quantity: Number(dto.quantity),
      unit: med.unit,
      batch_no: dto.batch_no || '',
      expiry_date: dto.expiry_date || '',
      notes: dto.notes || '',
      user_id: userId,
      user_name: user?.name || 'Shivansh Tripathi (Admin)',
      created_at: new Date().toISOString(),
    };
    this.db.monthlyStockEntries.push(entry);

    return {
      message: 'Monthly medicine entry recorded successfully',
      entry,
      inventory,
      previous_quantity: previousStock,
      current_quantity: inventory.quantity,
    };
  }

  async createBatchMonthlyStockEntries(dto: BatchMonthlyStockEntryDto, userId: string): Promise<any> {
    const results = [];
    if (dto.items && Array.isArray(dto.items)) {
      for (const item of dto.items) {
        if (!item.medicine_id || !item.quantity || Number(item.quantity) <= 0) continue;
        const res = await this.createMonthlyStockEntry(
          {
            hq_id: dto.hq_id,
            stocker_id: dto.stocker_id,
            month: dto.month,
            entry_date: dto.entry_date,
            invoice_no: dto.invoice_no,
            medicine_id: item.medicine_id,
            quantity: Number(item.quantity),
            batch_no: item.batch_no,
            expiry_date: item.expiry_date,
            notes: item.notes,
          },
          userId,
        );
        results.push(res);
      }
    }
    return {
      message: `Batch recorded: ${results.length} medicine inward entries saved.`,
      entries: results.map((r) => r.entry),
    };
  }
}
