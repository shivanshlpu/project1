import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
  CreatePackagingVariantDto,
  UpdatePackagingVariantDto,
  GrantStockagePermissionDto,
  RevokeStockagePermissionDto,
  SubmitStockageRequestDto,
  ReviewStockageRequestDto,
} from './inventory.dto';
import {
  Headquarter,
  HqArea,
  Stocker,
  Medicine,
  StockerInventory,
  InventoryTransaction,
  MonthlyStockEntry,
  MonthlyStockagePermission,
  StockageSubmissionRequest,
  StockageSubmissionItem,
  MedicinePackagingVariant,
} from '../../database/database.types';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class InventoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  
  async getHeadquarters(): Promise<Headquarter[]> {
    return this.db.headquarters.filter((h) => h.status === 'ACTIVE');
  }

  async createHeadquarter(dto: CreateHqDto): Promise<Headquarter> {
    const cleanCode = (dto.code || '').trim().toUpperCase();
    const existingName = this.db.headquarters.find(
      (h) => h.name.toLowerCase() === dto.name.trim().toLowerCase(),
    );
    if (existingName) {
      throw new BadRequestException(`Headquarter "${dto.name}" already exists`);
    }

    const existingCode = this.db.headquarters.find(
      (h) => h.code.toUpperCase() === cleanCode || (h.hq_code && h.hq_code.toUpperCase() === cleanCode),
    );
    if (existingCode) {
      throw new BadRequestException(`HQ Code "${cleanCode}" is already in use by ${existingCode.name}`);
    }

    const hqId = (dto as any).hq_id?.trim() || `HQ-${cleanCode}-001`;
    const existingId = this.db.headquarters.find(
      (h) => h.id.toUpperCase() === hqId.toUpperCase() || h.hq_id.toUpperCase() === hqId.toUpperCase(),
    );
    if (existingId) {
      throw new BadRequestException(`HQ ID "${hqId}" is already in use`);
    }

    const hq: Headquarter = {
      id: hqId,
      hq_id: hqId,
      name: dto.name.trim(),
      code: cleanCode,
      hq_code: cleanCode,
      state: dto.state || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.headquarters.push(hq);
    this.db.persistToDisk();
    this.db.syncHeadquarterToSupabase(hq).catch(() => null);
    return hq;
  }

  async updateHeadquarter(id: string, dto: UpdateHqDto): Promise<Headquarter> {
    const hq = this.db.findHeadquarter(id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    if (dto.name) {
      const cleanName = dto.name.trim();
      const existing = this.db.headquarters.find(
        (h) => h.id !== hq.id && h.name.toLowerCase() === cleanName.toLowerCase(),
      );
      if (existing) {
        throw new BadRequestException(`Headquarter "${cleanName}" already exists`);
      }
      hq.name = cleanName;
    }
    if (dto.code) {
      const cleanCode = dto.code.trim().toUpperCase();
      const existing = this.db.headquarters.find(
        (h) =>
          h.id !== hq.id &&
          (h.code.toUpperCase() === cleanCode || (h.hq_code && h.hq_code.toUpperCase() === cleanCode)),
      );
      if (existing) {
        throw new BadRequestException(`HQ Code "${cleanCode}" is already in use by ${existing.name}`);
      }
      hq.code = cleanCode;
      hq.hq_code = cleanCode;
    }
    if ((dto as any).hq_id) {
      const cleanHqId = (dto as any).hq_id.trim();
      const existing = this.db.headquarters.find(
        (h) =>
          h.id !== hq.id &&
          (h.id.toUpperCase() === cleanHqId.toUpperCase() || h.hq_id.toUpperCase() === cleanHqId.toUpperCase()),
      );
      if (existing) {
        throw new BadRequestException(`HQ ID "${cleanHqId}" is already in use`);
      }
      hq.hq_id = cleanHqId;
    }
    if (dto.state !== undefined) hq.state = dto.state.trim();
    if (dto.status) hq.status = dto.status;

    this.db.persistToDisk();
    this.db.syncHeadquarterToSupabase(hq).catch(() => null);
    return hq;
  }

  async deleteHeadquarter(id: string): Promise<{ success: boolean; message: string }> {
    const hq = this.db.findHeadquarter(id);
    if (!hq) throw new NotFoundException('Headquarter not found');

    const index = this.db.headquarters.findIndex((h) => h.id === hq.id);
    this.db.headquarters.splice(index, 1);
    this.db.stockers = this.db.stockers.filter((s) => s.hq_id !== hq.id && s.hq_id !== hq.hq_id);
    this.db.hqAreas = this.db.hqAreas.filter((a) => a.hq_id !== hq.id && a.hq_id !== hq.hq_id);
    this.db.stockerInventory = this.db.stockerInventory.filter((inv) => inv.hq_id !== hq.id && inv.hq_id !== hq.hq_id);
    this.db.persistToDisk();
    this.db.deleteHeadquarterFromSupabase(hq.id, hq.legacy_id).catch(() => null);
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
    this.db.persistToDisk();
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
    this.db.persistToDisk();
    return area;
  }

  async deleteHqArea(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.hqAreas.findIndex((a) => a.id === id);
    if (index === -1) throw new NotFoundException('Area not found');
    this.db.hqAreas.splice(index, 1);
    this.db.persistToDisk();
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
    this.db.persistToDisk();
    return this.db.hqAreas.filter((a) => a.hq_id === dto.hq_id && a.status === 'ACTIVE');
  }

  // === 3. STOCKERS ===
  async getStockers(hqId?: string, subArea?: string): Promise<any[]> {
    let list = this.db.stockers;
    if (hqId && hqId !== 'ALL') {
      const hq = this.db.findHeadquarter(hqId);
      const targetId = hq?.id || hqId;
      const legacyId = hq?.legacy_id;
      list = list.filter((s) => s.hq_id === targetId || s.hq_id === hqId || (legacyId && s.hq_id === legacyId));
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
    const newInvs: StockerInventory[] = [];
    for (const med of this.db.medicines.filter((m) => m.status === 'ACTIVE')) {
      const inv: StockerInventory = {
        id: `inv-${stocker.id}-${med.id}`,
        hq_id: dto.hq_id,
        stocker_id: stocker.id,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: 15,
        updated_at: new Date().toISOString(),
      };
      this.db.stockerInventory.push(inv);
      newInvs.push(inv);
    }

    this.db.persistToDisk();
    this.db.syncStockerToSupabase(stocker).catch(() => null);
    if (newInvs.length > 0) {
      this.db.syncBatchStockerInventoryToSupabase(newInvs).catch(() => null);
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

    this.db.persistToDisk();
    this.db.syncStockerToSupabase(stocker).catch(() => null);
    return stocker;
  }

  async deleteStocker(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.stockers.findIndex((s) => s.id === id);
    if (index === -1) throw new NotFoundException('Stocker not found');

    this.db.stockers.splice(index, 1);
    this.db.stockerInventory = this.db.stockerInventory.filter((inv) => inv.stocker_id !== id);
    this.db.persistToDisk();
    this.db.deleteStockerFromSupabase(id).catch(() => null);
    return { success: true, message: 'Stocker deleted successfully' };
  }

  // === 4. MEDICINES MASTER & PACKAGING VARIANTS ===
  /**
   * Helper to resolve HQ object and its assigned stockers
   */
  public resolveHqAndStockers(hqIdentifier?: string): { hq?: Headquarter; stockers: Stocker[]; stockerIds: Set<string> } {
    if (!hqIdentifier || hqIdentifier === 'ALL') {
      const allStockers = this.db.stockers.filter((s) => s.status !== 'INACTIVE');
      return {
        stockers: allStockers,
        stockerIds: new Set(allStockers.map((s) => s.id)),
      };
    }

    const hq = this.db.findHeadquarter(hqIdentifier);
    const cleanId = hqIdentifier.trim().toLowerCase();

    const stockers = this.db.stockers.filter((s) => {
      if (s.status === 'INACTIVE') return false;
      if (hq && (s.hq_id === hq.id || s.hq_id === hq.hq_id || (hq.code && s.hq_id === hq.code))) {
        return true;
      }
      const sHqClean = (s.hq_id || '').toLowerCase();
      if (sHqClean === cleanId) return true;
      if (cleanId.includes('shd') || cleanId.includes('shahdol')) return sHqClean.includes('shd') || sHqClean.includes('shahdol');
      if (cleanId.includes('amb') || cleanId.includes('ambikapur')) return sHqClean.includes('amb');
      if (cleanId.includes('bsp') || cleanId.includes('bilaspur')) return sHqClean.includes('bsp');
      if (cleanId.includes('ktm') || cleanId.includes('kotma')) return sHqClean.includes('ktm') || sHqClean.includes('kot');
      return false;
    });

    return {
      hq,
      stockers,
      stockerIds: new Set(stockers.map((s) => s.id)),
    };
  }

  /**
   * Get live stock status for all medicines at a specific HQ
   */
  async getHqStockOverview(hqIdentifier?: string): Promise<{
    hq_id: string;
    hq_name: string;
    stocker_count: number;
    medicines: Array<{
      medicine_id: string;
      medicine_name: string;
      medicine_code: string;
      unit: string;
      packing: string;
      pts_rate: number;
      available_stock: number;
      low_stock_threshold: number;
      stock_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
      is_out_of_stock: boolean;
      is_low_stock: boolean;
    }>;
  }> {
    const { hq, stockers, stockerIds } = this.resolveHqAndStockers(hqIdentifier);
    const hqId = hq?.id || hqIdentifier || 'HQ-ALL';
    const hqName = hq?.name || 'All Headquarters';

    const isAll = !hqIdentifier || hqIdentifier === 'ALL';
    const activeMeds = this.db.medicines.filter((m) => m.status === 'ACTIVE');
    const medicineStockList = activeMeds.map((med) => {
      const relevantInv = this.db.stockerInventory.filter(
        (inv) => inv.medicine_id === med.id && (isAll ? true : stockerIds.has(inv.stocker_id)),
      );

      const totalStock = relevantInv.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
      const threshold = med.low_stock_threshold || 10;
      const isOutOfStock = totalStock <= 0;
      const isLowStock = totalStock > 0 && totalStock <= threshold;
      const stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = isOutOfStock
        ? 'OUT_OF_STOCK'
        : isLowStock
        ? 'LOW_STOCK'
        : 'IN_STOCK';

      return {
        medicine_id: med.id,
        medicine_name: med.name,
        medicine_code: med.code,
        unit: med.unit || med.packing || 'Units',
        packing: med.packing || med.unit || 'Units',
        pts_rate: med.pts ?? med.pts_rate ?? med.base_price ?? 0,
        available_stock: totalStock,
        low_stock_threshold: threshold,
        stock_status: stockStatus,
        is_out_of_stock: isOutOfStock,
        is_low_stock: isLowStock,
      };
    });

    return {
      hq_id: hqId,
      hq_name: hqName,
      stocker_count: stockers.length,
      medicines: medicineStockList,
    };
  }

  /**
   * Check stock availability for an order at a specific HQ
   * Returns warning flags and item details so MR and Admin can be alerted
   */
  async checkOrderStock(
    hqIdentifier: string,
    items: Array<{ product_id?: string; product_name: string; quantity: number }>,
  ): Promise<{
    has_warning: boolean;
    warning_type: 'OUT_OF_STOCK' | 'LOW_STOCK' | null;
    warning_summary: string;
    hq_id: string;
    hq_name: string;
    items: Array<{
      product_name: string;
      product_id?: string;
      requested_quantity: number;
      available_stock: number;
      stock_status: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'LOW_STOCK' | 'IN_STOCK';
      is_out_of_stock: boolean;
      is_insufficient: boolean;
      is_low_stock: boolean;
      message: string;
    }>;
  }> {
    const { hq, stockers, stockerIds } = this.resolveHqAndStockers(hqIdentifier);
    const hqName = hq?.name || hqIdentifier || 'Assigned HQ';

    let hasOutOfStock = false;
    let hasLowStock = false;
    const warningItems: string[] = [];

    const detailedItems = items.map((item) => {
      const cleanName = (item.product_name || '').toLowerCase().trim();
      const med = this.db.medicines.find(
        (m) =>
          (item.product_id && m.id === item.product_id) ||
          m.name.toLowerCase().trim() === cleanName ||
          cleanName.startsWith(m.name.toLowerCase().trim()) ||
          m.name.toLowerCase().trim().startsWith(cleanName),
      );

      const requestedQty = Math.max(1, parseInt(String(item.quantity), 10) || 1);
      let availableStock = 0;
      let threshold = med?.low_stock_threshold || 10;

      if (med) {
        const invList = this.db.stockerInventory.filter(
          (inv) => inv.medicine_id === med.id && (stockerIds.size === 0 || stockerIds.has(inv.stocker_id)),
        );
        availableStock = invList.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
      }

      const isZeroStock = availableStock <= 0;
      const isInsufficient = !isZeroStock && availableStock < requestedQty;
      const isLowStock = !isZeroStock && !isInsufficient && (availableStock <= threshold || (availableStock - requestedQty) <= threshold);

      let status: 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'LOW_STOCK' | 'IN_STOCK' = 'IN_STOCK';
      let msg = `${item.product_name}: In Stock (${availableStock} available at ${hqName})`;

      if (isZeroStock) {
        status = 'OUT_OF_STOCK';
        hasOutOfStock = true;
        msg = `${item.product_name}: OUT OF STOCK (0 in ${hqName} stock, ${requestedQty} ordered)`;
        warningItems.push(`${item.product_name} (0 in stock, ${requestedQty} ordered)`);
      } else if (isInsufficient) {
        status = 'INSUFFICIENT_STOCK';
        hasOutOfStock = true;
        msg = `${item.product_name}: Insufficient Stock (${availableStock} in ${hqName} stock, ${requestedQty} ordered)`;
        warningItems.push(`${item.product_name} (${availableStock} available, ${requestedQty} ordered)`);
      } else if (isLowStock) {
        status = 'LOW_STOCK';
        hasLowStock = true;
        msg = `${item.product_name}: Low Stock (${availableStock} in ${hqName} stock, leaves ${availableStock - requestedQty})`;
        warningItems.push(`${item.product_name} (Low stock: ${availableStock} left)`);
      }

      return {
        product_name: item.product_name,
        product_id: med?.id || item.product_id,
        requested_quantity: requestedQty,
        available_stock: availableStock,
        stock_status: status,
        is_out_of_stock: isZeroStock || isInsufficient,
        is_insufficient: isInsufficient,
        is_low_stock: isLowStock,
        message: msg,
      };
    });

    const hasWarning = hasOutOfStock || hasLowStock;
    const warningType = hasOutOfStock ? 'OUT_OF_STOCK' : hasLowStock ? 'LOW_STOCK' : null;
    const warningSummary = warningItems.join(', ');

    return {
      has_warning: hasWarning,
      warning_type: warningType,
      warning_summary: warningSummary,
      hq_id: hq?.id || hqIdentifier,
      hq_name: hqName,
      items: detailedItems,
    };
  }

  async getMedicines(includeInactive = false, hqId?: string): Promise<any[]> {
    let list = includeInactive ? this.db.medicines : this.db.medicines.filter((m) => m.status === 'ACTIVE');

    const { stockerIds, hq } = this.resolveHqAndStockers(hqId);

    return list.map((m) => {
      const variants = (m.packaging_variants && m.packaging_variants.length > 0)
        ? m.packaging_variants
        : this.db.medicinePackagingVariants.filter((v) => v.medicine_id === m.id);

      const pts = m.pts ?? m.pts_rate ?? m.base_price ?? 0;
      const ptr = m.ptr ?? m.ptr_rate ?? 0;
      const mrp = m.mrp ?? 0;
      const packing = m.packing || m.unit;

      const isAll = !hqId || hqId === 'ALL';
      const invList = this.db.stockerInventory.filter(
        (inv) => inv.medicine_id === m.id && (isAll ? true : stockerIds.has(inv.stocker_id)),
      );
      const availableStock = invList.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
      const threshold = m.low_stock_threshold || 10;
      const isOutOfStock = availableStock <= 0;
      const isLowStock = availableStock > 0 && availableStock <= threshold;
      const stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = isOutOfStock
        ? 'OUT_OF_STOCK'
        : isLowStock
        ? 'LOW_STOCK'
        : 'IN_STOCK';

      return {
        ...m,
        product_code: m.code,
        unit: m.unit || packing,
        packing: packing,
        pts: pts,
        pts_rate: pts,
        base_price: pts,
        ptr: ptr,
        ptr_rate: ptr,
        mrp: mrp,
        packaging_variants: variants,
        is_active: m.status === 'ACTIVE',
        low_stock_threshold: m.low_stock_threshold || 10,
        hq_id: hq?.id || hqId,
        hq_name: hq?.name,
        available_stock: availableStock,
        stock_status: stockStatus,
        is_out_of_stock: isOutOfStock,
        is_low_stock: isLowStock,
      };
    });
  }

  async createMedicine(dto: CreateMedicineDto): Promise<any> {
    const rawCode = dto.code || dto.product_code || `MED-${Math.random().toString(36).substring(2, 6)}`;
    const code = rawCode.toUpperCase();
    const threshold = Number(dto.low_stock_threshold) || 10;
    const packing = dto.packing || dto.unit || 'Units';

    const basePrice =
      dto.base_price !== undefined && dto.base_price !== null && (dto.base_price as any) !== ''
        ? Number(dto.base_price)
        : null;

    const medId = `med-${uuidv4().substring(0, 8)}`;
    const ptsRate = dto.pts !== undefined ? Number(dto.pts) : (dto.pts_rate !== undefined ? Number(dto.pts_rate) : (basePrice || 0));
    const ptrRate = dto.ptr !== undefined ? Number(dto.ptr) : (dto.ptr_rate !== undefined ? Number(dto.ptr_rate) : 0);
    const mrp = dto.mrp !== undefined ? Number(dto.mrp) : ptsRate ? Number((ptsRate * 1.45).toFixed(2)) : 0;

    const variants: MedicinePackagingVariant[] = [];
    if (dto.packaging_variants && Array.isArray(dto.packaging_variants)) {
      for (const v of dto.packaging_variants) {
        variants.push({
          id: `var-${medId}-${uuidv4().substring(0, 6)}`,
          medicine_id: medId,
          variant_name: v.variant_name || `${v.package_size} ${v.package_unit}`,
          package_size: Number(v.package_size) || 1,
          package_unit: v.package_unit || 'units',
          display_label: v.display_label || `${v.package_size} ${v.package_unit}`,
          packing: v.packing || v.display_label || `${v.package_size} ${v.package_unit}`,
          pts_rate: Number(v.pts_rate) || ptsRate,
          ptr_rate: v.ptr_rate !== undefined ? Number(v.ptr_rate) : ptrRate,
          mrp: Number(v.mrp) || mrp,
          status: v.status || 'ACTIVE',
          created_at: new Date().toISOString(),
        });
      }
    } else {
      // Default single variant matching unit/packing
      variants.push({
        id: `var-${medId}-default`,
        medicine_id: medId,
        variant_name: packing || 'Standard Pack',
        package_size: 1,
        package_unit: packing || 'units',
        display_label: packing || 'Units',
        packing: packing,
        pts_rate: ptsRate,
        ptr_rate: ptrRate,
        mrp: mrp,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });
    }

    const med: Medicine = {
      id: medId,
      name: dto.name.trim(),
      code,
      category: dto.category || 'General',
      unit: dto.unit || packing,
      packing: packing,
      base_price: ptsRate,
      pts: ptsRate,
      pts_rate: ptsRate,
      ptr: ptrRate,
      ptr_rate: ptrRate,
      mrp: mrp,
      packaging_variants: variants,
      low_stock_threshold: threshold,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    this.db.medicines.push(med);
    this.db.medicinePackagingVariants.push(...variants);

    // Initialize stock records across all existing active stockers
    const newInvs: StockerInventory[] = [];
    for (const stk of this.db.stockers) {
      const inv: StockerInventory = {
        id: `inv-${stk.id}-${med.id}`,
        hq_id: stk.hq_id,
        stocker_id: stk.id,
        medicine_id: med.id,
        quantity: 0,
        low_stock_threshold: threshold,
        updated_at: new Date().toISOString(),
      };
      this.db.stockerInventory.push(inv);
      newInvs.push(inv);
    }

    this.db.persistToDisk();
    this.db.syncMedicineToSupabase(med).catch(() => null);
    for (const v of variants) {
      this.db.syncPackagingVariantToSupabase(v).catch(() => null);
    }
    if (newInvs.length > 0) {
      this.db.syncBatchStockerInventoryToSupabase(newInvs).catch(() => null);
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

    if (dto.code) {
      const codeUpper = dto.code.trim().toUpperCase();
      const existingWithCode = this.db.medicines.find(
        (m) => m.id !== id && (m.code?.toUpperCase() === codeUpper || m.product_code?.toUpperCase() === codeUpper)
      );
      if (existingWithCode) {
        throw new BadRequestException(
          `Medicine SKU / Code "${codeUpper}" already exists for "${existingWithCode.name}"`
        );
      }
      med.code = codeUpper;
      med.product_code = codeUpper;
      med.sku = codeUpper;
    }

    if (dto.name) med.name = dto.name.trim();
    if (dto.unit) med.unit = dto.unit;
    if (dto.packing) {
      med.packing = dto.packing;
      if (!dto.unit) med.unit = dto.packing;
    }
    if (dto.category) med.category = dto.category;
    if (dto.pts !== undefined || dto.pts_rate !== undefined) {
      const p = dto.pts !== undefined ? Number(dto.pts) : Number(dto.pts_rate);
      med.pts = p;
      med.pts_rate = p;
      med.base_price = p;
    } else if (dto.base_price !== undefined) {
      med.base_price =
        dto.base_price !== null && (dto.base_price as any) !== '' ? Number(dto.base_price) : null;
      med.pts = med.base_price || 0;
      med.pts_rate = med.pts;
    }
    if (dto.ptr !== undefined || dto.ptr_rate !== undefined) {
      const p = dto.ptr !== undefined ? Number(dto.ptr) : Number(dto.ptr_rate);
      med.ptr = p;
      med.ptr_rate = p;
    }
    if (dto.mrp !== undefined) med.mrp = Number(dto.mrp);
    if (dto.low_stock_threshold !== undefined) med.low_stock_threshold = Number(dto.low_stock_threshold);
    if (dto.status) {
      med.status = dto.status;
      med.is_active = dto.status !== 'INACTIVE';
    }
    if (dto.packaging_variants && Array.isArray(dto.packaging_variants)) {
      med.packaging_variants = dto.packaging_variants;
      this.db.medicinePackagingVariants = this.db.medicinePackagingVariants.filter((v) => v.medicine_id !== id);
      this.db.medicinePackagingVariants.push(...dto.packaging_variants);
      for (const v of dto.packaging_variants) {
        this.db.syncPackagingVariantToSupabase(v).catch(() => null);
      }
    }
    med.updated_at = new Date().toISOString();

    this.db.persistToDisk();
    await this.db.syncMedicineToSupabase(med).catch((err) => {
      console.warn('[InventoryService] Supabase medicine sync warning:', err.message);
    });

    return {
      ...med,
      product_code: med.code,
      is_active: med.status !== 'INACTIVE',
    };
  }

  async deleteMedicine(id: string): Promise<{ success: boolean; message: string }> {
    const index = this.db.medicines.findIndex((m) => m.id === id);
    if (index === -1) throw new NotFoundException('Medicine not found');

    const [deletedMed] = this.db.medicines.splice(index, 1);
    this.db.stockerInventory = this.db.stockerInventory.filter((inv) => inv.medicine_id !== id);
    this.db.medicinePackagingVariants = this.db.medicinePackagingVariants.filter((v) => v.medicine_id !== id);
    this.db.persistToDisk();
    await this.db.deleteMedicineFromSupabase(id).catch((err) => {
      console.warn('[InventoryService] Supabase medicine deletion warning:', err.message);
    });
    return { success: true, message: `Medicine "${deletedMed?.name || id}" deleted successfully` };
  }

  async getPackagingVariants(medicineId?: string): Promise<MedicinePackagingVariant[]> {
    if (medicineId) {
      return this.db.medicinePackagingVariants.filter((v) => v.medicine_id === medicineId);
    }
    return this.db.medicinePackagingVariants;
  }

  async createPackagingVariant(dto: CreatePackagingVariantDto): Promise<MedicinePackagingVariant> {
    const med = this.db.medicines.find((m) => m.id === dto.medicine_id);
    if (!med) throw new NotFoundException('Medicine not found');

    const pkgSize = Number(dto.package_size || dto.size || 1);
    const pkgUnit = (dto.package_unit || dto.unit || 'units').trim();
    const dispLabel = dto.display_label || dto.display_name || `${pkgSize} ${pkgUnit}`;

    const variant: MedicinePackagingVariant = {
      id: `var-${dto.medicine_id}-${uuidv4().substring(0, 6)}`,
      medicine_id: dto.medicine_id,
      variant_name: dto.variant_name || dispLabel,
      package_size: pkgSize,
      package_unit: pkgUnit,
      size: pkgSize,
      unit: pkgUnit,
      display_label: dispLabel,
      display_name: dispLabel,
      packing: dto.packing || dispLabel,
      pts_rate: Number(dto.pts_rate),
      ptr_rate: dto.ptr_rate !== undefined ? Number(dto.ptr_rate) : undefined,
      mrp: Number(dto.mrp),
      status: 'ACTIVE',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (!med.packaging_variants) med.packaging_variants = [];
    med.packaging_variants.push(variant);
    this.db.medicinePackagingVariants.push(variant);
    this.db.persistToDisk();
    this.db.syncPackagingVariantToSupabase(variant).catch(() => null);
    return variant;
  }

  async updatePackagingVariant(id: string, dto: UpdatePackagingVariantDto): Promise<MedicinePackagingVariant> {
    const variant = this.db.medicinePackagingVariants.find((v) => v.id === id);
    if (!variant) throw new NotFoundException('Packaging variant not found');

    if (dto.package_size !== undefined) variant.package_size = Number(dto.package_size);
    if (dto.package_unit !== undefined) variant.package_unit = dto.package_unit.trim();
    if (dto.variant_name !== undefined) variant.variant_name = dto.variant_name;
    if (dto.display_label !== undefined) variant.display_label = dto.display_label;
    if (dto.packing !== undefined) variant.packing = dto.packing;
    if (dto.pts_rate !== undefined) variant.pts_rate = Number(dto.pts_rate);
    if (dto.ptr_rate !== undefined) variant.ptr_rate = Number(dto.ptr_rate);
    if (dto.mrp !== undefined) variant.mrp = Number(dto.mrp);
    if (dto.status !== undefined) variant.status = dto.status;
    if (dto.is_active !== undefined) variant.is_active = dto.is_active;
    variant.updated_at = new Date().toISOString();

    const med = this.db.medicines.find((m) => m.id === variant.medicine_id);
    if (med && med.packaging_variants) {
      const idx = med.packaging_variants.findIndex((v) => v.id === id);
      if (idx >= 0) med.packaging_variants[idx] = variant;
    }

    this.db.persistToDisk();
    this.db.syncPackagingVariantToSupabase(variant).catch(() => null);
    return variant;
  }

  async deletePackagingVariant(id: string): Promise<{ success: boolean; message: string }> {
    const idx = this.db.medicinePackagingVariants.findIndex((v) => v.id === id);
    if (idx === -1) throw new NotFoundException('Packaging variant not found');
    const variant = this.db.medicinePackagingVariants[idx];
    this.db.medicinePackagingVariants.splice(idx, 1);

    const med = this.db.medicines.find((m) => m.id === variant.medicine_id);
    if (med && med.packaging_variants) {
      med.packaging_variants = med.packaging_variants.filter((v) => v.id !== id);
    }
    this.db.persistToDisk();
    this.db.deletePackagingVariantFromSupabase(id).catch(() => null);
    return { success: true, message: 'Packaging variant deleted successfully' };
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
    let delta = 0;
    if (dto.mode === 'SET' || dto.new_quantity !== undefined) {
      const targetStock = dto.new_quantity !== undefined ? dto.new_quantity : dto.quantity;
      delta = targetStock - previousStock;
      inventory.quantity = targetStock;
    } else {
      inventory.quantity += dto.quantity;
      delta = dto.quantity;
    }
    inventory.updated_at = new Date().toISOString();

    // Create Audit Transaction record (§19)
    const tx: InventoryTransaction = {
      id: `tx-${uuidv4().substring(0, 8)}`,
      hq_id: stocker.hq_id,
      stocker_id: stockerId,
      medicine_id: med.id,
      quantity: delta,
      balance_after: inventory.quantity,
      transaction_type: dto.transaction_type,
      user_id: userId,
      reason: dto.reason || `Stock adjustment (${dto.transaction_type})`,
      timestamp: new Date().toISOString(),
    };
    this.db.inventoryTransactions.push(tx);
    this.db.persistToDisk();
    await this.db.syncStockerInventoryToSupabase(inventory).catch((err) => {
      console.warn('[InventoryService] Supabase stocker inventory sync warning:', err.message);
    });

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
      this.db.persistToDisk();
      this.db.syncStockerInventoryToSupabase(inv).catch(() => null);

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

  /**
   * REVERT/RESTORE STOCK DEDUCTION
   * Restores items back into inventory if an order delivery is reverted or cancelled.
   */
  async restoreStockForOrder(
    hqId: string,
    stockerId: string,
    items: Array<{ product_id?: string; product_name: string; quantity: number }>,
    orderId: string,
    taskId: string,
    userId: string,
  ): Promise<any[]> {
    const results: any[] = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) continue;

      let med = item.product_id
        ? this.db.medicines.find((m) => m.id === item.product_id)
        : null;

      if (!med) {
        med = this.db.medicines.find(
          (m) => m.name.toLowerCase() === item.product_name.toLowerCase(),
        );
      }

      if (!med) continue;

      let inv = this.db.stockerInventory.find(
        (i) => i.stocker_id === stockerId && i.medicine_id === med!.id,
      );

      if (!inv) continue;

      const prevQuantity = inv.quantity;
      inv.quantity += item.quantity;
      inv.updated_at = new Date().toISOString();

      const tx: InventoryTransaction = {
        id: `tx-${uuidv4().substring(0, 8)}`,
        hq_id: hqId,
        stocker_id: stockerId,
        medicine_id: med.id,
        quantity: item.quantity,
        balance_after: inv.quantity,
        transaction_type: 'ORDER_RESTORE',
        order_id: orderId,
        task_id: taskId,
        user_id: userId,
        reason: `Reverted delivery deduction for Order ${orderId} (${item.quantity} units of ${med.name})`,
        timestamp: new Date().toISOString(),
      };
      this.db.inventoryTransactions.push(tx);
      this.db.persistToDisk();
      this.db.syncStockerInventoryToSupabase(inv).catch(() => null);

      results.push({
        medicine_id: med.id,
        medicine_name: med.name,
        restored: item.quantity,
        previous_balance: prevQuantity,
        new_balance: inv.quantity,
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
      user_name: user?.name || 'System Admin',
      created_at: new Date().toISOString(),
    };
    this.db.monthlyStockEntries.push(entry);
    this.db.persistToDisk();
    this.db.syncStockerInventoryToSupabase(inventory).catch(() => null);

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

  // === 9. MONTHLY MR UPLOAD PERMISSIONS (§1) ===
  async grantStockagePermissions(
    dto: GrantStockagePermissionDto,
    adminUser: any,
  ): Promise<{ message: string; granted: MonthlyStockagePermission[] }> {
    if (!dto.mr_ids || !Array.isArray(dto.mr_ids) || dto.mr_ids.length === 0) {
      throw new BadRequestException('At least one MR must be selected');
    }
    if (!dto.month && dto.month_year) {
      const parts = dto.month_year.split('-');
      if (parts.length === 2) {
        dto.year = dto.year || parseInt(parts[0], 10);
        dto.month = parseInt(parts[1], 10);
      }
    }
    if (!dto.month || dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    const currentYear = new Date().getFullYear();
    const targetYear = dto.year || currentYear;
    const monthStr = `${targetYear}-${String(dto.month).padStart(2, '0')}`;

    const grantedList: MonthlyStockagePermission[] = [];

    for (const mrId of dto.mr_ids) {
      const mr = this.db.users.find((u) => u.id === mrId);
      if (!mr) continue;

      // Check if MR already has an active AVAILABLE permission for this month
      const existing = this.db.monthlyStockagePermissions.find(
        (p) => p.mr_id === mrId && p.month_str === monthStr && p.status === 'AVAILABLE',
      );
      if (existing) {
        grantedList.push(existing);
        continue;
      }

      const permId = `perm-${targetYear}${String(dto.month).padStart(2, '0')}-${mr.id}-${uuidv4().substring(0, 4)}`;
      const hq = dto.hq_id ? this.db.findHeadquarter(dto.hq_id) : (mr.hq_id ? this.db.findHeadquarter(mr.hq_id) : null);
      const stocker = dto.stocker_id ? this.db.stockers.find((s) => s.id === dto.stocker_id) : null;

      const perm: MonthlyStockagePermission = {
        id: permId,
        mr_id: mr.id,
        mr_name: mr.name,
        mr_email: mr.email,
        mr_phone: mr.phone,
        hq_id: hq?.id || mr.hq_id || 'hq-shahdol',
        hq_name: hq?.name || 'Shahdol',
        stocker_id: stocker?.id || 'stk-shd-01',
        stocker_name: stocker?.name || 'Central Pharma Stockist',
        year: targetYear,
        month: dto.month,
        month_str: monthStr,
        status: 'AVAILABLE',
        granted_by_id: adminUser.id,
        granted_by_name: adminUser.name || 'System Admin',
        granted_at: new Date().toISOString(),
        notes: dto.notes || `Stockage upload authorization for ${monthStr}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.db.monthlyStockagePermissions.unshift(perm);
      this.db.syncStockagePermissionToSupabase(perm).catch(() => null);
      grantedList.push(perm);

      // Audit log & Notify MR
      this.notificationsService.sendPushNotification(
        mr.id,
        '📦 Stockage Upload Permission Granted',
        `Admin granted permission for monthly Stockage upload for ${monthStr}. You may now submit your monthly stock.`,
        { permissionId: perm.id, month: monthStr, type: 'STOCKAGE_PERMISSION_GRANTED' },
      );
    }

    this.db.persistToDisk();

    return {
      message: `Stockage upload permission granted to ${grantedList.length} MR(s) for ${monthStr}`,
      granted: grantedList,
    };
  }

  async getStockagePermissions(query?: {
    month?: string;
    year?: number;
    mr_id?: string;
    status?: string;
  }): Promise<MonthlyStockagePermission[]> {
    let list = [...this.db.monthlyStockagePermissions];

    if (query?.month) {
      list = list.filter((p) => p.month_str === query.month || String(p.month) === query.month);
    }
    if (query?.year) {
      list = list.filter((p) => p.year === Number(query.year));
    }
    if (query?.mr_id && query.mr_id !== 'ALL') {
      list = list.filter((p) => p.mr_id === query.mr_id);
    }
    if (query?.status && query.status !== 'ALL') {
      list = list.filter((p) => p.status === query.status);
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async revokeStockagePermission(
    permId: string,
    adminUser: any,
    reason?: string,
  ): Promise<MonthlyStockagePermission> {
    const perm = this.db.monthlyStockagePermissions.find((p) => p.id === permId);
    if (!perm) throw new NotFoundException('Permission not found');

    if (perm.status === 'CONSUMED') {
      throw new BadRequestException('Cannot revoke an already consumed permission');
    }

    perm.status = 'REVOKED';
    perm.revoked_by_id = adminUser.id;
    perm.revoked_by_name = adminUser.name || 'System Admin';
    perm.revoked_at = new Date().toISOString();
    perm.revoke_reason = reason || 'Revoked by Admin';
    perm.updated_at = new Date().toISOString();

    this.db.persistToDisk();
    this.db.syncStockagePermissionToSupabase(perm).catch(() => null);

    return perm;
  }

  async getMrActiveStockagePermission(
    mrId: string,
    monthStr?: string,
  ): Promise<{ has_permission: boolean; permission: MonthlyStockagePermission | null }> {
    const targetMonth = monthStr || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const perm = this.db.monthlyStockagePermissions.find(
      (p) => p.mr_id === mrId && p.month_str === targetMonth && (p.status === 'AVAILABLE' || p.status === 'RESERVED'),
    );

    return {
      has_permission: !!perm && perm.status === 'AVAILABLE',
      permission: perm || null,
    };
  }

  // === 10. MR BULK STOCKAGE SUBMISSION & ADDITIVE APPROVAL WORKFLOW (§2 & §3) ===
  async submitStockageRequest(
    dto: SubmitStockageRequestDto,
    mrUser: any,
  ): Promise<{ message: string; request: StockageSubmissionRequest }> {
    const perm = this.db.monthlyStockagePermissions.find((p) => p.id === dto.permission_id);
    if (!perm) {
      throw new NotFoundException('Stockage upload permission not found');
    }

    // Security check: MR cannot submit with another MR's permission
    if (perm.mr_id !== mrUser.id) {
      throw new ForbiddenException('You cannot use a permission granted to another representative');
    }

    // One permission = one submission state enforcement
    if (perm.status === 'RESERVED') {
      throw new BadRequestException('A submission is already pending review for this permission');
    }
    if (perm.status === 'CONSUMED') {
      throw new BadRequestException('This upload permission has already been consumed by a prior approved submission');
    }
    if (perm.status === 'REVOKED') {
      throw new BadRequestException('This upload permission has been revoked by the administrator');
    }
    if (perm.status !== 'AVAILABLE') {
      throw new BadRequestException(`Permission is not available for new submissions (status: ${perm.status})`);
    }

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one medicine row must be included in the submission');
    }

    // Check for duplicate medicine & variant rows within the draft
    const seenItems = new Set<string>();
    const validatedItems: StockageSubmissionItem[] = [];

    for (const item of dto.items) {
      const med = this.db.medicines.find((m) => m.id === item.medicine_id);
      if (!med || med.status !== 'ACTIVE') {
        throw new BadRequestException(`Medicine ID "${item.medicine_id}" is not active or found in catalog`);
      }

      const variantKey = `${item.medicine_id}__${item.variant_id || 'default'}`;
      if (seenItems.has(variantKey)) {
        throw new BadRequestException(`Duplicate entry for medicine "${med.name}" in submission draft. Please combine quantities into one row.`);
      }
      seenItems.add(variantKey);

      const rawQty = item.quantity !== undefined ? item.quantity : (item as any).submitted_quantity;
      const qty = Number(rawQty);
      if (!qty || qty <= 0 || !Number.isFinite(qty)) {
        throw new BadRequestException(`Quantity for "${med.name}" must be a positive number`);
      }

      // Lookup variant if present
      let variant: MedicinePackagingVariant | undefined;
      if (item.variant_id) {
        variant = this.db.medicinePackagingVariants.find(
          (v) => v.id === item.variant_id && v.medicine_id === med.id && v.status === 'ACTIVE',
        );
      }
      if (!variant && med.packaging_variants && med.packaging_variants.length > 0) {
        variant = med.packaging_variants[0];
      }

      const packagingDisplay = variant?.display_label || variant?.variant_name || med.unit || 'Units';
      const ptsRate = variant?.pts_rate || med.pts_rate || med.base_price || 0;
      const mrp = variant?.mrp || med.mrp || 0;

      validatedItems.push({
        id: `item-${uuidv4().substring(0, 8)}`,
        medicine_id: med.id,
        medicine_name: med.name,
        medicine_code: med.code,
        variant_id: variant?.id,
        package_size: variant?.package_size,
        package_unit: variant?.package_unit,
        packaging_display: packagingDisplay,
        pts_rate: ptsRate,
        mrp: mrp,
        submitted_quantity: qty,
        approved_quantity: qty, // Default pre-fill for Admin review
        batch_no: item.batch_no || '',
        expiry_date: item.expiry_date || '',
        notes: item.notes || '',
      });
    }

    const reqId = `sub-${perm.year}${String(perm.month).padStart(2, '0')}-${uuidv4().substring(0, 6)}`;
    const effectiveHqId = dto.hq_id || perm.hq_id || mrUser.hq_id || 'hq-shahdol';
    const hq = this.db.findHeadquarter(effectiveHqId);
    const stocker = dto.stocker_id
      ? this.db.stockers.find((s) => s.id === dto.stocker_id)
      : this.db.stockers.find((s) => s.hq_id === effectiveHqId) || this.db.stockers[0];

    const submission: StockageSubmissionRequest = {
      id: reqId,
      permission_id: perm.id,
      mr_id: mrUser.id,
      mr_name: mrUser.name || 'Field Representative',
      mr_phone: mrUser.phone || '',
      hq_id: effectiveHqId,
      hq_name: hq?.name || 'Shahdol',
      stocker_id: stocker?.id || 'stk-shd-01',
      stocker_name: stocker?.name || 'Central Pharma Stockist',
      month: perm.month_str,
      month_year: perm.month_str,
      year: perm.year,
      month_num: perm.month,
      status: 'PENDING',
      items: validatedItems,
      total_items: validatedItems.length,
      total_quantity: validatedItems.reduce((acc, i) => acc + i.submitted_quantity, 0),
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // One permission = one submission: transition status to RESERVED
    perm.status = 'RESERVED';
    perm.submission_id = reqId;
    perm.updated_at = new Date().toISOString();

    this.db.stockageSubmissionRequests.unshift(submission);
    this.db.persistToDisk();
    this.db.syncStockageRequestToSupabase(submission).catch(() => null);
    this.db.syncStockagePermissionToSupabase(perm).catch(() => null);

    // Notify Administrators
    const admins = this.db.users.filter((u) => ['SUPER_ADMIN', 'ADMIN'].includes(u.role) && !u.deleted_at);
    admins.forEach((admin) => {
      this.notificationsService.sendPushNotification(
        admin.id,
        '📋 New MR Stockage Request Submitted',
        `MR ${submission.mr_name} submitted Stockage upload (${submission.total_items} medicines, ${submission.total_quantity} units) for ${submission.month}. Pending your approval.`,
        { submissionId: submission.id, mrId: submission.mr_id, month: submission.month, type: 'STOCKAGE_SUBMISSION_PENDING' },
      );
    });

    return {
      message: 'Stockage data submitted successfully for Admin review',
      request: submission,
    };
  }

  async getStockageRequests(query?: {
    status?: string;
    mr_id?: string;
    month?: string;
    hq_id?: string;
  }): Promise<StockageSubmissionRequest[]> {
    let list = this.db.stockageSubmissionRequests.map((r) => {
      const stocker = this.db.stockers.find((s) => s.id === r.stocker_id);
      return {
        ...r,
        month_year: r.month_year || r.month,
        stocker_name: r.stocker_name || stocker?.name || r.stocker_id,
        admin_notes: r.admin_notes || r.admin_comment,
      };
    });

    if (query?.status && query.status !== 'ALL') {
      list = list.filter((r) => r.status === query.status);
    }
    if (query?.mr_id && query.mr_id !== 'ALL') {
      list = list.filter((r) => r.mr_id === query.mr_id);
    }
    if (query?.month && query.month !== 'ALL') {
      list = list.filter((r) => r.month === query.month);
    }
    if (query?.hq_id && query.hq_id !== 'ALL') {
      list = list.filter((r) => r.hq_id === query.hq_id);
    }

    return list.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }

  async getStockageRequestById(id: string): Promise<StockageSubmissionRequest> {
    const req = this.db.stockageSubmissionRequests.find((r) => r.id === id);
    if (!req) throw new NotFoundException('Stockage request not found');
    return req;
  }

  /**
   * ADMIN APPROVAL WORKFLOW WITH ADDITIVE STOCKAGE RULE (§3 & §7)
   * New Stockage Quantity = Existing Stockage Quantity + Approved Quantity
   * Never replace the existing quantity with the newly submitted quantity!
   * Idempotent: repeated clicks will not double add!
   */
  async reviewStockageRequest(
    reqId: string,
    dto: ReviewStockageRequestDto,
    adminUser: any,
  ): Promise<{ message: string; request: StockageSubmissionRequest }> {
    const request = this.db.stockageSubmissionRequests.find((r) => r.id === reqId);
    if (!request) throw new NotFoundException('Stockage request not found');

    // Idempotency safeguard: repeated clicks cannot add quantities twice
    if (request.status === 'APPLIED') {
      throw new BadRequestException('This request has already been approved and applied to official Stockage');
    }
    if (request.status === 'REJECTED') {
      throw new BadRequestException('This request has already been reviewed and rejected');
    }

    const perm = this.db.monthlyStockagePermissions.find((p) => p.id === request.permission_id);

    const effectiveAction =
      dto.action ||
      (dto.status === 'APPROVED' ? 'APPROVE' : dto.status === 'REJECTED' ? 'REJECT' : undefined);
    const reviewComment = dto.comment || dto.admin_notes;

    // === REJECTION PATH ===
    if (effectiveAction === 'REJECT') {
      request.status = 'REJECTED';
      request.admin_comment = reviewComment || 'Rejected by Administrator';
      request.admin_notes = request.admin_comment;
      request.reviewed_by_id = adminUser.id;
      request.reviewed_by_name = adminUser.name || 'System Admin';
      request.reviewed_at = new Date().toISOString();
      request.updated_at = new Date().toISOString();

      // Rule: Official Stockage is completely untouched (+0 units)
      // Rule: Permission remains linked and not silently reusable
      if (perm) {
        perm.updated_at = new Date().toISOString();
        this.db.syncStockagePermissionToSupabase(perm).catch(() => null);
      }

      this.db.persistToDisk();
      this.db.syncStockageRequestToSupabase(request).catch(() => null);

      this.notificationsService.sendPushNotification(
        request.mr_id,
        '❌ Stockage Submission Rejected',
        `Your Stockage submission for ${request.month} was rejected by Admin. Reason: ${request.admin_comment}`,
        { submissionId: request.id, status: 'REJECTED', type: 'STOCKAGE_REJECTED' },
      );

      return {
        message: 'Stockage request rejected. Official inventory was not modified.',
        request,
      };
    }

    // === APPROVAL PATH (ADDITIVE QUANTITY APPLICATION) ===
    if (effectiveAction !== 'APPROVE') {
      throw new BadRequestException('Invalid review action. Must be APPROVE or REJECT.');
    }

    // Apply any Admin item adjustments
    if (dto.item_adjustments && Array.isArray(dto.item_adjustments)) {
      for (const adj of dto.item_adjustments) {
        const item = request.items.find(
          (i) => (adj.item_id && i.id === adj.item_id) || (adj.medicine_id && i.medicine_id === adj.medicine_id),
        );
        if (item && adj.approved_quantity !== undefined) {
          const adjQty = Number(adj.approved_quantity);
          if (adjQty < 0 || !Number.isFinite(adjQty)) {
            throw new BadRequestException(`Approved quantity for ${item.medicine_name} must be non-negative`);
          }
          item.approved_quantity = adjQty;
          if (adj.reason) item.notes = adj.reason;
        }
      }
    }

    // Execute additive stock update for all line items atomically
    for (const item of request.items) {
      const approvedQty = Number(item.approved_quantity !== undefined ? item.approved_quantity : item.submitted_quantity);
      if (approvedQty <= 0) continue;

      let inv = this.db.stockerInventory.find(
        (i) => i.stocker_id === request.stocker_id && i.medicine_id === item.medicine_id,
      );

      if (!inv) {
        inv = {
          id: `inv-${request.stocker_id}-${item.medicine_id}`,
          hq_id: request.hq_id,
          stocker_id: request.stocker_id,
          medicine_id: item.medicine_id,
          variant_id: item.variant_id,
          packaging_display: item.packaging_display,
          quantity: 0,
          low_stock_threshold: 15,
          updated_at: new Date().toISOString(),
        };
        this.db.stockerInventory.push(inv);
      }

      const previousStock = inv.quantity;
      // CRITICAL BUSINESS RULE: Add to existing stock! Never replace!
      // New Stockage Quantity = Existing Stockage Quantity + Approved Quantity
      inv.quantity = previousStock + approvedQty;
      inv.updated_at = new Date().toISOString();

      item.previous_stock = previousStock;
      item.approved_quantity = approvedQty;
      item.final_stock = inv.quantity;

      // 1. Audit Transaction Log (§8 & §19)
      const tx: InventoryTransaction = {
        id: `tx-${uuidv4().substring(0, 8)}`,
        hq_id: request.hq_id,
        stocker_id: request.stocker_id,
        medicine_id: item.medicine_id,
        quantity: approvedQty,
        balance_after: inv.quantity,
        transaction_type: 'STOCKAGE_APPROVED_INWARD',
        user_id: adminUser.id,
        reason: `MR Stockage Approval for ${request.month} by ${adminUser.name} (Previous: ${previousStock}, Added: +${approvedQty}, Final: ${inv.quantity} ${item.packaging_display})`,
        timestamp: new Date().toISOString(),
      };
      this.db.inventoryTransactions.push(tx);

      // 2. Monthly Inward Entry Log
      const monthlyEntry: MonthlyStockEntry = {
        id: `entry-${uuidv4().substring(0, 8)}`,
        hq_id: request.hq_id,
        hq_name: request.hq_name,
        stocker_id: request.stocker_id,
        stocker_name: request.stocker_name,
        month: request.month,
        entry_date: new Date().toISOString().split('T')[0],
        invoice_no: `STOCKAGE-${request.id}`,
        medicine_id: item.medicine_id,
        medicine_name: item.medicine_name,
        medicine_code: item.medicine_code,
        quantity: approvedQty,
        unit: item.packaging_display,
        batch_no: item.batch_no || '',
        expiry_date: item.expiry_date || '',
        notes: `Approved MR submission from ${request.mr_name}`,
        user_id: request.mr_id,
        user_name: request.mr_name,
        created_at: new Date().toISOString(),
      };
      this.db.monthlyStockEntries.push(monthlyEntry);
      this.db.syncStockerInventoryToSupabase(inv).catch(() => null);
    }
    this.db.persistToDisk();

    // Only after successful Stockage application: mark Applied & Consume permission
    request.status = 'APPLIED';
    request.applied_at = new Date().toISOString();
    request.reviewed_by_id = adminUser.id;
    request.reviewed_by_name = adminUser.name || 'System Admin';
    request.reviewed_at = new Date().toISOString();
    request.admin_comment = dto.comment || 'Approved and added to official Stockage';
    request.admin_notes = request.admin_comment;
    request.updated_at = new Date().toISOString();

    if (perm) {
      perm.status = 'CONSUMED';
      perm.consumed_at = new Date().toISOString();
      perm.updated_at = new Date().toISOString();
      this.db.syncStockagePermissionToSupabase(perm).catch(() => null);
    }

    this.db.persistToDisk();
    this.db.syncStockageRequestToSupabase(request).catch(() => null);

    // Notify MR
    this.notificationsService.sendPushNotification(
      request.mr_id,
      '✅ Stockage Upload Approved & Applied!',
      `Your monthly Stockage submission for ${request.month} has been approved by ${adminUser.name} and successfully added to official stock.`,
      { submissionId: request.id, status: 'APPLIED', type: 'STOCKAGE_APPLIED' },
    );

    return {
      message: `Stockage request approved successfully! Approved quantities have been added to existing stock.`,
      request,
    };
  }

  /**
   * Broadcast a Stock Update Reminder to active MRs (or filtered by HQ).
   * Dispatches high-priority system notifications with sound and vibration.
   */
  async broadcastStockReminder(adminUser: any, customMessage?: string, targetHqId?: string) {
    const mrs = this.db.users.filter(
      (u) =>
        u.role === 'MR' &&
        !u.deleted_at &&
        u.status === 'ACTIVE' &&
        (!targetHqId || u.hq_id === targetHqId || u.assigned_territory === targetHqId),
    );

    const title = '📦 Stock Update Reminder';
    const body =
      customMessage?.trim() ||
      'Please verify and update stock levels for your assigned headquarters and stockers today.';

    for (const mr of mrs) {
      await this.notificationsService.sendPushNotification(mr.id, title, body, {
        type: 'STOCK_REMINDER',
        hq_id: mr.hq_id,
        sent_by: adminUser?.name || 'Management',
      });
    }

    return {
      message: `Stock update reminder sent to ${mrs.length} Field Representatives.`,
      recipient_count: mrs.length,
    };
  }
}

